# House motion preset

The default starting point for this studio's films. A film's `docs/style_guide.md` still makes
every creative choice and records overrides; this preset is what it starts from.
`product-motion.md` remains available for briefs that want that look.

## Rhythm

- One idea per beat. A new state every 0.5–1.3 s; a hold past 1.5 s needs a camera drift or a
  ticking element to stay alive.
- Chapters start on bar lines. Inside a chapter, state changes sit on beats. Word slams and
  montage cuts sit on 8th notes.
- Cuts may lead the beat by 65–70 ms (2 frames at 30 fps, 4 at 60). Set the lead once in the
  style guide and apply it everywhere: `t = grid.beat(i) - LEAD`.
- Frame 0 is already moving. Don't open on a title card or a fade from black.
- Numbered chapters (`01 — NAME`), two to eight of them, each with one technique or claim.

## Motion language

Mixed, chosen per job:

| Job | Motion | Engine |
|---|---|---|
| Containers, cards, camera framings | Spring, slight overshoot for UI, none for camera | `track(t, keys, SPRING.default / heavy)` |
| UI leading edges, toggles, pills, tabs | Stiff spring; leading edge first | `SPRING.snappy`, `stretch()` |
| Big type, logos, 3D objects | No overshoot | `SPRING.heavy` |
| Constant travel (glides, tunnels, marquees, LINEAR demos) | Linear | `progress()`, or `speed * t` |
| Counters | Decelerating approach that lands exactly | `clamp(1.15 * spring(...))` or an exponential approach that is clamped |
| Bounce, elastic | Only as a deliberate statement | `SPRING.playful` |
| Drift, handheld | Seeded noise | `noise(t * f, seed)` |

Fast motion is visible: render with subframe motion blur (`--sub 4`, the default). Where the look
calls for a stylised smear (dots stretched along velocity, horizontal word smears), draw it.

## Continuity and transitions

Inside a chapter, don't cut: one carrier element transforms and its content swaps
(`track()` geometry + `swap()` content, blurred out then in). Between chapters, use one of these:

| Transition | How |
|---|---|
| Hard cut with a ground-colour swap | Scene boundary on a beat; new `background` fill |
| Match cut (last element becomes the next first) | Share geometry across the boundary; overlapping scene ranges |
| Iris wipe with a chromatic fringe | Clip a growing circle; draw the edge ring three times offset in R, G, B with `lighter` |
| Pixel-mosaic dissolve | Grid of cells covering in `rand(seed, i)` order; switch scenes at full cover; uncover in a second order |
| Slice smear / glitch | Pre-render the text; draw horizontal strips offset by `rand(seed, strip) * (1 - p)²` under a blur |
| Text scramble exit | Swap glyphs for `rand(seed, floor(t * rate) + i)` characters, left to right |
| Zoom-through | Camera or scale rushes into one element that fills the frame, then cut |
| Blur-swap morph | `swap()` alpha + `g.filter = blur()` on the outgoing and incoming content |
| White flash | 2–4 frames of paper over everything at the convergence point |

## Type

Three voices, one family each:
- **Claim:** heavy grotesk, tight tracking (−2 to −4%), sentence case; caps only for one-word slams.
- **System:** mono, small, often tracked caps. Labels, code, figures, chrome, numbers.
- **Human:** italic serif, lowercase or sentence case, for the soft line (`humans.`, `motion designer`).

Entrances are per word or per glyph, never one opacity fade for a whole block. Pick one per film:
- **Blur-in:** alpha, `blur()` and a small horizontal offset ease to rest, staggered 30–40 ms per
  glyph.
- **Tint settle:** the word arrives in a pale accent tint and settles to ink (`trackColor`).
- **Rise from a baseline mask:** the glyph slides up inside a clip.
- **Width axis:** extended → normal per letter. Canvas 2D can't drive a variable font's
  `wdth` continuously; use a DOM text layer inside `#stage` with `font-variation-settings` set in
  `seek(t)`, or step through `g.fontStretch` keywords. Either way, the variable font goes in
  `assets/fonts/`.

Exits scramble, slice, or collapse into dots that become the next element. One keyword per line
may carry the accent colour.

## Chrome

Frame the picture with an instrument panel when the film suits it, all of it derived from `t`
and the grid:
- top-left: a wordmark block (name in bold, one or two mono lines under it);
- top-right: `NN — SECTION`, a progress row of ticks, `BAR 07.1 · 90 BPM · 16.52s`;
- bottom-left: a section caption or figure note; bottom-right: a URL or a signature;
- optional: corner crop marks, a timecode, a hairline progress bar in the accent, `FIG. 02 — …`
  labels in the accent mono.

Chrome text is small (≈1.05–1.3 u), so on a phone it becomes texture. It must never carry
information the film depends on.

## Numerals

Every number is honest and moves: decelerating count-ups that land exactly, odometers whose
digits roll late so the carry ripples up (each place rolls only in the last 15% before its digit
changes), stats on leader lines,
tabular mono for anything that ticks.

## Palette

Light grounds by default, one saturated accent at a time, pastels for relief:

| Family | Ground / ink | Accent | Relief |
|---|---|---|---|
| Editorial violet | `#FDFDFD` / `#08233E` | `#615AFD` | lavender `#DAD6FE`, mint `#CAEDDF`, peach `#FDDBC8` |
| Signal | `#F0EEE5`, `#0D0D10` | `#EE4938` | ultramarine `#2E2EF4`, lime `#E1FF44` as full-bleed grounds |
| Pastel / sand / blueprint | `#F3F5F9` / `#111114` | `#4C5DFD`, keyword pink `#FE6EAD` | pastel mesh, sand `#E9D4BB`, blueprint `#D8E1EB` |
| Product neutral | `#ECEDE8` / `#000000` | the product's own | one gradient (artwork only) |

Full-bleed accent frames are punctuation (≤1 s). Pastel gradient fields are grounds, never UI
chrome.

## Texture and depth

- Grain on dark and 3D chapters (≈3–7% amplitude), seeded by frame index so subframes agree.
- Chromatic fringe only on fast transitions and in the 3D post pass (≤0.4% radial split).
- 3D chapters get shadows, fog and depth of field; UI gets soft, size-aware drop shadows.
- WebGL is a set piece between flat chapters, not the whole film. Vocabulary, costs and
  determinism notes: `docs/webgl-techniques.md`.

## Product and assets

Real UI from `assets/` when a product is shown. Generic UI is fine for concepts that aren't a
specific product. The cursor can be the protagonist: oversized, eased paths, a press dips scale,
the camera follows it.

## Sound

Music at 90–130 BPM sets the grid. Measure a supplied track; otherwise synthesize on
`beatgrid`. SFX on `hits`, transitions and counters. Master to this repo's −14 LUFS / −1 dBTP
target.

## Overrides of `product-motion.md`

This preset allows several things `product-motion.md` bans:
- corner marks, HUD chrome and frame labels;
- numbered section labels (`01 — NAME`);
- cream, warm-grey and off-white grounds;
- pill buttons and pill controls when the UI calls for them;
- pastel gradient fields as grounds (not on UI chrome);
- one glowing keyword.

Still excluded: a fade up from black on frame 0, whole-block opacity fades, a generic easing
picked without reason, and redrawn product UI.
