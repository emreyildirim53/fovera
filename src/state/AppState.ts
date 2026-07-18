import { ReaderState } from './ReaderState';

export interface AppStateSnapshot {
  readerState: ReaderState;
  currentWordIndex: number;
  currentSentenceIndex: number;
  speedMultiplier: number;
  elapsedMs: number;
}

type Listener = (snapshot: Readonly<AppStateSnapshot>) => void;

/**
 * Minimal observable state container. Deliberately not a full framework:
 * the app has one reader screen, so a single store with a small listener
 * list is enough and keeps the bundle tiny.
 */
export class AppState {
  private snapshot: AppStateSnapshot = {
    readerState: ReaderState.Idle,
    currentWordIndex: 0,
    currentSentenceIndex: 0,
    speedMultiplier: 1.0,
    elapsedMs: 0,
  };

  private listeners = new Set<Listener>();

  get(): Readonly<AppStateSnapshot> {
    return this.snapshot;
  }

  update(patch: Partial<AppStateSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener(this.snapshot);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
