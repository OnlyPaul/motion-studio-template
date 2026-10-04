# Motion Studio Template

Films here are programs. `index.html` paints any moment on demand through `window.seek(t)`;
`render.mjs` walks time in headless Chromium and pipes frames to ffmpeg. This engine (route A)
is the default. Use HyperFrames or Remotion only when the brief names one.

## Map

| Path | What |
|---|---|
| `index.html` | The film: one `film({...})` call with scenes and cues. Currently a pipeline smoke test. |
| `lib/motion.js` | `spring`, `track`, `trackColor`, `stretch`, `swap`, `progress`, `rand`, `noise`, `SPRING` presets |
| `lib/stage.js` | Formats + layout `L`, beat grid `grid`, font loading, `window.seek`, live preview |
| `lib/draw.js` | `font`, `fitSize`, `glyphs` (per-letter layout), `rrect` |
| `examples/webgl-three.html` | Working WebGL layer: three.js under 2D type, seamless loop |
| `render.mjs` | Video, stills + contact sheet, posters, all formats, parallel workers |
| `scripts/` | `check`, `review`, `beatgrid`, `beats.py`, `sfx`, `mix`, `serve` |
| `refs/` | The brief's reference media (not committed) and `frames/`; `README.md` says how to study them. Take the grammar, never the content. |
| `assets/` | Real product screenshots, logos, `fonts/`. Never redraw product UI from memory. |
| `audio/track.wav` | Supplied music, used unchanged. Absent = synthesize the score in code. |
| `docs/` | `brief.md` (from `/director-brief`), `style_guide.md`, `shotlist.md`, `review_log.md`, `ANIMATION_GUIDE.md` (shapes in `docs/_templates/`), `presets/`, `webgl-techniques.md` |
| `prompts/` | Brief templates (tiers 1–4), critique pass, long-run lines |
| `out/` | Isolated builds and manifests. Never hand-edit. |

## Commands

```bash
npm run check                          # all three formats; boundary and seeded samples
npm test                               # harness regressions (Chromium + ffmpeg)
node render.mjs --film launch --stills mid
node scripts/sfx.mjs --manifest <build>/manifest.json
node scripts/mix.mjs --manifest <build>/manifest.json --audio <build>/sfx.wav,audio/track.wav
node scripts/review.mjs --manifest <build>/manifest.json --at 4.2 --loop
```

The full command table is in `README.md`.

## Render contract

- A frame is a pure function of time. `seek(t)` paints frame t from nothing. The stage calls
  `ctx.reset()` before every frame; nothing survives between frames, so don't rely on it.
- In film code: no `Math.random`, `Date`, `performance.now`, timers, `requestAnimationFrame`,
  CSS transitions/animations, Web Animations or `will-change`. Use `rand(seed, i)` and
  `noise(x, seed)`. The preview loop in `lib/stage.js` is the only exception.
- Everything that changes is derived from `t`, the beat grid or seeded noise. DOM/SVG layers
  inside `#stage` are fine if `seek` sets them too.
- WebGL is allowed: `film({ webgl: true })` adds a WebGL2 layer under the 2D canvas (2D type
  stays crisp on top). Build shaders, buffers or a three.js scene once in the scenes builder
  (`scenes: (grid, L, { gl, canvas }) => ...`); every frame sets uniforms, transforms and camera
  from `t`. three.js: `new WebGLRenderer({ canvas, context: gl })`, `autoClear = false` (the
  stage clears to `background`), `renderer.resetState()` before `render`, animation via
  `mixer.setTime(t)`, never `Clock`/`getDelta`. Import it through an import map from
  `/node_modules/three/` (see the example), not a CDN. Headless renders on SwiftShader (CPU):
  deterministic, but heavy shaders are slow, so check render time on the stills first.
- Webfonts go in `assets/fonts/` and are declared in `film({ fonts })`. An undeclared webfont
  falls back silently to a system face.
- `npm run check` passes before any render you show me.

## Creative direction

Technical requirements above are mandatory. Creative choices belong to each film's
`docs/style_guide.md`. Start from the brief's references if it has any, otherwise `docs/presets/house-motion.md`;
`docs/presets/product-motion.md` is an alternative when the brief wants that look.
Choose the motion language (springs, curves, linear, stepped or mixed), pacing, palette,
transitions, relationship to music and film-specific exclusions explicitly. Record overrides
with their purpose. A different style does not need permission when it serves the brief.

Keep product representations accurate and use supplied assets. Load declared fonts and assets
before drawing. Picture and sound share timing metadata; cuts need not fall on beats when the
creative direction calls for anticipation, pauses or syncopation.

## Builds and audio

Every render creates a fresh `out/<film>/<build>/` and prints its `manifest.json` path; `--out`
is relative to that build. Pass `--manifest <path>` to SFX, mix and review, and select audio
explicitly with mix's `--audio`. Never choose downstream inputs by file existence or
modification time. For format-dependent cues, generate and select audio per format.

## Gates

Work in this order and show me each artefact before starting the next:

1. `docs/style_guide.md` (from the reference, if there is one) and `docs/shotlist.md` on the beat grid. If `docs/brief.md` exists, both follow it.
2. Stills: `node render.mjs --stills mid`. Critique.
3. Animatic: `npm run animatic`, then SFX and mix using its manifest (explicit audio selection). Fix pacing with playback and listening.
4. Full animation, polish and sound. Render a fresh build, then mix using its manifest.
5. Deliver links to final video, contact sheet, poster, manifest and loop playback if applicable. These may come from separate identified builds. Report remaining defects and unverified assessments.

If the brief says the run is unattended, don't stop at gates: log assumptions in
`docs/review_log.md` and keep going.

## Critique loop

Stills show composition, playback shows motion, the mixed video shows sound and sync. Sheets
alone cannot verify motion or sound: record any review you couldn't do as **unverified**, never
as a pass. Up to three revision passes per gate; log defects in `docs/review_log.md`. Method and
log format: `prompts/critique-pass.md` and `/critique-pass`.

## Working style

- Written docs are as long as their content needs: no restated brief, filler sections or summaries.
- Do what was asked at the scope intended. Check in only when readings would lead to materially different work.
- Subagents only for large independent tracks (one chapter per agent), never to check your own
  work. Write `docs/ANIMATION_GUIDE.md` before spawning any.
- Long runs: status notes go in the same message as the next tool call. Don't offer to wait;
  stop only when nothing can move without me.
- API keys live in `.env` (names in `.env.example`). Read them by name; never print them.
