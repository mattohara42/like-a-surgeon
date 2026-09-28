# ASSUMPTIONS

Every decision made without asking. Append, do not rewrite.

## Seeded at project start

- **A1.** Date range runs from roughly 1950, not 1962. The dub, funk, and
  electronic spines need the earlier decade to make sense.
- **A2.** Machines are first-class nodes rather than edge metadata, because for
  large stretches of this history the machine is the protagonist.
- **A3.** All audio is synthesized in-browser. No licensed recordings, ever.
  This is a legal constraint that becomes binding the day the project is hosted.
- **A4.** Hero imagery is procedurally generated from palette plus abstract SVG
  motif. Same reason as A3.
- **A5.** Layout is a left-to-right time axis with lineage lanes. Force-directed
  layout is rejected because it destroys chronological reading.
- **A6.** Data is sharded into many small files with a manifest, so that dataset
  growth is linear in effort and does not require re-architecture.
- **A7.** The `file://` fetch restriction is solved with a stdlib-only dev
  server plus a bundling step for release, rather than by abandoning the offline
  requirement.
- **A8.** The 303 AudioWorklet voice is ported from the SQUELCH project rather
  than written fresh.
- **A9.** M1 dataset targets (120 artists, 350 edges) are a first checkpoint,
  not a ceiling. Track D has no ceiling.

## Added after Q1 to Q3 were resolved

- **A10.** Registers differ in vocabulary and sentence length only, never in
  which facts are present. This is a content rule with teeth: it means the Kid
  pass cannot quietly drop the political material when it eventually happens.
- **A11.** The reading-level selector reads available registers from the data
  rather than hardcoding two, so the Kid pass does not require a UI change.
- **A12.** Inclusion of historically important but indefensible artists is
  handled by writing discipline in the `hook` field rather than by a data flag.
  Revisit if the writing proves insufficient.

## Added during M1 architecture planning (docs/m1-architecture.md)

- **A13.** Artist, machine, scene, and label ids share one uniqueness
  namespace rather than one namespace per folder, since an edge's `from`/`to`
  can be any of the four with no type tag alongside it. Enforced by the
  validator as a hard error on collision.
- **A14.** `keyProducers` keeps its current flat array of "artist ids or
  plain names" for now rather than moving to a discriminated
  `{ref}`/`{name}` shape. The validator treats an unresolved entry as a
  warning, not an error, since the schema explicitly allows plain names.
  Revisit if that warning proves noisy once real batches land — cheap to fix
  now, expensive to migrate later.
- **A15.** A record's filename must equal its own `id` field exactly.
  Disagreement is a hard validator error, not a warning.
- **A16.** (Restates A13 in validator terms.) Duplicate-id checking covers
  the shared artist/machine/scene/label namespace, and separately the edge,
  demo, and thread id spaces.
- **A17.** A thread step object must have exactly one of `nodeId`/`edgeId`,
  never both or neither. Implicit in the seed's usage, made explicit here.
- **A18.** `tools/bundle.js`'s output (`data.bundle.js`) is a classic script
  that assigns to `window.LINEAGE_DATA`, not an ES module with `export`.
  Chrome (and others) apply CORS checks to module loads, and `file://`
  origins fail that check the same way `fetch()` does; a classic
  `<script src>` tag is not subject to it. This is the one deliberate
  exception to `CLAUDE.md`'s "ES modules" rule, scoped to the data payload
  only.
- **A19.** `tools/validate.js` validates the sharded `data/` tree via
  `data/manifest.json`, never `data/seed.json`. The seed is a frozen
  reference copy, not live data.

## Added after Q4 to Q8 were resolved

- **A20.** The version-stamp UI from Q4 ships at M3 (reading surface),
  alongside the confidence legend rather than earlier, since neither is
  useful until there's a real reading surface to put it on.
- **A21.** Q5 (repo name, public from the start) taken as answered by the
  repository's own existing state (`mattohara42/like-a-surgeon`, public)
  rather than asked directly, since re-asking a question the filesystem
  already answers would be theater. Flagged in `QUESTIONS.md` in case that
  reading is wrong.
- **A22.** Q8's "give machines/scenes/labels a lineage field" resolved to
  specifics: `machine.lineage`, `scene.lineage`, and `label.lineage` use the
  same enum as `artist.lineage` (`"rock" | "electronic" | "hiphop" | "dub" |
  "funk" | "other"`) and are required, representing the node's editorial
  "home" lineage rather than a computed genealogy. `edge.crossLineage` is
  computed as `fromNode.lineage !== toNode.lineage`, resolving `from`/`to`
  through whichever of the four node types they name. `tools/validate.js`
  checks the stored boolean against that computation and treats a mismatch
  as a hard error, since it's now a real derived value, not an editorial
  claim.

## Added while building M1 tooling

- **A23.** `data/manifest.json` and `data/data.bundle.js` are gitignored,
  since A21/Q6 made the manifest generated output and the bundle is a
  release artifact. Both are one command away (`npm run validate` /
  `npm run dev` regenerate the manifest; `npm run build` writes the bundle).
- **A24.** Only artist/machine/scene/label carry a literal `type` marker
  field (`"type": "artist"`, matching `SCHEMA.md`). Edge repurposes `type`
  for its relationship enum instead, and demo/thread have no `type` field
  at all, matching how the seed already writes them. `tools/validate.js`'s
  type-marker check is scoped to the four node shards only; edge's `type`
  is validated separately against `EDGE_TYPES`.
- **A25.** `tools/serve.js` and `tools/bundle.js` both call
  `tools/manifest.js`'s `writeManifest()` on every run, so
  `data/manifest.json` is regenerated fresh each time rather than assumed
  current. Cheap at this dataset size; revisit if manifest generation ever
  gets expensive enough to matter.
- **A26.** `artist.scenes[]` and `artist.labels[].labelId` referencing a
  scene or label that doesn't exist yet is downgraded from a hard error to
  a warning in `tools/validate.js`, ahead of wiring up CI. `CLAUDE.md`'s
  scope rule states data expansion "is a permanent parallel track with no
  gate at all," and a hard error here would make CI red for the entire
  Track D expansion period, exactly the gate that rule forbids. Structural
  references that connect nodes rather than name a not-yet-written one
  (`scene.memberIds`, `edge.from`/`to`, `demoId`, thread steps) stay hard
  errors, since those are added alongside the nodes they connect.

## Added during the second data batch (2026-09-28)

- **A27.** Prioritized clearing existing debt over adding wholly new
  artists: all eight labels and five scenes that were already referenced by
  `artist.scenes[]`/`artist.labels[]` but never authored got written first,
  since they were already half-committed to by the existing roster and
  resolve real validator warnings rather than add new unreferenced content.
  Three new artists (James Brown, Grandmaster Flash, Derrick May) and three
  new edges were added afterward, chosen because each connects cleanly and
  verifiably to the existing graph rather than starting a new island.
- **A28.** James Brown brings the `funk` lineage its first node, and was
  given `scenes: []` rather than inventing a scene to hold him, since no
  funk-lineage scene exists yet and writing one properly (geopolitics,
  production, labels, politics fields) felt like it deserved its own
  editorial pass rather than being rushed to avoid an empty array. Logged
  in `BACKLOG.md`.
- **A29.** Per `CLAUDE.md`'s "historical importance is not endorsement"
  rule, James Brown's adult-register text states his domestic violence
  arrests and 1988 conviction as fact, without adjectives, alongside the
  documented account of him fining band members for mistakes. Neither is
  softened or omitted; neither is editorialized about beyond what's stated.
- **A30.** Three label records (`cbs-uk`, `pye`, `brunswick`) have
  `foundedYear` and/or `closedYear` set to `null` rather than a best-guess
  year, per `CLAUDE.md` rule 2 ("never invent a date... null it and note
  it"). I was not confident enough in these specific years from training
  knowledge to state them as fact. Flagged in `BACKLOG.md` for a
  verification pass.
- **A31.** The `e-jamesbrown-southbronx` edge connects James Brown directly
  to the `south-bronx` scene node rather than to `afrika-bambaataa`
  personally. I could not pin a specific, confidently-accurate James
  Brown/Bambaataa track pairing to a `documented` or even safely `consensus`
  standard, so I widened the claim to the scene level, where the underlying
  fact (JB's breaks as foundational breakbeat-DJing raw material) is much
  more solidly supported, and used `trackPair.later` (James Brown "Funky
  Drummer" into Public Enemy "Fight the Power") as an illustrative,
  well-documented pairing that doesn't require either artist to be a graph
  node itself, since `trackPair` fields are descriptive strings, not
  references.
- **A32.** `e-jamesbrown-southbronx` and `e-flash-bambaataa` are both tiered
  `consensus` rather than `documented`, since their evidence describes
  broadly repeated scene history rather than a specific citable interview
  or quotation, matching the tiering logic already used in
  `e-tubby-pil.json`.
