# QUESTIONS

Things Claude Code needs from Matt. Answer inline and mark resolved.

## Open

- **Q10. Should `edge` carry a certainty note, or is the derived proxy
  enough?** `tools/report.js` ranks "the twenty edges I am least sure
  about" from confidence tier plus flags read off the record (see **A52**).
  It works, and on the current data it surfaces the right edges. But it is
  inference about the writing, not a record of what the writer actually
  thought. A one-line optional `edge.uncertainty` field would say it
  directly: what specifically is shaky, in the author's words. The cost is
  another field to write on every edge and the risk it gets left empty and
  becomes noise. My instinct is to leave it derived until the ranking is
  visibly wrong about something, but it is your call and the gate review is
  the moment to make it.

- **Q11. Does the M1 dataset target still stand?** The first gate report
  makes the gap concrete: 32 of 120 artists, 36 of 350 edges, 2 of 25
  machines, 8 of 60 cross-lineage edges, 4 of 30 edges with a demo. M2
  shipped anyway, and the renderer is good, so the plan's "milestones are
  gates" rule has already been bent once. Three honest options: hold the
  numbers and spend the next several sessions almost entirely on data;
  re-scope M1 to a number the project will actually reach before M3 (a
  60-artist, 150-edge version of the same shape); or keep the targets as a
  Track D destination and formally decouple them from the gate, which is
  closer to what is already happening. Machines are the sharpest gap, since
  M4's audio work is built on machine records and every demo needs one.

## Resolved

- **Q9. Keep or cut the King Tubby to Juan Atkins resemblance edge?**
  Resolved by me for now: **kept, renamed.** The edge (`asserted` tier, "no
  documented connection," framed explicitly as resemblance rather than
  transmission) was left in the seed with a note to "replace or remove it
  in M1." I kept it and just fixed its stale filename
  (`e-tubby-kraftwerk-nonedge.json` -> `e-tubby-atkins-resemblance.json`,
  matching its actual `from`/`to`), on the reasoning that it's an honest,
  well-tiered example of exactly the kind of edge `BUILD_PLAN.md`'s M1 gate
  asks Matt to review ("the twenty edges you are least sure about"). If you
  would rather cut it than keep it as a standing demonstration, say so and
  I'll remove it. Logged as **A29** in `ASSUMPTIONS.md`.

- **Q4. Version stamp.** Resolved: **yes.** Show a last-updated date and
  dataset version somewhere in the interface, so the map reads as a living
  document. Scheduled for the M3 reading-surface milestone alongside the
  confidence legend, since both are "how honest is this map" UI. Logged as
  **A20** in `ASSUMPTIONS.md`.

- **Q5. Repo name and visibility.** Resolved by observation rather than a
  direct answer: the repo already exists as `mattohara42/like-a-surgeon`,
  public, created at project start. Treating that as the answer unless told
  otherwise. Logged as **A21** in `ASSUMPTIONS.md`.

- **Q6. Manifest: generated or hand-maintained?** Resolved: **generated.**
  `data/manifest.json` is build output produced by a shared helper
  (`tools/manifest.js`) that `serve.js`, `validate.js`, and `bundle.js` all
  call, rather than something Matt hand-edits. Adding a record costs one
  file and zero manifest edits. See `docs/m1-architecture.md` section 2.

- **Q7. Scene's missing reader-facing field.** Resolved: **add `hook` +
  `blurb` to scene**, matching artist and machine. The five existing fields
  (`geopolitics`, `whatWasNew`, `production`, `labels`, `politics`) stay as
  adult-only backing detail that informs the blurb but isn't itself
  register-aware. `data/SCHEMA.md` updated. See `docs/m1-architecture.md`
  section 5.

- **Q8. What `crossLineage` means.** Resolved: **give machines, scenes, and
  labels a real `lineage` field**, same enum as artist. `crossLineage`
  becomes an actually-computable value (`from` node's lineage differs from
  `to` node's lineage) rather than an unverifiable editorial call, and
  `tools/validate.js` checks the stored boolean against that computation as
  a hard error. `data/SCHEMA.md` updated. See `docs/m1-architecture.md`
  section 5, and **A22** in `ASSUMPTIONS.md` for the specifics I had to
  decide beyond "add a field."

- **Q1. Reading levels.** Resolved: write **Teen and Adult first**. The Kid
  (7-11) register is deferred to Track D and gets written across the whole
  dataset once the Teen and Adult text is stable and has been tested on a real
  reader. The reading-level selector ships two-way at M3 and reads available
  registers from the data rather than hardcoding the count. `age7` fields in
  `data/seed.json` stay as the exemplar for that later pass.

- **Q2. Indefensible but important artists.** Resolved: **include them.** The
  `hook` field states what they changed and why they are on the map. It does
  not praise the music and it does not editorialize about the person. Where an
  artist's conduct is a documented part of why their standing changed, that
  goes in the adult register as fact, without adjectives. No data flag for now,
  writing discipline only. Logged as an open design question in `BACKLOG.md` in
  case it proves insufficient.

- **Q3. Political directness.** Resolved: **direct and factual, no softening,
  and the same facts at every reading level.** Registers change vocabulary and
  sentence length only. Redlining, deindustrialization, colonial economics,
  arson-for-insurance, and uncompensated session musicians are part of the
  causal story for Detroit, the Bronx, Kingston, and London, and they are
  stated plainly in every register. This rule is now in `CLAUDE.md` under
  "Writing rules" and it also constrains the Kid pass when it happens.
