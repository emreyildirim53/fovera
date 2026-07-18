/**
 * States for the top-level reading/gesture state machine. The gesture
 * controller is the only thing allowed to transition between these; every
 * other module reacts to state changes via `ReaderEngine`'s subscription API.
 */
export enum ReaderState {
  /** Nothing loaded/started yet; showing the "tap to begin" hint. */
  Idle = 'idle',
  /** Auto-advancing through words at the current speed. */
  Playing = 'playing',
  /** Pointer is down and stationary past the hold threshold; word is paused, axis not yet decided. */
  Holding = 'holding',
  /** Pointer is dragging but hasn't crossed the threshold that commits to an axis yet. */
  AxisUndecided = 'axisUndecided',
  /** Committed to a horizontal drag: live speed adjustment. */
  HorizontalAdjust = 'horizontalAdjust',
  /** Committed to a vertical drag: browsing word-by-word around the anchor. */
  VerticalBrowse = 'verticalBrowse',
  /** Gesture released while browsing; animating the candidate word into the anchor. */
  Snap = 'snap',
  /** Post-browse countdown (3-2-1) before playback resumes. */
  ResumeDelay = 'resumeDelay',
}

/** Discriminates the committed drag axis once the threshold has been crossed. Locked for the gesture's lifetime. */
export type GestureAxis = 'horizontal' | 'vertical' | null;
