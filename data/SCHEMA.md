# Data schema

Plain JSON, human-readable, hand-editable. Matt will edit these directly.

Sharding: one file per record under `data/lineages/`, `data/artists/`,
`data/machines/`, `data/scenes/`, `data/labels/`, `data/edges/`,
`data/threads/`, `data/demos/`.
Filename is the id, exactly; a mismatch is a hard validator error.

`data/manifest.json` is **generated, not hand-maintained.** `tools/manifest.js`
walks the eight directories and writes it; `serve.js`, `validate.js`, and
`bundle.js` all call that same helper. Adding a record is one new file and
zero manifest edits. Do not hand-edit `data/manifest.json`.

The app does not load every record at startup. It loads a **skeleton
index** (`tools/skeleton.js`): each artist, machine, scene, label and edge
cut down to the fields the map draws with, plus lineages, demos and
threads whole. A record's full text loads when its panel opens. The
skeleton's field lists are whitelists, so a new field that anything other
than the reading panels needs (the graph, search, Arrange by, the scene
atmosphere) has to be added to `SKELETON_FIELDS` there too, or the map
will not see it. Dev serves the index at `data/index.json`, built fresh on
each request, and the release writes it to `dist/data.js`.

Artist, machine, scene, and label ids share one namespace, since an edge's
`from`/`to` can be any of the four with no type tag. A label named the same
as an existing artist is a collision, checked globally by the validator.

Every node's end year (`activeTo`, `discontinuedYear`, `yearTo`,
`closedYear`) can be null, and null means **still going**. When the end
is unknown rather than ongoing, add `"endUnknown": true` beside the null
(Q20). The map then draws the span a few years past the start and fades
it out, and the panel prints "1978–?" instead of "1978–now". The
validator rejects `endUnknown` on a record whose end year is set, and
rejects any value other than `true`. Leave the flag out entirely when it
doesn't apply.

All prose fields come in registers:
`{ "age7": "...", "age13": "...", "adult": "..." }`

`age13` and `adult` are **required**. `age7` is **optional and deferred to
Track D**. Write the first two now. The seed file carries `age7` on every
record as the exemplar for that later pass.

Registers differ in vocabulary and sentence length only. They never differ in
which facts are present. See "Writing rules" in `CLAUDE.md`.

---

## lineage

A lane on the map. The legal values of every node's `lineage` field are
exactly the ids in this directory, so adding a lineage is one file here
and no code change.

```
id            slug, stable forever; what node records put in `lineage`
name          display name, shown on the lane title and in panels
color         six-digit hex, the lane's colour everywhere it appears
order         number, lane position top to bottom (lower is higher up);
              must be unique. Spaced in tens so a lane can be slotted in
              between two others without renumbering
```

A lineage with no records in it takes no space on the map (see
`CONFIG.layout.dropEmptyLanes`), so a lineage can be added before its first
artist.

---

## artist

```
id            slug, stable forever
name
sortName
type          "artist"
lineage       a lineage id, one of the files in data/lineages/
activeFrom    year
activeTo      year or null (null = still active)
endUnknown    optional, true when activeTo is null because the end is
              unsourced, not because the artist is still active (Q20)
originCity
originCountry
scenes        [scene ids]
labels        [ { labelId, from, to } ]    the ones that mattered
keyProducers  [artist ids or plain names]
hook          one sentence, why this node exists on the map
blurb         three registers
signatureTracks [ { title, year, whyThisOne } ]   2 to 3
```

## machine

Gear or technique that changed music on its own. Same node class as an artist
because for long stretches of this history it is the protagonist.

```
id, name, type: "machine"
kind          "drum-machine" | "synth" | "sampler" | "studio-technique" |
              "format" | "instrument"
lineage       a lineage id, one of the files in data/lineages/
              the machine's home lineage, for crossLineage checks on edges
              that touch it
maker, releasedYear, discontinuedYear
endUnknown    optional, see above
originalPurpose   what it was sold as doing
whatActuallyHappened
priceStory    what it cost new, what it cost secondhand, why that mattered
hook, blurb
demoId        optional, a playable demonstration of the machine itself
```

## scene

```
id, name, type: "scene"
lineage       a lineage id, one of the files in data/lineages/
              the scene's home lineage, for crossLineage checks on edges
              that touch it
yearFrom, yearTo, city, country
hook          one sentence, why this scene exists on the map
blurb         three registers
geopolitics   concrete, not vibes. Conscription, unemployment, rent, race and
              immigration policy, who controlled the radio, gear prices.
whatWasNew    what a listener at the time had literally never heard before,
              and why it became possible right then
production    rooms, engineers, consoles, budgets
labels        who paid, who owned the masters, who got robbed
politics      what the music argued for or against
memberIds     [artist ids]
palette       { ink, paper, accent, accent2 }   hero card colors
motif         motif key for the generated hero card
```

`hook` and `blurb` are the reader-facing, register-aware summary, same
pattern as artist and machine. `geopolitics`, `whatWasNew`, `production`,
`labels`, and `politics` stay plain adult-only strings: backing detail that
informs the blurb, not shown at every reading level on their own.

## label

```
id, name, type: "label"
lineage       a lineage id, one of the files in data/lineages/
foundedYear, closedYear, city, founders
ownershipStory  who owned it, who it was sold to, what happened to the artists
hook, blurb
songsAboutLabel   optional, [ { artist, title, year, note } ]
                  Songs whose actual subject is the label itself (a contract
                  dispute, an unauthorised release, the label's owners), not
                  just records the label put out. `artist` is that artist's
                  id when they are already on the map (same convention as
                  artist.keyProducers), so the panel can link to their page;
                  a plain name otherwise, shown as text. `note` is prose
                  describing the connection, not a lyric quotation
                  (CLAUDE.md accuracy rule 1 bars invented quotations, and
                  song lyrics are copyrighted besides).
```

## edge

The most important object in the project. A claim that one node's music changed
because of another. An edge is a content object, not a line.

```
id
from, to        node ids of any type
type            "direct" | "production" | "technological" | "label" |
                "scene" | "sample" | "reaction-against" | "rediscovery" |
                "cover"
confidence      "documented" | "consensus" | "asserted"
evidence        For "documented": what was said and roughly where and when.
                NEVER a fabricated quotation. Describe the source in prose.
year            when the influence landed, for timeline placement
crossLineage    boolean, stored for filtering. Must equal (from node's
                lineage !== to node's lineage), resolving from/to through
                whichever node type they name. The validator checks this;
                a mismatch is a hard error.
trackPair       { earlier: {artist, title, year, search?},
                  later:   {artist, title, year, search?},
                  whatToListenFor }
                whatToListenFor is the highest-value text in the dataset.
                Be specific about the sound. No mush.
                search (optional, Q17): what the reader's YouTube search
                link looks for. Absent: "artist title". A string: that
                query instead, for titles carrying notes ("The Bridge,
                produced for MC Shan" -> "MC Shan The Bridge"). false: no
                link, for a side that is not a record (a DJ set, a machine
                as sold, a practice). The validator rejects anything else.
explanation     three registers
demoId          optional
tags            ["production","labels","politics","technology"] for overlays
```

## demo

A synthesized, in-browser demonstration. No audio files, ever.

```
id, title, kind
kind is one of:
  "machine-voice"   trigger and tweak a synthesized recreation
  "fx-chain"        dry stem, then the same stem through a processing chain,
                    switchable live
  "pattern"         a rhythmic or melodic pattern on synthesized voices
  "ab"              two patterns or timbres, switchable mid-playback
  "morph"           a sequence that transforms from one era's sound to another
params            kind-specific, engine-defined
caption           three registers, what to listen for
safety            { maxGain }    a kid is wearing headphones
```

## thread

A curated ordered path through the graph. How readers enter.

```
id, title, subtitle
intro           three registers
steps           [ { nodeId or edgeId, framing (three registers),
                    demoId (optional), cameraHint } ]
outro           three registers
```
