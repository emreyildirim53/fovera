import { TimerManager } from '../core/TimerManager';
import type { ReaderEngine } from './ReaderEngine';

export interface PlaybackCallbacks {
  onWordShown: (animate: boolean) => void;
  onPageBoundary: (nextPageIndex: number, continuePlayback: () => void) => void;
  onFinished: () => void;
}

const MIN_SPEED = 0.2;
const MAX_SPEED = 6.0;

/**
 * Drives `ReaderEngine.advance()` forward over time using per-word delays
 * scaled by the live speed multiplier. All scheduling goes through the
 * shared `TimerManager` so play/pause/browse transitions can't leak timers.
 */
export class PlaybackEngine {
  private speedMultiplier = 1.0;
  private playing = false;

  constructor(
    private readonly reader: ReaderEngine,
    private readonly timers: TimerManager,
    private readonly callbacks: PlaybackCallbacks
  ) {}

  get speed(): number {
    return this.speedMultiplier;
  }

  setSpeed(multiplier: number): void {
    this.speedMultiplier = Math.max(MIN_SPEED, Math.min(MAX_SPEED, multiplier));
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  /** Starts (or resumes) auto-advance, showing the current word immediately. */
  start(animateFirstWord: boolean): void {
    this.playing = true;
    this.callbacks.onWordShown(animateFirstWord);
    this.scheduleNext();
  }

  /** Stops auto-advance without moving the reading position. */
  pause(): void {
    this.playing = false;
    this.timers.cancel('wordAdvance');
  }

  private scheduleNext(): void {
    if (!this.playing) return;
    if (this.reader.isAtEnd) {
      this.playing = false;
      this.callbacks.onFinished();
      return;
    }
    const current = this.reader.currentWord;
    const next = this.reader.nextWord;
    if (current && next && next.pageIndex !== current.pageIndex) {
      this.playing = false;
      this.callbacks.onPageBoundary(next.pageIndex, () => {
        this.playing = true;
        this.reader.advance();
        this.callbacks.onWordShown(false);
        this.scheduleNext();
      });
      return;
    }
    const baseDelay = current?.readingDelay ?? 200;
    const delay = baseDelay / this.speedMultiplier;

    this.timers.setTimeout(
      'wordAdvance',
      () => {
        if (!this.playing) return;
        this.reader.advance();
        this.callbacks.onWordShown(true);
        this.scheduleNext();
      },
      delay
    );
  }
}
