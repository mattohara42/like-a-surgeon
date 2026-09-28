# BACKLOG

Everything deliberately not being built right now. Adding to this file is the
correct response to a good idea arriving mid-milestone.

## Deferred features

- Touch and wall-panel build. Larger hit targets, gesture pan/zoom, no hover.
- Hosted deployment with a share-a-view URL scheme.
- User-authored threads, saved locally.
- A "what should I listen to next" walk that respects what the reader clicked.
- Printable poster export of a thread.
- Per-scene ambient generative bed that plays while browsing that region.
- Comparison mode: two artists side by side with their full edge sets.
- A contributor guide so someone other than Claude Code can add an artist.
- Non-English scene coverage and translated reading levels.
- Video-free "listening session" mode for a classroom.
- Quiz or recall mode for the 7-11 reader.

## Deferred data

- Jazz, which touches everything and would triple the graph.
- Country and its production lineage.
- Classical minimalism into electronic music.
- Regional scenes outside the US, UK, Jamaica, and Germany.
- The full label ownership and catalogue-sale history, which is a project on its own.

## Open design questions

- How to show an artist whose influence arrived decades later (rediscovery
  edges) without breaking left-to-right chronology.
- How to represent a scene that has no single city.
- Whether machines should share lanes with artists or get their own band.
- Whether historically important but indefensible artists need a data flag, or
  whether careful `hook` writing is sufficient. Starting with writing only.

## Observed problems

(Claude Code: record code smells and architectural concerns here rather than
fixing them inline.)

- **Resolved in the second data batch (2026-09-28):** the six seed artists
  short on `signatureTracks` were backfilled to 2 entries each, and the five
  scenes plus eight labels that were referenced but never authored (see the
  two entries this replaces) now exist as real records. `tools/validate.js`
  runs clean at 0 errors.
- `data/edges/e-tubby-kraftwerk-nonedge.json` is still present after the M1
  migration. The seed's own note on it says "replace or remove it in M1" as
  a deliberate `asserted`-tier pattern demonstration, not a claim to defend.
  Left in place again during the second data batch since deciding its fate
  is a separate decision from adding new content. Still needs a call.
- The `funk` lineage now has exactly one artist (`james-brown`) and zero
  scenes. Adding him surfaced that no funk-lineage scene has been authored,
  so he carries an empty `scenes` array for now. James Brown's Augusta/
  Cincinnati/King Records years, or a broader Southern soul/funk circuit,
  are a reasonable candidate for the next batch's scene work.
- Several label records added in the second batch (`cbs-uk`, `pye`,
  `brunswick`) have `foundedYear`/`closedYear` nulled rather than guessed,
  since I wasn't confident enough in the exact years to state them per
  `CLAUDE.md`'s accuracy rules. Worth a verification pass against a primary
  source if precise dates matter for a future UI element (e.g. a label
  timeline).
- Labels and several scenes are structurally orphaned by design in the
  current data model: `tools/validate.js`'s "orphan node" check only credits
  a node if an *edge* touches it, but labels and scenes are otherwise
  reached only through `artist.labels[]`/`artist.scenes[]`. Every label
  added so far, and most scenes, trip this warning even though they're
  fully connected through artists. Might be worth revisiting whether the
  orphan check should also count those reference arrays, or whether it's
  correctly scoped to catch truly unreferenced nodes and the warning is
  just noisy at this dataset size.
