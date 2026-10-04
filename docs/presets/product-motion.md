# Product motion preset

Optional starting point for product films. The brief and per-film style guide override every creative choice here. Do not grow a global banned list.

## Motion defaults

- Prefer springs for this preset; curves are valid when the style guide calls for them. `SPRING.snappy` for UI and leading edges, `default` for
  containers and camera, `heavy` for big type and logos (no overshoot), `playful` for characters only.
- A value with several targets is `track()`, one spring per change summed. Never restart a spring.
  Width and height of one shape ride the same spring, or circles go oval mid-morph.
- Content inside a morphing container uses `swap()`: in after the morph starts, out before the next.
- Bars and indicators use `stretch()` so the leading edge arrives first.
- Linear `progress()` only for wipes, draw-ons and constant camera drift.
- Lay out from `L` (`L.u` = 1% of the short side, `L.pad`, `L.pick({...})`), never fixed pixels,
  so 9:16, 1:1 and 16:9 reflow from one timeline. Never crop one format into another.

## Look defaults

- Banned defaults (allowed only when the brief or brand asks): centered title on a gradient;
  everything fading in; fading up from black on frame 0; corner labels and frame borders; glow
  on UI chrome; gradients on UI chrome; generic particle bursts; cream or off-white backgrounds;
  italic accent words; numbered "01 / 02 / 03" section labels; pill-shaped buttons; bouncy
  easing on type. Record any additional exclusions in the film’s style guide.
- One display face, one UI face, one accent colour unless the brief says otherwise.
- Something new happens every 2–4 s. The first 2 s carry the strongest image, never a title card.
- Frame 0 is already moving: start the first animation slightly before t = 0.
- Real product UI only: crop and animate screenshots from `assets/`.
- With a reference: copy its pacing, type, transitions and texture; never its content, logos or characters.

## Sound defaults

- Supplied track: measure it, use it unchanged. Otherwise synthesize the score in code on a
  `beatgrid`. Picture and sound read the same `beats.json`.
- State changes on beats, scene cuts on downbeats, SFX on `hits`. Start on a downbeat.
- SFX are `cues` in `film()`; `render.mjs` writes one cue file per format inside the build; `scripts/sfx.mjs` voices them.
- Final loudness -14 LUFS, true peak -1 dB: `scripts/mix.mjs --manifest <path> --audio <files>` targets both.

