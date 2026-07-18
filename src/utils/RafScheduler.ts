/**
 * Coalesces any number of `request()` calls within a single frame into one
 * `requestAnimationFrame` callback. This is what lets `pointermove` handlers
 * stay allocation-free and DOM-free: they just update a cached value and
 * call `request()`; the actual render happens at most once per frame.
 */
export class RafScheduler {
  private pending = false;
  private rafId: number | null = null;

  constructor(private readonly onFrame: () => void) {}

  /** Requests a render on the next animation frame. No-op if one is already pending. */
  request(): void {
    if (this.pending) return;
    this.pending = true;
    this.rafId = requestAnimationFrame(() => {
      this.pending = false;
      this.rafId = null;
      this.onFrame();
    });
  }

  /** Cancels a pending frame request, if any. */
  cancel(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.pending = false;
  }
}
