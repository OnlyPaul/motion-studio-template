---
name: motion-reel
description: Make a product film, launch video, showreel, animated explainer or motion ad rendered from code with this repo's seek(t) engine. Use when the user asks for any of those, or invokes /motion-reel with a URL, duration, format or reference.
argument-hint: "[URL] [duration] [vertical|square|wide|all] [reference path]"
---

# Motion reel

Follows `CLAUDE.md` (render contract, overridable creative defaults, gates, evidence-based critique). This skill is the order
of operations. Arguments: $ARGUMENTS

## 1. Inputs

If `docs/brief.md` exists (from `/director-brief`), it is the brief: take its inputs, mood,
exclusions and moments, and don't ask again for anything it settles. Then take what the
arguments give; ask once, in one message, for anything still open that would change the
film materially. Otherwise use the default:

| Input | Default |
|---|---|
| Product + URL | none: required for a product film; a showreel needs none |
| Duration | 20 s |
| Formats | 9:16 first, then `--format all` at the end |
| Brand colours + fonts | taken from the site |
| Reference | none: then name a style in the style guide |
| Music | `audio/track.wav` if present, else synthesize at 120 BPM |

## 2. Pipeline

1. **Assets.** With a URL: Playwright screenshots, logo, colours and fonts into `assets/`
   (fonts into `assets/fonts/`). List what you found. Never invent product screens.
2. **Style.** Reference given: `prompts/reference-style-guide.md` → `docs/style_guide.md`.
3. **Grid.** `.venv/bin/python scripts/beats.py audio/track.wav` or
   `node scripts/beatgrid.mjs --bpm 120 --bars N` (N bars cover the duration).
4. **Shot list.** `docs/shotlist.md` on the grid (template `docs/_templates/shotlist.md`).
   With a brief, fit its moments in order (★ moments on downbeats) and flag any you had to
   merge, split or drop.
   **Gate: show it and wait for OK.**
5. **Build.** Replace the scenes in `index.html`; keep the `film()` shape. Motion language from the style guide, layout from `L`, and explicit cues for intended sound events. `npm run check` after each edit.
6. **Stills.** `node render.mjs --stills mid` → `/critique-pass`. Up to three revision passes; stop earlier when meaningful defects are resolved.
7. **Animatic.** `npm run animatic`; keep the printed manifest path. Generate SFX with
   `node scripts/sfx.mjs --manifest <path> --bed beats.json`, then explicitly select that
   audio with `node scripts/mix.mjs --manifest <path> --audio <build>/sfx.wav`.
   Watch and listen to the mix for pacing; mark unavailable assessments unverified.
8. **Final.** Render a new build (use `--format all` when requested), generate its SFX and
   mix via its manifest with explicitly selected audio. Use review with the same manifest.
   Render the poster separately and retain its manifest too. For format-dependent cues,
   generate and select the matching audio separately for each format.
9. **Deliver.** Links to manifests, final video, contact sheet, poster, and loop playback if
   applicable. Include unresolved defects and unverified assessments.

## Hard rules

- Real product UI only.
- No `Math.random`, clocks, timers or CSS animation in film code; `npm run check` passes before any render you show.
- Creative presets are defaults. The film’s style guide defines motion, pacing, exclusions and purposeful overrides.
