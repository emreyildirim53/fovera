import { $, prefersReducedMotion } from '../utils/dom';
import type { BrowseRow } from '../engine/ReaderEngine';
import { I18n } from '../i18n';
import type { CompletionSummary } from '../state/ReadingHistory';

const ONBOARDING_SEEN_KEY = 'fovera:onboarding-seen:v2';

interface IdleBookMeta {
  title: string;
  author: string;
  pageCount: number;
}

interface PageChipOptions {
  highlight?: boolean;
}

type OnboardingStepId = 'focus' | 'pace' | 'browse' | 'settings';

/**
 * All direct DOM writes for the reading screen live here. Nothing outside
 * this class touches `center-word`, `browse-layer`, etc. That boundary is
 * what lets the gesture controller stay DOM-free during `pointermove` and
 * only flush through `RafScheduler` at most once per frame.
 */
export class RenderLayer {
  private readonly appEl = $<HTMLDivElement>('#app');
  private readonly progressBarEl = $<HTMLDivElement>('#progress-bar');
  private readonly bookIntroEl = $<HTMLDivElement>('#book-intro');
  private readonly centerWordEl = $<HTMLDivElement>('#center-word');
  private readonly centerWordTranslationEl = $<HTMLDivElement>('#center-word-translation');
  private readonly browseLayerEl = $<HTMLDivElement>('#browse-layer');
  private readonly startHintEl = $<HTMLDivElement>('#start-hint');
  private readonly onboardingTourEl = $<HTMLElement>('#onboarding-tour');
  private readonly onboardingKickerEl = $<HTMLSpanElement>('#onboarding-kicker');
  private readonly onboardingStepCounterEl = $<HTMLSpanElement>('#onboarding-step-counter');
  private readonly onboardingDemoEl = $<HTMLDivElement>('#onboarding-demo');
  private readonly onboardingTitleEl = $<HTMLParagraphElement>('#onboarding-title');
  private readonly onboardingCopyEl = $<HTMLParagraphElement>('#onboarding-copy');
  private readonly onboardingPointsEl = $<HTMLDivElement>('#onboarding-points');
  private readonly onboardingProgressEl = $<HTMLDivElement>('#onboarding-progress');
  private readonly onboardingPrevEl = $<HTMLButtonElement>('#onboarding-prev');
  private readonly onboardingNextEl = $<HTMLButtonElement>('#onboarding-next');
  private readonly onboardingSkipEl = $<HTMLButtonElement>('#onboarding-skip');
  private readonly completionPanelEl = $<HTMLElement>('#completion-panel');
  private readonly speedBadgeEl = $<HTMLDivElement>('#speed-badge');
  private readonly resumeCountdownEl = $<HTMLDivElement>('#resume-countdown');
  private readonly pageIndicatorEl = $<HTMLDivElement>('#page-indicator');
  private readonly pageChipEl = $<HTMLButtonElement>('#page-chip');
  private readonly pageSheetBackdropEl = $<HTMLButtonElement>('#page-sheet-backdrop');
  private readonly pageSheetEl = $<HTMLElement>('#page-sheet');
  private readonly pageSheetTitleEl = $<HTMLHeadingElement>('#page-sheet-title');
  private readonly pageSheetCopyEl = $<HTMLParagraphElement>('#page-sheet-copy');
  private readonly pageSheetListEl = $<HTMLDivElement>('#page-sheet-list');
  private readonly pageSheetCloseEl = $<HTMLButtonElement>('#page-sheet-close');
  private readonly menuBtnEl = $<HTMLButtonElement>('#menu-btn');

  private lastRenderedBrowseKey = '';
  private lastRenderedSpeed = -1;
  private lastElapsedLabel = '';
  private lastPageIndicator: number | null = null;
  private lastPageChip: { pageIndex: number; totalPages: number } | null = null;
  private lastPageSheet: { pages: string[]; currentPageIndex: number } | null = null;
  private startHintMode: 'idle' | 'paused' | 'finished' | 'hidden' = 'idle';
  private lastCompletionSummary: CompletionSummary | null = null;
  private idleBookMeta: IdleBookMeta | null = null;
  private bookIntroVisible = false;
  private hasSeenOnboarding = readOnboardingSeen();
  private onboardingVisible = false;
  private onboardingStepIndex = 0;
  private inlineTranslationEnabled = false;
  private translationLocale: 'en' | 'tr' | null = null;
  private lastCenterWord = '';
  private lastCenterWordTranslation = '';

  constructor(private readonly i18n: I18n) {
    this.wireOnboarding();
    this.i18n.subscribe(() => this.syncLocalizedCopy());
  }

  // ---- Center word (the fixed anchor) ----

  showCenterWord(wordsInput: string | readonly string[], animate: boolean, translationInput?: string | readonly string[] | null): void {
    const words = normalizeWordList(wordsInput);
    const translations = normalizeWordList(translationInput);
    const joinedWords = words.join(' ');
    const joinedTranslations = translations.join(' ');
    this.lastCenterWord = joinedWords;
    this.lastCenterWordTranslation = joinedTranslations;
    if (animate && !prefersReducedMotion()) {
      this.centerWordEl.classList.remove('word-enter', 'word-exit');
      // Force reflow so the animation restarts even if the same class is reapplied.
      void this.centerWordEl.offsetWidth;
      this.centerWordEl.classList.add('word-enter');
    }
    const centerFontSize = computeCenterWordFontSize(words);
    this.centerWordEl.textContent = joinedWords;
    this.centerWordEl.style.fontSize = `${centerFontSize}px`;
    this.centerWordTranslationEl.style.fontSize = `${computeCenterTranslationFontSize(centerFontSize, joinedTranslations)}px`;
    this.centerWordEl.classList.remove('hidden');
    this.syncCenterWordTranslation();
    this.syncPeripheralChromeState();
  }

  clearCenterWord(): void {
    this.lastCenterWord = '';
    this.lastCenterWordTranslation = '';
    this.centerWordEl.textContent = '';
    this.centerWordTranslationEl.textContent = '';
    this.centerWordTranslationEl.classList.add('hidden');
  }

  isOnboardingVisible(): boolean {
    return this.onboardingVisible;
  }

  setCenterWordVisible(visible: boolean): void {
    this.centerWordEl.classList.toggle('hidden', !visible);
    this.syncCenterWordTranslation();
  }

  setInlineTranslationEnabled(enabled: boolean): void {
    this.inlineTranslationEnabled = enabled;
    this.syncCenterWordTranslation();
  }

  setTranslationLocale(locale: 'en' | 'tr'): void {
    this.translationLocale = locale;
    this.centerWordTranslationEl.dataset['locale'] = locale;
    this.syncCenterWordTranslation();
  }

  showFinishedMessage(elapsedLabel: string): void {
    this.lastElapsedLabel = elapsedLabel;
    this.startHintMode = 'finished';
    this.lastCompletionSummary = null;
    this.lastCenterWord = this.i18n.t('finishedWord');
    this.lastCenterWordTranslation = '';
    this.centerWordEl.textContent = this.i18n.t('finishedWord');
    this.centerWordEl.style.color = 'var(--primary)';
    this.centerWordEl.style.fontSize = '42px';
    this.syncCenterWordTranslation();
    this.startHintEl.innerHTML = this.i18n.format('finishedHint', { elapsed: elapsedLabel });
    this.startHintEl.classList.remove('hidden');
    this.syncPeripheralChromeState();
  }

  showCompletionSummary(summary: CompletionSummary): void {
    this.lastCompletionSummary = summary;
    this.hideBookIntro();
    this.hideStartHint();
    this.clearCenterWord();
    this.setCenterWordVisible(false);
    this.setBrowseVisible(false);
    const wpmValue = renderMetricValue(String(summary.averageWpm), {
      unit: 'WPM',
      tooltip: this.i18n.t('wpmTooltip'),
    });

    const chartBars = [
      {
        label: this.i18n.t('completionChartPace'),
        valueHtml: wpmValue,
        progress: clamp(summary.averageWpm / 420, 0.12, 1),
      },
      {
        label: this.i18n.t('completionChartCoverage'),
        valueHtml: renderMetricValue(`${summary.progressPercent}%`),
        progress: clamp(summary.progressPercent / 100, 0.12, 1),
      },
      {
        label: this.i18n.t('completionChartDepth'),
        valueHtml: renderMetricValue(String(summary.pagesVisitedThisSession)),
        progress: clamp(summary.pagesVisitedThisSession / Math.max(1, summary.maxPagesSingleSession), 0.12, 1),
      },
      {
        label: this.i18n.t('completionChartControl'),
        valueHtml: renderMetricValue(String(summary.rewoundPages)),
        progress: clamp(1 - Math.min(1, summary.rewoundPages / Math.max(1, summary.pagesVisitedThisSession)), 0.12, 1),
      },
    ];

    const returnedBadge =
      summary.returnedAfterDays !== null
        ? `<span class="completion-chip">${escapeHtml(
            this.i18n.format('completionReturned', { days: String(summary.returnedAfterDays) })
          )}</span>`
        : '';

    this.completionPanelEl.innerHTML = `
      <div class="completion-shell">
        <div class="completion-kicker">Fovera Flow</div>
        <h2 class="completion-title">${escapeHtml(this.i18n.t('completionTitle'))}</h2>
        <p class="completion-subtitle">${escapeHtml(this.i18n.t('completionSubtitle'))}</p>

        <div class="completion-stat-chain">
          ${renderCompletionStat(this.i18n.t('completionElapsed'), renderMetricValue(summary.elapsedLabel), 'primary')}
          ${renderCompletionStat(this.i18n.t('completionPace'), wpmValue, 'accent')}
          ${renderCompletionStat(this.i18n.t('completionPages'), renderMetricValue(String(summary.maxPagesSingleSession)), 'muted')}
          ${renderCompletionStat(this.i18n.t('completionRewinds'), renderMetricValue(String(summary.rewoundWords)), 'muted')}
        </div>

        <div class="completion-chart-shell">
          <div class="completion-chart-head">
            <span>${escapeHtml(this.i18n.t('completionChartLabel'))}</span>
            <span>${escapeHtml(summary.title)}</span>
          </div>
          <div class="completion-chart-grid">
            ${chartBars
              .map(
                (bar) => `
                  <article class="completion-bar-card">
                    <div class="completion-bar-top">
                      <span>${escapeHtml(bar.label)}</span>
                      <span>${bar.valueHtml}</span>
                    </div>
                    <div class="completion-bar-track">
                      <span class="completion-bar-fill" style="transform: scaleX(${bar.progress})"></span>
                    </div>
                  </article>`
              )
              .join('')}
          </div>
        </div>

        <div class="completion-chip-row">
          <span class="completion-chip">${escapeHtml(this.i18n.format('completionSessions', { count: String(summary.sessions) }))}</span>
          <span class="completion-chip">${escapeHtml(
            this.i18n.format('completionCompletions', { count: String(summary.completions) })
          )}</span>
          <span class="completion-chip">${escapeHtml(
            this.i18n.format('completionBestSession', { count: String(summary.maxPagesSingleSession) })
          )}</span>
          ${returnedBadge}
        </div>

        <p class="completion-restart">${escapeHtml(this.i18n.t('completionRestart'))}</p>
      </div>`;

    this.completionPanelEl.classList.remove('hidden');
    this.completionPanelEl.setAttribute('aria-hidden', 'false');
    this.syncPeripheralChromeState();
  }

  hideCompletionPanel(): void {
    this.lastCompletionSummary = null;
    this.completionPanelEl.innerHTML = '';
    this.completionPanelEl.classList.add('hidden');
    this.completionPanelEl.setAttribute('aria-hidden', 'true');
    this.syncPeripheralChromeState();
  }

  resetCenterWordColor(): void {
    this.centerWordEl.style.color = '';
  }

  // ---- Intro ----

  showBookIntro(bookMeta?: IdleBookMeta): void {
    this.idleBookMeta = bookMeta ?? null;
    if (!bookMeta) {
      this.bookIntroEl.innerHTML = '';
      this.bookIntroEl.classList.add('hidden');
      this.bookIntroVisible = false;
      this.syncPeripheralChromeState();
      return;
    }

    this.bookIntroEl.innerHTML = `
      <div class="book-intro-shell">
        <div class="book-intro-kicker">Fovera</div>
        <div class="book-intro-title">${escapeHtml(bookMeta.title)}</div>
        <div class="book-intro-meta">
          <span>${escapeHtml(bookMeta.author)}</span>
          <span class="book-intro-dot"></span>
          <span>${escapeHtml(this.i18n.pageCount(bookMeta.pageCount))}</span>
        </div>
        <div class="book-intro-rule"></div>
      </div>`;
    this.bookIntroVisible = true;
    this.bookIntroEl.classList.remove('hidden');
    this.syncPeripheralChromeState();
  }

  hideBookIntro(): void {
    this.bookIntroVisible = false;
    this.bookIntroEl.classList.add('hidden');
    this.syncPeripheralChromeState();
  }

  // ---- Start hint ----

  showIdleHint(bookMeta?: IdleBookMeta): void {
    this.startHintMode = 'idle';
    this.idleBookMeta = bookMeta ?? null;
    this.startHintEl.innerHTML = `
      <div class="start-hint-shell">
        <div class="start-hint-copy">${escapeHtml(this.i18n.t('startHint'))}</div>
        <p class="start-hint-subcopy">${escapeHtml(this.i18n.t('startHintSubcopy'))}</p>
      </div>`;
    this.startHintEl.classList.remove('hidden');
    if (!this.hasSeenOnboarding && !this.onboardingVisible) {
      this.showOnboarding();
    }
    this.syncPeripheralChromeState();
  }

  showPausedHint(): void {
    this.startHintMode = 'paused';
    this.startHintEl.innerHTML = this.i18n.t('pausedHint');
    this.startHintEl.classList.remove('hidden');
    this.syncPeripheralChromeState();
  }

  hideStartHint(): void {
    this.startHintMode = 'hidden';
    this.startHintEl.classList.add('hidden');
    this.syncPeripheralChromeState();
  }

  completeOnboarding(): void {
    if (this.hasSeenOnboarding) return;
    this.hasSeenOnboarding = true;
    try {
      localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    } catch {
      // Ignore localStorage issues and keep the in-memory onboarding state.
    }
  }

  showOnboarding(force = false): void {
    if (this.hasSeenOnboarding && !force) return;
    this.onboardingVisible = true;
    this.onboardingStepIndex = 0;
    this.onboardingTourEl.classList.remove('hidden');
    this.onboardingTourEl.setAttribute('aria-hidden', 'false');
    this.onboardingTourEl.removeAttribute('inert');
    this.renderOnboardingStep();
    this.syncPeripheralChromeState();
  }

  hideOnboarding(markSeen = false): void {
    if (markSeen) this.completeOnboarding();
    this.onboardingVisible = false;
    this.onboardingTourEl.classList.add('hidden');
    this.onboardingTourEl.setAttribute('aria-hidden', 'true');
    this.onboardingTourEl.setAttribute('inert', '');
    this.syncPeripheralChromeState();
  }

  // ---- Progress / page state ----

  setProgress(progress: number): void {
    const clamped = Math.max(0, Math.min(1, progress));
    this.progressBarEl.style.transform = `scaleX(${clamped})`;
  }

  showPageIndicator(pageIndex: number): void {
    this.lastPageIndicator = pageIndex;
    this.pageIndicatorEl.innerHTML = this.i18n.format('pageLabel', { page: String(pageIndex + 1) });
    this.pageIndicatorEl.classList.add('show');
  }

  hidePageIndicator(): void {
    this.lastPageIndicator = null;
    this.pageIndicatorEl.classList.remove('show');
  }

  showPageChip(pageIndex: number, totalPages: number, options: PageChipOptions = {}): void {
    this.lastPageChip = { pageIndex, totalPages };
    const label = this.i18n.format('pageChipLabel', {
      page: String(pageIndex + 1),
      total: String(totalPages),
    });
    this.pageChipEl.textContent = `${pageIndex + 1}/${totalPages}`;
    this.pageChipEl.removeAttribute('aria-label');
    this.pageChipEl.title = label;
    this.pageChipEl.classList.toggle('hidden', totalPages <= 0);
    this.pageChipEl.classList.remove('page-chip-highlight');
    if (options.highlight && totalPages > 0) {
      void this.pageChipEl.offsetWidth;
      this.pageChipEl.classList.add('page-chip-highlight');
    }
  }

  renderPageSheet(pages: string[], currentPageIndex: number): void {
    this.lastPageSheet = { pages: [...pages], currentPageIndex };
    this.pageSheetListEl.innerHTML = pages
      .map((page, index) => {
        const active = index === currentPageIndex;
        const pageLabel = this.i18n.format('pageLabel', { page: String(index + 1) });
        const status = active
          ? `<span class="page-sheet-card-status">${escapeHtml(this.i18n.t('currentPage'))}</span>`
          : '';
        const ariaLabel = active ? `${pageLabel}, ${this.i18n.t('currentPage')}` : pageLabel;
        return `
          <article
            class="page-sheet-card${active ? ' active' : ''}"
            data-page-index="${index}"
            aria-current="${active ? 'page' : 'false'}"
            aria-label="${escapeHtml(ariaLabel)}"
            role="button"
            tabindex="0"
          >
            <div class="page-sheet-card-top">
              <span class="page-sheet-card-label">${escapeHtml(pageLabel)}</span>
              ${status}
            </div>
            <div class="page-sheet-card-paper">
              <div class="page-sheet-card-text">${escapeHtml(page)}</div>
            </div>
          </article>`;
      })
      .join('');
  }

  setPageSheetOpen(open: boolean): void {
    this.pageSheetBackdropEl.classList.toggle('show', open);
    this.pageSheetBackdropEl.setAttribute('aria-hidden', open ? 'false' : 'true');
    this.pageSheetEl.classList.toggle('open', open);
    this.pageSheetEl.setAttribute('aria-hidden', open ? 'false' : 'true');
    this.pageSheetEl.toggleAttribute('inert', !open);
    this.bookIntroEl.classList.toggle('occluded', open);
    this.startHintEl.classList.toggle('occluded', open);
    this.completionPanelEl.classList.toggle('occluded', open);
    this.syncPeripheralChromeState();
  }

  // ---- Browse layer ----

  setBrowseVisible(visible: boolean): void {
    this.browseLayerEl.classList.toggle('visible', visible);
    if (!visible) {
      this.browseLayerEl.innerHTML = '';
      this.lastRenderedBrowseKey = '';
    }
  }

  /** Renders the 5-row browse window. Skips the DOM write entirely if nothing changed since the last frame. */
  renderBrowseRows(rows: BrowseRow[]): void {
    const key = rows.map((r) => `${r.sentenceIndex ?? 'x'}:${r.words.map((w) => w.word).join(',')}`).join('|');
    if (key === this.lastRenderedBrowseKey) return;
    this.lastRenderedBrowseKey = key;

    const html = rows
      .map((row) => {
        if (row.sentenceIndex === null) {
          return `<div class="browse-row" style="opacity:0;">&nbsp;</div>`;
        }
        const isTarget = row.offset === 0;
        const distance = Math.abs(row.offset);
        const opacity = isTarget ? 1 : Math.max(0.3, 1 - distance * 0.42);
        const wordsHtml = row.words
          .map((w) => {
            let cls = 'w';
            if (isTarget && w.isCenter) cls += ' hl';
            else if (isTarget) cls += ' neighbor';
            else cls += ' dim';
            return `<span class="${cls}">${escapeHtml(w.word)}</span>`;
          })
          .join('');
        const fontSizes = computeBrowseFontSizes(
          row.words.map((word) => word.word),
          isTarget
        );
        return `<div class="browse-row ${isTarget ? 'browse-row-target' : 'browse-row-context'}" style="opacity:${opacity}; --browse-base-size:${fontSizes.base}px; --browse-highlight-size:${fontSizes.highlight}px; --browse-dim-size:${fontSizes.dim}px; --browse-neighbor-size:${fontSizes.neighbor}px;">${wordsHtml}</div>`;
      })
      .join('');
    this.browseLayerEl.innerHTML = html;
  }

  // ---- Speed badge ----

  showSpeedBadge(multiplier: number): void {
    const rounded = Math.round(multiplier * 10) / 10;
    if (rounded === this.lastRenderedSpeed) {
      this.speedBadgeEl.classList.add('show');
      return;
    }
    this.lastRenderedSpeed = rounded;
    this.speedBadgeEl.textContent = `x${rounded.toFixed(1)}`;
    this.speedBadgeEl.classList.add('show');
  }

  hideSpeedBadge(): void {
    this.speedBadgeEl.classList.remove('show');
    this.lastRenderedSpeed = -1;
  }

  // ---- Resume countdown ----

  showResumeCountdown(remainingSeconds: number): void {
    this.hideBookIntro();
    this.hideStartHint();
    this.hidePageIndicator();
    this.clearCenterWord();
    this.setCenterWordVisible(false);
    this.setBrowseVisible(false);
    this.resumeCountdownEl.textContent = String(remainingSeconds);
    this.resumeCountdownEl.classList.add('show');
    this.syncPeripheralChromeState();
  }

  hideResumeCountdown(): void {
    this.resumeCountdownEl.classList.remove('show');
    this.syncPeripheralChromeState();
  }

  // ---- Menu ----

  setMenuVisible(visible: boolean): void {
    this.menuBtnEl.classList.toggle('visible', visible);
  }

  onPageChipClick(handler: () => void): void {
    this.pageChipEl.addEventListener('click', handler);
  }

  onPageSheetClose(handler: () => void): void {
    this.pageSheetBackdropEl.addEventListener('click', handler);
    this.pageSheetCloseEl.addEventListener('click', handler);
  }

  onPageSheetSelect(handler: (pageIndex: number) => void): void {
    const selectFromTarget = (target: EventTarget | null): number | null => {
      const card = (target as HTMLElement | null)?.closest<HTMLElement>('.page-sheet-card');
      if (!card) return null;
      const pageIndex = Number.parseInt(card.dataset['pageIndex'] ?? '', 10);
      return Number.isNaN(pageIndex) ? null : pageIndex;
    };

    this.pageSheetListEl.addEventListener('click', (event) => {
      const pageIndex = selectFromTarget(event.target);
      if (pageIndex === null) return;
      handler(pageIndex);
    });

    this.pageSheetListEl.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const pageIndex = selectFromTarget(event.target);
      if (pageIndex === null) return;
      event.preventDefault();
      handler(pageIndex);
    });
  }

  private syncLocalizedCopy(): void {
    if (this.startHintMode === 'idle') {
      this.showIdleHint(this.idleBookMeta ?? undefined);
    } else if (this.startHintMode === 'paused') {
      this.startHintEl.innerHTML = this.i18n.t('pausedHint');
      this.startHintEl.classList.remove('hidden');
    } else if (this.startHintMode === 'finished') {
      this.lastCenterWord = this.i18n.t('finishedWord');
      this.lastCenterWordTranslation = '';
      this.centerWordEl.textContent = this.i18n.t('finishedWord');
      this.syncCenterWordTranslation();
      this.startHintEl.innerHTML = this.i18n.format('finishedHint', { elapsed: this.lastElapsedLabel });
      this.startHintEl.classList.remove('hidden');
    }
    if (this.lastCompletionSummary) {
      this.showCompletionSummary(this.lastCompletionSummary);
    }
    if (this.lastPageIndicator !== null) {
      this.pageIndicatorEl.innerHTML = this.i18n.format('pageLabel', { page: String(this.lastPageIndicator + 1) });
    }
    if (this.bookIntroVisible) {
      this.showBookIntro(this.idleBookMeta ?? undefined);
    }
    if (this.lastPageChip) {
      this.showPageChip(this.lastPageChip.pageIndex, this.lastPageChip.totalPages);
    }
    this.pageSheetTitleEl.textContent = this.i18n.t('pagesTitle');
    this.pageSheetCopyEl.textContent = this.i18n.t('pagesIntro');
    this.pageSheetBackdropEl.setAttribute('aria-label', this.i18n.t('closePages'));
    this.pageSheetCloseEl.setAttribute('aria-label', this.i18n.t('closePages'));
    if (this.lastPageSheet) {
      this.renderPageSheet(this.lastPageSheet.pages, this.lastPageSheet.currentPageIndex);
    }
    if (this.onboardingVisible) {
      this.renderOnboardingStep();
    }
  }

  private syncCenterWordTranslation(): void {
    const isCenterWordHidden = this.centerWordEl.classList.contains('hidden');
    const translation = this.inlineTranslationEnabled ? this.lastCenterWordTranslation : '';
    const visible =
      !isCenterWordHidden &&
      this.lastCenterWord.length > 0 &&
      translation.length > 0;

    this.centerWordTranslationEl.textContent = visible ? translation : '';
    if (this.translationLocale) {
      this.centerWordTranslationEl.dataset['locale'] = this.translationLocale;
    } else {
      delete this.centerWordTranslationEl.dataset['locale'];
    }
    this.centerWordTranslationEl.classList.toggle('hidden', !visible);
  }

  private syncPeripheralChromeState(): void {
    const completionVisible = !this.completionPanelEl.classList.contains('hidden');
    const resumeCountdownVisible = this.resumeCountdownEl.classList.contains('show');
    const pageSheetOpen = this.pageSheetEl.classList.contains('open');
    const centerWordVisible = !this.centerWordEl.classList.contains('hidden') && this.lastCenterWord.length > 0;
    const shouldDim =
      this.startHintMode === 'hidden' &&
      !this.bookIntroVisible &&
      !completionVisible &&
      !resumeCountdownVisible &&
      !pageSheetOpen &&
      !this.onboardingVisible &&
      centerWordVisible;

    this.appEl.classList.toggle('reading-ui-dim', shouldDim);
  }

  private wireOnboarding(): void {
    this.onboardingPrevEl.addEventListener('click', () => {
      if (!this.onboardingVisible || this.onboardingStepIndex === 0) return;
      this.onboardingStepIndex -= 1;
      this.renderOnboardingStep();
    });

    this.onboardingNextEl.addEventListener('click', () => {
      if (!this.onboardingVisible) return;
      if (this.onboardingStepIndex >= this.getOnboardingSteps().length - 1) {
        this.hideOnboarding(true);
        return;
      }
      this.onboardingStepIndex += 1;
      this.renderOnboardingStep();
    });

    this.onboardingSkipEl.addEventListener('click', () => this.hideOnboarding(true));
    this.onboardingTourEl.addEventListener('keydown', (event) => {
      if (!(event instanceof KeyboardEvent) || !this.onboardingVisible) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        this.hideOnboarding(true);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.onboardingNextEl.click();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.onboardingPrevEl.click();
      }
    });
  }

  private renderOnboardingStep(): void {
    const steps = this.getOnboardingSteps();
    const fallbackStep = steps[0];
    if (!fallbackStep) return;
    const step = steps[this.onboardingStepIndex] ?? fallbackStep;
    const isLastStep = this.onboardingStepIndex === steps.length - 1;

    this.onboardingKickerEl.textContent = this.i18n.t('onboardingKicker');
    this.onboardingStepCounterEl.textContent = this.i18n.format('onboardingStepCounter', {
      current: String(this.onboardingStepIndex + 1).padStart(2, '0'),
      total: String(steps.length).padStart(2, '0'),
    });
    this.onboardingTitleEl.textContent = step.title;
    this.onboardingCopyEl.textContent = step.copy;
    this.onboardingSkipEl.textContent = this.i18n.t('onboardingSkip');
    this.onboardingPrevEl.textContent = this.i18n.t('onboardingBack');
    this.onboardingNextEl.textContent = isLastStep ? this.i18n.t('onboardingFinish') : this.i18n.t('onboardingNext');
    this.onboardingPrevEl.disabled = this.onboardingStepIndex === 0;
    this.onboardingDemoEl.dataset['step'] = step.id;
    this.onboardingDemoEl.innerHTML = this.renderOnboardingDemo(step.id);
    this.onboardingPointsEl.innerHTML = step.points
      .map((point) => `<span class="onboarding-point">${escapeHtml(point)}</span>`)
      .join('');
    this.onboardingProgressEl.innerHTML = steps
      .map(
        (_step, index) =>
          `<span class="onboarding-progress-dot${index === this.onboardingStepIndex ? ' active' : ''}"></span>`
      )
      .join('');
  }

  private getOnboardingSteps(): Array<{ id: OnboardingStepId; title: string; copy: string; points: string[] }> {
    return [
      {
        id: 'focus',
        title: this.i18n.t('onboardingFocusTitle'),
        copy: this.i18n.t('onboardingFocusCopy'),
        points: [this.i18n.t('onboardingFocusPointOne'), this.i18n.t('onboardingFocusPointTwo')],
      },
      {
        id: 'pace',
        title: this.i18n.t('onboardingPaceTitle'),
        copy: this.i18n.t('onboardingPaceCopy'),
        points: [this.i18n.t('onboardingPacePointOne'), this.i18n.t('onboardingPacePointTwo')],
      },
      {
        id: 'browse',
        title: this.i18n.t('onboardingBrowseTitle'),
        copy: this.i18n.t('onboardingBrowseCopy'),
        points: [this.i18n.t('onboardingBrowsePointOne'), this.i18n.t('onboardingBrowsePointTwo')],
      },
      {
        id: 'settings',
        title: this.i18n.t('onboardingSettingsTitle'),
        copy: this.i18n.t('onboardingSettingsCopy'),
        points: [this.i18n.t('onboardingSettingsPointOne'), this.i18n.t('onboardingSettingsPointTwo')],
      },
    ];
  }

  private renderOnboardingDemo(stepId: OnboardingStepId): string {
    const demoHand = this.renderOnboardingHand();
    switch (stepId) {
      case 'pace':
        return `
          <div class="tour-demo-card tour-demo-pace">
            <div class="tour-demo-chip">x1.0</div>
            <div class="tour-demo-meter">
              <span>${escapeHtml(this.i18n.t('onboardingDemoSlow'))}</span>
              <div class="tour-demo-track"><span class="tour-demo-track-fill"></span></div>
              <span>${escapeHtml(this.i18n.t('onboardingDemoFast'))}</span>
            </div>
            <div class="tour-demo-gesture tour-demo-gesture-horizontal">
              <span class="tour-demo-gesture-line"></span>
              ${demoHand}
            </div>
          </div>`;
      case 'browse':
        return `
          <div class="tour-demo-card tour-demo-browse">
            <div class="tour-demo-line subdued">${escapeHtml(this.i18n.t('onboardingDemoBrowseBefore'))}</div>
            <div class="tour-demo-line focus">${escapeHtml(this.i18n.t('onboardingDemoBrowseCenter'))}</div>
            <div class="tour-demo-line subdued">${escapeHtml(this.i18n.t('onboardingDemoBrowseAfter'))}</div>
            <div class="tour-demo-gesture tour-demo-gesture-vertical">
              <span class="tour-demo-gesture-line"></span>
              ${demoHand}
            </div>
          </div>`;
      case 'settings':
        return `
          <div class="tour-demo-card tour-demo-settings">
            <div class="tour-demo-toggle-row">
              <span class="tour-demo-toggle-label">${escapeHtml(this.i18n.t('onboardingDemoTranslate'))}</span>
              <span class="tour-demo-toggle"><span></span></span>
            </div>
            <div class="tour-demo-word-count">
              <span class="tour-demo-word-pill">1</span>
              <span class="tour-demo-word-pill active">2</span>
              <span class="tour-demo-word-pill">3</span>
            </div>
            <div class="tour-demo-preview">
              <span class="tour-demo-preview-word">${escapeHtml(this.i18n.t('onboardingDemoPreviewWord'))}</span>
              <span class="tour-demo-preview-translation">${escapeHtml(this.i18n.t('onboardingDemoPreviewTranslation'))}</span>
            </div>
          </div>`;
      case 'focus':
      default:
        return `
          <div class="tour-demo-card tour-demo-focus">
            <div class="tour-demo-word-row">
              <span class="tour-demo-word-muted">${escapeHtml(this.i18n.t('onboardingDemoFocusBefore'))}</span>
              <span class="tour-demo-word-main">${escapeHtml(this.i18n.t('onboardingDemoFocusCenter'))}</span>
              <span class="tour-demo-word-muted">${escapeHtml(this.i18n.t('onboardingDemoFocusAfter'))}</span>
            </div>
            <div class="tour-demo-tap-callout">${escapeHtml(this.i18n.t('onboardingDemoTap'))}</div>
            <div class="tour-demo-gesture tour-demo-gesture-tap">
              <span class="tour-demo-ripple"></span>
              ${demoHand}
            </div>
          </div>`;
    }
  }

  private renderOnboardingHand(): string {
    return `
      <span class="tour-demo-hand" aria-hidden="true">
        <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M42 8C42 4.1 45.1 1 49 1C52.9 1 56 4.1 56 8V43H60C64.4 43 68 46.6 68 51V72C68 91.3 52.3 107 33 107H31C18.3 107 8 96.7 8 84V54C8 49.6 11.6 46 16 46C20.4 46 24 49.6 24 54V31C24 27.1 27.1 24 31 24C34.9 24 38 27.1 38 31V50H42V8Z"
            fill="rgba(245,247,251,0.94)"
            stroke="rgba(255,255,255,0.36)"
            stroke-width="2"
          />
          <path
            d="M24 53V38C24 34.1 27.1 31 31 31C34.9 31 38 34.1 38 38V50"
            stroke="rgba(10,17,28,0.14)"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </span>`;
  }
}

function renderCompletionStat(label: string, valueHtml: string, tone: 'primary' | 'accent' | 'muted'): string {
  return `
    <article class="completion-stat-card completion-stat-card-${tone}">
      <span class="completion-stat-label">${escapeHtml(label)}</span>
      <strong class="completion-stat-value">${valueHtml}</strong>
    </article>`;
}

function renderMetricValue(value: string, options?: { unit?: string; tooltip?: string }): string {
  const escapedValue = escapeHtml(value);
  if (!options?.unit) return escapedValue;

  const escapedUnit = escapeHtml(options.unit);
  if (!options.tooltip) {
    return `${escapedValue} <span class="metric-unit">${escapedUnit}</span>`;
  }

  const escapedTooltip = escapeHtml(options.tooltip);
  return `${escapedValue} <span class="metric-unit metric-unit-help" tabindex="0" title="${escapedTooltip}" aria-label="${escapedTooltip}">${escapedUnit}</span>`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeWordList(value?: string | readonly string[] | null): string[] {
  if (Array.isArray(value)) {
    return value.map((word) => word.trim()).filter((word) => word.length > 0);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }
  return [];
}

function computeCenterWordFontSize(words: readonly string[]): number {
  const count = Math.max(1, words.length);
  const joinedLength = words.join(' ').length;
  const base = count === 1 ? 44 : count === 2 ? 38 : 34;
  const threshold = count === 1 ? 12 : count === 2 ? 18 : 24;
  const penalty = Math.max(0, joinedLength - threshold) * 0.52;
  const availableWidth = Math.min(window.innerWidth * 0.9, 980);
  const widthFit = availableWidth / Math.max(1, joinedLength * 0.56);
  return clamp(Math.round(Math.min(base - penalty, widthFit)), 20, 44);
}

function computeCenterTranslationFontSize(centerFontSize: number, translation: string): number {
  const ideal = centerFontSize * 0.42;
  const penalty = Math.max(0, translation.length - 22) * 0.12;
  const availableWidth = Math.min(window.innerWidth * 0.86, 740);
  const widthFit = availableWidth / Math.max(1, translation.length * 0.58);
  return clamp(Math.round(Math.min(ideal - penalty, widthFit)), 12, 18);
}

function computeBrowseFontSizes(words: readonly string[], isTarget: boolean): { base: number; highlight: number; dim: number; neighbor: number } {
  const joinedLength = words.join(' ').length;
  const availableWidth = Math.min(window.innerWidth * 0.92, 980);

  if (isTarget) {
    const count = Math.max(1, words.length);
    const baseHighlight = count === 1 ? 44 : count === 2 ? 38 : 34;
    const threshold = count === 1 ? 12 : count === 2 ? 18 : 24;
    const penalty = Math.max(0, joinedLength - threshold) * 0.44;
    const widthFit = availableWidth / Math.max(1, joinedLength * 0.56);
    const highlight = clamp(Math.round(Math.min(baseHighlight - penalty, widthFit)), 20, 44);
    return {
      highlight,
      neighbor: clamp(Math.round(highlight * 0.62), 18, 24),
      dim: clamp(Math.round(highlight * 0.5), 16, 20),
      base: clamp(Math.round(highlight * 0.48), 15, 18),
    };
  }

  const widthFit = availableWidth / Math.max(1, joinedLength * 0.6);
  const dim = clamp(Math.round(Math.min(20 - Math.max(0, joinedLength - 26) * 0.2, widthFit)), 13, 20);
  return {
    highlight: clamp(dim + 12, 24, 34),
    neighbor: clamp(dim + 3, 17, 22),
    dim,
    base: clamp(dim - 1, 14, 18),
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function readOnboardingSeen(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}
