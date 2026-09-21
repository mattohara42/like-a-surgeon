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

- The new scenes and labels authored in the cleanup pass (see A28) are all
  orphan nodes: no edge touches any of them yet. Wiring them into real edges
  (scene-type and label-type edges, machine cross-references) is Track D
  content work, not a defect, but worth doing early in the next batch since
  eight labels and five scenes sitting unconnected is a lot of dead weight
  in the graph.
