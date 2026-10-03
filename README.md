# Lineage

An offline, browser-based atlas of how recorded popular music influenced itself,
built to be explored by a curious 13-year-old.

The map lays the whole dataset on a left-to-right time axis, with lanes by
lineage, scene or label, machines on a receding floor beneath, and a year
cursor you can drag to watch it arrive. Click anything to read about it.
Every line is a sourced claim, graded for how sure we are. The sound demos
are synthesized in the browser, never recordings. Guided threads walk
through the map, and Six Degrees of Weird Al turns it into a game.

The latest `main` is live at https://like-a-surgeon.netlify.app, and every
pull request gets its own Netlify preview.

## Where things stand

- **M1 (data layer):** closed. The dataset targets moved to Track D, which
  keeps growing (`npm run report` measures the distance).
- **M2 (graph renderer):** shipped.
- **M3 (reading surface):** passed 2026-09-29.
- **M4 (audio engine):** built, with nine playable demos. Matt moved on to
  M5 on 2026-09-30. The by-ear listen and the Safari and Firefox check
  (Q27) are still to do, and the Planet Rock A/B is a draft (Q30).
- **M5 (timeline, threads, lenses):** built 2026-09-30. Six threads, the
  receding past, and the four lenses, which became the "Part of the story
  of" list on each edge's panel on 2026-10-03 (A343). The gate is still to run: a reader
  who has never seen the map finishes a thread and explains what it was
  about. `docs/m5-gate-notes.md` is the script.
- **Six Degrees of Weird Al:** built 2026-10-02, ahead of the M5 gate at
  Matt's request (A340). Start from the welcome card or any artist panel
  and hop through connections until you reach Yankovic, in six or fewer.
  Every artist on the map is in reach.
- **Track D (data):** ongoing, and past every old M1 target except demos:
  214 artists, 33 machines, 21 scenes, 36 labels, 457 edges (190 across
  lineages), 6 threads, and 19 of 30 edges with a demo. `npm run report`
  has the exact distance and the Six Degrees reach.
- **Cards (the phone version):** built, gate open. A screen narrower
  than 700 px gets one record per card instead of the map, with a Random
  button and a link for each card. `?view=map` and `?view=cards` override the
  choice. See `docs/cards-architecture.md`.
- **Adding artists:** see `docs/adding-artists.md` for what a new artist
  needs to join the map, the threads and the Six Degrees game.

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
| `tools/report.js` | Generates the data report into `docs/m1-gate-report.md`: counts, the edges to read hardest, sampled listening notes, and the Six Degrees reach (who is beyond six hops). `npm run report`. |
| `tools/crosscheck.js` | Checks the data against Wikidata and MusicBrainz and lists disagreements in `docs/crosscheck-report.md`. Dev only, and the only tool that uses the network. `npm run crosscheck`. |
| `index.html`, `main.js` | The app shell and entry point. |
| `config.js` | Every tuning value in the project. No magic numbers in logic. |
| `render/` | The graph renderer: layout in lineage lanes, substrate, nodes, edges, gradients, atmosphere, transport, viewport culling, semantic zoom, label placement. |
| `cards/` | Cards, the phone version: the view switch, card addresses, the opening and random pools, and the card shell. |
| `reading/` | The reading surface: the drawer and its node and edge panels, legend and version stamp, search, YouTube links, interface copy, the type scale, the welcome card and missions, the thread player (`threads.js`), and Six Degrees of Weird Al (`sixDegrees.js`, on the shared hop graph in `hops.js`). |
| `audio/` | The audio engine: machine voices, the 303 worklet, the dub effects, pattern playback. |
| `docs/` | Milestone designs (`m1-` to `m5-architecture.md`, `cards-architecture.md`), the data report, the M3 and M5 gate notes, the source policy (`sources.md`), and the guide to adding artists (`adding-artists.md`). |
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
    npm test           # unit tests: audio, demos, cards, and the Six Degrees hop graph
    npm run cards:check # walks the phone view in headless Chromium (needs Playwright and a build)

Scroll to zoom, drag to pan, and drag the year cursor or press play. Click a
dot or a line to open its panel, and follow the links in the panel sideways.
Press `/` to search by name, place or year. The top-left control switches
the layers. The map is always laid out by lineage, and every record has one
text, with no reading levels (A343). The legend bottom-left explains how sure each
line is. The welcome card ("Start here") opens the missions, the threads
and Six Degrees of Weird Al.

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
