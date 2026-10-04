# Prompt library

House rules (render contract, creative defaults, gates, evidence-based critique) already load from `CLAUDE.md`,
so these templates only carry what changes per film.

| You want | Use | Effort |
|---|---|---|
| Work out what the film should be | `/director-brief` (interview → `docs/brief.md`) | medium |
| Prove the pipeline runs | `tier1-oneliner.md` | medium, xhigh to stress it |
| An ad for a product with a URL | `tier2-brand-brief.md` | xhigh |
| A product film built from real UI states | `tier3-xml-spec.md` | xhigh |
| A multi-minute film | `tier4-director-brief.md` | xhigh, max for the opening |
| A look you can point at | `reference-style-guide.md` | medium |
| Frames that get better | `critique-pass.md` (or `/critique-pass`) | medium |
| A long run that doesn't stall | `long-run.md` | — |

Run tier 1 before tier 4. A one-liner checks the engine, not the idea.

## Order inside a prompt

Context before rules, rules before examples, examples before the request, the request before
anything about process:

1. Role for this job (director, animator, sound designer, render engineer)
2. The look in two lines, including what's banned
3. Inputs: reference, assets, beat grid
4. Rules: the render contract (already in `CLAUDE.md`)
5. One or two beats written exactly as you want them, with timings
6. What the project already knows (`CLAUDE.md`, earlier films in this session)
7. The request: what to make, how long, what size
8. Gates: named artefacts in order, not "think step by step"
9. Deliverables by filename, plus how long written docs should be
10. Optional: make the first output a plan (`<plan>` shot list) before any code

## Before you press enter

- **State list, not vibe.** Beats with named states, not adjectives. (decides the result)
- **Critique with evidence.** Timestamped defects, before/after comparisons, up to three revision passes. (decides the result)
- **Render contract present.** It's in `CLAUDE.md`, so don't contradict it. (decides the result)
- A reference: a frame, a video or a folder. Naming a style is the minimum.
- A film-specific exclusion list of named patterns, not "avoid the generic AI look".
- Gates named as files: style_guide, shotlist, stills, animatic, render.
- Effort set on purpose.
- No carried-over lines: "double-check", "think carefully", "verify with a subagent", "show your
  reasoning". On Opus 5.5 they cost tokens and add nothing. Effort is the thinking control.
- Delegation capped: one agent per chapter, style guide first.
- Deliverables named by path.

## Effort

| Level | For |
|---|---|
| low | Re-renders, one-line fixes, format exports |
| medium | The default. Start every new film here |
| xhigh | A new film whose look isn't established yet |
| max | The opening seconds of something that has to land |

Change effort between messages, not inside a long run.
