# Lineage

An offline, browser-based atlas of how recorded popular music influenced itself,
built to be explored by a curious 13-year-old.

This folder is the design package. There is no code yet, on purpose.

## What is here

| File | What it is for |
|---|---|
| `CLAUDE.md` | The operating contract. Claude Code reads this every session. |
| `SPEC.md` | What the thing is and why. The design, locked. |
| `BUILD_PLAN.md` | Milestones and gates, plus the ungated data-expansion track. |
| `BACKLOG.md` | Everything deliberately not being built yet. |
| `ASSUMPTIONS.md` | Decisions made without asking. Append-only. |
| `QUESTIONS.md` | Five open questions that need Matt's answers before M1. |
| `data/SCHEMA.md` | The data contract. |
| `data/seed.json` | Ten artists, two machines, three scenes, nine edges, three audio demos, two threads. This is the quality bar, not the dataset. |

## How to start with Claude Code

1. Answer `QUESTIONS.md` in the file. Five questions, ten minutes.
2. Read `data/seed.json`, specifically the `whatToListenFor` fields and the
   `evidence` fields. If those read well to you, the project will read well.
   If they read like filler, fix two of them by hand so there is a standard to
   point at.
3. `git init`, commit the whole folder as the design package.
4. Open Claude Code in the folder and send the kickoff message below.

### Kickoff message

> Read CLAUDE.md, SPEC.md, BUILD_PLAN.md, and data/SCHEMA.md before doing
> anything. Then read data/seed.json carefully, because it is the quality bar
> for everything you will write.
>
> You are starting M1. Do not write any UI code, any renderer, or any scratch
> visualization. M1 is the data layer and nothing else.
>
> Start by proposing the sharded file layout and the manifest format, and by
> solving the file:// fetch problem with a stdlib-only dev server and a bundling
> step. Show me that plan before you build it.
>
> Then expand the dataset toward the M1 targets in BUILD_PLAN.md, in batches of
> about twenty artists with their edges, pausing after each batch so I can read
> a sample. Lead with the dub, electro, Detroit, and Chicago material.
>
> The single thing I will judge you on is the quality of edge.evidence and
> trackPair.whatToListenFor. Never invent a quotation. Tier confidence honestly.

## The one rule that protects this project

The dataset is unbounded. The build is milestoned.

Growing the map to a thousand artists is the goal, and the architecture exists
to make that cheap. Adding a feature while the data layer is half-finished is
how this becomes a beautiful shell around nothing.
