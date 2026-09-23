# QUESTIONS

Things Claude Code needs from Matt. Answer inline and mark resolved.

## Open

None right now.

## Resolved

- **Q20. A null end year means three different things.** Resolved: **the recommendation, (a).** See **A172**. On machines,
  `discontinuedYear: null` currently means "still made" (the Mellotron),
  "one-off, no production run" (Tubby's console, the slashed Elpico) and
  "I could not find it" (six machines in the second machines batch, see
  A111). The loader draws all three to the present, and the panel prints
  "1978–now", so the Korg MS-10 reads as a synth still on sale. The
  same ambiguity exists on `artist.activeTo`, `scene.yearTo` and
  `label.closedYear`, just less often. Options:
  (a) **Recommended.** Add one optional field to every node,
  `endUnknown: true`. Null plus that flag draws the span fading out after
  the start year and prints "1978–?". Null alone keeps meaning
  "ongoing". Small change: schema, validator, loader, panel.
  (b) Allow the string `"unknown"` as a year value. Fewer fields, but every
  consumer of a year field then has to handle a non-number.
  (c) Leave it and accept the misreading until Track D sources the years.
  **Update from the source verification pass (A159, A160):** the new
  sources closed the RE-201, Ruffhouse and Pye. They confirmed that the
  Mellotron and SL-1200 really are "still made". The MPC60, MPC3000,
  Fairlight, MS-10, Mirage, Mu-Tron and Fuzz-Tone stay unknown after
  checking the English, German and French Wikipedias, so (c) no longer
  looks like it will resolve itself.

- **Q22. Should `documented` edges that cite only "histories" drop to
  `consensus`?** Resolved: **the recommendation, (a).** Raised by the source verification pass. 101 of 141
  edges are `documented`, against the roughly one quarter METHOD.md calls
  healthy. Most of them earn it: a sleeve credit, a court opinion, or the
  person's own interview account, and the credits I could check against
  Discogs held up (A163). But eight rest only on the literature agreeing,
  with no first-hand source named in the evidence: e-dubplate-tubby,
  e-melodica-pablo, e-re201-perry, e-sl1200-flash, e-herc-cokelarock,
  e-desk-tubby, e-sugarhill-mellemel and e-robinson-mellemel. By
  METHOD.md's own definitions that is what `consensus` means. Options:
  (a) **Recommended.** Move those eight to `consensus` now, and move any
  of them back when a session finds the interview or document. It's
  eight one-field edits, and it makes the tier mean one thing.
  (b) Keep them and spend a session looking for first-hand sources for
  each, now that the sources are reachable. Better if it works, but some
  of it (Kingston sound-system practice, Bronx park jams) may never have
  been written down by the people involved.
  (c) Leave the tiers alone. Accept that `documented` currently means
  "documented, or very widely agreed".
  See **A171**.

- **Q21. Going deep on hip-hop: producers, sampling lore, and order.**
  Raised by Matt after PR #24, asking for The Roots, The Goats, Souls of
  Mischief, Lords of the Underground, Cypress Hill, Beastie Boys, Wu-Tang,
  MF DOOM and more, producers as a dimension (Premier, Large Professor,
  DJ Muggs), the records sampled over and over, and classic rock
  (Zeppelin, Hendrix, Beatles, Stones). Resolved in three parts:
  (a) **Producers are data first.** They stay artist nodes, with a
  `production` edge to each act they shaped. No schema or interface
  change now. A "follow the producer" view waits in `BACKLOG.md` for the
  M3 gate.
  (b) **The sampled artist is the hub.** A heavily sampled record lives
  as its artist's node (James Brown, The Winstons, Led Zeppelin), and
  each use is a `sample` edge naming the record in its track pair. No
  record node type for now.
  (c) **Three batches, one PR each:** the 90s groups and their producers,
  then the most-sampled breaks and their artists, then classic rock,
  which then gets its sample edges into the hip-hop from the first batch.

- **Q19. Scenes are hard to click, labels get lost: re-lane the map by
  scene or label?** Raised by Matt after trying the preview. Resolved:
  **yes, as a separate "Arrange by" control** (Lineage, Scene, Label) rather
  than tied to the layer toggles. Artists with no scene or label go in **one
  lane at the bottom**, and it is **built next, before step 5**. See
  `docs/m3-architecture.md` section 7a.

- **Q18. The app does not run from `file://`, and never has.** Resolved:
  **the recommendation, (a).** `npm run build` now writes `dist/`, where the
  code is flattened into one classic script next to the data. Development
  still serves unbundled ES modules. See **A84**.

- **Q16. Where do the dataset version and last-updated date come from?**
  Resolved: **the recommendation.** `tools/manifest.js` writes a
  `generatedAt` date into the manifest it already regenerates on every run,
  and a hand-bumped `version` comes from `package.json`. See **A77**.

- **Q17. How should a track-pair side say what to search for?** Resolved:
  **the recommendation.** Each side of `trackPair` gets an optional `search`
  field. When it is absent, the query is artist plus title. A string
  replaces the query, and `false` means no link is drawn. See **A78**.

- **Q13. Where does the detail panel sit?** Resolved: **overlay drawer** on
  the right, as in the Strata prototype. The graph does not reflow, and the
  camera centres within the uncovered part of the screen.

- **Q14. Which streaming services get outbound links?** Resolved: **YouTube
  search only.** It is free and needs no account, which matters for the
  primary reader.

- **Q15. When does the Kid register appear in the selector?** Resolved:
  **only when complete.** A register is offered only if every reader-facing
  record carries it, so Kid stays hidden until the Track D pass finishes.

- **Q12. Should the map draw a Kingston-to-Bronx edge at all?** Resolved:
  **yes, it should connect.** Drawn as `e-kingston-bronx`, from the
  `kingston-dub` scene to the `south-bronx` scene rather than through Kool
  Herc, at `consensus` tier, with the dispute stated in both the evidence
  and the adult register. Scene to scene because routing it through Herc
  would attribute to him a transmission he has denied; at the scene level
  the basis is migration and resemblance of practice rather than anyone's
  testimony about themselves. It is also the dataset's first edge touching
  a scene node, which clears two orphan warnings. See **A65** and **A66**.

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
