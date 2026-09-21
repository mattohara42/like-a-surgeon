# M1 architecture: the data layer

Plan only. Nothing in this document is implemented yet. Three of the five
sections below end with a question for Matt in `QUESTIONS.md` because they are
forks where either answer is reasonable and changes the schema. Everything
else here is a decision I made and logged in `ASSUMPTIONS.md`.

## 1. Sharded file layout

One file per record under `data/artists/`, `data/machines/`, `data/scenes/`,
`data/labels/`, `data/edges/`, `data/threads/`, `data/demos/`.

**Convention: filename is `id + ".json"`, no exceptions.** `SCHEMA.md` already
says "filename is the id"; the addition here is that the validator treats any
mismatch between a file's name and its own `id` field as a hard error, so the
rule is enforced rather than assumed.

Ids are lowercase kebab-case slugs, already the pattern in `data/seed.json`:

- Artist, machine, scene, label: kebab-case of the name/place itself
  (`the-kinks`, `tr-808`, `kingston-dub`).
- Edge: `e-<from>-<to>`, with a short qualifier appended when the same pair
  has more than one edge (the seed already does this: `e-perry-clash-cover`
  and `e-perry-clash-production` for the same two nodes).
- Demo: `demo-<slug>`.
- Thread: `thread-<slug>`.

Three example paths:

```
data/artists/the-kinks.json
data/edges/e-perry-clash-cover.json
data/scenes/kingston-dub.json
```

**Namespace note, not in `SCHEMA.md` today:** an edge's `from`/`to` can be an
artist, machine, scene, or label id with no type tag alongside it, so those
four id spaces have to be globally unique against each other, not just unique
within their own folder. A label someday named `the-who` would silently
collide with the artist. The validator checks this globally; logged as **A13**
in `ASSUMPTIONS.md` rather than asked, since there's only one workable answer.

## 2. The manifest

`SCHEMA.md`'s current line: "`data/manifest.json` lists them. Adding a record
is one new file plus one manifest line." That's a real constraint and I can
build to it directly:

```json
{
  "artists": ["the-kinks", "the-who", "..."],
  "machines": ["tr-808", "tb-303"],
  "scenes": ["kingston-dub", "south-bronx", "detroit-techno"],
  "labels": [],
  "edges": ["e-kinks-who", "e-perry-clash-cover", "..."],
  "demos": ["demo-808-voices", "..."],
  "threads": ["thread-delay-line", "..."]
}
```

Adding an artist means creating `data/artists/foo.json` and appending
`"foo"` to the `artists` array. One file, one line, exactly as specified.

**But I want to flag a stronger option before building the weaker one.** A
hand-maintained list like this is a second place that has to stay in sync
with the filesystem, and at 1000 records "stay in sync by hand" is exactly
the kind of thing that drifts quietly: a file gets deleted and the manifest
line doesn't, or vice versa, and nothing notices until something tries to
resolve a reference. The stronger option is to make `manifest.json` a
**generated** artifact: `tools/serve.js`, `tools/validate.js`, and
`tools/bundle.js` all need the same file list, so I'd write one small shared
helper that walks the seven directories and produces this exact structure,
called by all three tools. Adding a record then costs **one file and zero
manifest edits**, which is strictly better than what's specified, and the
drift failure mode disappears because there's nothing to drift against.

The tradeoff: `manifest.json` stops being something Matt hand-edits or
reorders, and becomes pure build output (possibly not even committed to git).
That's a real change to what `SCHEMA.md` currently describes, so I'm not
making it unilaterally. Asked as **Q6** in `QUESTIONS.md`. My recommendation
is the generated version; I can build either one once you say which.

## 3. The `file://` problem

Scoped tightly to what M1 needs to solve: `fetch()` of the JSON data is
blocked from `file://`. (I'm flagging a related, larger risk for M6 in
section 5 rather than solving it here, since `BUILD_PLAN.md` explicitly
assigns "bundling, offline verification" to M6.)

**Dev path — `tools/serve.js`.** A stdlib-only static file server
(`node:http`, `node:fs`, `node:path`, `node:url`, no dependencies) that
serves the project root over `http://localhost`. Over `http://`, `fetch()`
works normally with no CORS issue since everything is same-origin, so app
code can just `fetch('/data/manifest.json')` and friends during development.
One command: `node tools/serve.js`.

**Release path — `tools/bundle.js`.** Walks the manifest and every shard
directory, reads every record file, and writes a single `data.bundle.js`
containing all of it. One command: `node tools/bundle.js`.

**The tradeoff I considered and want to flag explicitly:** the obvious way
to write that bundle is an ES module — `export const DATA = {...}` — since
`CLAUDE.md` specifies ES modules for the app. I'm not doing that. Chrome (and
several other browsers) apply CORS checks to `<script type="module">` and to
`import` statements themselves, and a `file://` origin fails that check the
same way `fetch()` does. An ES module bundle would open fine in Firefox in
some versions and fail in Chrome with a CORS error, which is worse than the
plain `fetch()` problem we're solving, because it would look like it works
until someone opens it in the most common browser. Instead `tools/bundle.js`
emits a **classic script** that assigns to one global:

```js
window.LINEAGE_DATA = { artists: {...}, machines: {...}, /* ... */ };
```

A plain `<script src="data.bundle.js"></script>` tag is not a module load and
is not subject to that CORS check, so it works from `file://` in every major
browser. App code reads `window.LINEAGE_DATA` in the release build instead of
importing it. This is the one deliberate exception to "ES modules" in
`CLAUDE.md`, and it exists only because of a browser security restriction on
the data payload, not because the rest of the app should follow suit.

Both commands need zero setup: no `npm install`, since neither script has a
dependency. I'd still add a `package.json` with `"type": "module"` and three
scripts (`dev`, `build`, `validate`) purely as memorable aliases —
`npm run dev` and `node tools/serve.js` do the same thing, and the second one
always works even without the package.json.

## 4. The validator

`tools/validate.js`, stdlib-only, run as `node tools/validate.js [--strict]`.
Validates the sharded `data/` tree via `data/manifest.json`, not
`data/seed.json` (the seed is a frozen reference copy, not live data — see
`SCHEMA.md`'s own description of it).

**Hard errors (exit 1):**

- Filename doesn't match the record's own `id`.
- Duplicate id, checked in the shared artist/machine/scene/label namespace
  (section 1) and separately within edges, demos, and threads.
- `manifest.json` and the directory contents disagree in either direction: a
  file with no manifest entry, or a manifest entry with no file.
- Any reference fails to resolve: `artist.scenes[]`, `artist.labels[].labelId`,
  `scene.memberIds[]`, `edge.from`/`edge.to` (against the shared node
  namespace), any `demoId` (on a machine, an edge, or a thread step), and
  `thread.steps[].nodeId`/`edgeId`.
- A thread step has both `nodeId` and `edgeId`, or neither.
- A required field is missing: `id`, `type`, and the type's own required
  fields per `SCHEMA.md`; for every three-register object, both `age13` and
  `adult` must be present and non-empty (`age7` stays optional, per
  `SCHEMA.md`).
- An enum field holds a value outside its legal set: `artist.lineage`,
  `edge.type`, `edge.confidence`, `machine.kind`.

**Warnings (reported, don't fail unless `--strict`):**

- Orphan node: an artist/machine/scene/label with zero edges touching it in
  either direction.
- `signatureTracks` outside the 2–3 count `SCHEMA.md` calls for.
- A `keyProducers` entry that doesn't resolve to an artist id. This can't be
  a hard error, because `SCHEMA.md` allows plain names there deliberately for
  producers without their own record.

**Always reported, not pass/fail:** counts by lineage, by edge type, and by
confidence tier. This output is designed to directly satisfy the first part
of the M1 gate in `BUILD_PLAN.md` ("a generated report of counts by lineage,
edge type, and confidence tier"). The other two gate artifacts — the twenty
edges you're least sure about, and twenty random `whatToListenFor` samples —
need weighted sampling rather than a validity check, so I'd rather give those
their own small `tools/report.js` at the M1-03/M1-04 batch stage than bolt
sampling logic onto the validator now. Noted here so it isn't forgotten, not
built in this session.

One known, expected result the first time this runs: the seed's `artist.labels`
reference eight distinct `labelId`s (`pye`, `brunswick`, `cbs-uk`, `virgin`,
`kling-klang`, `tommy-boy`, `trax`, `metroplex`), and the seed has zero label
records. That's eight unresolved-reference errors on the very first run,
before anything is broken — it means labels haven't been authored yet, not
that the migration failed.

## 5. What in `SCHEMA.md` won't survive 1000 records

Three findings changed how I'd build things above and are already reflected
there. Three more are real but smaller, and I made a call on each rather than
asking, logged in `ASSUMPTIONS.md`.

**Scene has no reader-facing, reading-level-aware field, and I think that's a
gap. (Q7 in `QUESTIONS.md`.)** `SCHEMA.md`'s top line says "all prose fields
come in registers," but scene's five content fields — `geopolitics`,
`whatWasNew`, `production`, `labels`, `politics` — are specified with no
register annotation, and the seed stores them as plain adult-only strings,
matching artist and machine's `hook`+`blurb` pattern nowhere. That collides
with `CLAUDE.md`'s writing rule that a scene's politics and economics have to
reach the Kid and Teen reader too, in their own words, not just the adult one.
Two ways to close it: turn all five fields into three-register objects (a lot
of writing surface, five fields times three registers times every scene), or
give scene a `hook` + `blurb` like the other node types and keep the five
existing fields as adult-only backing detail that informs the blurb but isn't
itself shown at every reading level. I'd lean toward the second; it's your
call since it changes the schema for every scene from here forward.

**`crossLineage` is documented as computed but there's nothing to compute it
from, and the seed doesn't apply one consistent rule. (Q8 in `QUESTIONS.md`.)**
Machines, scenes, and labels have no `lineage` field, only artists do. Yet
`e-808-planetrock` (TR-808 → Afrika Bambaataa) is marked `crossLineage: true`
and `e-303-phuture` (TB-303 → Phuture) is marked `false`, and the only way
both are right is an unwritten rule that a machine has an implicit "home"
lineage (808 reads as electronic-adjacent crossing into hip-hop; 303 reads as
already electronic, so no crossing into Phuture). That's a real editorial
judgment, not a computation, and at 1000 records a field that looks computed
but is actually hand-set by unstated logic will drift, right at the one field
`SPEC.md` calls "the highest-value content in the project." Two ways to fix
it: add a real lineage-ish field to machines/scenes/labels so the validator
can check the boolean against an actual rule, or drop the word "computed" and
treat `crossLineage` as a hand-authored editorial call the validator can't
verify. I don't think there's an obviously-right default here, so it's a
question rather than an assumption.

**`keyProducers` mixes two kinds of value with no way to tell them apart.**
`SCHEMA.md` allows "artist ids or plain names" in the same array. A validator
can't distinguish a real id from a plain name that happens to look like a
slug, so it either falsely flags valid entries or silently skips checking the
field at all — which is what I've specified above, as a warning rather than
an error. A cleaner fix is `{ "ref": "arthur-baker" }` vs
`{ "name": "Some Producer" }`, cheap to do now with ~10 records and much more
annoying to migrate at 1000. I'm not blocking M1 on this: **A14**, keep the
current flat array and the warning-level check for now, revisit if the
warning noise turns out to be high once real batches land. Logged, not asked,
since either answer is recoverable later.

Smaller items, decided and logged as **A15**, **A16**, **A17** rather than
asked, since each has only one workable answer:

- **A15.** Filename must equal the record's `id` exactly; disagreement is a
  hard validator error, not a warning (`SCHEMA.md` states the rule but not
  the consequence of breaking it).
- **A16.** Artist/machine/scene/label ids share one uniqueness namespace,
  since edges reference any of the four with no type tag (section 1).
- **A17.** A thread step must have exactly one of `nodeId`/`edgeId`, never
  both or neither; `SCHEMA.md` implies this from the seed's usage but doesn't
  say it.

**One forward-looking flag, not an M1 problem.** Section 3's classic-script
workaround solves data loading for `file://`. The same CORS-on-module-load
restriction will apply to the app's own JS once it's organized as ES modules
and opened via `file://` at release. `BUILD_PLAN.md` already assigns
"bundling, offline verification" to M6, so I'm not solving it now, but M2's
renderer should be written as normal ES modules for dev (served over
`http://` via `tools/serve.js`, where this problem doesn't exist), with the
expectation that M6's bundler concatenates the app's modules into one classic
script the same way `tools/bundle.js` does for data. Worth remembering before
M2 accumulates a deep import graph that's expensive to flatten later.

## What I need from you

Three new questions in `QUESTIONS.md`: **Q6** (generated vs. hand-maintained
manifest), **Q7** (scene's missing reader-facing field), **Q8** (what
`crossLineage` actually means and whether it can be validated). Everything
else above is logged in `ASSUMPTIONS.md` as **A13**–**A17**.

Not building anything until you've replied, per the session brief.
