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

## Added during the M1 cleanup pass (backlog items resolved before Track D batch 1)

- **A27.** The six seed artists short on `signatureTracks` (below `SCHEMA.md`'s
  2-3 target) were backfilled to two entries each with real, verified tracks
  rather than by inventing plausible-sounding ones. Every added title and
  year was checked against web sources before being written in, per
  `CLAUDE.md`'s "never invent a date" rule; this took real search effort
  and is not a rubber-stamp fix.
- **A28.** This pass originally authored the five scenes and eight labels
  referenced by existing artists but never written. While that work was in
  flight, data batches 1 and 2 merged into `main` and independently
  authored the same records. Rather than reconcile two separately
  researched versions field by field, `main`'s versions were kept wholesale
  and this pass's own copies dropped; nothing here should be read as a
  claim about their content. See those batches' own `BACKLOG.md` and
  `ASSUMPTIONS.md` entries for how they were sourced.
- **A29.** `data/edges/e-tubby-kraftwerk-nonedge.json` renamed to
  `e-tubby-atkins-resemblance.json` (file and `id` both), since its old
  name referenced Kraftwerk while its actual `from`/`to` are King Tubby and
  Juan Atkins, a stale naming mismatch rather than a content problem. Its
  content was kept substantively as-is (an honest `asserted`-tier edge that
  explicitly states "no documented connection" and frames itself as
  resemblance, not transmission) rather than removed, since it demonstrates
  a real, defensible pattern this dataset needs: `BUILD_PLAN.md`'s M1 gate
  itself asks Matt to review "the twenty edges you are least sure about,"
  so having at least one clean example of that tier in place is useful, not
  filler. Flagged as **Q9** in `QUESTIONS.md` in case Matt would rather cut
  it than keep it.

## Added while building M2 (docs/m2-architecture.md)

- **A30.** Machines get their own dedicated band above the six lineage
  lanes rather than sharing a lane with the lineage named in
  `machine.lineage`. Resolves the "whether machines should share lanes with
  artists or get their own band" open question `BACKLOG.md` had been
  carrying since M1. `machine.lineage` still drives `edge.crossLineage`
  computation, it just isn't what positions a machine vertically. This is
  layout code, cheap to reverse if it reads wrong once there's more machine
  data to look at.
- **A31.** Node/edge position (x1/x2/y, i.e. where something sits on the
  time axis) is left in content coordinates and scales with the viewport
  transform on purpose. Every other visual property, marker radius, stroke
  width, font size, hit-area size, dash length, is divided by the current
  scale before being set, so it reads as a constant size on screen
  regardless of zoom level. Found the hard way: the first version set all
  of these in content-space units too, and they were multiplying with the
  zoom transform on top of the already-tiered collapsed/mid/detail sizing,
  blowing up to hundreds of screen pixels at high zoom and shrinking to
  nothing at low zoom.

## Added restyling M2 to Matt's "galaxy" direction

Matt asked for a visual more like a 3D galaxy: colorful glowing planets
sized by popularity, linked by trails, click one to zoom to another. That
collides directly with `SPEC.md` ("Layout is a left-to-right time axis with
horizontal lanes by lineage. Explicitly not force-directed.") and
`CLAUDE.md`'s anti-goals ("No force-directed layout, it looks impressive
and destroys chronological reading"), which exist because the project's
success test depends on a reader seeing *when* things happened relative to
each other. Raised this in chat before touching anything; Matt chose
restyling the existing chronological layout as glowing planets/trails over
a true 3D/force-directed rebuild, so the time axis and lineage lanes are
unchanged, only the visual language changed.

- **A32.** Node size ("planet size") is driven by graph connectedness
  (in+out edge count for that node), not record sales. Matt's original
  framing was "more popular artists that sold more records are larger,"
  but no sales/certification data exists in the schema, and real sales
  figures are exactly the kind of thing `CLAUDE.md`'s accuracy rules would
  need serious sourcing discipline for (contested, patchy for older and
  non-US/non-mainstream acts, which is a lot of this roster). Raised this
  as a separate question; Matt chose connectedness. Radius scales with the
  square root of degree (not degree directly), so visual area rather than
  radius grows roughly linearly with connections, standard bubble-chart
  practice. If real sales/certification data gets added to the schema
  later, this is a one-function change in `render/graph.js`
  (`computeDegreeFactors`), not a rearchitecture.
- **A33.** Click-to-fly-to (`render/viewport.js`'s `flyTo`) animates the
  pan/zoom transform to center and zoom in on whatever was clicked, rather
  than jumping instantly, per Matt's "click on it to zoom to another planet
  or cluster." Any user-initiated pan or zoom interrupts an in-flight
  fly-to instead of fighting it, so grabbing the view mid-animation always
  wins.
- Glow (a blurred, larger, low-opacity copy of each node's/edge's own color
  behind the crisp shape) uses two *shared* SVG filters, one for nodes and
  one for edges, rather than one filter instance per element. Filters are
  costly enough in SVG that per-element instances would have been a real
  perf risk; a shared filter whose blur radius is updated once per frame
  (same counter-scaling approach as everything else, see A31) costs two
  attribute writes regardless of how many nodes/edges are on screen.
  Re-measured the M2 perf gate after this restyle: `render()` averages
  3.2ms (was 1.9ms pre-restyle), max 13.5ms, still 0/90 sampled frames over
  the 16.7ms budget.

## Added reconciling a second parallel Track D session against merged main

A separate session (this one, working from an earlier `main`) independently
researched and wrote 8 artists, 6 labels, and 2 scenes covering the same
dub/electro/Detroit/Chicago ground the by-then-merged data batches 1 and 2
had already covered, plus M2 on top of that. Two Claude sessions reaching
the same real facts (the Belleville Three friendship, Arthur Baker's
production credit, King Tubby mixing Augustus Pablo, Sly and Robbie's
riddim economy, Frankie Knuckles at the Warehouse) independently, from
separately-run research, reads as convergent validation of the underlying
history, not as either session being sloppy; Matt's framing, on being told
about the collision. Handling it as a design smell to fix would be the
wrong lesson.

- **A34.** Reconciliation kept `main`'s already-merged versions wholesale
  for every artist/label/scene both sessions wrote (Derrick May, Kevin
  Saunderson, Arthur Baker, Augustus Pablo, Sly and Robbie, Frankie
  Knuckles; the Metroplex/Kling Klang/Tommy Boy/Trax/Transmat labels; the
  Düsseldorf Electronic and Chicago House scenes), rather than
  reconciling field-by-field, since both were independently sourced and
  comparably rigorous on inspection (spot-checked `derrick-may.json`
  side by side). This session's branch was rebuilt from scratch on top of
  current `main`, keeping only what `main` didn't already have: **Man
  Parrish** and **Mad Professor** as artists, **Ariwa** and **Rockers
  International** as labels, and four connecting edges
  (`e-808-manparrish`, `e-kraftwerk-may`, `e-perry-madprofessor`,
  `e-tubby-madprofessor`).
- **A35.** Dropped this session's `e-knuckles-phuture` edge (Frankie
  Knuckles' Warehouse/Power Plant sets as the scene Phuture grew up in,
  `consensus` tier) rather than add it alongside `main`'s already-merged
  `e-hardy-phuture` (Ron Hardy's Music Box tape circulation of 'Acid
  Tracks' before release, `documented` tier). Both claims are real, but
  Hardy's is the more specific and better-sourced version of essentially
  the same Chicago-house-scene-to-Phuture transmission; keeping both would
  have padded the edge count with a strictly weaker duplicate rather than
  adding real coverage.
- **A36.** `main`'s `e-knuckles-atkins` and `e-hardy-phuture` already
  establish real precedent for edge `type: "scene"` (a scene-level
  cultural influence reaching a specific artist, `from` the influencing
  figure `to` the influenced artist), which this session's own `BACKLOG.md`
  entry had flagged as having no worked example anywhere in the dataset.
  That flag is now stale; see the `BACKLOG.md` correction alongside this
  entry. `edge: type: "label"` still has no example.

## Added during the visual direction pass

- **A37.** Visual exploration lives in `design/` as standalone prototypes
  rather than in a `src/`. `BUILD_PLAN.md` gates the renderer at M2 behind
  an incomplete M1, but `CLAUDE.md`'s working style says "lock design before
  implementing." Prototypes satisfy the second without breaking the first:
  they are throwaway, they import nothing, and nothing imports them.
- **A38.** `design/data-snapshot.js` is a generated snapshot of `data/`, written by
  `tools/design-snapshot.js` as a classic script that sets `window.LINEAGE`.
  `file://` blocks `fetch` and ES module imports but not `<script src>`, so
  this is the only shape that lets a prototype open by double-click with no
  server. It is explicitly not an answer to the `file://` problem for the
  real build, which stays with `tools/serve.js` and `tools/bundle.js` per
  M1 step 4. Unlike the other generated files in **A23**, it is committed
  rather than gitignored: a prototype that needs `npm install` before it
  opens defeats the point of a prototype. It carries a "do not edit"
  header instead.
- **A39.** Lineage colour is a separate system from the `palette` field on
  scene records. Scene palettes drive the scene clouds in the prototypes;
  the four lineage colours (rock, dub, hip-hop, electronic) are invented in
  each prototype and chosen for hue separation on a dark ground. If a
  direction is picked, these move into `CONFIG` properly and should be
  checked against colour-vision deficiency before they ship.
- **A40.** The prototypes place machines three different ways on purpose:
  own lane at the bottom (01), mixed among artists with an angular form
  (02), and on a receding floor beneath everything with light rising from
  it (03). **A30** had already settled this for `render/` (own band, above
  the lanes) while this branch was cut from a stale `main`; that is now
  four answers to one question, all resting on a two-machine sample. A30
  itself says it is "cheap to reverse ... once there's more machine data",
  so this is flagged for Matt rather than decided here.
- **A41.** None of the prototypes import `render/`, and all three omit
  label nodes and render scenes as atmosphere rather than as graph nodes,
  where `render/` draws both as nodes in the lanes. Not a considered
  disagreement at the time (this branch was cut before `render/` existed on
  `main`), but it is a real fork and the README puts it to Matt as one.
  Keeping the prototypes free of `render/` is deliberate: three variations
  sharing one renderer would have produced three skins, not three
  arguments.
- **A42.** Node collision is resolved by moving `y` only, never `x`, and
  clamping each node back inside its own lane. `x` is the year and fudging
  it would corrupt the one axis the project cannot afford to lie about.
  Needed once the roster passed roughly twenty nodes; the first version of
  these prototypes was built against a 12-record snapshot where staggered
  offsets were enough.

## Added porting the Strata direction into render/

Matt reviewed the three prototypes in `design/` and picked **03 Strata**.
These cover what changed in `render/` to carry it, and what it supersedes.

- **A43.** Machines move from a band *above* the lineage lanes to a floor
  receding *below* them, drawn in real perspective, with a machine's
  influence rising out of it as a vertical shaft of light. This
  **supersedes A30**, which put them in a band above and said it was
  "cheap to reverse if it reads wrong once there's more machine data to
  look at." It still reads off two machines, so it is still cheap to
  reverse: `CONFIG.substrate` and `render/substrate.js` are the whole of
  it. What decided it is that the substrate makes `SPEC.md`'s
  machine-as-protagonist claim structural rather than decorative.
- **A44.** Scenes render as atmosphere (a blurred cloud from the
  `palette.accent` the scene record already carries, behind its members)
  rather than as graph markers, and labels are left to the labels overlay
  planned for M5. Both previously drew as nodes in the lanes. This roughly
  halves what competes for attention at a glance, and it is the one place
  the port *removes* something a reader could previously click:
  a label is now reachable only through an artist until that overlay
  exists. Flagged to Matt rather than slipped in, and reversible by one
  line, `CONFIG.layout.graphNodeKinds`.
- **A45.** Row packing packs a node's **label footprint**, not its career
  span. Packing career spans is what produced the vertical column of names
  beside an unused time axis: `endYear` for anyone still active is the
  current year, so every living artist overlapped every other one and each
  lane needed one row per artist. The career span is still drawn, as the
  faint orbital track. Footprint width is estimated from the name length
  via `CONFIG.layout.labelCharPx`, sized for the opening zoom; labels are
  counter-scaled to a constant screen size, so there is no single correct
  value and this one is deliberately generous.
- **A46.** The opening view frames the years something actually happens in
  (first start year to last), not the full axis. Careers running to the
  present stretch the axis to the current year, so fitting the whole thing
  opens on a map that is mostly empty. The semantic zoom thresholds in
  `CONFIG.zoom.levels` were retuned to match: the opening fit has to land
  inside `mid` or the map opens with no names on it.
- **A47.** `.claude/hooks/session-start.sh` reports how far behind
  `origin/main` the checkout is and which branches are in flight. Added
  because this branch was itself cut from a stale `main` and rebuilt work
  that already existed. The hook installs nothing: this project has no
  dependencies, so telling a session the truth about where it is starting
  is the only useful thing a session start can do here.

## Added making the record types toggleable

- **A48.** Scenes, labels and machines each get a reader-facing toggle
  rather than a fixed answer. This **replaces the decision half of A44**:
  A44's reasoning (each type competing for attention, labels reachable
  only through an artist) was right about the trade-off and wrong to
  settle it once for everyone. A reader following one artist's influence
  wants the map quiet; a reader asking who owned the masters wants the
  labels on. Defaults stay as A44 had them, scenes and machines on and
  labels off, so the map still opens calm.
  Artists are deliberately not toggleable: a map with no artists on it is
  not a view anyone is looking for.
- **A49.** Each type keeps one representation, and the toggle controls
  whether that type appears at all: scenes as atmosphere, labels as
  markers in the lineage lanes, machines as the whole substrate (floor,
  markers and beams). With machines off there is no floor rather than an
  empty one, because the substrate is the machines' representation and not
  scenery that happens to sit under the lanes.
- **A50.** A toggle rebuilds the graph rather than restyling it. Labels
  and machines take lane rows, so turning either on moves everything below
  it; there is no honest way to do that without recomputing the layout.
  The reader's camera and year are carried across the rebuild, and the
  year is re-clamped because the axis itself moves (turning labels on
  pulls it back to 1953, since Pye Records was founded before any artist
  on the map started).
- **A51.** Layer choices persist per reader in `localStorage`, under
  `CONFIG.layers.storageKey`, matching the pattern `SPEC.md` already
  specifies for the reading-level selector. Every access is wrapped:
  `localStorage` can throw outright in private mode or with site data
  blocked, and a reader whose browser refuses to remember should still get
  a working map on the defaults. Only known keys with boolean values are
  read back, so a stale or hand-edited entry cannot invent a layer.
- **A52.** "The twenty edges you are least sure about" (the M1 gate) is
  computed, not stored. No field on `edge` records how sure the author was,
  and adding one is a schema change I did not want to make unasked, so
  `tools/report.js` derives a proxy: confidence tier sets a base score, then
  named flags readable off the record add to it (evidence that says the
  connection is not documented, evidence that calls a claim disputed or
  widely repeated, hedging with probably/may have, evidence under 120
  characters, a track pair naming no specific record or missing a year, a
  pair whose chronology runs backwards). Every flag that fires is printed
  next to its edge, so the ranking shows its working instead of asking to be
  trusted. Ties break by id, which carries no meaning. Raised as **Q10** in
  `QUESTIONS.md`, because a stored field would be more honest than a proxy
  if the tier alone is not doing enough work.
- **A53.** The report's sampling is seeded (mulberry32, default seed 1)
  rather than genuinely random. "Twenty randomly sampled `whatToListenFor`
  fields" has to be reviewable: the same seed against the same dataset draws
  the same twenty, so a review comment can name one and the next run still
  shows it. `--seed=N` draws fresh.
- **A54.** `docs/m1-gate-report.md` is committed generated output, the same
  way `data/manifest.json` is, so the gate review can happen in a pull
  request rather than in a terminal nobody else can see. It carries a
  generation date and goes stale the moment data lands; `npm run report`
  rewrites it. The scoring constants live at the top of `tools/report.js`
  rather than in `config.js`, following `tools/validate.js`: `config.js` is
  the running app's tuning surface, and the tools do not import it.
- **A55.** `tools/report.js` is a rewrite, not a new tool. A first version
  landed with data batch 1 (tier-sorted least-sure edges, an unseeded
  random `whatToListenFor` sample, counts left to the validator). Nothing
  referenced it: no npm script, no README row, no CI step, and
  `docs/m1-architecture.md` describes it as a thing to build later, so I
  overwrote it before noticing it existed. The rewrite keeps both of its
  sections and adds the counts, the distance-to-target table, Markdown
  output to a committed file, seeded sampling, and the flag-based
  uncertainty ranking. Its `--sample N` flag is gone, replaced by
  `--edges=N` and `--tracks=N`, since the two sections want different
  sizes. The tool is now wired into `package.json`, the README and CI, so
  the next session finds it before rewriting it again.

## Added during the machines batch

- **A56.** `machine.lineage` means the world the machine was built for and
  sold into, not the world that ended up using it. So the Technics SL-1200
  (consumer hi-fi), King Tubby's MCI console (professional studio gear), the
  Roland Space Echo (guitarists and studios) and the Hohner melodica (school
  teaching aid) are all `other`, and their edges into dub and hip-hop come
  out as genuinely cross-lineage. That is the honest reading of A22's
  "editorial home lineage" and it makes `crossLineage` mean something on
  machine edges: a machine crossing into a scene it was never aimed at is
  the single most common story in this dataset.
- **A57.** The 12-inch single is filed as `funk`. Disco has no value in the
  lineage enum and funk is its nearest neighbour, which is a compromise
  rather than a correct answer. Logged in `BACKLOG.md` under observed
  problems: the enum may need a disco value, and that is a schema change
  touching the validator and the lineage palette, not a data fix.
- **A58.** `machine.kind` has no value for an effect unit, a mixing desk or
  a turntable. The Space Echo is filed as `studio-technique`, since it is a
  processor in a chain. King Tubby's console and the SL-1200 are filed as
  `instrument`, on the grounds that this project's whole argument about both
  is that they were played rather than configured. That reading is
  defensible but it is a reading, and the missing `effect` kind is logged in
  `BACKLOG.md`.
- **A59.** A one-off machine has an acquisition date, not a release date.
  `tubby-mci-console` carries `releasedYear: 1972`, the year the desk
  reached Tubby, with its mid-1960s build date stated plainly in the record's
  own `whatActuallyHappened`. A null would have been more literally correct
  and would have made the node invisible, since the renderer places machines
  on the time axis by `releasedYear` (see the `brunswick` label problem
  already in `BACKLOG.md`).
- **A60.** Likewise `dubplate` carries `releasedYear: 1950` as an explicit
  placement anchor for a practice documented in Jamaica from the late 1940s
  onward. The record says so in its own text rather than letting the number
  pass as a fact. There is no year the dubplate came out.
- **A61.** New records in this batch carry all three registers, `age7`
  included, matching every record already in `data/`. `CLAUDE.md` defers the
  Kid pass to Track D and requires only Teen and Adult, but every existing
  record has all three, and writing two of three now would leave the Kid
  pass with a ragged subset to find rather than a uniform dataset to rewrite.
- **A62.** I had the wrong machine for "Strings of Life". From memory I was
  going to author an E-mu Emulator II record and hang the edge off it;
  checking first turned up the Ensoniq Mirage instead, and the Emulator II
  never got written. Logged because the fact-check is the only reason the
  error did not ship, and because it is a concrete argument for verifying
  gear attributions rather than trusting recall on them.
- **A63.** The map does not draw a Kingston-to-Bronx edge through Kool Herc,
  and that is a decision rather than an omission. `BACKLOG.md` had recorded
  Herc as "the documented carrier" of Jamaican sound system practice into
  the Bronx; researching him for this record falsified that. Herc has
  answered the question both ways across decades of interviews, at times
  rejecting any connection to toasting outright and naming James Brown and
  the Last Poets as the source of rap's vocal style, at other times
  describing his DJing as something he brought from Jamaica. Scholarship
  splits the same way, with some reading the resemblance as shared
  African-American and Caribbean DJ roots rather than transmission. An edge
  would make the map assert, at best at `asserted` tier, a claim its own
  subject rejects half the time. The contest is written into Herc's adult
  register instead, where it can be stated as a contest. Raised as **Q12**
  in `QUESTIONS.md`, because the dub-to-hip-hop crossing is load-bearing for
  this project's thesis and the call is Matt's, not mine.
- **A64.** While adding Herc to `south-bronx`'s `memberIds` I also added
  `grandmaster-flash`, who declares the scene in his own record but was
  missing from the scene's member list. That is the artist-declares-scene
  versus scene-lists-member gap already recorded in `BACKLOG.md`. Fixed for
  this one file because I was editing it anyway; the validator still has no
  check in either direction, and the other scenes are still unreconciled, so
  the backlog item stands.
- **A65.** Q12 resolved yes, so the Kingston-to-Bronx crossing is drawn, but
  it runs `kingston-dub` to `south-bronx` rather than through Kool Herc.
  Routing it through him would attribute to a living person a transmission
  he has repeatedly denied. At the scene level the basis is demographic and
  structural rather than testimonial (documented migration, plainly
  resembling practices, inferred causal direction), which is weaker
  evidence and a more honest claim. Held at `consensus` per `CLAUDE.md`
  rule 4, with the dispute stated in the evidence and in the adult
  register, including the reading that the resemblance reflects common
  African-American and Caribbean DJ roots rather than one scene feeding the
  other.
- **A66.** This is the dataset's first edge with a scene node on either end,
  which clears `kingston-dub` and `south-bronx` from the orphan warnings and
  sets the precedent for scene-to-scene edges: use them for claims about
  cultures rather than people, where naming an individual carrier would
  overstate what the sources support.
- **A67.** Matt signed off M1 in chat ("M1 is good") in the same message that
  asked for another batch. Read as: the gate report passes on quality, and
  the numeric targets held at Q11 still stand, since "batch" is Track D
  language and no feature milestone was opened. If that reading is wrong and
  M1 is meant to be closed outright, say so and M3 can open; nothing in this
  batch depends on which way it goes.

## Added during the Bronx batch

- **A68.** `sylvia-robinson` carries `lineage: "funk"`, not `hiphop`,
  following A56's logic applied to a person: her home is the R&B and funk
  business she had worked in since 1957, and hip-hop is what she crossed
  into. This makes her edges into rap genuinely cross-lineage, which is the
  substance of her story rather than a technicality: the person who first
  saw that rap could be sold on a record had spent two decades in another
  business. Duke Bootee is filed `hiphop` despite arriving from a session
  band, because unlike Robinson his defining work is inside the form.
- **A69.** `edge.type: "label"` now has its worked example
  (`e-sugarhill-mellemel`) and a direction convention, which `BACKLOG.md`
  had flagged as missing: a label edge runs **label to artist** and claims
  that the label's decisions changed the artist's output, matching the
  machine-to-artist direction where the thing acts on the person. Founding
  and roster relationships are deliberately not edges: they live in the
  label's `founders` field and the artist's `labels` field. That keeps
  label edges to actual causal claims rather than turning the graph into a
  directory.
- **A70.** I wrote three artist records with `labels` as bare id strings
  instead of the schema's `{ labelId, from, to }` objects, and four with
  `signatureTracks` entries missing `whyThisOne`. The validator caught the
  first and not the second, because it counts `signatureTracks` entries
  without checking their shape. Both are fixed here; the validator gap is
  logged in `BACKLOG.md`, since `whyThisOne` is reader-facing text and a
  record can currently ship without it and pass clean.

## Added on closing M1

- **A71. Disco.** Matt asked for disco to be alluded to rather than added,
  and for the map to be visibly embarrassed about this. Done, on the
  following terms, because the embarrassment is not allowed to cost the
  reader a fact.

  The lineage enum gains no `disco` value. `twelve-inch-single` and
  `sylvia-robinson` stay filed under `funk`, which is the nearest available
  neighbour and is not the right answer. The records themselves go on
  naming Salsoul, Walter Gibbons, the remix contest, the extended club mix
  and the New York clubs in plain terms, because that material is
  load-bearing for house and for the remixer becoming an author. Declining
  to give something a label on the map is not a licence to stop describing
  it.

  So the embarrassment here is the map's and not disco's, and it is the
  right feeling to have for a slightly different reason than the joke
  usually implies. Disco's reputation was not lost in a fair fight. On 12
  July 1979 a Chicago radio DJ blew up a crate of disco records between
  games of a White Sox doubleheader and the crowd rioted; ushers reported
  that people had also turned up with funk and R&B records to be destroyed.
  Historians broadly read the backlash as a reaction to changing racial and
  sexual rules in America, disco having come out of Black, Latino and queer
  spaces before it reached the mainstream. Nile Rodgers of Chic has said
  the footage looked to him like a book burning. Steve Dahl, who ran the
  event, has consistently denied any racial or homophobic intent and says
  it was about the music.

  Which is to say the position "we would rather not get into disco" has a
  lineage of its own, and it is not a flattering one. Filed under `funk`.
  Moving on, briskly, whistling.

- **A72. M1 closed.** Matt closed M1 in chat. The step-5 numeric targets
  were unmet at closing and are not abandoned: they move to Track D as its
  destination, which is where `BUILD_PLAN.md` always said data expansion
  belongs, and `npm run report` keeps measuring the distance. This
  supersedes **A67**, which read an earlier "M1 is good" as a quality
  sign-off with the Q11 targets still gating. Closing M1 opens M3, the
  reading surface, since M2 shipped ahead of its gate. The largest single
  piece of M3 is already specified in `BACKLOG.md` under "Deferred from the
  Strata port": the detail panels, which the design prototype had and the
  shipped renderer does not, and which are the reason clicking a node
  currently only logs.

## Added while planning M3 (docs/m3-architecture.md)

- **A73.** The reading surface lives in a new `reading/` directory rather
  than inside `render/`, and only `main.js` wires the two together. The
  graph gains three small API additions (`focusNode`/`focusEdge`, a right
  camera inset, `selectedId`) and never imports from `reading/`.
- **A74.** Selecting a node whose layer is off, from a panel link or a
  search result, turns that layer on and then focuses the node. The
  alternative, a panel describing something the map refuses to show, is the
  worse surprise. The toggle chip updates, so one click undoes it.
- **A75.** Scene panels are reached from artist scene chips and from search.
  The nebula stays unclickable, because making it a hit target would fight
  with panning.
- **A76.** Interface copy (tier explanations, panel headings, legend text)
  is written in registers in `reading/copy.js` and follows the same writing
  rules as the data. It also counts toward Q15's completeness test, so the
  Kid register cannot appear with an untranslated interface around it.
- **A77.** (Q16) The manifest gains two top-level keys, `generatedAt` (an
  ISO date) and `version` (read from `package.json`). Both sit beside the
  shard lists, and `tools/validate.js` ignores them. The date records when
  the manifest was last regenerated, which in dev is every server start.
  That is close enough for a "last updated" line, and a release bundle fixes
  it at bundle time.
- **A78.** (Q17) `trackPair.earlier.search` and `trackPair.later.search`
  are optional. A string overrides the query, and `false` suppresses the
  link. The validator rejects any other type as a hard error, since a
  malformed value would silently draw a wrong link.

## Added while building M3 step 1 (panels)

- **A79.** The drawer stops above the transport bar rather than running to
  the bottom of the screen, so the year readout and play button stay usable
  while reading. Its bottom edge reuses `CONFIG.viewport.fitBottomInsetPx`,
  the height the opening fit already reserves for the transport.
- **A80.** Added `reading/dom.js`, a small element builder that is not in
  the plan's file list. It is the one place that enforces the plan's
  "textContent only, never innerHTML" rule for record text, and it holds the
  tier swatch, which draws from the same `CONFIG.edge` values the map uses.
- **A81.** The Teen register names the `asserted` tier "Our reading". The
  Adult register keeps "Asserted". Same fact, simpler word: "asserted" is
  exactly the vocabulary a 13-year-old does not have yet, and the tier's
  explanation sits beside it in both registers.
- **A82.** A scene's member list is the union of `scene.memberIds` and
  every artist whose `scenes[]` names it, because the two are known to be
  out of sync (BACKLOG). The reader should not lose a member to a data gap
  the validator does not catch yet.
- **A83.** Following a panel link moves the camera. Clicking the map opens
  the panel. Back steps through the drawer's stack and moves the camera
  with it. Closing the drawer clears the map highlight but leaves the
  camera where it is.
- **A84.** (Q18) The release is a folder, `dist/`, rather than extra files
  beside the source: `dist/index.html`, `dist/data.js` (the data bundle,
  which used to be `data/data.bundle.js`) and `dist/app.js` (the code).
  One folder that opens from disk is easier to hand to someone than
  instructions about which files matter. The code bundle wraps each module
  in a function scope and runs them in ES module evaluation order. It
  handles only the syntax this codebase uses and fails the build, with file
  and line, on anything else. CI already runs the bundler, so that failure
  shows up there. The source tree is never rewritten, and ES modules remain
  the only way the code is written. This is the same trade A18 made for
  data, extended to code, and it is the one place the project has a build
  step. It exists only for the release copy.

## Added while building M3 step 2 (legend and version stamp)

- **A85.** The dataset version starts at `0.1.0` in `package.json`. There
  was no earlier version to continue from, and a 0.x number says honestly
  that the map is far from its M1 targets. Bump it by hand when the dataset
  changes in a way worth announcing. Nothing bumps it automatically.
- **A86.** The legend sits bottom-left, above the transport bar, where the
  drawer never reaches. It opens expanded on a first visit, because the
  tiers are part of what the map teaches (SPEC.md), and after that it
  remembers the reader's choice. Collapsed, it still shows all three
  swatches and the version stamp, so it is never truly hidden. Its text
  follows the reading register.

## Added when setting up the Netlify preview

- **A87.** Matt asked for a web preview on Netlify. The site is
  `like-a-surgeon` (like-a-surgeon.netlify.app), linked to this repo with a
  deploy preview per PR, and `netlify.toml` tells it to run `node tools/bundle.js` and publish `dist/`:
  the same offline build CI makes, served as static files. This is a
  preview for checking M3 work, not the hosting path M6 owns, and it adds
  no runtime network dependency, since `dist/` still makes no requests of
  its own. A direct upload through the Netlify MCP tool was refused (403
  from Netlify's upload relay, no reason given), which is why the preview
  builds from the repo instead. That attempt also created an empty
  `lineage-atlas` site, which is unused and can be deleted.

## Added while building M3 step 3 (search)

- **A88.** The search box sits top centre, where people look for one first,
  clear of the controls on the left and the drawer on the right. Its
  placeholder and labels follow the reading register, like every other
  piece of interface copy (A76).
- **A89.** Place matches are grouped by the part of the place that matched,
  not by the whole place string. Records spell places inconsistently: labels
  carry a city but no country, and some artists name a neighbourhood
  ("Waterhouse, Kingston"). Grouping by the full string split Detroit into
  two groups and Kingston into three. Now "kingston" gives one "From
  Kingston" group and "jamaica" gives one "From Jamaica" group. A record
  whose name matches is listed under Names and not repeated under a place.
- **A90.** Escape in the search box clears the search and does not close
  the drawer, because the reader was stopping a search, not closing what
  they were reading. Choosing a result clears the box, ready for the next
  search. `/` focuses the box from anywhere that is not already a text
  field.
- **A91.** A year result moves the year cursor to that exact year, which
  can move it backwards. Clicking a node only ever moves the cursor
  forward. Typing a year is a request to stand there, and a node click is
  not.

## Added while building M3 step 4 (YouTube links)

- **A92.** Q17 estimated "roughly 17 of 122" track-pair sides were not
  records. That figure came from a keyword grep and badly undercounted.
  Reading all 122 by hand found 50: DJ sets, machines "as sold", park jams,
  practices, a piano piece nobody recorded, and "various versions". All 50
  now carry `search: false`. Eight real records carry notes in the title or
  artist ("The Bridge, produced for MC Shan", "Mr. Fingers (Larry Heard)")
  and get an explicit query. The other 64 use the default. One call is a
  judgement: Duke Bootee's side of `e-bootee-mellemel` ("The Message,
  written and demoed") is a demo, not a release, so it gets no link. The
  record it became is linked on the other side of the same edge.
- **A93.** Artists' signature tracks get a YouTube link too, searching the
  artist's name plus the title. Several titles carry credit notes ("Strings
  of Life (Rhythim Is Rhythim)", "The Bridge (produced for MC Shan)"), which
  make a looser query but still land on the record. They are left alone
  rather than growing a second `search` field on another schema object
  without asking (BACKLOG).

## Added while building Arrange by (Q19)

- **A94.** An artist that names more than one scene or label goes in the
  lane of its earliest one: by the artist's own `from` year for labels, and
  by the scene's start year for scenes. No artist has two of either yet, so
  nothing on the map depends on this rule today. It exists so the first one
  that does has a defined place.
- **A95.** In scene view, label markers (when the Labels layer is on) get a
  lane of their own, titled "LABELS", rather than being filed under "Not in
  a scene yet". That lane is for artists. A label does not belong to a
  scene, so putting it there would state something false.
- **A96.** Changing the arrangement re-fits the camera rather than
  carrying the old view across, as a layer toggle does. The old coordinates
  point at a different part of a different layout, so keeping them would
  land the reader somewhere arbitrary.
- **A97.** Lane titles moved from the band layer to a new titles layer
  drawn above the edges and nodes. The first browser run found that an
  edge's wide invisible hit area sat over a scene title and swallowed its
  clicks. Lineage titles moved with them and look unchanged.
- **A98.** Scene and label lane titles use ordinary letter-spacing, not the
  wide tracking of the uppercase lineage titles, and sit just before the
  lane's earliest member rather than at the axis origin. That keeps them
  near the content when the reader is zoomed into the middle of the map.

## Added while building M3 step 5 (typography and legibility)

- **A99.** The three confidence tiers now differ on two channels instead of
  half a pixel of width. Documented is solid at 2.6px and full strength.
  Consensus is solid at 1.4px and 55% of the opacity. Asserted is dotted. The
  legend swatches read the same values, including opacity, so they cannot
  drift from the map. This changes how the map looks everywhere, so it is
  the step-5 change most worth Matt's eye.
- **A100.** Label collisions are handled by placement, not by alternating
  label side and offset as the plan said. Alternating only moves the
  problem: a row whose labels sit below meets the next row's labels sitting
  above. Each frame now places names in priority order (the selected node,
  then by connectedness, then earliest) and hides a name that would overlap
  one already placed, until zooming in makes room. Hooks go after all
  names. Measured: zero overlaps at every zoom level tested, and 0.9ms for
  the slowest render over 30 pan frames. Labels still ignore other nodes'
  markers (BACKLOG).
- **A101.** The opening view keeps the legend's width clear on the left.
  Doing that at 1280px first pushed the fit to scale 0.34, the `collapsed`
  zoom level, and the map opened with no names on it. The fit now has a
  floor (`CONFIG.viewport.fitMinScale`, 0.36) just inside the level where
  names show. Names win over perfect clearance: at 1280x800 the leftmost
  marker lands at x=357 against the legend's right edge at 318.
- **A102.** Contrast was measured, not assumed, against the drawer's actual
  background: ink 17.3:1, body 12.6:1, hook 14.6:1, links 11.0:1, and the
  dimmest text 5.8:1. All pass WCAG AA, so no colour changed.
- **A103.** The plan asked for a 60 to 70 character measure. At the drawer's
  430px width and the new 16px body size, the measure is about 48
  characters. That is inside the comfortable range but short of the target.
  Widening the drawer enough to reach 60 would cover more than 40% of a
  1280px map, so the width stays and the shortfall is recorded here instead.
- **A104.** The reading surface's type sizes and line heights live in
  `CONFIG.type`, and `reading/type.js` publishes them as CSS custom
  properties (`--t-*`, `--lh-*`). The stylesheet keeps its selectors and
  colours but holds no sizes for the panel or legend. Reading text has a
  16px floor. Secondary notes are 15px, and the monospaced kickers and
  headings stay small because they are labels, not text to read.
- **A105.** In scene and label views, every lane is titled next to its
  earliest member, including "NOT IN A SCENE YET" and "LABELS". At the axis
  origin, one of those titles printed on top of a 1950s marker.
- **A106.** Node names and hooks moved out of each node's group into a
  single labels layer between the markers and the lane titles, so no dot
  paints over a name. Each node is now two elements (marker group and
  labels group). Both carry the "not yet" and "selected" classes, and both
  are created and removed together. Label placement also treats every lane
  title, "THE MACHINES" included, as a fixed obstacle, so a name that would
  print over a title waits for room instead. Title boxes are computed from
  their known position, font size and letter-spacing, not measured in the
  DOM, which would force a layout pass on every pan frame. The letter-spacing
  in `CONFIG.arrange.titleTrackingEm` mirrors the stylesheet and must change
  with it.


## Added during the second machines batch (Track D, machines to 25)

- **A107.** Selection rule: a machine got in only if it had a sourced
  connection to an artist already on the map, so none of the thirteen
  arrives as an orphan. That rule shaped the list more than importance did.
  The Akai MPC60, the Casio MT-40 behind 'Under Mi Sleng Teng', the Roland
  TR-707 and the LinnDrum all matter more than a slashed Elpico amp, and
  none of them touches anyone on the map yet. They are logged in
  `BACKLOG.md` as the next machines, to add alongside the artists who
  carry them.
- **A108.** Lineage follows A56 (the world a machine was sold into). Only
  the Marshall JTM45 is `rock`, because it was built at the request of
  London rock guitarists in Jim Marshall's shop. The fuzz pedal, the
  Mellotron, the Stylophone, the Harmonizer, the AMS delay, the TEAC, the
  Mu-Tron and the Simmons kit were sold to musicians or studios in
  general, so they are `other`. The Fairlight, the Juno-60 and the MS-10
  are `electronic`, like the existing synths and samplers.
- **A109.** `kind` extends A58. Both amplifiers are `instrument`, as are
  the Mellotron and the Simmons kit, since each is played by hand. Effects
  (fuzz, phaser, pitch shifter, digital delay) and the TEAC multitrack are
  `studio-technique`, alongside the Space Echo. The Mellotron is
  functionally a sampler, but it plays a fixed tape library the owner did
  not record, so `sampler` would overstate it. The missing `effect` kind
  in `BACKLOG.md` now covers four records, and amplifiers would want one
  too.
- **A110.** `davies-elpico-amp` is a one-off, handled the way A59 handled
  Tubby's console: `releasedYear` 1964 is the year of the razor blade, and
  the record says so. `discontinuedYear` is null to match
  `tubby-mci-console`, which draws it to the present. See Q20.
- **A111.** End years. Sourced: Juno-60 1984, JTM45 1966, H910 1988 (the
  year Eventide sold its last units). Stylophone 1975 is the end of the
  original run, with the 2007 revival stated in the record. Simmons SDS-V
  1983 is the year its successors arrived, which is the best available
  proxy and not a documented end date. The Mellotron is null because new
  ones are made today. The Fuzz-Tone, AMS DMX 15-80, Korg MS-10, TEAC
  A-3340, Mu-Tron Bi-Phase and Fairlight CMI are null because I could not
  source an end year, and the schema cannot tell that apart from "still
  made". Raised as Q20.
- **A112.** Two release years had conflicting sources. The Mu-Tron Bi-Phase
  is dated 1975: its designer describes a prototype in 1974, and one source
  calls 1974 the release. The TEAC A-3340 is dated 1972, where sources say
  1972 or 1973.
- **A113.** Two of the fifteen edges are `consensus`: AMS to Joy Division
  and Mu-Tron to Lee Perry. In both, the device is well attested, but no
  session record ties it to a specific sound, and for the Mu-Tron the
  model name varies between sources. The MS-10 to Juan Atkins edge is
  `documented`, but it claims only what Atkins has said: he learned on
  the instrument. It does not claim the MS-10 is audible on 'Alleys of
  Your Mind', and the record and edge say so.
- **A114.** `e-909-heard` is a new edge on an existing machine. The source
  for the Juno-60 purchase names the TR-909 in the same breath, and
  leaving it out would have made the Juno look like the whole story.
- **A115.** Tony Visconti's often-quoted remark about the Harmonizer is
  described in prose rather than quoted. The quotation is real, but it is
  profane, and describing it loses nothing for the reader.
- **A116.** The Stylophone record does not name its 1960s television
  spokesman. That is left out because it has nothing to do with why the
  machine is on the map, not to avoid the subject. If the dataset ever
  covers him as a performer, his convictions belong in that record's
  adult register as fact.
- **A117.** A web search result for this batch credited Tony Visconti with
  producing 'Space Oddity'. The single was produced by Gus Dudgeon, and
  none of this batch's records repeats the error. Logged as another case,
  after A62, where a confident secondary source was wrong about a credit.


## Added during the hip-hop production batch (Track D, batch 2 of the suggested order)

- **A118. Scope.** Eight artists, three machines, one label and thirteen
  edges, centred on New York production from 1983 to 2001: Run-D.M.C.,
  Rick Rubin, LL Cool J, Biz Markie, Eric B. & Rakim, Pete Rock, J Dilla
  and DJ Premier, with the Oberheim DMX, the Akai MPC60 and MPC3000, and
  Cold Chillin'. The rule from A107 applied: nothing arrives as an
  orphan, so every new node has at least one sourced edge. That rule is
  why Public Enemy, De La Soul, Mantronix and the West Coast are in
  `BACKLOG.md` and not here. The batch is deliberately smaller than the
  template's twenty artists so that every sound description could be
  checked against what I actually know of the records.
- **A119. Machines.** All three are `electronic` under A108, as samplers
  and drum machines sold to studios in general. The DMX is
  `drum-machine`, the two MPCs are `sampler`. The DMX end year (1984)
  comes from one secondary archive and is flagged in its record. The MPC
  end years are null because I could not source them (Q20).
- **A120. Rick Rubin is filed `rock`.** This follows A68's logic for
  Sylvia Robinson, applied the other way: his home is the New York
  hardcore scene he came from (his band Hose was Def Jam's first release),
  and what he carried into rap, the volume, the stripped arrangements, the
  rock guitar, is the substance of his effect. It makes his two edges into
  hip-hop cross-lineage. If Matt reads Rubin as a hip-hop producer first,
  it is a one-field change and both edges flip automatically.
- **A121. The Cold Chillin' label edge.** Under A69 a label edge must
  claim the label's decision changed the artist's output. Here the court
  record states that a licence was sought and refused and the label
  released the record anyway, and Biz Markie's next album is titled after
  the consequence. That is the strongest label edge on the map so far.
  The judgment's famous opening line is described, not quoted, per the
  accuracy rules, even though it is a matter of public record.
- **A122. The Eric B. & Rakim production dispute is carried, not
  resolved.** The edge from Marley Marl claims only what both men agree
  on, that the record was made in Marl's room on his equipment, and is
  held at `consensus`. The artist record and the edge set out both
  accounts and the album credit without choosing between them.
- **A123. Tier ratio.** Nine of the thirteen edges are `documented` and
  four `consensus`, which is richer in `documented` than METHOD.md's
  healthy ratio and so worth Matt's scrutiny. Each documented edge rests
  on something checkable: a sleeve credit (Rubin twice, Marl twice), a
  court opinion (Cold Chillin'), archived radio broadcasts (Marl to Pete
  Rock), a producer's own account of his instrument in the pattern of
  e-ms10-atkins (SP-1200 to Pete Rock), a museum object
  (MPC3000 to Dilla), and the record itself (Kraftwerk to Dilla). In
  each case the evidence field limits the claim to what that source
  shows, and the parts it does not show (Rubin's idea for 'Walk This
  Way', the unquantised method, Dilla's intent with Kraftwerk) are named
  as secondhand.
- **A124. Two claims I cut rather than soften.** A `whatToListenFor`
  draft for 'Mama Said Knock You Out' described its intro structure, and
  one for 'Runnin'' described its drum timing. On rereading I could not
  stand behind either from memory, so the first sentence went and the
  second edge now pairs with 'Fall in Love', a record whose off-grid
  kicks I am more confident describing. Matt should still listen to that
  pair before trusting it, since it is the least checked sound
  description in the batch. The Sound on Sound
  profile behind e-mpc60-premier was blocked by the network proxy and
  is cited through search summaries only, which is part of why that
  edge is `consensus`.
- **A125. Biz Markie's `originCity`** is Long Island, where he grew up,
  and the blurb says he was born in Harlem. This follows neither side of
  the unsettled `originCity` convention in `BACKLOG.md` on purpose: it
  records both facts in the text until the convention is decided.


## Added during the 90s hip-hop and producers batch (Q21, batch 1 of 3)

- **A126. Roster.** All eight groups Matt named (The Roots, The Goats,
  Souls of Mischief, Lords of the Underground, Cypress Hill, Beastie
  Boys, Wu-Tang Clan, MF DOOM), plus the producers who connect them:
  Large Professor, DJ Muggs, RZA and Madlib. Nas and A Tribe Called
  Quest came in because they are where those producers meet (Illmatic
  gathers Large Professor, Premier and Pete Rock, and Tribe is how
  Large Professor's teaching and J Dilla's career connect). Billy Cobham
  is the first sampled-artist hub (Q21b), since he is the only honest
  anchor for Souls of Mischief.
- **A127. Producers get their own node only when they have more than one
  edge's worth of reach.** Large Professor, Muggs, RZA and Madlib do.
  Q-Tip, K-Def, A-Plus, the Dust Brothers, Joe Nicolo and Questlove
  stay as plain names in `keyProducers` for now, which is why the
  validator warns about them. Any of them becomes a node the moment a
  second act needs an edge from them.
- **A128. The Goats' anchor is their label.** No source consulted claims
  an influence edge to or from The Goats and anything on the map. The
  Roots comparison is about who did live-band rap first, not who learned
  from whom, so it stays in prose. The edge is Ruffhouse to The Goats,
  because the label's co-founder co-produced the album in the studio the
  label grew out of. That fits A69.
- **A129. End years.** The Goats' `activeTo` is 1994, the year of their
  last album. That stands in for a break-up date I couldn't source. The
  EPS-16 Plus ends in 1992 when the ASR-10 replaced it, which is a proxy
  like the Simmons in A111. Ruffhouse's closing year is null because it
  isn't sourced (Q20). Billy Cobham's `activeFrom` of 1968 is his late-60s
  start as a professional drummer, and is approximate.
- **A130. Two sample origins are disputed, and both disputes are kept.**
  The 'Insane in the Brain' squeal is widely said to be a horse, while
  Muggs says it's a pitched blues guitar. The 'Accordion' loop is not an
  accordion: Daedelus played it on an electric chord organ. Both go in as
  lore, with each side stated.
- **A131. Tier ratio.** Eleven of fifteen edges are `documented`, all on
  album credits or sample credits. The four `consensus` edges are the
  teaching and influence claims (Large Professor to Tribe, Dilla to The
  Roots, Dilla to Madlib) and RZA's EPS-16 Plus, where the only sources
  I found retell someone else's account.
- **A132. Conduct and deaths are stated as fact.** The Beastie Boys'
  later repudiation of Licensed to Ill's sexism, Subroc's death and
  Elektra shelving KMD's album, Phife Dawg's and Ol' Dirty Bastard's
  deaths, and DOOM's death with its delayed announcement are each given
  once, plainly, in the registers where they belong.


## Added during the sampling breaks batch (Q21, batch 2 of 3)

- **A133. Roster.** Fourteen sampled-artist hubs and two sampling acts.
  The hubs: James Brown, The Winstons, The Honey Drippers, the
  Incredible Bongo Band, Sly and the Family Stone, The Charmels, Ahmad
  Jamal, Sade, Ronnie Foster, Tom Scott, Gilbert O'Sullivan and Daedelus.
  Public Enemy and N.W.A were added because the two most famous breaks
  (Funky Drummer, the Amen) reach the map through them. Each hub got in
  only with a sample edge whose credit I could source to a record
  already on the map.
- **A134. Where a sample edge points.** It points at the act on the
  record when that act is a node (Nas, Wu-Tang, Biz Markie). When the act
  isn't a node, it points at the producer who made the sampling choice:
  Marley Marl for MC Shan's 'The Bridge', and Madlib for Madvillain's
  'Accordion'. The edge text says which rule applied.
- **A135. Lineage for sampled sources.** Soul and funk sources are
  `funk`, under A71's nearest-neighbour logic (Brown, Sly, Winstons,
  Honey Drippers, Charmels). Jazz players (Jamal, Foster, Scott), Sade,
  O'Sullivan and the Bongo Band are `other`, because jazz, British soul
  and pop have no lane yet. Daedelus is `electronic`. That makes almost
  every sample edge cross-lineage, which is honest: sampling is where
  hip-hop meets everything else. It's why cross-lineage edges jumped to
  55 of the 60 target in one batch.
- **A136. Single-track hubs are left at one.** The Honey Drippers, The
  Charmels, Ronnie Foster, Tom Scott, Gilbert O'Sullivan and Daedelus
  each carry one `signatureTracks` entry and warn. For a sample hub the
  one sampled record is the reason they're here, and padding the list
  with a second record I haven't checked would break the accuracy rules.
- **A137. Edges I dropped rather than write thinly.** Sly Stone's 'Sing
  a Simple Song' in 'Fight the Power' is named in prose only: I couldn't
  describe where it sits in a dozen-layer collage. Isaac Hayes ('Ike's
  Mood I' in Biz's debut) and Joni Mitchell ('Big Yellow Taxi' in
  'Got 'til It's Gone') are waiting in BACKLOG. Hayes waits for the same
  reason as Sly. Mitchell waits because the sampling act, Janet Jackson,
  isn't a node. Michael Jackson ('Human Nature' in 'It Ain't Hard to
  Tell') is deferred too. His record needs the documented allegations
  and 2005 acquittal set out carefully in the adult register, and that
  deserves more than a hub entry written at batch speed.
- **A138. Conduct stated as fact.** James Brown's 1988 conviction and
  domestic violence arrests, Professor Griff's 1989 antisemitic remarks,
  and Dr. Dre's 1991 no-contest plea for assaulting Dee Barnes are each
  stated once, in the adult register, without adjectives. That follows
  the Q2 resolution.
- **A139. Dates that are proxies.** Several hubs were short-lived acts
  with no sourced end date: the Winstons (1970), the Charmels (1968), the
  Bongo Band (1974) and Sly and the Family Stone (1983). Those end years
  are approximate. The Bongo Band's city is Los Angeles, the base of its
  organiser Michael Viner. Where the sessions happened isn't sourced.


## Added during the classic rock batch (Q21, batch 3 of 3)

- **A140. Roster.** The Beatles, Led Zeppelin and Jimi Hendrix, as Matt
  asked, plus The Verve, who carry the rock side's biggest sampling
  lawsuit. The Rolling Stones were already on the map and gain two
  edges, one in and one out. Every edge joins classic rock to something
  already on the map. Most of them run into the hip-hop from the earlier
  Q21 batches, which was the point of doing rock last.
- **A141. Hendrix's edge comes from a scene.** He is anchored by
  `e-swinginglondon-hendrix`, from the scene node, because London, not
  any one London artist, made him. He's added to the scene's `memberIds`
  and the scene gets its first edge, clearing its orphan warning. The
  scene's end year (1967) comfortably covers his arrival in 1966.
- **A142. Zeppelin's borrowing is stated as sampling lore, not as
  judgment.** The adult register lists the Dixon settlement (1987), the
  'Dazed and Confused' settlement (2012) and the 'Stairway' verdict in
  the band's favour (upheld 2020) as fact, next to their being sampled.
  It doesn't editorialise either way.
- **A143. The Verve edge runs from the Rolling Stones even though the
  sampled recording is Andrew Loog Oldham's orchestral version.** The
  dispute was over the Jagger and Richards song, owned through ABKCO,
  and Oldham isn't a node. The edge text says so.
- **A144. The Beatles' legal action over Paul's Boutique is reported, not
  resolved.** Sources say their side pursued it. I couldn't source the
  outcome, so the records say "reported" and stop there.


## Added during the outré electronic batch (Track D batch 3)

- **A145. Why this batch, and why now.** Q21 finished, and Matt said to
  keep going without naming a subject. I took the next unstarted entry in
  BUILD_PLAN's Track D order: musique concrète, the Radiophonic Workshop,
  krautrock and early IDM. Matt said he will add sources soon, so every
  record here was written from standard histories checked with web
  searches, and each edge's `evidence` says what it rests on. Nothing is
  footnoted to a page. When Matt's sources arrive they should be checked
  against A146 to A152 first, because those are where I made a choice.
- **A146. The roster.** Schaeffer, Stockhausen, Oram, Derbyshire, Wendy
  Carlos, Can, Neu!, Conny Plank, Tangerine Dream, Brian Eno, Aphex Twin
  and Autechre, plus the Moog modular, two scenes (Paris musique concrète,
  the BBC Radiophonic Workshop) and Warp. Every new node has at least one
  edge, and most edges join the new material to something already on the
  map (Kraftwerk, Bowie, the Beatles, PiL, Detroit techno). IDM got a
  label, not a scene, because Warp's framing is the documented thing and
  "IDM" as a scene name is disputed by the people in it. Krautrock also
  got no scene node, since the existing Düsseldorf scene covers Neu! and
  a wider "krautrock" node would be a journalist's category.
- **A147. End years are deaths where the stopping point isn't sourced.**
  Schaeffer (1995) and Oram (2003) use their death years, and the adult
  text says so. Derbyshire uses 1975, when accounts say she stopped
  making music. Can uses 1979, when the band stopped working regularly,
  with reunions mentioned in the text. Neu! uses 1975, the last of the
  three original albums, which ignores the 1980s sessions released in
  1995. Stockhausen's start (1952) is his first tape piece, not his first
  composition. Conny Plank's start (1969) and Autechre's (1987) are
  approximations.
- **A148. Lineages.** Schaeffer, Stockhausen, Oram, Derbyshire and both
  new scenes are `other`, since none of them sits in a pop lineage and
  inventing an "art music" lineage would be a schema change. Can and Eno
  are `rock`, since that's where they played and were heard. Neu! is
  `electronic`, matching Kraftwerk and the Düsseldorf scene, though their
  records are guitar and drums. That's the most arguable call in the
  batch, and it makes e-kraftwerk-neu same-lineage.
- **A149. Two edges are consensus because the specific claim outruns the
  documentation.** e-stockhausen-beatles: the Beatles' interest is
  documented, but the Hymnen to 'Revolution 9' pairing is Ian MacDonald's
  critical reading, and Yoko Ono's own avant-garde background is an
  equally good route. e-can-pil: Lydon played Can on Capital Radio in
  July 1977, but the debt of Metal Box to Can in particular is critical
  consensus.
- **A150. Scene-sourced edges where the method, not a person, travelled.**
  e-musiqueconcrete-oram runs from the Paris scene because Oram's direct
  contact with Schaeffer isn't sourced. e-radiophonic-derbyshire runs
  from the Workshop because the institution's equipment and rules made
  both the record and the lack of credit. e-detroittechno-warp runs from
  the scene to the label because the founders cite imported Detroit
  records in general. Its later track is LFO's 'LFO', and LFO are not on
  the map yet.
- **A151. Wendy Carlos is named as Wendy Carlos throughout.** Her early
  pressings carried her former name. The adult text says so without
  printing it. That matches how she's credited on reissues.
- **A152. Stockhausen's 2001 remarks are stated, not judged.** The adult
  register records that his comments about the September 11 attacks were
  widely reported, that concerts were cancelled, and that he said he had
  been misreported. Same approach as A138. Aphex Twin's own contradictory
  stories about his gear and past are flagged, and the text doesn't
  repeat any of them as fact.
- **A153. Small edits to existing records.** David Bowie's
  `keyProducers` now points at the new `brian-eno` id instead of the plain
  name, which clears one validator warning. Neu! is added to the
  Düsseldorf scene's `memberIds`. That scene still has no edge, so its
  orphan warning stays. The two new scenes use a new motif key,
  `tape-reel`. Nothing renders motifs yet, so this is only a name for the
  card designer.
- **A154. Two licenses: MIT for code, CC BY-SA 4.0 for the dataset.** Matt
  asked for a license and left the choice to Claude. Code and data have
  different reuse needs. MIT keeps the code easy to borrow. The data is
  the hand-researched part, so share-alike keeps improved copies open. The
  copyright line names `mattohara42`, the GitHub account, because no legal
  name is given anywhere in the repo. When the SQUELCH 303 worklet is
  ported in M4 (A8), its own license has to allow relicensing under MIT,
  or it keeps its original license in its own file.


## Added during the source verification pass

Matt opened the container's network to Wikipedia (en, de, fr, pt, ja),
Wikidata, MusicBrainz, the Discogs API, archive.org and World Radio
History, and asked for everything already on the map to be checked
against them. SecondHandSongs is reachable but waits for an API key.
`docs/sources.md` records what each source is good for and the rate
limits. The pass started with a bulk diff of every node against Wikidata
and every track year against MusicBrainz, then read the articles behind
each disagreement.

- **A155. Deaths after the records were written.** The Wikidata diff
  showed two deaths the map did not know about. Afrika Bambaataa died in
  April 2026, so his `activeTo` is now 2026 and both registers say so.
  Sly Dunbar died in January 2026. Sly and Robbie's `activeTo` stays 2021,
  when Robbie Shakespeare died and the partnership ended, but neither
  register had ever said why the span stops there. Both deaths are now in
  the text. Sources: the English Wikipedia articles on each man, which
  give place and cause.
- **A156. Bambaataa's record now states the abuse allegations.** The
  record was written from the seed before the Q2 resolution and never
  mentioned them. Under Q2 they belong in the adult register as fact,
  because they are a documented part of why his standing changed: the
  2016 accusations, his denial, his resignation from the Universal Zulu
  Nation and its later apology, and the 2025 default judgment in a Child
  Victims Act suit. The teen register carries the same facts in shorter
  words, since registers never differ in facts (Q3). `data/seed.json`
  still has the old text. It is the ruler, not the dataset, so I left it
  alone.
- **A157. Release years corrected from the pressings.** Every
  `signatureTracks` and `trackPair` year was searched in MusicBrainz, and
  the ones that disagreed were checked against Discogs release listings.
  Most disagreements were MusicBrainz matching a reissue or compilation,
  and those were ignored. Four were real:
  'Breaker's Revenge' is 1984, from the Beat Street soundtrack, not 1982
  (Wikipedia's Arthur Baker article and every Discogs pressing, all
  Atlantic 1984). The 1982 date was probably a mix-up with Rocker's
  Revenge's 'Walking on Sunshine', which Baker produced that year.
  'Funky Child' is a 1992 Pendulum single (Discogs), ahead of the 1993
  album. 'Male Stripper' is 1986 (Discogs, credited to Man 2 Man meet
  Man Parrish), not 1983. Its `whyThisOne` claimed a UK chart run
  "nearly a decade later", which the corrected date makes false, so
  that sentence was rewritten without the chart claim. 'Sing a Simple
  Song' first came out in November 1968 as the B-side of 'Everyday
  People', so it moves from 1969 (the Stand! album) to 1968. Checked and
  left alone: 'Your Love' (Jamie Principle's 1986 Persona single comes
  before Knuckles' 1987 Trax version), 'Mecca and the Soul Brother'
  (1991 promo, 1992 album), 'Timesteps' (the soundtrack LP is 1972 in
  Discogs, and the 1971 single does not carry it), 'Don't Worry' (1960 in
  Canada, 1961 in the US, and the US release is the one that matters).
- **A158. e-baker-bambaataa has a new earlier record.** With
  'Breaker's Revenge' at 1984, the edge's "earlier" record came two
  years after the "later" one. It now pairs 'Jazzy Sensation' (Tommy
  Boy TB 812, 1981) with 'Planet Rock'. The Discogs transcription of the
  label credits Baker as producer, the studio band as the music, and
  Kenton Nix as writer, which makes it a replay of Nix's 'Funky
  Sensation' (a Gwen Guthrie record) rather than a sample. That is the
  method 'Planet Rock' then used on Kraftwerk, so the new
  `whatToListenFor` is about the method, and it claims nothing about
  the 1981 drums that I have not heard described in a source. Matt
  should listen to this pair before trusting it.
- **A159. End years that now have a source.** The Roland RE-201 ends in
  1990: English Wikipedia says it stayed in production until then.
  Ruffhouse closes in 1999, when its founders shut it (Wikipedia), and
  its 2012 revival through EMI is in the ownership story. Pye closes in
  1980, when the rights to the name ran out and the label became PRT
  (Wikipedia). The 2024 relaunch of the name is mentioned, and it is not
  treated as the same label. Sly and the Family Stone's 1983 end (A139)
  turns out to be what Wikipedia gives, so it is no longer a proxy.
  Cold Chillin's 1998 close is confirmed.
- **A160. End years still null after this pass, and why.** The Akai
  MPC60 and MPC3000: English and German Wikipedia give launch years for
  every model and no end dates. The Fairlight CMI: English Wikipedia
  dates Series III 1985 to 1989, while German Wikipedia says the CMI was
  replaced by the MFX from 1991. The sources disagree, so it stays null.
  The Korg MS-10, Ensoniq Mirage, Mu-Tron Bi-Phase and Maestro FZ-1 have
  no production end in any Wikipedia edition I could read. The Mellotron
  and Technics SL-1200 are correct as null, because both are made again
  today, and their records already say so. All of these still depend on
  Q20.
- **A161. The Oberheim DMX start year is disputed.** Wikipedia says it
  was introduced in 1980. The record says 1981. The archive.org copies of
  the owner's manual date the third edition to June 1982 and the
  schematics to December 1981, which fits either. I left 1981, since
  moving it would need the first-edition manual or a 1980 trade-press
  listing, and archive.org's file downloads are blocked from the
  container (see `docs/sources.md`). The record's end year of 1984 is
  still from one secondary source, and Wikipedia only says "mid-1980s".
- **A162. A144's Beatles question, half answered.** Wikipedia's Paul's
  Boutique article traces the legal action to Mike D, who told Vibe the
  Beatles' side filed preliminary legal papers. It gives no outcome, and
  neither does anything else I could reach, so the records still say
  "reported". The edge's evidence now names the source. The same article
  lists the Beatles samples on 'The Sounds of Science' differently from
  our edge ('Back in the U.S.S.R.' included, only the Sgt. Pepper
  reprise). The evidence now claims only the three that both listings
  share, and says the listings differ on the rest.
- **A163. Sleeve credits checked on the documented production edges.**
  The documented edges that cite an album or single credit were compared
  with the Discogs release credits and the credits sections of the
  Wikipedia articles. These matched: Pete Rock, DJ Premier and Large
  Professor on Illmatic, Rubin on Radio, Raising Hell and Licensed to
  Ill, Marley Marl on Mama Said Knock You Out and Make the Music with
  Your Mouth, Biz, Muggs on Cypress Hill, RZA on 36 Chambers, Perry on
  'Complete Control', Plank on Neu! (producer) and Autobahn (engineer),
  Madlib on Madvillainy, Tubby on King Tubbys Meets Rockers Uptown,
  Nicolo on Tricks of the Shade, the Ummah on Beats, Rhymes and Life,
  Eno on Low, and Wakeman on 'Space Oddity'. Three did not:
  - **'Planet Rock'.** Four records called John Robie an engineer and a
    co-producer. The liner-note credits (Wikipedia, and the label as
    transcribed on Discogs) make Baker the producer and mixer, and Robie
    a co-writer and synthesizer player, credited on the label as Planet
    Patrol. The same credits put Baker, not Robie, on the Fairlight, so
    e-fairlight-planetrock's evidence is corrected too. The seed still
    lists Robie in Bambaataa's `keyProducers`. I left that alone, since
    he shaped the record even though he was not credited as producer.
  - **Here Come the Lords.** The edge said Marl had sole or shared
    production on every track. Both the CD's track credits and
    Wikipedia give K-Def five or six tracks on his own, so the claim is
    now "most of the album". The two sources disagree about 'Funky
    Child' (Marl with K-Def, or K-Def alone). The edge and the track's
    `whyThisOne` now say so rather than choosing.
  - **Breaking Atoms** is credited to Main Source as producers, made
    mainly by Large Professor. The edge had said Large Professor
    produced it.
  None of these changes a tier. Each edge still rests on a credit. The
  credit just says slightly less than we had claimed.
- **A164. Sample edges checked against the song articles.** Wikipedia's
  articles on the sampling records confirm the sampled source for
  'C.R.E.A.M.' (the Charmels), '93 'til Infinity' (Cobham's 'Heather'),
  'Electric Relaxation' ('Mystic Brew'), 'Mama Said Knock You Out'
  ('Funky Drummer'), 'Insane in the Brain' (Sly's 'Life'), 'T.R.O.Y.'
  (Tom Scott's 'Today', which is itself a Jefferson Airplane cover),
  'Fight the Power' ('Funky Drummer'), 'Alone Again' (the Grand Upright
  opinion) and 'Bitter Sweet Symphony'. The rest had no sample list in
  the article text I could read. They keep their existing citations,
  and nothing contradicted them.
- **A165. The Verve records overstated what 2019 left out.** The edge
  and the artist record both said the 2019 settlement returned
  Ashcroft's royalties "but not the publishing". Wikipedia's article
  says ABKCO, Jagger and Richards agreed in April 2019 to return both
  the royalties and the songwriting credit. I found nothing for the
  publishing claim, so it's gone, and the returned credit is added.
  The same article dates the Oldham recording to 1965 in one place and
  1966 in another. The edge keeps 1965, the year of the Stones'
  original, which is the date it gives.
- **A166. Duke Bootee's second track.** 'Message II (Survival)' (Sugar
  Hill, 1982) is credited to Melle Mel and Duke Bootee on every Discogs
  listing. That clears his validator warning and closes the BACKLOG note
  that his catalogue needed real research.
- **A167. Dates in documented evidence, spot-checked.** Wikipedia
  confirms these as written: Czukay studying with Stockhausen 1963 to
  1966, Phaedra recorded at the Manor in November 1973 on a Moog bought
  with the Virgin advance, Hendrix arriving in London on 24 September
  1966, Derbyshire joining the Workshop in April 1962, Stockhausen in
  Paris from January 1952 and his Konkrete Etüde that December, Davis's
  drums through the H910 on Low, McCartney on the 'Strawberry Fields'
  Mellotron, Dilla's MPC3000 at the Smithsonian, and Phuture passing
  early versions of 'Acid Tracks' to Ron Hardy. Two small disagreements
  are left as they are and noted here. Wikipedia has Knuckles buying
  his first drum machine from Derrick May "around 1983", where
  e-may-knuckles says 1984. It also has Tubby opening his studio in
  1971 with the mixer from Dynamic, where e-desk-tubby and the console
  record say 1972. Both are approximate on both sides, and changing
  either would mean choosing one secondary source over another.
- **A168. Sugar Hill's end.** Discogs gives 1985 for the shutdown, and
  our record says 1986. Wikipedia gives a Chapter 11 filing in November
  1985 and the Robinsons' fraud suit against MCA in November 1986,
  settled in 1990, with no single closing date. `closedYear` stays 1986,
  and the ownership story now gives the bankruptcy and the settlement.
  Discogs confirms Metroplex (1985), Transmat (1986), KMS (1987), Tommy
  Boy (1981) and Factory (1978 to 1992) as the records have them.
- **A169. e-dilla-roots had its pair in the wrong order.** 'Fall in
  Love' (released 2000) was the earlier record and Things Fall Apart
  (1999) the later one. That pairing came from A124, which picked the
  track for how confidently its sound could be described. Fantastic,
  Vol. 2 was finished in 1998 and circulated on advance cassettes that
  year, before its delayed release, and Questlove is recorded as
  championing it in that period. So the edge's earlier side is dated
  1998, and the evidence explains why. Dilla's `signatureTracks` keeps
  2000, because that field records release years. A scan for other pairs
  with the earlier record dated after the later one found none, so this
  was the only case besides e-baker-bambaataa (A158). Delia Derbyshire's
  1975 end year (A147) is confirmed by Wikipedia's "In 1975, she
  stopped producing music".
- **A170. What this pass did not check.** It checked dates, deaths,
  credits and named samples, which are the things a database or a
  sleeve can settle. It did not check any `whatToListenFor` sound
  description (those need ears, and A124's warning still stands), the
  scene records' adult prose, the causal claims in `consensus` edges, or
  the outré electronic batch's interpretive calls (A146 to A152) beyond
  the dates in them. It did not use SecondHandSongs (no key yet), so the
  one `cover` edge was checked only through Wikipedia. Wayback copies
  and archive.org files could not be read (see `docs/sources.md`), so
  the Sound on Sound profile A124 wanted is still unread.
- **A171. Q22 applied: eight edges move to `consensus`.** Matt took the
  recommendation. e-dubplate-tubby, e-melodica-pablo, e-re201-perry,
  e-sl1200-flash, e-herc-cokelarock, e-desk-tubby, e-sugarhill-mellemel
  and e-robinson-mellemel are now `consensus`, and each evidence field
  ends by saying why. Where the text itself called the claim
  "documented", the word was changed so the prose and the tier agree.
  Nothing else in these edges changed. Any of them goes back to
  `documented` when a session finds the interview or document that
  shows it. The tier count is now 93 documented, 47 consensus and 1
  asserted.
- **A172. Q20 applied: `endUnknown`.** Matt took the recommendation. Any
  artist, machine, scene or label may carry `"endUnknown": true` beside
  a null end year. Null alone still means "still going". With the flag,
  the loader ends the span `CONFIG.layout.unknownEndFadeYears` (8) years
  after the start, capped at the current year. The span is drawn with a
  per-node user-space gradient fading to nothing (a bounding-box
  gradient on a horizontal line has zero height and draws nothing), and
  the panel prints "1978–?". The validator rejects the flag beside a
  set end year, and rejects any value but `true`. Edges clamp to the
  shortened span the same way they clamp to any ended node, so an edge
  later than the fade anchors at its end. That's the behaviour the
  sampled hubs with proxy end years already have.
  Twelve records carry the flag. Nine are machines whose production end
  no source settles: the MPC60, MPC3000, AMS DMX 15-80, Ensoniq Mirage,
  Fairlight CMI, Korg MS-10, Maestro Fuzz-Tone, Mu-Tron Bi-Phase and TEAC
  A-3340. Two are the "one-off" case Q20 named, the Elpico amp and
  Tubby's MCI console. Both are product models whose production end is
  unknown, so "–?" is true of them and "–now" was not. The twelfth is The
  Honey Drippers, a 1970s band with no sourced end. Left as ongoing: the
  Mellotron, SL-1200, melodica, dubplate and twelve-inch single (all
  still made), every living artist and working band, and Rockers
  International, which I can't show has closed. The MPC60 and MPC3000
  texts now say the map shows their end as unknown. Sly and the Family
  Stone's text no longer calls its 1983 end an approximation, which A159
  had found to be sourced but not fixed in the prose.


## Added with the cross-check tool and the orphans batch

- **A173. `tools/crosscheck.js`.** Matt asked for the BACKLOG idea to be
  built, which settles the question it raised: a dev tool may use the
  network. The app still never does, and nothing the app imports touches
  it. The tool uses Node built-ins only, re-launches itself with
  `NODE_USE_ENV_PROXY=1` when a proxy is set, caches responses in a
  gitignored `.crosscheck/`, and writes `docs/crosscheck-report.md`. Two
  matching choices came out of testing. MusicBrainz's search score is
  ignored, because remix EPs outscore the 1982 'Planet Rock' single, and
  a hit must instead match the title exactly and carry the most
  distinctive (longest) word of the artist's name. Any shared word was
  too loose: "Frankie" matched a 1955 'Your Love' by someone else. A
  producer's `signatureTracks` entry names the act in brackets, so the
  bracketed act counts as an artist, but a "with" guest doesn't:
  "(with Aerosmith)" otherwise matched Aerosmith's own 1975 record.
  Discogs isn't in the tool yet. Its credit checks needed a person to
  pick the right release, and that doesn't automate well.
- **A174. Wikimedia blocked this container's IP.** Partway through the
  orphans batch, every Wikipedia request started returning 403 with a
  message citing Wikimedia's robot policy. The first pass had made a few
  hundred requests over several hours, with a descriptive User-Agent,
  Retry-After honoured and gaps of several seconds. The IP is shared,
  so it may not all have been this project's traffic. I stopped all
  Wikimedia requests at once and did not try to get around the block.
  The tool now stops asking any host that answers 403, and its
  Wikimedia gaps are longer. The rest of the batch was researched from
  articles fetched before the block, plus Discogs and MusicBrainz. If
  Matt wants the block looked at, Wikimedia's error page gives
  noc@wikimedia.org as the contact. That should come from Matt, not from
  an agent.
- **A175. The full cross-check's first findings.** The first full run
  found one real error: 'Love Is Strange' is 1956 (Groove 4G-0175, per
  Discogs), not 1957. The chart hit was early 1957, so the teen text's
  "a hit in 1957" stays, and the signature track's year and "twenty-two
  years" become 1956 and "twenty-three". The rest of its findings were
  conventions already logged (Derbyshire's 1975, Pye's 1980) or
  MusicBrainz data gaps. Its six "dates a track earlier" findings are
  all settled now: 'Love Is Strange' and 'Quoth' match their Discogs
  pressings, 'Don't Worry' (A157) and Mystic Warrior (A176) are logged
  disputes, and 'Common People' came out in 1995, so MusicBrainz's 1994
  is its own error. They will keep appearing in the report. That's
  expected, since the report lists disagreements, not open work.
- **A176. The orphans batch: twelve edges.** Label edges: CBS to the
  Clash ('Complete Control' is about CBS releasing 'Remote Control'
  without asking), Factory to Joy Division (Hannett's production, paid
  for by the label), Pye to the Kinks (a refusal to pay for the
  re-recording of 'You Really Got Me', which the band's management then
  funded), Virgin to Tangerine Dream (the advance bought the Moog and
  Virgin's own studio made Phaedra), Tommy Boy to Bambaataa (Silverman
  pairing him with Baker), Metroplex to Saunderson (his first record,
  as Kreem with Atkins, was Metroplex M-007 before he reissued it on
  KMS), Ariwa to Lee Perry (the late-1980s and 1990s albums made and
  released there), and Trax to the Chicago house scene. Scene edges: UK
  punk to Joy Division (the Lesser Free Trade Hall show), UK post-punk to
  Adrian Sherwood (the New Age Steppers' line-up), Chicago house to
  Derrick May (his trips to the Warehouse and the Music Box), and
  Düsseldorf to Kraftwerk (Kling Klang as the band's real beginning).
  Tiers: six `documented`, each on a credit, a catalogue number, or the
  record itself ('Complete Control' is its own evidence), and six
  `consensus`, where the account reached me through Wikipedia rather
  than a named first-hand source (the Q22 standard). Pye to the Kinks
  is the unusual one, a label edge whose decision was a refusal, and its
  adult text says so. Mystic Warrior's release year is disputed (the CD
  says 1989, Ariwa's site and MusicBrainz say 1986). The edge uses 1989
  and states the dispute. Three `whatToListenFor` fields describe records
  I know only from their credits and descriptions: 'Triangle of Love',
  Mystic Warrior and 'Fade Away'. Each is written around what the
  credits and tracklist show, and the Ariwa one says outright that it
  needs checking by ear. Matt should listen to those three pairs first.
- **A177. A new convention: a label edge can point at a scene.** Trax's
  causal role was owning the pressing plant that put Chicago house on
  vinyl, cheaply and badly, and the royalty disputes that came with it.
  That's a claim about the scene's records as a whole, not about one
  artist, so e-trax-chicagohouse runs label to scene. A69 only described
  label to artist. This extends it without changing it: the edge still
  has to claim that the label's decisions changed the output. Five nodes
  are left orphaned, because their only honest edges would be the
  founder or roster relationships A69 excludes: Transmat, KMS, the Kling
  Klang label, Rockers International and Brunswick. BACKLOG lists what
  each is waiting for.
- **A178. New optional label field: `songsAboutLabel`.** Matt asked for a
  side note on artists who write songs about record labels themselves,
  scoped (per his choice) to a per-label field rather than a prose aside
  or a curated thread: `[ { artist, title, year, note } ]`, rendered as
  a new panel section following the same track-row pattern as an
  artist's `signatureTracks`. `artist` follows the `keyProducers`
  convention (A-many): an id when the artist is on the map, so the panel
  links to their page, plain text otherwise. `note` is prose describing
  the connection, never a lyric quotation, both because CLAUDE.md's
  accuracy rule 1 bars invented quotations and because lyrics are
  themselves copyrighted, which the project's stance on album art and
  audio already treats as something to route around rather than ship.
  Seeded one example on `cbs-uk`: the Clash's 'Complete Control', which
  A176 already establishes as `documented` evidence for `e-cbsuk-clash`
  ("Complete Control" is its own evidence, per that entry), so this
  reuses an already-vetted fact rather than introducing a new claim.
  Population of this field across the rest of the label roster is left
  to Track D rather than invented here, in line with the accuracy rules;
  the request to Matt for a scope check on this and album art is closed
  by his answer, so it isn't repeated in QUESTIONS.md.
- **A179. No mechanism for real album art, and none is planned.** Matt
  asked whether the project could show album covers without hitting API
  rate limits. It can't, and not for a rate-limit reason: CLAUDE.md's
  anti-goals rule out album art outright ("No album art... Not one"),
  and the no-runtime-network-calls constraint rules out fetching it at
  all, rate limits aside. Both are hard constraints, not implementation
  gaps, so nothing was built. Flagged to Matt; his answer was to drop it
  and keep the anti-goal as written, rather than pursue a synthesized/
  generated alternative.

## Track D: funk/dub data batch 1

- **A180. Funk and dub, batch 1: six artists, four labels, nine edges.**
  Matt asked to prioritize Track D and, given the choice, picked funk
  and dub, the two thinnest lineages by far (`npm run report` had them
  at 6 and 7 artists respectively, against hip-hop's 32). Added:
  Parliament-Funkadelic, Bootsy Collins and Curtis Mayfield (funk);
  U-Roy, Scientist and Prince Jammy (dub); Casablanca and Curtom
  (funk labels); Studio One and Treasure Isle (dub labels). All facts
  were checked against multiple sources with WebSearch rather than
  written from training data alone, given the accuracy rules' bar on
  invented dates, credits and quotations; specific verified facts and
  their sources are in each record's `evidence`/`ownershipStory` fields
  rather than repeated here. `npm run validate` passes clean (0 errors,
  same category of pre-existing warnings only); `npm run report` moves
  funk from 7 to 12 total records and dub from 11 to 16.
- **A181. Two label founding/closing years carry `endUnknown` rather
  than a guessed date.** Studio One's post-2004 (Dodd's death)
  operating status, and Treasure Isle's status after Sonia Pottinger
  bought it in 1974, are not clearly established in the sources checked.
  Both get `closedYear: null, endUnknown: true` rather than a null read
  as "still going" (the ordinary meaning per SCHEMA.md) or an invented
  closure year.
  Treasure Isle's `foundedYear` (1962) is the one specific year sourcing
  converged on, against looser "late 1950s" accounts of when Duke Reid's
  broader liquor-store-and-sound-system business began; Studio One's
  founding (1954) is the record label's start, distinct from the 1963
  opening of its own Brentford Road studio, which the label's
  `ownershipStory` states separately rather than conflating the two
  dates.
- **A182. Did not attribute 'Atomic Dog' to Parliament-Funkadelic.**
  It's the P-Funk universe's most sampled track and the obvious choice
  for a crossLineage sample edge into hip-hop, but it was released in
  1982 as a George Clinton solo record, after Parliament and Funkadelic
  had already dissolved as legal entities (1981), not under either band
  name. Crediting it to the `parliament-funkadelic` node would be an
  invented credit under CLAUDE.md's accuracy rules 2 and 3. Used
  Funkadelic's 'Get Off Your Ass and Jam' (1975), correctly band-credited
  and sampled on Public Enemy's 'Bring the Noise' (1988), for
  `e-parliamentfunkadelic-publicenemy` instead. George Clinton's solo
  catalogue, including 'Atomic Dog', waits on a `george-clinton` artist
  node of its own; logged in BACKLOG rather than added here, since a
  hip-hop-adjacent solo artist was out of this batch's funk/dub scope.
- **A183. `kingston-dub`'s scene window (1968-1980) and its new
  members.** U-Roy (1970 breakout), Scientist (joins Tubby's as a
  teenager mid-1970s) and Prince Jammy (joins Tubby's 1976) all fall
  inside the existing scene's year range, so all three were added to
  its `memberIds` alongside King Tubby and Lee Perry, and each artist
  record lists the scene back. Prince Jammy's 1985 'Under Mi Sleng
  Teng', the record usually cited as ending the era the scene
  describes, falls after the scene's own end year and is described in
  his artist record without being pulled into the scene's membership
  window.

## Track D: orphan-closing batch (Transmat, KMS, Rockers International)

- **A184. Three orphan labels, three artists, six edges.** BACKLOG named
  the specific non-founder artist each orphan label was waiting on
  (A177). Added Carl Craig (Transmat), Chez Damier (KMS), and Hugh
  Mundell (Rockers International), each with the label edge BACKLOG
  called for plus a second, person-to-person edge to an artist already
  on the map (Derrick May, Kevin Saunderson, Augustus Pablo
  respectively), so each new node lands inside the main connected
  component rather than forming its own small island. `npm run
  report`'s node/edge counts don't show connectivity, so this was
  checked separately with a script walking `data/edges/` as an
  undirected graph. Before: 159 nodes in 18 components (one 120-node
  main component, 12 islands of 2-5 nodes, 5 single-node orphans).
  After: 162 nodes in 15 components (main component grown to 126, the
  same 12 mid-size islands untouched, 2 single-node orphans remaining,
  Kling Klang and Brunswick per A177). All facts checked with WebSearch
  against multiple sources per record (Wikipedia, Discogs release data,
  and outlet profiles for each artist; specific citations are in each record's
  `evidence` field rather than repeated here). `npm run validate`
  passes clean (0 errors, 48 warnings, down from 51: the three orphan-
  label warnings clear, no new warning categories introduced).
- **A185. KMS: picked Chez Damier over MK.** BACKLOG offered either.
  Chez Damier's KMS connection is the more specific, better-sourced
  claim: he worked A&R for Kevin Saunderson at the label and released
  his own single there ('Can You Feel It', 1992, confirmed on Discogs),
  where MK's early KMS-era work is described consistently across
  sources only in general terms ('crafting deep house for KMS from age
  17') without a specific KMS-credited release surfacing in the sources
  checked. MK remains a valid future addition on his own terms (his
  later remix and production career is extensively documented) but
  wasn't needed to close this particular orphan.
- **A186. Rockers International: picked Hugh Mundell over Jacob Miller.**
  Both are directly and heavily sourced (Wikipedia biographies for
  both, corroborated by Discogs and contemporary reviews). Mundell's
  entire catalogue ran through Pablo and Rockers specifically, a
  cleaner single-label claim; Miller's catalogue was split across
  Inner Circle's other labels as well as Pablo's productions, which
  would have made the label edge's evidence field carry more caveats.
  Jacob Miller remains a strong future addition; nothing here rules
  him out.
- **A187. Chez Damier's `activeTo` left as `null` rather than a guessed
  end date.** Sources describe his active career from the Music
  Institute (1988) through Prescription Records (founded 1993) in
  detail, but none of the sources checked state or imply he has
  stopped recording or performing, and electronic-music figures of his
  generation routinely remain active well past their commercially
  documented peak. Per SCHEMA.md, `null` means "still going" by
  default; there is no positive evidence of an end to justify
  `endUnknown` either; if he has in fact stopped, this should be
  corrected with a source rather than guessed here.
- **A188. `e-kevinsaunderson-chezdamier` held at `consensus`, distinct
  from the `documented` `e-kms-chezdamier` label edge.** The label
  edge documents an institutional fact (A&R role, then a KMS release)
  that multiple sources state plainly. The person-to-person edge tries
  to name what Saunderson's mentorship specifically changed in
  Damier's own music, which no source checked states directly; it
  rests on the two men's proximity (the Music Institute's shared DJ
  booth, then the A&R relationship) rather than a specific claim, so
  it sits one tier lower, the same distinction A69's label-vs-artist
  edges draw elsewhere in this dataset.

## Track D: bridge edges (no new nodes, three islands merged)

- **A189. Three more islands merged into the main component, with no
  new artists.** Re-ran the connectivity script from A184 after that
  batch and found the pattern wasn't unique to orphan labels: several
  scene and label nodes carry edges only to each other, in their own
  small island, even though the artists who belong to them (via
  `scenes`/`memberIds`, not a graph edge) sit in the main component.
  `detroit-techno`/`warp`/`aphex-twin`/`autechre` (4 nodes),
  `south-bronx`/`kingston-dub`/`studio-one` (3 nodes), and
  `ensoniq-eps-16-plus`/`rza`/`the-charmels`/`wu-tang-clan` (4 nodes)
  were each one edge away from the main graph. Added exactly one
  bridging edge per island rather than new nodes: `e-kraftwerk-warp`
  (documented: the 'Artificial Intelligence' compilation's cover
  depicts Kraftwerk's 'Autobahn' on the android's turntable, a sleeve
  fact rather than an interview quote), `e-bronx-theclash` (documented:
  'The Magnificent Seven', recorded April 1980, directly credited to
  the Clash's exposure to Grandmaster Flash and the Sugarhill Gang on
  the ground in New York), and `e-publicenemy-rza` (consensus: RZA's
  production widely described as adapting the Bomb Squad's cut-up
  technique toward a sparser end, but no first-person RZA quote naming
  Public Enemy specifically was found in the sources checked). Main
  component: 126 to 137 nodes, 15 components to 12. `npm run validate`
  stays clean at 0 errors, 48 warnings (unchanged, since none of these
  three islands carried an orphan warning to begin with, only their
  now-fixed disconnection from the main graph). Left `moog-modular`/
  `tangerine-dream`/`virgin`/`wendy-carlos` and the `cypress-hill`
  cluster alone: a candidate bridge for the Moog island (George
  Harrison's Moog use on Beatles records) didn't hold up under a
  second search, which credited the Melody Maker comparison to Wendy
  Carlos rather than a stated influence, and no substitute was checked
  carefully enough to add before running out of session time.
- **A190. Crosscheck on the PR #32 batch.** `tools/crosscheck.js`
  (MusicBrainz only, while Wikimedia's block holds, A174) over the 32
  records added or changed since the orphans batch found two real date
  errors, both confirmed on Discogs. 'Bring the Noise' was a 1987 Def Jam
  single (651335 7) before It Takes a Nation of Millions (1988), so
  e-parliamentfunkadelic-publicenemy and e-publicenemy-rza now date it
  1987. 'Protect Ya Neck' was self-released on Wu-Tang Records in 1992
  (PR234), as e-rza-wutang and the Wu-Tang record already said, so
  e-publicenemy-rza's later side and edge year are now 1992. The rest of
  its findings are MusicBrainz's thin dating of reggae and early techno.

## Track D: sample-hub and Native Tongues batch (unattended, autonomous session)

Run without Matt in the loop, at his own request ("how far can you go
without my input"). Every fact below was checked against live web sources
(WebSearch) during the session rather than recalled from training data,
following A62/A117's lesson that confident recall of a credit or date is
exactly the kind of claim this project has been burned by before. Sources
are named in each record's own `evidence` field rather than repeated here.

- **A191. Scope: seven artists, one machine, nine edges.** Isaac Hayes,
  The Isley Brothers, Bob James and Syl Johnson (sample hubs named in
  `BACKLOG.md`, all now with a documented single-song sample credit into
  an artist already on the map), De La Soul and Prince Paul (closing the
  hip-hop-production-batch gap A118 logged), Mantronix (an early,
  well-documented TR-808 self-taught-in-the-session story, same pattern
  as Man Parrish's), and the Casio MT-40 (closing the specific machine
  gap `e-tubby-princejammy`'s own adult text had been flagging since the
  funk/dub batch, A180). The A107/A118 orphan rule held: every new node
  got a sourced edge to something already on the map before being
  written, not after.
- **A192. Isaac Hayes and The Isley Brothers both sample into Public
  Enemy's Bomb Squad catalogue** (`e-hayes-publicenemy`,
  `e-isley-publicenemy`) rather than into some other already-mapped act,
  because the Bomb Squad's own dense, multi-source collage method is
  already established on this map (`e-jamesbrown-publicenemy`) and both
  new credits are independently well documented single-song matches
  rather than a guess at which of a dozen buried sources mattered most.
  The Isley Brothers edge also confirms, rather than duplicates, a credit
  `e-jamesbrown-publicenemy`'s own evidence field had already named in
  passing.
- **A193. `e-tommyboy-delasoul` held at `consensus`, not `documented`,**
  on purpose. The label decision itself (Tommy Boy choosing which of De
  La Soul's submitted samples to clear) and the resulting Turtles lawsuit
  and settlement are both directly sourced. The claim that the group's
  next album's darker tone was a response to that specific lawsuit is a
  widely repeated critical reading, not a first-person causal statement
  from the group naming the lawsuit as the cause, so per rule 4 it earns
  consensus and says so in its own explanation text, the same honesty
  move A171/Q22 already established for edges resting on agreement
  rather than testimony.
- **A194. `e-delasoul-tribecalledquest` is this map's first `direct`-type
  edge between two contemporaneous peers rather than a mentor, a
  technique, or a one-way transmission.** Chronology decided the
  direction: De La Soul's debut (1989) predates A Tribe Called Quest's
  (1990), and Q-Tip appears on a De La Soul record months before his own
  group's first album, so `from: de-la-soul, to: a-tribe-called-quest`
  is defensible even though the real relationship is a shared collective
  identity (the Native Tongues) rather than a one-way act of influence.
  Held at `consensus`, and the edge's own adult text says plainly that
  this is a collective identity forming around a style, not a named
  transmission, rather than dressing up a mutual scene as a directed
  claim.
- **A195. Mantronix filed `lineage: "hiphop"`, not `"electronic"`,**
  unlike Man Parrish (`electronic`). Both are 1980s electro acts built
  around the TR-808, but Mantronix always had a credited rapper, MC Tee,
  and released on a rap-context label (Sleeping Bag), matching Afrika
  Bambaataa's precedent (also `hiphop` despite heavy machine use) rather
  than Man Parrish's instrumental-only electro records. `crossLineage`
  on `e-808-mantronix` is therefore `true`.
- **A196. Casio MT-40 filed `kind: "instrument"`, not `"synth"`.**
  Sources describing the machine are explicit that it is not a
  synthesizer in the signal-generating sense, since it only plays
  prerecorded preset sounds; it is played by hand the same way A109 reads
  the Mellotron, a fixed sound library triggered from a keyboard, which
  is the closer analogy.
- **A197. De La Soul's own `labels` field is left empty rather than
  populated with a `tommy-boy` entry.** The schema's `{ labelId, from,
  to }` shape implies a closed date range, and no source checked gives a
  defensible year the group's association with Tommy Boy ended (they
  remained linked to the label's catalogue into the streaming era in
  ways too tangled for a single "to" year). The causal claim that matters
  for this map, the label's sample-clearance decision, is carried by
  `e-tommyboy-delasoul` instead, which needs no end year. Tommy Boy's own
  `ownershipStory` already named De La Soul in prose before this batch,
  so nothing about the relationship was previously undocumented, only
  ungraphed.
- **A198. `stones-throw` added as a label whose causal edge targets MF DOOM,
  not Madlib, for the Madvillain pairing.** Founder Chris Manak's own
  account (a Complex interview marking Madvillainy's 20th anniversary,
  corroborated elsewhere) describes a specific mechanism: he called
  Dumile to propose the collaboration with his own already-signed artist
  Madlib, then hosted the sessions at his house. The label's decision
  landed on DOOM's side of the pairing, so `e-stonesthrow-mfdoom` runs
  label to DOOM under the A69 convention, with DOOM's self-produced
  'Doomsday' (1999) and Madvillain's 'Accordion' (2004) as the trackPair
  showing the audible change. Madlib's own `labels` field is left
  untouched; he is a career-long Stones Throw artist across many records,
  not one this specific documented decision reshaped.
- **A199. Stan Getz and Luiz Bonfá are filed as one joint artist node,
  `stan-getz-luiz-bonfa`, not two.** Their 1963 album 'Jazz Samba
  Encore!' is co-billed on every pressing checked (Discogs: "Stan Getz /
  Luiz Bonfá"), and the node exists on this map only for that one
  session's sample into J Dilla's 'Runnin'' (The Pharcyde, 1995), the
  same minimal sample-hub pattern Bob James and Ahmad Jamal already
  established (Q21) rather than a claim about either musician's much
  larger individual career. `activeFrom` and `activeTo` are both set to
  1963, the one year this node represents. Jazz remains a deferred
  lineage (BACKLOG); this is a sample-hub exception, not the start of
  covering it.
- **A200. Neither `mf-doom.json` nor `j-dilla.json` had a `stones-throw`
  entry added to their `labels` array.** Following A197's precedent
  rather than the older `biz-markie.json`/`cold-chillin` pattern: the
  causal claim lives in the edge, and a closed `{ from, to }` date range
  on the artist record would add a fact the edge doesn't need: DOOM and
  Dilla each have exactly one dated Stones Throw record on this map
  (Madvillainy, Donuts), which the edge's own `year` field already
  carries.
- **A201. Michael Jackson's `hook` and both required registers state the
  child sexual abuse allegations as fact, in age-appropriate language,
  rather than omitting them or confining them to the adult register.**
  CLAUDE.md's writing rules say reading level changes vocabulary, never
  facts, as "the governing rule for all three registers," and its
  accuracy rules treat an artist's documented conduct as part of the
  historical record, not an editorial aside. The specific claims (the
  1993 civil suit and 1994 settlement, the 2005 criminal acquittal, and
  the 2019 'Leaving Neverland' allegations with the estate's denial and
  lawsuit against HBO) were checked against Wikipedia's own dated,
  sourced summary rather than assumed. This is the first artist on the
  map BACKLOG had flagged by name as needing "careful adult-register
  handling" (A137); the same care was extended to the required Teen
  register rather than only the Adult one.
- **A202. Michael Jackson, Janet Jackson, and Sade are all filed
  `lineage: "funk"` or `"other"` for the same reason: none fits `"rock"`,
  `"hiphop"`, `"dub"`, or the enum's narrower sense of `"funk"` cleanly,
  and the map has no `"pop"` or `"soul"` lineage (A71 already declined to
  add a lineage value for disco on similar grounds).** Michael and Janet
  Jackson went to `"funk"` as the closer fit (Motown/JB's-descended
  funk-soul-pop, matching James Brown and Isaac Hayes); Joni Mitchell
  went to `"rock"` as canonical folk-rock singer-songwriter work, not a
  sample-hub-only case like Bob James or Ahmad Jamal. All three are on
  the map for one documented sample connection each (into Nas, and
  between each other), not for a fuller biography, matching the Q21
  sample-hub convention.
- **A203. Shy FX added alone, not jointly with UK Apache, for
  'Original Nuttah' (1994).** Unlike the Getz/Bonfá pairing (A199), Shy
  FX is a decades-long solo/production career on his own credit; UK
  Apache's MC contribution is named in the edge's evidence and prose
  rather than given a separate node, the same treatment other one-off
  guest vocalists (Q-Tip's features, for instance) already get elsewhere
  on the map. `e-winstons-shyfx` closes the "jungle and drum and bass
  aren't on the map" gap BACKLOG had named for the Amen break specifically;
  it is one hub edge, not coverage of either genre, which BACKLOG now
  says explicitly.
- **A204. George Clinton is a separate node from `parliament-funkadelic`,
  `activeFrom` starting in 1982 rather than his full career.** 'Atomic
  Dog' is a Clinton solo credit on Capitol, not a Parliament or
  Funkadelic release, and BACKLOG had already named this as the reason
  the sample couldn't attach to the band's node. The node is deliberately
  scoped to his solo career rather than backdated to the Parliaments in
  the 1950s, since the band node already covers 1968-1981 and a full
  Clinton biography isn't this map's job (Q21 sample-hub convention).
- **A205. `dr-dre` added as N.W.A's producer stepping out on his own,
  with `nwa.json`'s `keyProducers` updated from the plain name "Dr. Dre"
  to the `dr-dre` id now that the node exists**, the same fix A127 and
  others have made elsewhere once a plain-name credit gets its own
  record. His entry repeats, briefly and by reference rather than in
  full, the Dee Barnes assault N.W.A's own record already documents in
  full (CLAUDE.md: historical importance is not endorsement, and
  documented conduct is fact, not an aside), rather than omitting it
  from a second record about the same person. The same plain-name-to-id
  fix was applied to `bootsy-collins.json` and `parliament-funkadelic.json`,
  both of which carried "George Clinton" as a plain-name `keyProducers`
  entry that now resolves to `george-clinton`.
- **A206. `britpop` given `city: "London"` despite its three members
  spanning London (Blur), Sheffield (Pulp), and Wigan (The Verve),** the
  same pragmatic single-value choice A26/the open design question on
  `uk-post-punk` already made for a scene with no single city: London
  carries the scene's press and industry weight (Food Records, the
  Britpop-vs-grunge press narrative, the 1997 Downing Street framing),
  and the other two cities are named directly in the scene's own prose.
  `e-britpop-pulp` is a scene-to-artist edge in the `e-swinginglondon-hendrix`
  mould (the scene as causal agent supplying an audience and moment, not
  the songwriting), held at `consensus` rather than `documented` since
  it rests on a widely shared critical reading of timing rather than a
  single first-person account. Blur and The Verve are scene members
  without their own scene-edge for now: Blur's causal story already runs
  through the Kinks (`e-kinks-blur`) rather than the scene itself, and
  The Verve's through the Rolling Stones/ABKCO sample story
  (`e-stones-verve`), so a second scene edge for either would have had
  nothing new to claim.
- **A207. `cologne-krautrock` is a separate scene from `dusseldorf-kling-klang`,
  not a merge into it,** even though both cover the same 1970s West
  German moment the British press lumped together as "krautrock."
  Düsseldorf's story is self-built and private (Kraftwerk's own factory-
  space studio); Cologne's is institutional (WDR's state-funded Studio
  for Electronic Music since 1951, which trained Can's founders under
  Stockhausen). Distinct causal roots earned distinct scene nodes, the
  same reasoning that already kept `kingston-dub` and the Bronx apart as
  separate scenes rather than one generic "sampling-era" node.
  `e-cologne-can` and the existing `e-stockhausen-can` are a deliberate
  paired claim, the same shape as `e-osullivan-bizmarkie` and
  `e-coldchillin-bizmarkie`: one edge names the institution (the studio
  existing at all), the other the specific mechanism (two named students
  and their teacher). Conny Plank joins the scene as a member without a
  second scene edge; his own documented production credits run to
  Düsseldorf acts (Kraftwerk, Neu!) already covered by that scene's own
  edges, not to Can, so inventing a causal claim between his studio and
  Cologne specifically would have overstated what's sourced.
- **A208. `enjoy-records`'s A69 claim is a distribution limitation, not a
  creative or contractual decision like the label edges before it.**
  Robinson's judgment on Grandmaster Flash and the Furious Five was
  sound; Enjoy simply had no machinery to sell 'Superrappin'' outside
  New York, which is what moved the group to Sugar Hill within the year.
  `closedYear` is `null` with `endUnknown: true` (Q20) rather than a
  guessed date, since Robinson stayed active into the mid-1980s but no
  source checked gives the label's own closing year.
  `grandmaster-flash.json`'s `labels` field is left empty rather than
  populated, matching the more recent convention (A197, A200) even
  though a closed `{ from: 1979, to: 1979 }` range would have been
  defensible here.
- **A209. `e-kane-nas` is held at `consensus`, not `documented`,** after
  a specific-sounding secondary claim (that Nas's 'Where Are They Now'
  both reuses a Marley Marl sample and lyrically shouts out Big Daddy
  Kane's Juice Crew by name) turned out not to hold up under a second
  check: the sample reuse is real, but no source checked confirmed the
  song names Kane specifically rather than other Juice Crew members, or
  gave a firm release year. Rather than build the edge on a half-verified
  specific, it rests on the broadly and repeatedly documented critical
  reading of Kane as a technical forerunner of Nas's generation, which
  is genuinely consensus rather than a single sourced claim. His
  documented mentorship of a then-unsigned Jay-Z (touring as his hype
  man, a 1994 track together) is real but goes nowhere on this map,
  since Jay-Z isn't a node.
- **A210. `uk-jungle` gives Shy FX a second scene edge's worth of
  context without a second edge**, since he's already the source of
  `e-winstons-shyfx` (a sample edge, not a scene one); `e-ukjungle-goldie`
  carries the scene's own causal claim instead, on the same "scene
  supplied the audience, not the technique" model as `e-britpop-pulp`
  and `e-swinginglondon-hendrix`. `e-goldie-bowie` runs the opposite
  direction from most of this map's cross-lineage edges: a young dance-
  music producer's club night reshaping an older rock legend's late
  work, rather than the usual older-artist-shapes-younger-successor
  pattern, and it's genuinely documented, in Goldie's own repeated
  account, not a reach for symmetry. Bowie's own reciprocal guest vocal
  on Goldie's 'Saturnz Return' (1998) is named in prose rather than
  given a second edge, since the causal claim (the club night inspiring
  'Earthling') only runs one way.
- **A211. MC Shan, Kool G Rap, and Roxanne Shanté all connect to the map
  through a straightforward `production` edge from `marley-marl`,**
  rather than a `label` edge from `cold-chillin`, since the causal claim
  in each case is squarely about what Marl did in the booth (produced
  'The Bridge' and 'Road to the Riches' in full, made his own production
  debut on 'Roxanne's Revenge') rather than a label decision under the
  A69 convention. `e-marleymarl-mcshan`'s trackPair names 'The Bridge Is
  Over' with `search: false`, since Boogie Down Productions isn't a node
  and the record is prose-only context, the same pattern the seed already
  used for MC Shan himself inside `e-marleymarl-bizmarkie` before this
  batch gave him his own record. Both single-signature-track warnings
  (MC Shan, Roxanne Shanté) are deliberate: each is on the map for the
  one record this batch's edges are actually about, matching the-charmels'
  and gilbert-osullivan's precedent, not a gap to be padded.
- **A212. `chess-records` filed `lineage: "funk"`, not `"rock"`,** on the
  same logic A71 already used for disco: the enum has no blues bucket,
  and Chess's actual catalogue (Muddy Waters, Chuck Berry, Howlin' Wolf)
  is Black American vernacular music, closer in kind to the funk bucket's
  other occupants than to the British and American rock acts on the
  other side of most of its edges. This makes `e-chess-stones` genuinely
  `crossLineage: true`, which reads truer to the real story (a blues
  label's studio reshaping a British rock band) than tagging Chess
  `"rock"` to match its edge target would have. The causal claim is
  access, not a creative or contractual decision like most A69 label
  edges: Chess granting studio time it didn't normally extend to outside
  artists is what put the Stones in the same room as Muddy Waters and
  Chuck Berry, which both band accounts and Keith Richards' own telling
  tie to their shift toward original songwriting shortly after.
- **A213. `sheffield-idm` is a scene built around a label's marketing
  decision rather than a shared city or club culture,** and says so in
  its own adult text: Aphex Twin and Autechre were never based in
  Sheffield or working in the same room, and the connecting fact is
  Warp Records' 1992 'Artificial Intelligence' compilation and its
  'home listening' framing, which is also already documented in
  `warp.json`'s own blurb. `city: "Sheffield"` follows the same
  pragmatic single-value convention as `britpop` and `uk-post-punk`
  (the label's home city, not either artist's). `e-sheffieldidm-aphextwin`
  is a scene-to-artist edge in the by-now-familiar mould (the scene
  supplied a name, a category and an audience; Aphex Twin's ambient,
  non-club music predates the compilation). Both artists already carried
  `warp` in their `labels` field from an earlier batch, which this one
  didn't touch.
- **A214. `motown` connects to `michael-jackson` rather than a
  standalone Jackson 5 node.** The causal claim, Berry Gordy reassigning
  a Corporation-written song from Gladys Knight to the Jacksons and
  putting an eleven-year-old Michael at the center of the arrangement,
  is specifically about him, and `michael-jackson.json` already covers
  his Jackson 5 years in its own text rather than treating them as a
  separate, unconnected phase. `closedYear` is `null` without
  `endUnknown`, unlike several other labels on this map: Motown
  genuinely never closed, it changed hands (MCA in 1988, PolyGram in
  1993, Universal in 1999) and still operates as a label today, which is
  a different fact than "we don't know when it ended."
- **A215. `stax` and `memphis-stax` split one history into a label edge
  and a scene edge, each carrying a different half of it,** the same
  division `cologne-krautrock`/`e-cologne-can` and `e-stockhausen-can`
  used. `e-stax-isaachayes` (label) names the specific mechanism: Stax's
  1968 catalogue loss to Atlantic forced Al Bell to grant Hayes full
  creative control in exchange for trying again after his flopped 1968
  debut, which is what produced 'Hot Buttered Soul'. `e-memphisstax-charmels`
  (scene) names the general condition instead: an in-house writing system
  (Hayes and Porter, before Hayes's own solo career) that could and did
  produce records for acts far less prominent than its own staff. Both
  Isaac Hayes and The Charmels join the scene; only Hayes gets the label
  edge, since the Charmels' record predates and has no connection to the
  1968 crisis that is `e-stax-isaachayes`'s actual claim.

## Added a fourth visual-direction prototype: depth and leap

Matt asked how to fix the map reading as vertical stripes, add an illusion
of depth, and add randomized discovery and a challenge mode. Measured the
live M2 render before proposing anything: of 154 on-screen edges, 132
(86%) were steeper than 63 degrees and the median horizontal span was 0
years. Traced the cause to `edgeAnchors` in `render/graph.js`, which
anchors both ends of an edge at the edge's own year rather than at the
artists' own markers, so a same-year edge is nearly vertical by
construction. Raised the fix as two options (arc the edges but keep the
year anchor, or anchor edges at the markers for a true diagonal leap) and
raised depth as a question of what "recede" means. Matt chose diagonals
and asked to see depth mocked up; asked to keep planning before any build
move otherwise.

- **A216.** Built `design/04-depth-leap.html`, a fourth prototype
  alongside `01`-`03`: same conventions (frozen against the same snapshot,
  imports nothing from `render/`, is not app code). It answers only the
  two visual questions Matt asked to see, not the random-discovery or
  challenge-mode ideas, which stay text-only per "keep planning."
- **A217. Depth recedes lanes vertically only, never on the time axis.**
  A focused lane's nodes enlarge to full opacity and sharpness; every
  other lane dims, blurs (CSS `filter: blur()`, scaled by how many lanes
  away it is), and compresses its rows toward its own centreline. The
  prototype enforces this structurally rather than by convention: `n.x`
  is set once from `xOf(year)` during layout and no code past that point
  ever writes to it, and a static year ruler is drawn outside every lane
  group specifically so a reader can see it hold still under both toggles.
  This is a real constraint on any future 3D treatment: true parallax
  (background layers sliding sideways at a different rate while panning)
  is exactly the thing CLAUDE.md rules out, since it would put two
  different years at the same screen x.
- **A218. The diagonal-edge option changes what an edge's exact year
  means on screen.** Star-to-star anchoring dropped the steep-edge count
  from 86% to 3% and moved the median horizontal gap from 0 to 7 years in
  the prototype's smaller snapshot, but an edge's `year` field no longer
  positions it on the axis; the claim's year still has to be readable
  somewhere (the reading panel already states it in prose per M3, so nothing
  new is needed there, but it is a real trade Matt should hold in mind
  before signing off on the direction for M2's port).
- Random discovery ("Leap"/"Dive" through the neighbour graph) and the
  Connect-the-Stars challenge mode were not prototyped or built. Logged
  in `BACKLOG.md` under "Deferred features" so the idea isn't lost before
  Matt decides how this whole pass gets sequenced against the open M3
  gate.

## Added a "discover on hover" reveal mode to the depth/leap prototype

Matt tried the Netlify preview and reported it taxing the browser, with
too many lines on screen at once, and asked for most connections (the
vertical ones especially) hidden by default and revealed on discovery.
This is the same problem two ways: BACKLOG already carried the M2 perf
gate's real-browser spot-check as unverified, and a map that shows every
edge at once is also the less inviting one to explore.

- **A219.** Added a third toggle to `design/04-depth-leap.html`: "All
  edges" (unchanged) versus "Discover on hover". In discover mode every
  edge starts out of the render tree entirely (`display: none`, not just
  invisible), replaced by a short static tick at each endpoint that only
  says a connection exists there, not what it is. Hovering a node reveals
  its real edges; leaving the node leaves them lit but dimmed rather than
  hidden again, so exploring only ever adds to what's shown and nothing
  Matt finds disappears on him. The prototype's own readout now counts
  live edges against the total, so the perf argument is a number on
  screen rather than an assertion: hovering one well-connected node in
  the 33-edge snapshot put 7 edges in the render tree, not 33.
- This composes with depth (A217) without changing either: a hint tick
  sits at the node's current position, so it recedes and dims along with
  its lane, same as everything else there.
- Not decided yet: whether "discovered" persists across a session (this
  prototype never forgets, which was the simplest thing to build and
  worth Matt's read before it becomes a real behaviour with real storage
  implications), and whether hover is the right trigger on a touch build
  with no hover at all (BACKLOG already defers touch/wall-panel as its
  own track).

**A220.** Matt: discovered should be stored, and touch is out of scope for
now but worth exploring later (no BACKLOG change needed, it was already
filed there as its own track). Wired persistence into the prototype rather
than leaving it as a described-but-unbuilt idea, since the mechanism is
small and worth having in front of Matt alongside everything else here.

- `discovered` now loads from and saves to `localStorage` under
  `lineage.design04.discovered.v1`, mirroring `render/layers.js`'s
  existing pattern exactly: wrapped in try/catch so Safari private mode
  or blocked site data degrades to "starts empty" rather than breaking
  the map, and only ids that resolve to a real edge in the current
  dataset are read back, so a stale or hand-edited entry can't invent
  one. Verified with Playwright: discovering King Tubby's 7 edges,
  reloading the page, and reading the render-tree count back at 7/33
  confirms the round trip; clearing via the new "Forget what I've found"
  control drops it back to 0/33 and empties the stored array.
- Added that control (a plain reset, no confirmation) specifically so
  testing this doesn't require clearing `localStorage` by hand. A real
  build likely wants the same affordance somewhere, if only so a reader
  sharing a device with someone else isn't stuck looking at a
  half-explored map that isn't theirs.
- The storage key is namespaced to this prototype
  (`lineage.design04.*`, not `lineage.discovered.*`) on purpose, so a
  browser that has both this file and the real app open never confuses
  a design experiment's state with the shipped reader's. `render/`'s
  real key, if this direction is ported, is Matt's to name alongside
  the rest of `CONFIG.layers`/`CONFIG.arrange`'s keys, not inherited
  from here.

## Lineages moved into the data

- **A221. Lineages are records in `data/lineages/`, not a list in code.**
  Matt asked for this in chat (2026-09-25) after a scope conversation
  about adding jazz and blues and about letting others run the concept
  against their own taste. The list had been copied into four places
  (`tools/validate.js`, `CONFIG.colors.lineage`, `reading/copy.js`'s
  `LINEAGE_LABELS`, and `data/SCHEMA.md`), so adding a lineage meant
  editing three files, which CLAUDE.md's scope rule says is the
  architecture being wrong. Each record now holds `id`, `name`, `color`
  and `order`, and `render/lineages.js` is the one place the app asks.
- **A222. A lineage's colour lives on its record, not in `CONFIG`.** This
  bends the "all tuning values in `CONFIG`" rule on purpose. A lane's
  colour is part of what the lineage is, the same way a scene's
  `palette` already lives on the scene record, and keeping it in
  `CONFIG` would make a new lineage a two-file change again. `CONFIG`
  keeps one `colors.lineageFallback` for a node whose lineage has no
  record.
- **A223. `order` is spaced in tens** (rock 10 through funk 50, `other`
  at 90) so a lane can go between two others without renumbering. Lane
  order and colours are unchanged from before. The one visible change is
  the lane title, which now uses the record's `name`, so HIPHOP reads
  HIP-HOP.
