---
name: director-brief
description: Interview the user about a film before anything is built (audience, platform, the one line, mood through references, must-show and must-avoid, story shape) and write docs/brief.md with an ordered list of moments for /motion-reel to fit to the beat grid.
argument-hint: "[what the film is for, URL, or a draft idea]"
disable-model-invocation: true
---

# Director's brief

Decide what the film is before `/motion-reel` decides how to make it. The output is
`docs/brief.md` (template `docs/_templates/brief.md`). Starting point: $ARGUMENTS

## Before asking

Read what already exists: the arguments, `docs/brief.md` if this is a revision, `refs/`,
`assets/`, `audio/`. With a URL, visit the site and learn what the product does, who it's for and
its brand. Never ask what you can find out: colours, fonts, product features, tempo of a
supplied track.

## Interview

Ask in rounds of up to four questions, each with a recommended answer the user can accept.
Use the question tool when available. Two or three rounds; stop as soon as the answers stop
changing the film. Each round builds on the last; don't ask about things already settled.

Cover, in roughly this order:

1. **Audience and placement.** Who watches, where (feed, site hero, keynote, ad slot), with sound
   or muted, how long before they scroll. This sets formats, caption size, duration and pacing.
2. **The one line.** What the viewer should feel, believe or do at the end. Push until it is a
   sentence a frame can be checked against, not a category ("a launch video").
3. **Mood through references.** A film, frame, brand or folder to point at, and what to take from
   it. If the user offers adjectives ("premium", "playful"), ask what they look like: an example,
   or a choice between two concrete treatments.
4. **Story shape.** Problem → product → proof → CTA, a showreel of techniques, a story over time,
   a single morphing object, a loop. Recommend one that fits the one line.
5. **Must-show and must-avoid.** Specific screens, numbers, claims, the logo moment; looks,
   claims or competitors this brand never wants. Turn "not cheesy" into named patterns.
6. **Practical inputs.** Duration, formats, music (supplied track or synthesized, and its
   feel), real assets available, voiceover or on-screen text only.

Skip anything the arguments or earlier answers already settle. If the user says "you decide",
take the recommendation and record it as an assumption.

## Moments

Draft the ordered list of moments: what is on screen and what it does, one line each, with the
hook first. No timestamps: the beat grid doesn't exist until the music does, and `/motion-reel`
fits moments to it. Mark moments that must land on a strong beat. Show the list and revise it
with the user until they approve it.

## Write

Fill `docs/brief.md` from the template, as long as its content needs. Record assumptions the
user didn't confirm. End by telling the user the next step: `/motion-reel`, which reads the brief.
