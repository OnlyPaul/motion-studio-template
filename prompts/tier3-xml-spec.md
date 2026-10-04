# Tier 3: XML spec

Replaces a feeling with a state list. A state list can be visibly wrong, so it can be corrected.
Keep the blocks in this order. `<start>` goes last: moved to the top, the model starts coding
against inputs it never collected.

The example concept is "one shape, never cut": a single container morphs size, radius and fill
from state to state, a cursor drives each change, and the last frame equals the first.

```xml
<inputs>
Before any code, ask me for: product + URL; 8–12 UI states that tell its story; the real data
each state shows; brand colours, fonts and one accent; a track near 120 BPM or "synthesize";
formats.
</inputs>

<direction>
Product-film UI motion. One container never cuts: each state is the same element changing size,
radius and fill while its content swaps behind a short blur. A cursor drives every change.
Neutral canvas, one accent. Springs with at most a hair of overshoot.
Banned: bouncy easing, glows, gradients on UI chrome, particle bursts, dead beats.
</direction>

<structure>
[120] BPM, [8] bars, a change on every beat.
[logo -> CTA button -> email field (typed) -> loader -> success check -> dashboard card
 -> chart draws itself -> tooltip on hover -> command palette -> toast -> logo]
</structure>

<build>
1. index.html via film() from lib/stage.js. The render contract in CLAUDE.md applies.
2. Container geometry and colour are track()/trackColor() over the state keys, one shared spring.
3. Content inside the container uses swap(): in after the morph starts, out before the next.
4. Tab indicators and bars use stretch(): leading and trailing edges on different springs.
5. Beat grid from the track (scripts/beats.py) or scripts/beatgrid.mjs. Start on a downbeat;
   UI sounds as cues on measured hits.
6. Final render at 60 fps with 4 subframes (render.mjs defaults).
</build>

<gotchas>
- Text inside a scaled DOM layer: no will-change (it rasterizes and blurs).
- The last frame equals the first, cursor position and velocity included: set loop: true and
  npm run check will measure the seam.
- Width and height share one spring or the container goes oval mid-morph.
</gotchas>

<start>
Ask me for the inputs. Then show me the state list placed on the beat grid, and wait.
</start>
```
