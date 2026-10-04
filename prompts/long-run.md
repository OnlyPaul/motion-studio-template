# Long and unattended runs

A message with no tool call ends the turn. A text-only end of turn is a progress report, not
a finished task, so long productions need explicit lines to keep moving and to stay in scope.

## Keep moving (add to a tier-4 brief)

```
Status notes and open questions go in the same message as your next tool call. If you notice
yourself offering to wait, don't: do the next thing. Stop only when nothing can move without me.
```

## Continuation (send when the run stops with work open)

```
Your task list still has open items: [the animatic and the sound pass]. Continue with them.
If one is blocked, say what's blocking it.
```

Send it at most two or three times in a row so a loop can't run away.

## Scope

```
Deliver what was asked, at the scope intended. Make routine judgement calls yourself and check
in only when different readings would lead to materially different work. Finish the whole task,
and stop short of anything clearly beyond it.
```

## Delegation cap

```
Use a subagent only for a large, genuinely independent track: one chapter per agent, no more.
Don't delegate what you can finish in a handful of tool calls, and never use a subagent to check
your own work. Write docs/ANIMATION_GUIDE.md before spawning any.
```

## Concise replies (when a person reads the output)

```
Keep responses focused and brief. Keep caveats short and spend the response on the main answer.
```
