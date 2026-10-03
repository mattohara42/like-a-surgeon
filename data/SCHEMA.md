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
than the reading panels needs (the graph, search, the scene
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

Every prose field is one plain string, written for the primary reader, with
every fact in it (A343). There are no reading levels: the Teen and Adult
registers were merged into one text, and the Kid register was dropped. See
"Writing rules" in `CLAUDE.md`. The validator rejects a prose field that is
not a non-empty string. `data/seed.json` is a frozen reference copy from M1
and still has the old register objects.

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

`docs/adding-artists.md` is the working guide to adding one: the file, its
edges, and what the threads and the Six Degrees game need from it.

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
originCity    for a person, where they were born; for a band, group or duo,
              where it formed. The city a person is known for, when it
              differs, belongs in the blurb ("born in Harlem, grew up on
              Long Island"). City level, or a neighbourhood with its city.
originCountry the country of originCity
scenes        [scene ids]. Each is also a Six Degrees hop (A334).
labels        [ { labelId, from, to } ]    the ones that mattered.
              Not a Six Degrees hop.
keyProducers  [artist ids or plain names]. An id drives "Follow the
              producer"; it is not an edge and not a hop, so a documented
              production on the map also gets a `production` edge.
hook          one sentence, why this node exists on the map
blurb         one text
signatureTracks [ { title, year, whyThisOne, search? } ]   2 to 3
              search is optional, as on trackPair (Q17): absent means
              "<artist name> <title>", a string replaces that query, false
              means no link. Use it when the title carries a credit note,
              like "Big Fun (Inner City)".
signatureTracksNote  optional string (Q32). Why this artist has fewer
              than two tracks: a DJ known for sets rather than records, or
              an act with one record that matters here. The panel shows it
              above the tracks, and the validator then accepts 0 or 1.
```

## machine

Gear or technique that changed music on its own. Same node class as an artist
because for long stretches of this history it is the protagonist.

```
id, name, type: "machine"
kind          "drum-machine" | "synth" | "sampler" | "studio-technique" |
              "format" | "instrument" | "effect" | "amplifier"
              effect: a unit sound passes through (fuzz, delay, phaser,
              pitch shift). amplifier: a guitar or instrument amp.
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
yearFrom, yearTo, country
city          a city name, or a list of them when the scene genuinely
              spanned several (UK post-punk: London, Manchester, Leeds)
hook          one sentence, why this scene exists on the map
blurb         one text
geopolitics   concrete, not vibes. Conscription, unemployment, rent, race and
              immigration policy, who controlled the radio, gear prices.
whatWasNew    what a listener at the time had literally never heard before,
              and why it became possible right then
production    rooms, engineers, consoles, budgets
labels        who paid, who owned the masters, who got robbed
politics      what the music argued for or against
memberIds     [artist ids]. Each is also a Six Degrees hop, as an
              artist's own `scenes` is (A334).
palette       { ink, paper, accent, accent2 }   hero card colors
motif         motif key for the generated hero card
```

`hook` and `blurb` are the reader-facing summary, same pattern as artist
and machine. `geopolitics`, `whatWasNew`, `production`, `labels`, and
`politics` are the backing detail behind the blurb, each shown as its own
section of the scene's panel.

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
                A song parody is "cover" (Q24); a style parody, an original
                song in another act's manner, is "direct" (A337). A
                documented collaboration may stand in for influence as
                "direct" when the evidence says so (A239).
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
explanation     one text
demoId          optional
demoCaption     optional, one text like a demo's caption. Replaces
                the demo's own caption wherever this edge's demo is shown
                (the edge panel, and an artist panel that picks this edge's
                demo). Use it when the demo's caption names another edge's
                record. Needs a demoId.
tags            ["production","labels","politics","technology"]. Each tag
                is named, with a line on what it covers, in the edge's
                panel under "Part of the story of".
```

## demo

A synthesized, in-browser demonstration. No audio files, ever. Checked by
`tools/demoSchema.js` (M4, docs/m4-architecture.md section 5).

```
id, title, kind
kind is one of:
  "machine-voice"   trigger and tweak a synthesized recreation   (playable)
  "ab"              two patterns, switchable mid-playback          (playable)
  "fx-chain"        dry stem, then the same stem through a processing chain,
                    switchable live                                (playable)
  "pattern"         a rhythmic pattern straight, then chopped      (playable)
  "morph"           a sequence that transforms from one era's sound to another
                                                                   (M5)
params            kind-specific, below
caption           one text, what to listen for
safety            { maxGain }    above 0, at most 1: a kid is wearing headphones
status            optional, "draft": planned but cannot play yet. A draft
                  needs `pending`, a sentence saying what it waits for, and
                  its params are not checked.
note              optional, prose for maintainers: how it is synthesized
```

machine-voice params:

```
machine     a machine id that has a player (audio/instruments.js): the
            drum machines tr-808 and tr-909; the voices tb-303,
            minimoog, dubreq-stylophone, and electric-bass and
            electric-guitar (stand-ins with no machine record). Each voice
            has its own note range.
pads        drum machines only, optional: lanes to show as buttons, e.g.
            ["bd", "sd", "cp"]
controls    optional: [{ target, min, max, default }]. target is
            "lane.knob" on a drum machine ("bd.decay"; every lane has
            "level") or a parameter name on the 303 ("cutoff"). Values are
            0..1; the player converts to the machine's own units.
levels      drum machines only, optional: { lane: 0..1 } starting level per
            lane, to balance the kit. A lane's level control starts from
            its own default instead.
keys        voices only, optional: MIDI notes, rising, shown as a keyboard
            the reader holds down to play (at most 25)
pattern     optional on a drum machine that has pads, required otherwise
```

ab params:

```
a, b        each { label (one text), pattern }
```

pattern params (a chop switches on the next bar):

```
pattern     one pattern
versions    two or more { label (one text), order (optional) }.
            A version without `order` plays the pattern straight. `order`
            lists, for each step, the step number (1-based) to play in its
            place, or null for silence: [1, 2, 3, 4, 13, 14, ...]
controls    optional, as machine-voice, targeting any drum lane in the
            pattern
```

fx-chain params (switching an effect in or out is immediate, so an
echo's tail rings on):

```
pattern     one pattern
route       "send": the dry sound always plays and the chain is added
            beside it, as a dub engineer sends to an echo. "insert": the
            sound passes through the chain, and each effect is switched in
            or bypassed on its own, as a pedal is.
through     optional: the instruments in the pattern that go through the
            chain. The rest go straight out. Default: all of them.
chain       effects in order, each { fx, ...settings in real units }
            (audio/fx.js). Each effect may appear once.
              "tape-echo"     steps (1 to 8, the delay in sixteenth-notes),
                              lowCutHz (into the echo), highCutHz (in its
                              feedback loop)
              "fuzz"          driveDb, toneHz, outDb
              "torn-speaker"  driveDb, rattleHz, rattleDb, outDb
              "crusher"       rateHz, bits (a whole number)
versions    two or more { label (one text), fx: [effect ids] }.
            fx: [] is the plain sound. On a send, a version engages the
            whole chain or none of it.
controls    optional, as machine-voice. Targets are "fx.knob"
            ("tape-echo.feedback", "tape-echo.level") or a drum lane knob.
```

A pattern (audio/pattern.js):

```
bpm         60 to 200
steps       16 (the scheduler loops at that length)
parts       { machineId: part }
  drum part     { lane: "x...X..." }  one character per step:
                "." rest, "x" hit, "X" accented hit
  voice part    { notes: [45, null, ...], accent: "X...", slide: "..s.",
                  chord: [0, 7, 12] }
                one MIDI note (in the voice's range) or null per step. A
                slide on step N glides into step N+1. A rest cannot carry
                either flag. `chord`, optional, on a voice that can play
                one (electric-guitar, up to three notes): semitones above
                every note, sounded together.
```

Patterns and melodies here are original unless the demo says otherwise.
A demo that reproduces a specific record's melody needs a sourced
transcription (CLAUDE.md accuracy rules).

## thread

A curated ordered path through the graph. How readers enter.

```
id, title, subtitle
intro           one text
steps           at least three: [ { nodeId or edgeId, framing, demoId
                    (optional) } ]. framing is one text: two or three sentences in the
                    thread's own voice, saying why this stop comes next.
                    It restates what the step's records say and adds no
                    new facts. The camera frames the record itself, so
                    there is no camera hint.
outro           one text
```
