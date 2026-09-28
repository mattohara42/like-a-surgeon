# CLAUDE.md

Operating contract for Claude Code on this repository. Read this first, every
session. If anything here conflicts with a request in chat, say so before
acting.

## What this project is

**Lineage** is an offline, browser-based atlas of recorded popular music from
roughly 1950 to the present. It shows how artists, scenes, machines, producers,
and labels influenced each other, and it lets a curious teenager *hear* the
connection, not just read about it.

The primary reader is a 13-year-old with real curiosity and no vocabulary yet.
Every screen must reward him in two sentences and then offer a third.

## The scope rule, stated plainly

The **dataset is unbounded**. The **build is milestoned**.

This distinction is the spine of the project. We want a completionist map that
can grow to a thousand artists, so the architecture must make artist number 900
cost exactly what artist number 9 cost. But a session that adds features while
the data layer is half-built produces a beautiful shell around nothing.

Concretely:
- Never write code that assumes the roster size. No fixed arrays, no
  hand-maintained indexes, no "load everything then render."
- Adding an artist must mean adding one file and one manifest line. If it ever
  means editing three files, the architecture is wrong. Stop and raise it.
- Features ship behind milestone gates (see `BUILD_PLAN.md`). Data expansion is
  a permanent parallel track with no gate at all.

When you catch yourself wanting to add a feature mid-milestone, write it in
`BACKLOG.md` and keep going.

## Hard technical constraints

- Vanilla JS, ES modules, **no build step**, no framework, no bundler.
- **No runtime network calls.** The whole thing runs from `file://` offline.
  (Note: `file://` blocks `fetch`. Data loads via a tiny dev server script for
  development, and the release path is a single-command bundling of JSON into a
  JS module. Solve this in M1, not later.)
- The one exception to "no build step" is `npm run build`, which writes the
  offline release to `dist/` and flattens code and data into classic scripts
  because `file://` blocks module loads too (A18, A84). It exists for the
  release copy only. Source stays ES modules, and dev never runs it.
- SVG for the graph. Canvas only if profiling proves SVG cannot hold 60fps at
  500+ visible nodes, and only after raising it.
- All tuning values live in one exported `CONFIG` object in `config.js`. No
  magic numbers in logic, ever.
- Web Audio API for all sound. See "Audio" below.
- Target 1280x800 laptop first. Do not assume hover. A touch wall-panel build
  comes later.
- No album art, no press photos, no copyrighted audio files. Not one.

## Audio, and why it is synthesized

Every sonic demonstration in this project is **generated in the browser from
synthesis and sequencing**. We never ship or stream a copyrighted recording.

This is not a compromise. It is better pedagogy. A 30-second clip of "Planet
Rock" tells a 13-year-old nothing. A TR-808 kick he can trigger, slow down,
detune, and A/B against a 909 teaches him what the machine actually did to
music. Same for a 303 line he can twist the filter on, a dub delay he can
switch in and out of the signal path, a breakbeat pattern he can hear straight
and then hear chopped.

Rhythmic patterns and chord movements are not the protected thing. The
recording is. We demonstrate the technique, and we link out to a streaming
search for the record itself.

## Writing rules

**Reading levels change vocabulary, never facts.** This is the governing rule
for all three registers. A shorter sentence and a simpler word are allowed. A
removed fact is not. If a scene cannot be explained honestly to an 11-year-old
without mentioning redlining, deindustrialization, or colonial economics, then
the 11-year-old gets told about redlining, deindustrialization, and colonial
economics, in words he knows. No softening, no euphemism, no omission by
kindness.

The Kid register is deferred to Track D (see `BUILD_PLAN.md`). Write Teen and
Adult first. `data/seed.json` already carries Kid text on every record, which
exists as the exemplar for when that pass happens, not as a requirement now.

**Historical importance is not endorsement.** Artists who mattered and who
neither of us would recommend belong on the map. Their `hook` states what they
changed and why they are here. It does not praise the music, and it does not
editorialize about the person either. State what happened and let the reader
decide. If an artist's conduct is a documented part of why their reputation
changed, that belongs in the adult register as fact, not as adjective.

## Accuracy rules, non-negotiable

1. **Never invent a quotation.** Describe the source in prose instead.
   "Cited by Atkins in multiple interviews" is good. A fabricated sentence in
   quotation marks is a project failure and undermines everything else here.
2. Never invent a date, label, catalogue number, or producer credit. Null it
   and note it.
3. Tier confidence honestly. `asserted` is a respectable answer. Do not upgrade
   a tier to make the graph look more authoritative.
4. Widely repeated popular-history claims that are actually disputed get
   `consensus` at best, and the dispute earns a sentence in the adult text.
   Those sentences are some of the best content in the project.
5. Log every unasked decision in `ASSUMPTIONS.md`. Log every question for Matt
   in `QUESTIONS.md`.

## Staying in sync

Each session's container is cloned once, at the start. Nothing tells it when
`main` moves underneath it, and more than one session has now spent its whole
run building against a tree that had stopped existing hours earlier.

- `.claude/hooks/session-start.sh` runs at session start and prints how far
  behind `origin/main` the checkout is, what landed, and which other branches
  are in flight. **Read it before planning anything.** If it says the checkout
  is behind, merge `origin/main` first; what you were about to build may
  already exist.
- Before opening a PR, fetch again. A branch cut from a stale base produces a
  merge conflict and a PR description that describes a world that has moved on.
- When a session runs long, re-check. The hook only fires once.
- Parallel sessions are fine. Silently parallel sessions are not: if the hook
  lists another branch in flight, say so before starting work that could
  collide with it.

## Working style

- Lock design before implementing. If the design is ambiguous, ask.
- Do not touch unrelated code. If you spot a smell, note it in `BACKLOG.md`
  under "Observed problems" rather than fixing it inline.
- Surface uncertainty explicitly instead of producing confident output.
- Small, reversible commits. One concern per commit.

## Anti-goals

No build step. No runtime network dependency. No framework. No force-directed
layout (it looks impressive and destroys chronological reading). No genre
purity, the cross-lineage edges are the point of the whole thing. No hero
images we do not own. No layout cleverness that makes reading harder.
