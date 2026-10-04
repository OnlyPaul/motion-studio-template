# Animation guide: [film]

Read this before writing any scene. Every chapter, and every subagent, codes to it.

- Engine: `film()` from `lib/stage.js`; scenes `{ from, to, draw(g, { t, T, p, L, grid }) }`.
  Chapter files live in `scenes/<chapter>.js` and export a function `(grid, L) => [scenes]`.
- Timing: scene bounds on `grid.bar(i)`; state changes on `grid.beat(i)`; never raw seconds
  unless a hit from `grid.hits`.
- Layout: only `L.u`, `L.pad`, `L.cx/cy`, `L.pick`. No fixed pixels.
- Palette constants: [INK, PAPER, ACCENT] from `[shared file]`. No new colours.
- Type: [display face] for headlines via `fitSize`; [UI face] for UI. Sizes in `L.u`.
- Motion: presets per element type: [table]. `track` for multi-target values, `swap` for content.
- Hand-off: chapter N's last frame matches chapter N+1's first frame: [what carries over].
- Cues: each chapter returns its cues; no cue within 60 ms of another of the same type.
- Done means: `npm run check` passes and observed defects are resolved with before/after evidence in `docs/review_log.md`; unavailable assessments are explicitly unverified.
