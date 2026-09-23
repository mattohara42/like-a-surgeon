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

