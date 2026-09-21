# M1, session 1: data layer architecture

Paste as-is.

---

Read CLAUDE.md, SPEC.md, BUILD_PLAN.md, METHOD.md, and data/SCHEMA.md before
doing anything. Then read data/seed.json carefully. It is the quality bar for
every word you will write later, not a dataset.

You are starting M1. M1 is the data layer and nothing else. Do not write UI
code, a renderer, a scratch visualization, or a "quick check that the data
loads" page. If you find yourself wanting to see the graph, that is the
feeling M1 exists to resist.

This session produces a plan, not an implementation. Write it to
`docs/m1-architecture.md` and stop.

Cover:

1. The sharded file layout. One record per file under data/artists/,
   data/machines/, data/scenes/, data/labels/, data/edges/, data/threads/,
   data/demos/. Propose the naming convention and show me three example paths.

2. The manifest format. The constraint that matters: adding an artist must be
   one new file plus one manifest line. If your design needs edits in three
   places, it is wrong. Say so rather than working around it.

3. The file:// problem. fetch() is blocked from file://, and offline operation
   is a hard requirement. Propose the dev path (a stdlib-only Node server, no
   dependencies) and the release path (a bundling step that inlines all JSON
   into a single JS module). Both must be one command. Tell me the tradeoffs
   you considered.

4. The validator. What it checks, what it outputs, how it runs. At minimum:
   unresolved references, missing required fields, illegal enum values,
   duplicate ids, orphan nodes, and a confidence-tier distribution report.

5. Anything in data/SCHEMA.md that will not survive contact with 1000 records.
   Say it now.

Log decisions in ASSUMPTIONS.md and anything you need from me in QUESTIONS.md.

Do not begin implementing until I have replied.
