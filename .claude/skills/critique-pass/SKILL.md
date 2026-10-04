---
name: critique-pass
description: Review a film with timestamped defects and before/after evidence. Inspect stills, play motion, and listen to audio when available; mark unavailable assessments unverified.
argument-hint: "[manifest path] [timestamp of fastest action]"
---

# Critique pass

Follow `prompts/critique-pass.md` and log to `docs/review_log.md` using its template.
Run `npm run check` first. Use the explicit build manifest from the arguments or current
render; never infer the latest film from loose files in out/.

For a video build: `node scripts/review.mjs --manifest <path> --at <t>` (add `--loop` for loops).
Inspect stills for composition and readability, play video for motion, and listen to the mix
for sound sync. If a modality is unavailable, mark that assessment unverified.

Record timestamp/range, severity, observed defect, evidence path, intended correction, and a
before/after comparison at the same time and format. Fix the highest-impact defects first.
Use up to three revision passes per gate, stopping earlier when meaningful defects are
resolved. Report unresolved defects and unverified areas at the limit. Do not self-score
into acceptance. After partial fixes, render and review the full film in a new build.
