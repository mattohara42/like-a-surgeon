# Adding an artist

This is the working guide for bringing a new artist onto the map and making
sure it joins everything that is built on the data: the graph, the panels,
search, threads, the cards view, and the Six Degrees of Weird Al game. The
rules it applies live in `CLAUDE.md` (accuracy and writing), `data/SCHEMA.md`
(fields), and `ASSUMPTIONS.md` (precedents). Where this guide and those
disagree, they win, and this guide should be fixed.

The short version: an artist is one file, but an artist with no good edges
is a dot nobody can reach. Most of the work is the edges.

## 1. The artist file

One file, `data/artists/<id>.json`, with the fields in `data/SCHEMA.md`.
There is no manifest to edit; `tools/manifest.js` finds it.

- **id.** A lowercase slug, stable forever. Artist, machine, scene and label
  ids share one namespace, so check it is not already a label or scene.
- **lineage.** One of the files in `data/lineages/`. Follow precedent for
  borderline cases: R&B-pop singers are `pop` (Whitney Houston, Janet
  Jackson, Robin Thicke), Weird Al is `pop`, new wave bands are `rock`
  (Devo). The lineage decides the lane and whether each edge is
  `crossLineage`, so choose before writing edges.
- **activeFrom / activeTo.** A documented year. If the end is unknown rather
  than ongoing, set `endUnknown: true` (Q20). Never invent a year.
- **originCity.** Where a person was born, or where a band formed.
- **hook.** One sentence on why this node is on the map. It states what the
  artist changed. It does not praise them.
- **blurb.** One text (A343): plain words a curious 13-year-old can follow,
  with every fact in it, including the disputes, the business and the
  conduct. Documented conduct that is part of why a reputation changed goes
  in as plain fact, not adjective (CLAUDE.md, "Writing rules").
- **signatureTracks.** Two or three. An act that matters for one record gets
  one track plus a `signatureTracksNote` saying why (Q32).
- **scenes.** Scene ids the artist belonged to. This field matters beyond
  the panel: it is a hop in Six Degrees (section 4).
- **labels.** The labels that mattered. Shown on the panel, but not a Six
  Degrees hop.
- **keyProducers.** Artist ids or plain names. An id here powers "Follow the
  producer", but it is not an edge and not a hop. If the production is
  documented and the producer is on the map, also write a `production` edge
  (A332 added `e-dre-nwa` for exactly this gap).

Every fact needs a source you have actually read. Recent batches cite
English Wikipedia and say so in the evidence. If a detail cannot be
confirmed, cut it rather than soften it into vagueness; ASSUMPTIONS A332 to
A339 log several such cuts.

## 2. Connecting it: edges

An edge is `data/edges/e-<from>-<to>.json`, a claim that one node's music
changed because of another. Write at least one, and ideally two or more,
to nodes already on the map.

- **Direction.** From the earlier or source node to the later one. Parodies
  run from the original artist to Yankovic.
- **type.** The schema's list. Two conventions from this project's
  decisions:
  - A **song parody** is `cover` (Q24): it rebuilds one record's
    arrangement with new words.
  - A **style parody** ("Dare to Be Stupid", "Bob", "Craigslist") is
    `direct` (A337), because no single song was copied.
  - A documented **collaboration** can stand in for influence, typed
    `direct`, when the edge says plainly that it is a collaboration (A239,
    A333).
- **confidence.** `documented` needs a first-person statement or a primary
  record (a credit, an interview, a court case). An article's summary of
  someone's influences is `consensus`. Disputed popular history is
  `consensus` at best, with the dispute in the text.
- **evidence.** What the source says, in prose. Never a quotation you have
  not seen, and never an invented one. If the edge year places a paired
  record rather than a documented moment, say so (A336).
- **crossLineage.** Must equal "the two nodes' lineages differ". The
  validator rejects a mismatch, which catches a wrong lineage guess early.
- **trackPair.** Two real records with real years. `whatToListenFor` must
  be specific to this pair. When you cannot say what one side sounds like
  from a source, frame it as something to listen for, not a claim.
- **tags.** `production`, `labels`, `politics` or `technology`, if the edge
  is part of that story. The edge's panel names each tag it carries.

## 3. What picks it up with no code

Once the file and its edges validate, all of this updates by itself:

- the map layout, lanes, timeline and semantic zoom
- the node panel and its connections list, and the edge panels
- search, by name and city
- a scene's member list, through the artist's `scenes`
- "Follow the producer", through `keyProducers` ids and `production` edges
- the "Part of the story of" list on an edge's panel, through its `tags`
- golden edges, if a `documented` cross-lineage edge spans far enough
- the cards view on phones, and its Random pool
- any thread that stops at the artist, through `stopsSection`
- the Six Degrees game and `npm run report`

Nothing lists artists by hand. If a change ever needs a hand-maintained
list, stop and raise it (CLAUDE.md, "The scope rule").

## 4. Six Degrees of Weird Al

The game (`reading/sixDegrees.js`, A340) and the report's reach section
both use `reading/hops.js`. Its rule:

- A **hop** is any edge, in either direction, through any node type, or a
  **scene membership** (an artist's `scenes`, or a scene's `memberIds`).
- **Label membership and `keyProducers` are not hops** (A334).
- The target and limits are in `CONFIG.sixDegrees`: `target`, `maxHops`
  (6), `minStartHops` (2) and `minStartLinks` (2).

What that means for a new artist:

- **Run `npm run report` and read the Six Degrees section.** It lists every
  artist beyond six hops, with its hop count and number of neighbours. A
  new artist should not appear there. If it does, it is short of edges.
- **Connect to something already in reach.** An artist whose only edge
  goes to another far or isolated node is unreachable. The game will not
  offer it as a random start, and its panel button gives an honest "this
  is N hops away" page instead of a game.
- **Two or more connections make a better start.** Random starts need at
  least `minStartLinks` neighbours, so the first move is a choice. One
  well-sourced edge is still better than two weak ones.
- **Never add an edge to fix reach.** Every edge meets the same evidence
  bar as any other. An artist out of reach is a data worklist item, not a
  reason to stretch a claim. The far list is in the report for exactly
  that reason.
- **The edge type is game text.** Each connection button shows its edge
  type ("Sample", "Cover", "Production", or "Same scene" for a
  membership), and "How you got here" opens the edge. A wrong type or thin
  evidence shows up mid-game.
- **When two links join the same pair,** the game shows the edge rather
  than the membership, since an edge carries evidence.

Adding a new **Weird Al target** follows the same pattern as A337 to A339:
one artist file, one edge into `weird-al-yankovic` (`cover` for a song
parody, `direct` for a style parody, `crossLineage` against `pop`), and
where the source supports it, a second edge tying the new artist to the
rest of the map (Eno to Devo, Dre to Eminem, Nirvana to Foo Fighters).
The permission story, when sourced, belongs in the evidence and the text,
told as whose account it is.

If the hop rule itself changes, change it in `reading/hops.js`'s callers
(`reading/sixDegrees.js` and `tools/report.js`) together, so the game and
the report never disagree. A new field the game reads must also be added to
`SKELETON_FIELDS` in `tools/skeleton.js`, or the map will not see it.

## 5. Threads

A thread (`data/threads/`) is only offered when every one of its stops is
on the map, so a thread can name an artist before the artist exists. When a
new artist completes a thread's stops, the thread appears. Renaming a
thread changes only its `title` and `subtitle`; keep its `id`, since
finished threads are remembered by id (A331).

## 6. Before the pull request

    npm run validate                          # the data tree, hard errors and warnings
    node tools/crosscheck.js --ids=<new ids>  # outside sources, needs network (docs/sources.md)
    npm run report                            # regenerates docs/m1-gate-report.md, incl. Six Degrees reach
    npm test                                  # unit tests, including the hop graph
    npm run build                             # optional: the offline release still bundles

Then log the batch in `ASSUMPTIONS.md` (what was added, the tier of each
edge, what was dropped and why), and put any question for Matt in
`QUESTIONS.md`. Commit the regenerated `docs/m1-gate-report.md` with the
batch.
