# Lineage

An offline, browser-based atlas of how recorded popular music influenced itself,
built to be explored by a curious 13-year-old.

Open `index.html` through `npm run dev`. The graph renders the whole dataset
on a left-to-right time axis with lineage lanes, machines on a receding floor
beneath them, and a year cursor you can drag to watch the map arrive.

## What is here

| File | What it is for |
|---|---|
| `CLAUDE.md` | The operating contract. Claude Code reads this every session. |
| `SPEC.md` | What the thing is and why. The design, locked. |
| `BUILD_PLAN.md` | Milestones and gates, plus the ungated data-expansion track. |
| `BACKLOG.md` | Everything deliberately not being built yet. |
| `ASSUMPTIONS.md` | Decisions made without asking. Append-only. |
| `QUESTIONS.md` | Open questions that need Matt's answers, and the resolved ones. |
| `data/SCHEMA.md` | The data contract. |
| `data/seed.json` | Frozen reference copy of the original ten-artist quality bar. No longer live data; see `data/artists/` etc. |
| `data/artists/`, `data/machines/`, `data/scenes/`, `data/labels/`, `data/edges/`, `data/demos/`, `data/threads/` | The live, sharded dataset. One file per record. |
| `tools/validate.js` | Checks the data tree. `npm run validate`. |
| `tools/serve.js` | Dev static server, solves the `file://` fetch problem. `npm run dev`. |
| `tools/bundle.js` | Release bundler, inlines all data into `data/data.bundle.js`. `npm run build`. |
| `tools/report.js` | Generates the M1 gate report into `docs/m1-gate-report.md`. `npm run report`. |
| `index.html`, `main.js` | The app shell and entry point. |
| `config.js` | Every tuning value in the project. No magic numbers in logic. |
| `render/` | The graph renderer: layout, substrate, nodes, edges, gradients, atmosphere, transport, viewport culling, semantic zoom. |
| `design/` | Visual direction prototypes. `03-strata.html` is the one that shipped. |
| `tools/design-snapshot.js` | Freezes `data/` for the `design/` prototypes. `npm run design:snapshot`. |
| `.claude/hooks/session-start.sh` | Tells each session how far behind `origin/main` it is, and what else is in flight. |

## Running it

    npm run dev        # serves at localhost:8080
    npm run validate   # checks the data tree
    npm run report     # regenerates docs/m1-gate-report.md
    npm run build      # writes data/data.bundle.js for the offline release

Drag the year cursor at the bottom, or press play. Scroll to zoom, drag to
pan, click a node to fly to it.

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
