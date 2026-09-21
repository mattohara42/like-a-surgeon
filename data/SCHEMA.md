# Data schema

Plain JSON, human-readable, hand-editable. Matt will edit these directly.

Sharding: one file per record under `data/artists/`, `data/machines/`,
`data/scenes/`, `data/labels/`, `data/edges/`, `data/threads/`, `data/demos/`.
Filename is the id, exactly; a mismatch is a hard validator error.

`data/manifest.json` is **generated, not hand-maintained.** `tools/manifest.js`
walks the seven directories and writes it; `serve.js`, `validate.js`, and
`bundle.js` all call that same helper. Adding a record is one new file and
zero manifest edits. Do not hand-edit `data/manifest.json`.

Artist, machine, scene, and label ids share one namespace, since an edge's
`from`/`to` can be any of the four with no type tag. A label named the same
as an existing artist is a collision, checked globally by the validator.

All prose fields come in registers:
`{ "age7": "...", "age13": "...", "adult": "..." }`

`age13` and `adult` are **required**. `age7` is **optional and deferred to
Track D**. Write the first two now. The seed file carries `age7` on every
record as the exemplar for that later pass.

Registers differ in vocabulary and sentence length only. They never differ in
which facts are present. See "Writing rules" in `CLAUDE.md`.

---

## artist

```
id            slug, stable forever
name
sortName
type          "artist"
lineage       "rock" | "electronic" | "hiphop" | "dub" | "funk" | "other"
activeFrom    year
activeTo      year or null
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
lineage       "rock" | "electronic" | "hiphop" | "dub" | "funk" | "other"
              the machine's home lineage, for crossLineage checks on edges
              that touch it
maker, releasedYear, discontinuedYear
originalPurpose   what it was sold as doing
whatActuallyHappened
priceStory    what it cost new, what it cost secondhand, why that mattered
hook, blurb
demoId        optional, a playable demonstration of the machine itself
```

## scene

```
id, name, type: "scene"
lineage       "rock" | "electronic" | "hiphop" | "dub" | "funk" | "other"
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
lineage       "rock" | "electronic" | "hiphop" | "dub" | "funk" | "other"
foundedYear, closedYear, city, founders
ownershipStory  who owned it, who it was sold to, what happened to the artists
hook, blurb
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
trackPair       { earlier: {artist, title, year},
                  later:   {artist, title, year},
                  whatToListenFor }
                whatToListenFor is the highest-value text in the dataset.
                Be specific about the sound. No mush.
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
