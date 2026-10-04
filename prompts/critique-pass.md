# Evidence-based critique

Use up to three revision passes per gate; stop earlier when meaningful defects are resolved.

1. Run `npm run check` for all requested formats. Fix technical failures first.
2. Render stills for composition. Keep the manifest path printed by the renderer.
3. For video builds, run `node scripts/review.mjs --manifest <path> --at <timestamp>`.
   For loops add `--loop`. The strip and loop diagnostic help locate defects; they do not
   substitute for playback.
4. Inspect stills for composition, brand accuracy and readability at 360 px. Watch the video
   for hook, pacing, transitions and motion. Listen to the mixed video for sound and sync.
   Mark each unavailable assessment **unverified**, including the reason.
5. Log each meaningful defect with timestamp/range, severity, concrete evidence, intended
   correction, and a reproducible before/after comparison. Use the same time and format.
6. Fix the highest-impact defects. Re-render the affected interval in a new build and compare
   it with the original. After accepted changes, render and review the complete film again.
7. Stop when meaningful observed defects are resolved or three revision passes are used.
   Report remaining defects and unverified areas. A self-assigned score is not acceptance.

Hunt for clipped or overlapping type, illegible frames, accidental pauses, discontinuities,
asset errors, unwanted distortion, and sound that misses the intended action. Judge motion
against the film's stated direction; curves and springs are both legitimate choices.
