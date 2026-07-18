/**
 * TimerManager centralizes every `setTimeout`/`setInterval` used across the
 * app (word advance, resume countdown, auto-scroll-while-browsing, hold
 * delay) so nothing can leak: a single `cancelAll()` guarantees a clean
 * slate on every state transition and on teardown.
 */
export type TimerName = 'wordAdvance' | 'resumeCountdown' | 'holdDelay' | 'speedBadgeHide' | 'elapsedTick' | 'snap' | 'browseGrace';

interface TimerHandle {
  id: ReturnType<typeof setTimeout>;
  kind: 'timeout' | 'interval';
}

export class TimerManager {
  private timers = new Map<TimerName, TimerHandle>();

  /** Schedules a one-shot timer under `name`, replacing any existing timer with that name. */
  setTimeout(name: TimerName, callback: () => void, delayMs: number): void {
    this.cancel(name);
    const id = setTimeout(() => {
      this.timers.delete(name);
      callback();
    }, delayMs);
    this.timers.set(name, { id, kind: 'timeout' });
  }

  /** Schedules a repeating timer under `name`, replacing any existing timer with that name. */
  setInterval(name: TimerName, callback: () => void, intervalMs: number): void {
    this.cancel(name);
    const id = setInterval(callback, intervalMs);
    this.timers.set(name, { id, kind: 'interval' });
  }

  /** Cancels the timer registered under `name`, if any. Safe to call redundantly. */
  cancel(name: TimerName): void {
    const handle = this.timers.get(name);
    if (!handle) return;
    if (handle.kind === 'timeout') clearTimeout(handle.id);
    else clearInterval(handle.id);
    this.timers.delete(name);
  }

  /** True if a timer is currently pending under `name`. */
  isActive(name: TimerName): boolean {
    return this.timers.has(name);
  }

  /** Cancels every currently registered timer. Call on state transitions and teardown. */
  cancelAll(): void {
    for (const name of this.timers.keys()) this.cancel(name);
  }
}
