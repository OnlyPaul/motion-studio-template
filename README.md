# Motion Studio Template

A small harness for making code-rendered motion graphics with an agent. One HTML file paints
any moment through `window.seek(t)`; Chromium captures frames and ffmpeg encodes video.
Pure time-based drawing supports scrubbing, partial renders and parallel workers. Sampled
checks catch common violations; they do not prove visual quality or cross-machine identity.

## Setup

Requires Node 22+, ffmpeg (including ffprobe) and Python 3.

```bash
npm run setup
```

Playwright and three.js are pinned in `package.json`. The Python environment supplies beat
measurement. The default engine is this repo's `film()` API; use other frameworks when the
brief calls for them. Agent instructions are in `CLAUDE.md`.

## First build

```bash
npm run check
node render.mjs --film smoke
```

The renderer prints an absolute manifest path under `out/smoke/<unique-build>/manifest.json`.
Copy that path into the downstream commands. For example, replacing the placeholders:

```bash
node scripts/sfx.mjs --manifest <build>/manifest.json
node scripts/mix.mjs --manifest <build>/manifest.json --audio <build>/sfx.wav
node scripts/review.mjs --manifest <build>/manifest.json --at 1.2
```

Open the final video and review sheets listed in the manifest. Mixing never discovers audio
by scanning a directory. Include supplied music or a generated score explicitly:
`--audio audio/track.wav,<build>/sfx.wav`. A later mix without `--audio` reuses and verifies the
selection recorded in that manifest. A changed or missing selected file fails the mix.

## Build isolation

Every render invocation creates a fresh `out/<film>/<build>/` directory, including stills,
posters and partial renders. `--film` names the film; it defaults to the entry filename.
`--out` is a filename or subdirectory **inside the new build**, not a global output path.

The manifest records source/asset hashes, render settings, output paths per format and build
status. Every format writes a cue file, even with zero cues. Only completed builds can feed
SFX, mixing or review. Old loose files under `out/` are ignored and can be retained as archives.
The manifest tracks provenance; it is not a source archive or a guarantee of reproducibility
on another machine. Keep the source and pinned runtime alongside it.

`--format all` renders all three layouts. Downstream SFX/review use `--format 9x16`, `1x1` or
`16x9`; mixing also accepts `--format all` when all formats share the same audio. For cues that
vary by format, generate separate SFX filenames and mix each format with its matching audio.
Partial video builds are for visual comparisons; mixing requires a full-length render.

## Commands

| Command | Result |
|---|---|
| `npm run preview` | Preview at localhost:5173; space plays, arrows step, shift+arrows step beats |
| `npm run check` | Three layouts, scene-boundary and seeded samples, fonts, runtime errors, loop diagnostic |
| `node scripts/check.mjs --format 9x16` | Check only that requested layout; comma-separated lists also work |
| `npm test` | Browser, rendering and build-isolation regressions |
| `npm run stills` | Beat-midpoint stills and contact sheet in a fresh build |
| `npm run animatic` | 30 fps, no blur, half-size video in a fresh build |
| `npm run render` / `render:all` | Full-resolution video, parallel workers, motion blur |
| `node render.mjs --from 4 --to 6` | Partial video for before/after comparison |
| `node render.mjs --at 1.2 --out poster.png` | Poster in its own build |
| `npm run beats:grid -- --bpm 120 --bars 8` | Generate beats.json |
| `npm run beats:measure` | Measure audio/track.wav |
| `npm run sfx -- --manifest <path>` | Synthesize that build's cues; empty cues produce silence |
| `npm run mix -- --manifest <path> --audio <files>` | Mix selected tracks and mux final video |
| `npm run review -- --manifest <path> --at 4.2 --loop` | Contact/phone/strip sheets and twice-playing loop video |

Output names and manifest paths are printed. Review artifacts are under the build's
`review/<format>/` directory. A poster from a separate render retains its own manifest.

## Creative workflow

For a film where the idea matters, run `/director-brief` first. It interviews you about audience,
placement, the one line, references, must-show and must-avoid, then writes `docs/brief.md` with
an ordered list of moments. `/motion-reel` reads that brief and fits the moments to the beat grid.

Start with `docs/style_guide.md` and `docs/shotlist.md` using `docs/_templates/`. The style guide
chooses motion language, pacing, palette, transitions, musical relationship and exclusions.
`docs/presets/product-motion.md` is an optional product-film preset. Its springs, beat-aligned
cuts and visual restrictions are creative defaults, explicitly overridable per film.

Proceed through stills → animatic with sound → full render and mix. At each gate:

- Inspect stills for composition, brand accuracy and readability.
- Play video to assess motion, hook, pacing and loop continuity.
- Listen to the mix to assess sound and synchronization.
- Log timestamped defects, severity, intended corrections and before/after evidence in
  `docs/review_log.md`. Mark unavailable assessments **unverified**.

Use up to three revision passes per gate, stopping earlier when meaningful observed defects
are resolved. At the budget limit, report remaining defects. There is no numerical self-score
threshold. After partial fixes, render and review the whole film again. See
`prompts/critique-pass.md`, `/critique-pass` and `/motion-reel`.

## Validation limits and tests

`film()` exposes scene boundaries in `window.FILM.boundaries`. The checker samples both sides
of each boundary and seeded additional timestamps, then compares forward and scrubbed renders
in separate pages. It checks all requested layouts. Missing assets, failed fonts and runtime
errors fail checks; page errors in any render worker also fail the render.

The loop diagnostic captures the last three and first three actual frames, including DOM and
WebGL. It flags a wrap jump much larger than neighboring changes and reports a change in pixel
motion magnitude. This is a heuristic: intentional seam cuts may trigger it, subtle or localized
motion defects may escape it, and it cannot prove velocity continuity. Inspect loop playback.

The regression suite includes scene transitions, DOM overlays, smooth and broken loops,
WebGL, font loading, empty cues, invalid timing, missing assets and secondary-worker failures.
It uses Chromium and ffmpeg. The font test uses a system TTF on macOS/Linux; set `TEST_FONT`
to an installed TTF path elsewhere. Temporary test font copies are removed after the test.

## Files

- `index.html`: film; `lib/stage.js`, `motion.js`, `draw.js`: stage and drawing helpers.
- `render.mjs`, `scripts/`: rendering, checks, beats, sound, mixing and review.
- `assets/`, `audio/`, `refs/`: real assets, supplied music and references (reference media isn't
  committed; `refs/README.md` says how to study it).
- `docs/presets/house-motion.md`: the default creative starting point.
- `docs/`, `prompts/`: direction, evidence logs and brief templates.
- `examples/webgl-three.html`: three.js plus 2D type. `docs/webgl-techniques.md`: 3D effect
  recipes and render costs.
- `tests/`: harness fixtures and regression suite.
- `out/`: generated builds; ignored by Git. Keys belong in `.env`, never output.
