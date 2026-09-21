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
- **"Six Degrees of Weird Al" thread.** Matt's idea: "Weird Al" Yankovic
  genuinely touches a surprising cross-section of artists (parody targets
  like Coolio, Michael Jackson, Nirvana, The Knack, Devo; polka-medley
  covers of dozens more), which is exactly what the `thread` object is for.
  Not buildable yet: none of his real, documented connections land on
  anyone currently in the graph. Revisit once a batch adds an overlapping
  artist (a 90s/grunge or mainstream-pop batch would probably do it), then
  build it with the same evidence discipline as every other edge, not as
  an exception to it.

## Deferred data

- Jazz, which touches everything and would triple the graph.
- Country and its production lineage.
- Classical minimalism into electronic music.
- Regional scenes outside the US, UK, Jamaica, and Germany.
- The full label ownership and catalogue-sale history, which is a project on its own.

## Open design questions

- How to show an artist whose influence arrived decades later (rediscovery
  edges) without breaking left-to-right chronology.
- How to represent a scene that has no single city. **Hit this concretely in
  data batch 2:** `uk-post-punk` spans London (PiL), Manchester (Joy
  Division), and Leeds (Gang of Four), each with different local geopolitics
  that actually mattered. Set `city: "London"` as a pragmatic single value
  and named the other two in the prose fields instead. `city` as an array,
  or a looser `region` concept, would fix this properly; jazz, if it's ever
  added, will hit the same wall across several US cities.
- Whether machines should share lanes with artists or get their own band.
- Whether historically important but indefensible artists need a data flag, or
  whether careful `hook` writing is sufficient. Starting with writing only.

## Observed problems

(Claude Code: record code smells and architectural concerns here rather than
fixing them inline.)

- Six of the seed's ten artists carry only one `signatureTracks` entry
  against `SCHEMA.md`'s 2-3 target (`tools/validate.js` warns on this now).
  The seed was meant to be the quality bar, so this is worth a pass before
  using it as a template for the next batch, not just backfilling the count.
  **Resolved, M1 cleanup pass:** all six backfilled to 2 entries with
  verified real tracks. See A27 in `ASSUMPTIONS.md`.
- `data/edges/e-tubby-kraftwerk-nonedge.json` is still present after the M1
  migration. The seed's own note on it says "replace or remove it in M1" as
  a deliberate `asserted`-tier pattern demonstration, not a claim to defend.
  Left in place during the sharding migration since deciding its fate is
  data-expansion work, not tooling work. Needs a decision during the next
  data batch.
  **Resolved, M1 cleanup pass:** renamed to `e-tubby-atkins-resemblance.json`
  (file and `id`), since the old name referenced Kraftwerk while the edge's
  actual `from`/`to` are King Tubby and Juan Atkins. Content kept as the
  dataset's deliberate example of an asserted-tier resemblance-not-
  transmission edge rather than removed. See A29 in `ASSUMPTIONS.md` and Q9
  in `QUESTIONS.md` in case that call should be reversed.
- Five scenes are referenced by `artist.scenes[]` but were never authored in
  the seed: `swinging-london`, `uk-punk-77`, `uk-post-punk`,
  `dusseldorf-kling-klang`, `chicago-house`. `docs/m1-architecture.md`
  flagged the analogous gap for labels (8 missing) but missed this one for
  scenes. Both now show as expected validator warnings (A26) until authored,
  not errors, so CI stays green through Track D.
  **Update, data batch 1:** `chicago-house` and `dusseldorf-kling-klang` are
  now authored. The three UK ones (`swinging-london`, `uk-punk-77`,
  `uk-post-punk`) and four UK labels (`pye`, `brunswick`, `cbs-uk`, `virgin`)
  are left for a rock-spine batch, since this batch stayed focused on
  dub/electro/Detroit/Chicago per the kickoff brief.
- Data batch 1 (dub/electro/Detroit/Chicago) trimmed from the roughly-20
  target to 13 artists. Two candidates researched for this batch, Bunny Lee
  and Ron Hardy, ended up needing enough extra digging (Lee's sprawling
  producer discography; Hardy left no discography under his own name at
  all) that they're included, but at lower confidence than the rest: Lee's
  `signatureTracks` lean on two specific production credits rather than his
  much larger catalogue, and Hardy's `signatureTracks` is deliberately
  empty (see his `blurb`) rather than force a title/year for an uncredited
  bootleg tape edit. Other electro-spine candidates considered but not
  researched deeply enough to include confidently: Man Parrish, Mantronix,
  Egyptian Lover. Good targets for the next batch.
- `on-u-sound` (Adrian Sherwood's label) was researched (founded 1979 with
  Pete Holdsworth) but not authored as a label record in batch 1; his
  `labels` field is left empty rather than reference an unauthored label.
  Cheap to add in a later pass.
- Data batch 2 (UK rock spine: Swinging London through punk, post-punk, and
  into Britpop) authored `swinging-london`, `uk-punk-77`, and `uk-post-punk`
  plus the four originally-dangling labels (`pye`, `brunswick`, `cbs-uk`,
  `virgin`) and one new one (`factory`). `e-tubby-kraftwerk-nonedge` (above)
  was still not touched, since resolving it isn't rock-spine work; the next
  data batch should make a call on it.
>>>>>>> origin/main
