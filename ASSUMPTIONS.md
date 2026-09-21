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
