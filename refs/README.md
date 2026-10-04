# References

Put reference films, stills and image libraries for the current brief here. Take their grammar
(pacing, transitions, type behaviour, texture), never their content, logos, product UI or
characters. Reference media is not committed; keep only the notes you write about it.

Study a reference video before writing the style guide (see `prompts/reference-style-guide.md`):

```bash
ffmpeg -i refs/launch.mp4 -vf fps=2 refs/frames/f_%03d.png
ffmpeg -i refs/launch.mp4 -vn refs/launch.wav
.venv/bin/python scripts/beats.py refs/launch.wav --out refs/launch-beats.json
```

Pass `--out`; without it the measurement overwrites the film's `beats.json`.

Frame n is at t = (n − 1) / 2 s. Record tempo, cut times, palette and per-shot notes in this file
or in `docs/style_guide.md`. Mark anything only measured, not watched or listened to, as unverified.

With no references, start from `docs/presets/house-motion.md`.
