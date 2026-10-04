# Reference → style guide

Without a reference the model falls back to its defaults. Naming a style beats describing one;
a frame or a clip beats naming one, because it carries pacing and transition grammar nobody
writes down. Specify the look and the constraints, then let the model choose the technique.

Kinds of reference:
- **A frame**: a screenshot of something you love. Say what to take (palette, type, grain) and what not (subject).
- **A video**: put it in `refs/`, have frames extracted and pacing described shot by shot.
- **A library**: a folder of your own images or past work. Nobody else can copy it.

```
Reference: ./refs/[launch.mp4] (and/or ./refs/frames/*.png)

1. Extract a frame every 0.5 s into refs/frames with ffmpeg and look at them.
2. Write docs/style_guide.md: palette (hex), type (family, weight, tracking), shot lengths,
   transition types, camera moves, texture/grain, how text enters and exits.
3. Write docs/shotlist.md for a [DURATION]s film about [SUBJECT] in that style, on the beat grid.
   Take the grammar of the reference, never its content, logos or characters.
4. Show me both files and wait for my OK before writing code.
```

Frame extraction:

```bash
ffmpeg -i refs/launch.mp4 -vf fps=2 refs/frames/f_%03d.png
```
