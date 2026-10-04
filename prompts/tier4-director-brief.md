# Tier 4: director's brief

For multi-minute films. It doesn't describe a video, it staffs a crew. The idea still has to
come from you: the critique loop polishes a concept, it can't supply one.

```markdown
You are director, animator, sound designer and render engineer for a [DURATION] film made in
code. This is a multi-session production; don't rush to a final render.

## The film in one line
[LOGLINE: what the viewer should feel at the end.]

## References and inputs
- ./refs/: [video | frames | image library]. Take its grammar, never its content.
- ./audio/track.wav: use unchanged. Measure it first: .venv/bin/python scripts/beats.py audio/track.wav
- Skills you may use: [/hyperframes | /claude-animation | none: the seek(t) engine here].
- APIs in .env: [ELEVENLABS_API_KEY, FAL_KEY]. Budget [$X]. Spend it economically.

## Character bible (if there are characters)
Proportions, palette sampled from [sheet], expressions, and an identity lock that survives any
style change.

## Look
[3–5 lines: palette, type, texture, camera language. Extra banned looks for this film.]

## Beat sheet
0:00–0:02  hook: [the single most striking image]
0:02–0:10  [act 1]
...        a new visual payoff every 3–5 s
[END]      the last frame sets up the first

## Text on screen
[When captions or lyrics go huge, when they sit as subtitles. Leave room in the composition.]

## Workflow, with gates
1. docs/style_guide.md and docs/shotlist.md (every shot: time range, frames, camera, text, SFX).
   Show me the shot list; if I haven't answered by your next step, continue and log assumptions.
2. Stills for every shot, contact sheet, critique.
3. Animatic: npm run animatic with the placeholder pulse. Fix pacing before polish.
4. Full animation, polish pass, sound pass, final render, mix.
5. Write docs/ANIMATION_GUIDE.md and docs/STORYBOARD.md first. Then, only for independent
   chapters, one subagent per chapter; each reads ANIMATION_GUIDE.md before coding.

## Critique loop: every shot, up to three revision passes
Per CLAUDE.md, plus a "depth" axis for this film. Log to docs/review_log.md. Record timestamped defects and before/after evidence; report unresolved and unverified areas.

## Deliverables
build manifest · final video · loop playback · poster · contact sheet (linked from their build directories) · README.md section on how to re-render
```

**Generate-then-trace** (optional): a video model renders base shots for motion that's hard to
hand-code (characters, physics); the film then redraws everything in code on top, so only the
code layer is ever seen. Video models give motion; the code layer gives a consistent, ownable look.
