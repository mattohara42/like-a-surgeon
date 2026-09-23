# BUILD_PLAN

Milestones are gates. Do not begin a milestone until the previous one is
reviewed and signed off in chat. Data expansion (see "Track D") runs in
parallel and has no gate.

---

## M0 — Documentation and decisions

Read `CLAUDE.md` and `SPEC.md`. Produce or update `ASSUMPTIONS.md` and
`QUESTIONS.md`. Resolve the questions with Matt before M1.

**Gate:** Matt has answered `QUESTIONS.md`.

---

## M1 — Data layer and loader

The single most important milestone. No UI work of any kind, including scratch
renderers.

1. Finalize `data/SCHEMA.md` against the seed files.
2. Build the sharded data layout: `data/artists/*.json`, `data/edges/*.json`,
   `data/scenes/*.json`, `data/machines/*.json`, `data/labels/*.json`,
   `data/threads/*.json`, `data/demos/*.json`, plus `data/manifest.json`.
3. Write `tools/validate.js`: checks every reference resolves, every required
   field is present, every confidence tier is legal, no orphan nodes, no
   duplicate ids. Run it in CI-style from the command line.
4. Solve the `file://` problem now. Dev uses `tools/serve.js` (Node, stdlib
   only). Release uses `tools/bundle.js` to inline all JSON into a single
   `data.bundle.js` module. Both must be one command.
5. Expand the seed dataset to the M1 target: 120 artists, 25 machines, 20
   scenes, 30 labels, 350 edges, 5 threads. At least 60 edges cross lineages.
   At least 30 edges carry a demo id.

**Gate:** Matt reviews a generated report of counts by lineage, edge type, and
confidence tier, plus the twenty edges you are least sure about, plus twenty
randomly sampled `whatToListenFor` fields. Reading those twenty is the real
quality check on the whole dataset.

**Gate passed.** Matt reviewed `docs/m1-gate-report.md` and closed M1 in chat.
The step-5 dataset targets were not met at closing (39 artists of 120, 61 edges
of 350, 12 machines of 25) and they are not abandoned: they move to Track D as
its destination, which is where the plan always said data expansion lives.
`npm run report` keeps measuring the distance. Closing M1 opens M3, since M2
shipped ahead of the gate.

---

## M2 — Graph renderer

Static first, no timeline. Left-to-right time axis, lineage lanes, SVG, viewport
culling from the first commit. Pan and zoom. The three semantic zoom levels with
collapse and expand animation. Node and edge hit testing. Render the whole M1
dataset at 60fps or raise the problem.

**Gate:** performance at 2x the M1 dataset size, simulated by duplication.

**Shipped ahead of its gate** (A72). The 2x check was run headless, where
`render()` averaged 1.9ms against a 16.7ms budget. A spot check in a real
browser is still logged in BACKLOG.

---

## M3 — Reading surface

Detail panels for nodes and edges. Reading-level selector with localStorage,
shipping two-way (Teen, Adult) at M3 and widening to three-way when the Kid
register lands in Track D. Build the selector to read available registers from
the data rather than hardcoding two.
Confidence legend. Search. Outbound streaming-search links. Typography pass.

**Gate:** Matt's 13-year-old uses it without instruction and gets somewhere.

**Build complete, gate open.** Every step in `docs/m3-architecture.md`
shipped in PRs #16 to #21, plus Arrange by (Q19), which Matt asked for
mid-milestone. `docs/m3-gate-notes.md` covers how to run the gate session.
M4 does not open until the gate is passed.

---

## M4 — Audio engine

`audio/` module. Machine voices, the ported SQUELCH 303 worklet, the dub FX
chain, pattern playback, A/B switching. Demo definitions load from
`data/demos/`. Visual feedback tied to playback. A global mute and a volume
that a kid cannot blow his ears out with.

**Gate:** ten demos across three lineages, each tied to a real edge.

---

## M5 — Timeline, threads, overlays

Timeline scrub with play/pause and keyboard stepping. Thread player with
framing text and audio through-line. The four overlays.

**Gate:** a cold reader can complete a thread start to finish and explain what
they learned.

---

## M6 — Polish and release

Transitions, keyboard navigation everywhere, empty and error states, a first-run
guided tour, bundling, offline verification, then a hosting path.

---

## Track D — Data expansion (parallel, ungated, never finished)

Runs alongside every milestone from M1 forward. Adding an artist is one file
plus one manifest line. Each expansion batch is its own commit with its own
validator run and its own confidence-tier report.

Suggested batch order after M1:
1. Deepen dub, electro, and Detroit, the spine Matt cares most about.
2. Underground and 80s/90s hip-hop production lineage in depth.
3. Outre electronic: musique concrete, Radiophonic Workshop, krautrock, IDM.
4. Fill the rock spine forward to the present.
5. Machines and labels to full coverage.
6. Kid (7-11) register written across the whole dataset, once Teen and Adult
   text is stable and proven with a real reader.
7. Long tail, forever.

Progress: batches so far have covered dub, electro and Detroit, the UK
rock spine, the founding Bronx generation, 80s hip-hop production, and
all three Q21 batches (90s groups and producers, the most-sampled breaks,
classic rock), and batch 3, outré electronic, in a first pass. Batch 5 is half done. Machines reached 25 in PR #23, and labels are
still short. `npm run report` has the current distance on every target.

## Definition of done for any milestone

Validator passes. No console errors. `CONFIG` holds every tuning value.
`ASSUMPTIONS.md` current. `BACKLOG.md` updated with everything deferred.
