# Tier 2: brand brief

Point the reel at a product. Three things do most of the work: the URL, "use the real assets"
and "it needs music". Keep one session per brand: once the renderer and audio exist in the
conversation, the next film for the same brand is much cheaper.

```
A dynamic [20]-second motion film for [PRODUCT] ([URL]) with showreel energy. Go all out.

Assets
- Visit the site with Playwright. Save real screenshots, the logo, colours and fonts to ./assets
  (fonts to ./assets/fonts). List what you found before animating anything.
- Never redraw the product UI from memory. Crop and animate the real thing.

Story: one beat each, 2–4 seconds
1. Hook: the problem in five words of huge kinetic type.
2. The product appears; its UI assembles piece by piece.
3. Three features, each a UI moment with a cursor performing a real action.
4. One number that proves it works: [METRIC].
5. Logo lockup + [CTA].

Sound
- Original score synthesized in code at [120] BPM (scripts/beatgrid.mjs first). UI clicks and
  whooshes as cues on the grid.

Formats: 9:16 first, then 1:1 and 16:9 from the same timeline (render.mjs --format all).
Show me a contact sheet of one settled still per beat before the full render.
```

Voice or a mascot: put the key in `.env` and refer to it by name, e.g.
"The ElevenLabs key is ELEVENLABS_API_KEY in .env. Read it from there; never print it."
