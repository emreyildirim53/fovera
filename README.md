# Fovera

The new era of focused reading.

A center-anchored, gesture-driven reader built around the sharpest point of
your vision. The active word stays locked to the middle of the screen; every
other interaction moves around that focus.

## Setup

```bash
npm install
npm run dev       # local dev server
npm run build     # production build -> dist/
npm run preview   # serve the production build locally
npm run typecheck # strict TS check, no emit
```

The build is a PWA (installable, offline-capable via a generated service
worker) courtesy of `vite-plugin-pwa`.

## Architecture

```
src/
  core/           Parser, TimerManager, shared types — no DOM, no timers-as-side-effects beyond TimerManager itself
  engine/         ReaderEngine (position/navigation), PlaybackEngine (auto-advance), GestureController (pointer state machine)
  render/         RenderLayer — the only module allowed to touch reader-screen DOM
  state/          ReaderState enum + tiny observable AppState store
  library/        BookLibrary (catalog + localStorage), LibraryUI (drawer/modal wiring), presetBooks data
  utils/          RafScheduler, dom/format helpers
  styles/         main.css
```

### Gesture state machine

`Idle → Playing → Holding → AxisUndecided → {HorizontalAdjust | VerticalBrowse} → Snap → ResumeDelay → Playing`

- Single Pointer Events implementation (`setPointerCapture`/`pointercancel`) — one code path for touch, pen, mouse, and trackpad.
- `pointermove` never touches the DOM; it only caches the latest pointer delta. All rendering happens in `RafScheduler`'s single per-frame callback.
- The drag axis locks the first time the 12px threshold is crossed and never changes for the rest of the gesture.
- Vertical browsing moves word-by-word (continuous, ~36px per word) and shows a 3-word window (previous / candidate / next) aligned to the fixed anchor — never the sentence midpoint.
- Releasing a browse commits the candidate word, cross-fades the browse layer out over 150ms (within the 120–180ms spec), then runs a 3-2-1 resume countdown that never touches the anchor's position.

### Accessibility

- `Space` play/pause, `↑/↓` step one word, `←/→` nudge speed — full keyboard parity with the pointer gestures.
- Respects `prefers-reduced-motion` (word-transition and snap animations are skipped).
- `aria-live` on the center word, proper roles/labels on the library drawer and add-book dialog.

### Adding books

Use the library drawer (top-left button) → "My Books" → "Add Book" to paste
text or upload a `.txt` file. Custom books persist in `localStorage`. Paste
`---PAGE---` on its own line to mark page breaks; otherwise blank lines
separate paragraphs.
