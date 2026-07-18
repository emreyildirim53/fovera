import { TimerManager } from '../core/TimerManager';
import type { ReaderEngine } from './ReaderEngine';
import type { PlaybackEngine } from './PlaybackEngine';
import type { RenderLayer } from '../render/RenderLayer';
import { ReaderState, type GestureAxis } from '../state/ReaderState';
import { AppState } from '../state/AppState';
import { ReadingHistory } from '../state/ReadingHistory';
import { RafScheduler } from '../utils/RafScheduler';
import { clamp, formatElapsed, prefersReducedMotion } from '../utils/dom';

const DRAG_THRESHOLD_PX = 12;
const WORD_STEP_PX = 36; // vertical px of drag per word, for continuous word-by-word browsing
const SPEED_DRAG_RANGE_FRACTION = 0.3; // horizontal drag distance (as fraction of viewport width) that spans the full speed range
const MIN_SPEED = 0.2;
const MAX_SPEED = 6.0;
const SNAP_DURATION_MS = 150; // within the required 120-180ms ease-out window
const PAGE_PAUSE_MS = 1000;
const BROWSE_GRACE_MS = 2000;
const HISTORY_PERSIST_INTERVAL_MS = 5000;

interface ResetOptions {
  elapsedMs?: number;
}

interface PointerFrameState {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

/**
 * Owns pointer input end-to-end using the Pointer Events API
 * (`setPointerCapture`/`releasePointerCapture`/`pointercancel`), so the same
 * code path handles touch, pen, mouse, and trackpad without branching per
 * device. `pointermove` never touches the DOM directly — it only updates
 * `pendingFrame` and asks the `RafScheduler` for a frame; all rendering
 * happens inside the single rAF callback.
 */
export class GestureController {
  private state: ReaderState = ReaderState.Idle;
  private axis: GestureAxis = null;

  private pointerId: number | null = null;
  private pointerStartState: ReaderState = ReaderState.Idle;
  private startX = 0;
  private startY = 0;
  private pendingFrame: PointerFrameState | null = null;
  private raf = new RafScheduler(() => this.flushFrame());

  private anchorWordIndex = 0; // word index the vertical browse started from
  private candidateWordIndex = 0; // live candidate while browsing
  private lastBrowsePageIndex: number | null = null;
  private elapsedAtHoldStart = 0;
  private elapsedStartTimestamp = 0;
  private pendingPageTurnResume: (() => void) | null = null;
  private pageSheetOpen = false;
  private bookCompleted = false;
  private lastHistoryPersistBucket = -1;

  constructor(
    private readonly root: HTMLElement,
    private readonly reader: ReaderEngine,
    private readonly playback: PlaybackEngine,
    private readonly render: RenderLayer,
    private readonly timers: TimerManager,
    private readonly appState: AppState,
    private readonly readingHistory: ReadingHistory,
    private readonly onRequestOpenLibraryBlocked: () => boolean = () => false
  ) {
    this.attach();
  }

  getState(): ReaderState {
    return this.state;
  }

  // ---- wiring ----

  private attach(): void {
    document.addEventListener('pointerdown', this.onPointerDown);
    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerUp);
    document.addEventListener('pointercancel', this.onPointerCancel);
    window.addEventListener('keydown', this.onKeyDown);
  }

  destroy(): void {
    document.removeEventListener('pointerdown', this.onPointerDown);
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
    document.removeEventListener('pointercancel', this.onPointerCancel);
    window.removeEventListener('keydown', this.onKeyDown);
    this.timers.cancelAll();
    this.raf.cancel();
  }

  // ---- state transitions ----

  private setState(next: ReaderState): void {
    if (this.state === next) return;
    if (this.state === ReaderState.Playing) {
      // Leaving Playing always stops auto-advance and freezes the elapsed clock,
      // regardless of which state we're entering (hold, speed-adjust, browse...).
      this.playback.pause();
      this.timers.cancel('elapsedTick');
      this.elapsedAtHoldStart = this.appState.get().elapsedMs;
    }
    this.state = next;
    this.appState.update({ readerState: next });
    this.render.setMenuVisible(true);
  }

  // ---- pointer handlers ----

  private onPointerDown = (e: PointerEvent): void => {
    if (this.render.isOnboardingVisible()) return;
    if (!this.isReaderSurfaceTarget(e.target)) return;
    if (this.onRequestOpenLibraryBlocked()) return;
    if (this.pointerId !== null) return; // ignore secondary pointers
    this.pointerId = e.pointerId;
    this.pointerStartState = this.state;
    this.root.setPointerCapture(e.pointerId);

    this.startX = e.clientX;
    this.startY = e.clientY;
    this.axis = null;

    if (this.state === ReaderState.VerticalBrowse && this.timers.isActive('browseGrace')) {
      this.pauseDuringBrowseGrace();
      return;
    }

    if (this.state === ReaderState.ResumeDelay || this.state === ReaderState.Snap) {
      this.pausePlayback();
      return;
    }

    if (this.state === ReaderState.Idle) {
      if (this.bookCompleted) {
        this.restartCompletedBook();
        return;
      }
      this.beginPagePause(0, () => this.beginPlayback());
      return;
    }

    if (this.state === ReaderState.Playing) {
      this.pausePlayback();
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    this.pendingFrame = { x: e.clientX, y: e.clientY, dx, dy };
    this.raf.request();
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    this.releaseCapture();
    const committedAxis = this.axis;
    this.axis = null;
    this.pointerId = null;
    this.pendingFrame = null;
    this.raf.cancel();

    if (committedAxis === null) {
      // Tap without a drag toggles pause/resume.
      const pausedOnDown = this.pointerStartState === ReaderState.Playing;
      if (this.pointerStartState === ReaderState.Idle) {
        return;
      }
      if (pausedOnDown) {
        return;
      }
      if (this.pointerStartState === ReaderState.Playing && this.state === ReaderState.Playing) {
        this.pausePlayback();
      } else if (this.pointerStartState === ReaderState.Holding && this.state === ReaderState.Holding) {
        this.beginPlayback();
      }
      return;
    }

    if (this.state === ReaderState.HorizontalAdjust) {
      this.render.hideSpeedBadge();
      this.beginPlayback();
      return;
    }

    if (this.state === ReaderState.VerticalBrowse) {
      this.scheduleBrowseGrace();
    }
  };

  private onPointerCancel = (e: PointerEvent): void => {
    if (e.pointerId !== this.pointerId) return;
    this.releaseCapture();
    this.axis = null;
    this.pointerId = null;
    this.pendingFrame = null;
    this.raf.cancel();

    if (this.state === ReaderState.HorizontalAdjust) this.render.hideSpeedBadge();
    if (this.state === ReaderState.VerticalBrowse) {
      this.scheduleBrowseGrace();
      return;
    }
    if (this.state !== ReaderState.Idle && this.state !== ReaderState.Holding) this.beginPlayback();
  };

  private releaseCapture(): void {
    if (this.pointerId !== null && this.root.hasPointerCapture(this.pointerId)) {
      this.root.releasePointerCapture(this.pointerId);
    }
  }

  private isReaderSurfaceTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    if (!target.closest('#app')) return false;
    return !target.closest('#menu-btn, #page-chip, #page-sheet, #library, #add-modal, #onboarding-tour, input, textarea, select, button, label');
  }

  // ---- single per-frame render, called from RafScheduler ----

  private flushFrame(): void {
    const frame = this.pendingFrame;
    if (!frame) return;

    // Axis is undecided until the drag threshold is crossed; it locks for the gesture's lifetime.
    if (this.axis === null) {
      if (Math.abs(frame.dx) < DRAG_THRESHOLD_PX && Math.abs(frame.dy) < DRAG_THRESHOLD_PX) return;
      this.axis = Math.abs(frame.dx) > Math.abs(frame.dy) ? 'horizontal' : 'vertical';

      if (this.axis === 'horizontal') {
        this.setState(ReaderState.HorizontalAdjust);
      } else {
        this.anchorWordIndex = this.reader.currentWordIndex;
        this.candidateWordIndex = this.anchorWordIndex;
        this.lastBrowsePageIndex = this.reader.currentPageIndex;
        this.setState(ReaderState.VerticalBrowse);
        this.render.clearCenterWord();
        this.render.setCenterWordVisible(false);
        this.render.setBrowseVisible(true);
        this.renderWordWindow(this.candidateWordIndex);
      }
    }

    if (this.axis === 'horizontal' && this.state === ReaderState.HorizontalAdjust) {
      const dragFraction = -frame.dx / (window.innerWidth * SPEED_DRAG_RANGE_FRACTION);
      const multiplier = clamp(1.0 + dragFraction * 3.0, MIN_SPEED, MAX_SPEED);
      this.playback.setSpeed(multiplier);
      this.appState.update({ speedMultiplier: multiplier });
      this.render.showSpeedBadge(multiplier);
    } else if (this.axis === 'vertical' && this.state === ReaderState.VerticalBrowse) {
      const wordOffset = Math.round(-frame.dy / WORD_STEP_PX);
      const newIndex = clamp(this.anchorWordIndex + wordOffset, 0, Math.max(0, this.reader.wordCount - 1));
      if (newIndex !== this.candidateWordIndex) {
        this.candidateWordIndex = newIndex;
        this.renderWordWindow(this.candidateWordIndex);
      }
    }
  }

  private renderWordWindow(centerIndex: number): void {
    this.render.renderBrowseRows(this.reader.buildBrowseRowsAroundWord(centerIndex, 1));
    const pageIndex = this.reader.wordAt(centerIndex)?.pageIndex ?? this.reader.currentPageIndex;
    const shouldHighlight = this.lastBrowsePageIndex !== null && pageIndex !== this.lastBrowsePageIndex;
    this.render.showPageChip(pageIndex, this.reader.totalPages, { highlight: shouldHighlight });
    this.lastBrowsePageIndex = pageIndex;
  }

  refreshVisibleWordLayout(): void {
    if (this.state === ReaderState.VerticalBrowse) {
      this.renderWordWindow(this.candidateWordIndex);
      return;
    }
    this.renderCurrentFocus(false);
  }

  private renderCurrentFocus(animate: boolean): void {
    this.render.showCenterWord(this.reader.currentDisplayWords, animate, this.reader.currentDisplayTranslations);
  }

  private commitBrowseSelection(): void {
    this.timers.cancel('browseGrace');
    this.reader.jumpToWord(this.candidateWordIndex);
    this.lastBrowsePageIndex = null;
    this.readingHistory.recordPosition(this.reader.currentWordIndex, this.reader.currentPageIndex, 'seek');
    this.syncPageUi();
    this.render.setCenterWordVisible(true);
    this.renderCurrentFocus(false);
    this.setState(ReaderState.Snap);

    // Browse layer fades out over SNAP_DURATION_MS (see CSS transition on #browse-layer);
    // the already-positioned center word reads as a seamless settle onto the anchor.
    this.render.setBrowseVisible(false);
    this.timers.setTimeout('snap', () => this.beginPlayback(), prefersReducedMotion() ? 0 : SNAP_DURATION_MS);
  }

  private scheduleBrowseGrace(): void {
    this.axis = null;
    this.pendingFrame = null;
    this.render.hideStartHint();
    this.render.setCenterWordVisible(false);
    this.render.setBrowseVisible(true);
    this.renderWordWindow(this.candidateWordIndex);
    this.timers.setTimeout('browseGrace', () => this.commitBrowseSelection(), BROWSE_GRACE_MS);
  }

  private pauseDuringBrowseGrace(): void {
    this.timers.cancel('browseGrace');
    this.reader.jumpToWord(this.candidateWordIndex);
    this.lastBrowsePageIndex = null;
    this.readingHistory.recordPosition(this.reader.currentWordIndex, this.reader.currentPageIndex, 'seek');
    this.syncPageUi();
    this.pausePlayback();
  }

  private beginPagePause(pageIndex: number, onResume: () => void): void {
    this.setState(ReaderState.ResumeDelay);
    this.render.hideBookIntro();
    this.render.hideResumeCountdown();
    this.render.hideStartHint();
    this.render.hideCompletionPanel();
    this.render.clearCenterWord();
    this.render.showPageIndicator(pageIndex);
    this.timers.setTimeout('resumeCountdown', () => {
      this.render.hidePageIndicator();
      onResume();
    }, PAGE_PAUSE_MS);
  }

  private beginPlayback(): void {
    this.timers.cancel('browseGrace');
    this.lastBrowsePageIndex = null;
    this.render.completeOnboarding();
    this.render.setCenterWordVisible(true);
    this.render.hideStartHint();
    this.render.hidePageIndicator();
    this.render.hideCompletionPanel();
    this.bookCompleted = false;
    this.readingHistory.ensureSessionStarted();
    this.setState(ReaderState.Playing);
    this.beginPlaybackClock();
    this.playback.start(true);
  }

  private pausePlayback(): void {
    this.timers.cancel('browseGrace');
    this.timers.cancel('resumeCountdown');
    this.timers.cancel('snap');
    this.timers.cancel('elapsedTick');
    this.pendingPageTurnResume = null;
    this.render.hideResumeCountdown();
    this.render.hidePageIndicator();
    this.render.setBrowseVisible(false);
    this.setState(ReaderState.Holding);
    this.render.setCenterWordVisible(true);
    this.renderCurrentFocus(false);
    this.render.showPausedHint();
    this.syncPageUi();
    this.readingHistory.recordElapsed(this.appState.get().elapsedMs);
    this.readingHistory.pause();
  }

  private beginPlaybackClock(): void {
    this.elapsedStartTimestamp = Date.now();
    this.lastHistoryPersistBucket = Math.floor(this.elapsedAtHoldStart / HISTORY_PERSIST_INTERVAL_MS);
    this.timers.setInterval(
      'elapsedTick',
      () => {
        const elapsed = this.elapsedAtHoldStart + (Date.now() - this.elapsedStartTimestamp);
        this.appState.update({ elapsedMs: elapsed });
        this.readingHistory.recordElapsed(elapsed);
        const bucket = Math.floor(elapsed / HISTORY_PERSIST_INTERVAL_MS);
        if (bucket !== this.lastHistoryPersistBucket) {
          this.lastHistoryPersistBucket = bucket;
          this.readingHistory.persist();
        }
      },
      1000
    );
  }

  pauseForPageTurn(nextPageIndex: number, resumePlayback: () => void): void {
    this.playback.pause();
    this.timers.cancel('elapsedTick');
    this.readingHistory.recordElapsed(this.appState.get().elapsedMs);
    this.readingHistory.pause();
    this.pendingPageTurnResume = resumePlayback;
    this.render.clearCenterWord();
    this.render.hideStartHint();
    this.render.showPageChip(nextPageIndex, this.reader.totalPages, { highlight: true });
    this.beginPagePause(nextPageIndex, () => {
      const resume = this.pendingPageTurnResume;
      this.pendingPageTurnResume = null;
      if (!resume) return;
      this.beginPlaybackClock();
      resume();
    });
  }

  /** Stops timers/playback and returns to Idle, e.g. when a new book is loaded. */
  reset(options: ResetOptions = {}): void {
    this.playback.pause();
    this.timers.cancelAll();
    this.raf.cancel();
    this.pageSheetOpen = false;
    this.bookCompleted = false;
    this.render.setPageSheetOpen(false);
    this.render.hideCompletionPanel();
    this.elapsedAtHoldStart = options.elapsedMs ?? 0;
    this.setState(ReaderState.Idle);
    this.render.resetCenterWordColor();
    this.render.setCenterWordVisible(true);
    this.renderCurrentFocus(false);
    this.render.hidePageIndicator();
    this.render.hideResumeCountdown();
    const currentBook = this.reader.currentBook;
    this.render.showBookIntro(
      currentBook
        ? {
            title: currentBook.title,
            author: currentBook.author,
            pageCount: currentBook.pages.length,
          }
        : undefined
    );
    this.render.showIdleHint(
      currentBook
        ? {
            title: currentBook.title,
            author: currentBook.author,
            pageCount: currentBook.pages.length,
          }
        : undefined
    );
    this.syncPageUi();
    this.appState.update({
      elapsedMs: this.elapsedAtHoldStart,
      speedMultiplier: this.playback.speed,
      currentWordIndex: this.reader.currentWordIndex,
      currentSentenceIndex: this.reader.currentSentenceIndex,
    });
  }

  finishBook(): void {
    this.timers.cancel('elapsedTick');
    this.readingHistory.recordElapsed(this.appState.get().elapsedMs);
    const completionSummary = this.readingHistory.finishBook();
    this.bookCompleted = true;
    this.setState(ReaderState.Idle);
    this.render.setProgress(1);
    this.render.setCenterWordVisible(false);
    this.render.hideBookIntro();
    this.render.hidePageIndicator();
    this.render.hideResumeCountdown();
    if (completionSummary) {
      this.render.showCompletionSummary(completionSummary);
    } else {
      this.render.showFinishedMessage(formatElapsed(this.appState.get().elapsedMs));
    }
    this.syncPageUi();
  }

  pauseForOverlay(): void {
    if (this.pageSheetOpen) this.closePageSheet();
    if (this.state === ReaderState.Idle) return;
    this.pausePlayback();
  }

  togglePageSheet(): void {
    if (this.pageSheetOpen) {
      this.closePageSheet();
      return;
    }
    if (!this.reader.currentBook) return;
    this.pauseForOverlay();
    this.pageSheetOpen = true;
    this.render.renderPageSheet(this.reader.pages, this.reader.currentPageIndex);
    this.render.setPageSheetOpen(true);
  }

  closePageSheet(): void {
    if (!this.pageSheetOpen) return;
    this.pageSheetOpen = false;
    this.render.setPageSheetOpen(false);
  }

  jumpToPage(pageIndex: number): void {
    if (!this.reader.currentBook) return;
    this.closePageSheet();
    this.playback.pause();
    this.timers.cancel('elapsedTick');
    this.reader.jumpToPage(pageIndex);
    this.readingHistory.recordPosition(this.reader.currentWordIndex, this.reader.currentPageIndex, 'seek');
    this.readingHistory.recordElapsed(this.appState.get().elapsedMs);
    this.readingHistory.pause();
    this.syncPageUi();
    this.render.setCenterWordVisible(true);
    this.renderCurrentFocus(false);
    this.render.hideStartHint();
    this.beginPagePause(pageIndex, () => this.beginPlayback());
  }

  syncPageUi(): void {
    this.render.showPageChip(this.reader.currentPageIndex, this.reader.totalPages);
    if (this.pageSheetOpen) {
      this.render.renderPageSheet(this.reader.pages, this.reader.currentPageIndex);
    }
  }

  // ---- keyboard accessibility (mirrors the pointer gestures for non-pointer users) ----

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.render.isOnboardingVisible()) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (this.state === ReaderState.Idle) this.beginPlayback();
      else if (this.state === ReaderState.Playing) this.pausePlayback();
      else if (this.state === ReaderState.Holding) this.beginPlayback();
      return;
    }

    if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
      e.preventDefault();
      const delta = e.code === 'ArrowUp' ? 1 : -1;
      const wasPlaying = this.state === ReaderState.Playing;
      if (wasPlaying) this.playback.pause();
      this.reader.jumpToWord(this.reader.currentWordIndex + delta);
      this.readingHistory.recordPosition(this.reader.currentWordIndex, this.reader.currentPageIndex, 'seek');
      this.syncPageUi();
      this.renderCurrentFocus(true);
      if (wasPlaying) this.playback.start(false);
    }

    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      e.preventDefault();
      const delta = e.code === 'ArrowLeft' ? 0.2 : -0.2;
      const multiplier = clamp(this.playback.speed + delta, MIN_SPEED, MAX_SPEED);
      this.playback.setSpeed(multiplier);
      this.appState.update({ speedMultiplier: multiplier });
      this.render.showSpeedBadge(multiplier);
      this.timers.setTimeout('speedBadgeHide', () => this.render.hideSpeedBadge(), 800);
    }
  };

  private restartCompletedBook(): void {
    this.readingHistory.restartCurrentRun();
    this.reader.resetToStart();
    this.render.hideCompletionPanel();
    this.syncPageUi();
    this.appState.update({
      elapsedMs: 0,
      currentWordIndex: this.reader.currentWordIndex,
      currentSentenceIndex: this.reader.currentSentenceIndex,
    });
    this.beginPagePause(0, () => this.beginPlayback());
  }
}
