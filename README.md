# Lineage

An offline, browser-based atlas of how recorded popular music influenced itself,
built to be explored by a curious 13-year-old.

The map lays the whole dataset on a left-to-right time axis, with lanes by
lineage, scene or label, machines on a receding floor beneath, and a year
cursor you can drag to watch it arrive. Click anything to read about it.

The latest `main` is live at https://like-a-surgeon.netlify.app, and every
pull request gets its own Netlify preview.

## Where things stand

- **M1 (data layer):** closed. The dataset targets moved to Track D, which
  keeps growing (`npm run report` measures the distance).
- **M2 (graph renderer):** shipped.
- **M3 (reading surface):** built. Panels, reading levels, legend, search,
  YouTube links, Arrange by, and the typography pass are all in (PRs #16 to
  #21). The gate is still open: it passes when Matt's 13-year-old uses the
  map without instruction and gets somewhere. `docs/m3-gate-notes.md` is the
  guide for that session.
- **Track D (data):** ongoing. Artists (135 of 120), machines (31 of 25),
  scenes (20 of 20), labels (31 of 30) and cross-lineage edges (103 of 60)
  have all passed their old M1 targets. Still short: 263 of 350 edges,
  2 of 5 threads, and 5 of 30 edges with a demo. Recent batches were
  edge-only passes between artists already on the map, the Juice Crew and
  Sherwood's On-U Sound circle, producers (George Martin, Quincy Jones,
  Tony Visconti and others), and the Weird Al parody edges (Nirvana,
  Madonna, Coolio, Rick Derringer). `npm run report` has the exact
  distance.
- **Cards (the phone version):** built, gate open. A screen narrower
  than 700 px gets one record per card instead of the map, with Random
  and a web address per card. `?view=map` and `?view=cards` override the
  choice. See `docs/cards-architecture.md`.
- **Open question:** Q20 in `QUESTIONS.md`. A null end year can't
  currently tell "still made" from "unknown", so some machines read as
  still on sale.
- **Next:** M4, the audio engine, once the M3 gate is passed.

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
| `tools/bundle.js` | Release bundler. Writes `dist/`, which opens from disk with no server. `npm run build`. |
| `tools/report.js` | Generates the M1 gate report into `docs/m1-gate-report.md`. `npm run report`. |
| `tools/crosscheck.js` | Checks the data against Wikidata and MusicBrainz and lists disagreements in `docs/crosscheck-report.md`. Dev only, and the only tool that uses the network. `npm run crosscheck`. |
| `index.html`, `main.js` | The app shell and entry point. |
| `config.js` | Every tuning value in the project. No magic numbers in logic. |
| `render/` | The graph renderer: layout, lane plans (`arrange.js`), substrate, nodes, edges, gradients, atmosphere, transport, viewport culling, semantic zoom, label placement. |
| `cards/` | Cards, the phone version: the view switch, card addresses, the opening and random pools, and the card shell. |
| `reading/` | The reading surface: the drawer and its node and edge panels, reading levels, legend and version stamp, search, YouTube links, interface copy in registers, the type scale. |
| `docs/` | Milestone designs (`m1-`, `m2-`, `m3-architecture.md`), the M1 gate report, and the M3 gate notes. |
| `netlify.toml` | Builds `dist/` for the Netlify site and its PR previews. |
| `design/` | Visual direction prototypes. `03-strata.html` is the one that shipped. |
| `tools/design-snapshot.js` | Freezes `data/` for the `design/` prototypes. `npm run design:snapshot`. |
| `.claude/hooks/session-start.sh` | Tells each session how far behind `origin/main` it is, and what else is in flight. |

## Running it

    npm run dev        # serves at localhost:8080
    npm run validate   # checks the data tree
    npm run report     # regenerates docs/m1-gate-report.md
    npm run crosscheck # checks the data against outside sources (needs network)
    npm run build      # writes dist/, the offline release: open dist/index.html directly
    npm run cards:check # walks the phone view in headless Chromium (needs Playwright and a build)

Scroll to zoom, drag to pan, and drag the year cursor or press play. Click a
dot or a line to open its panel, and follow the links in the panel sideways.
Press `/` to search by name, place or year. The top-left controls switch
the layers, the reading level (Teen, Adult) and the arrangement (Lineage,
Scene, Label). The legend bottom-left explains how sure each line is.

## Working with Claude Code

Each session starts by reading `CLAUDE.md`, and the SessionStart hook reports
whether the checkout is behind `main`. Work goes through a pull request per
concern. Every decision made without asking goes in `ASSUMPTIONS.md`, and
every question for Matt goes in `QUESTIONS.md`. The prompts that drove M1 are
kept in `prompts/`, and the original kickoff message is preserved there
(`prompts/README.md`).

## License

The code is under the MIT License (`LICENSE`). The dataset in `data/`, the
records and the writing in them, is under Creative Commons
Attribution-ShareAlike 4.0 (`data/LICENSE`). Anyone can reuse and adapt the
data if they credit Lineage and share their version under the same terms.

## The one rule that protects this project

The dataset is unbounded. The build is milestoned.

Growing the map to a thousand artists is the goal, and the architecture exists
to make that cheap. Adding a feature while the data layer is half-finished is
how this becomes a beautiful shell around nothing.
