# QUESTIONS

Things Claude Code needs from Matt. Answer inline and mark resolved.

## Open

(none)

## Resolved

- **Q10. Should `edge` carry a certainty note, or is the derived proxy
  enough?** Resolved: **keep it derived.** No schema change. The ranking in
  `tools/report.js` (confidence tier, plus flags read off the record) stays
  the way "least sure about" is computed, and every flag that fires prints
  next to its edge so the ranking can be argued with. Revisit if it is
  visibly wrong about a specific edge. See **A52**.

- **Q11. Does the M1 dataset target still stand?** Resolved: **yes, hold the
  numbers.** 120 artists, 25 machines, 20 scenes, 30 labels, 350 edges, 5
  threads, 60 cross-lineage edges, 30 edges with a demo. `BUILD_PLAN.md` is
  unchanged and M1 stays open until the dataset reaches it. The practical
  consequence: sessions from here are Track D data work, leading with
  machines (2 of 25, and every M4 audio demo needs one), and no new feature
  milestone opens until the targets are met. M2 shipping early does not
  become a precedent. `npm run report` measures the distance each time.

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
