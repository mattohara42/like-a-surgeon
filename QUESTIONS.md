# QUESTIONS

Things Claude Code needs from Matt. Answer inline and mark resolved.

## Open

- **Q4.** Do you want a visible "last updated" stamp and dataset version in the
  interface, so the map reads as a living document rather than an authority?
- **Q5.** Repo name, and whether this is a public GitHub repo from the start.
  Public makes the audio and imagery licensing constraints immediate rather
  than theoretical, and opens the door to outside data corrections.

## Resolved

- **Q1. Reading levels.** Resolved: write **Teen and Adult first**. The Kid
  (7-11) register is deferred to Track D and gets written across the whole
  dataset once the Teen and Adult text is stable and has been tested on a real
  reader. The reading-level selector ships two-way at M3 and reads available
  registers from the data rather than hardcoding the count. `age7` fields in
  `data/seed.json` stay as the exemplar for that later pass.

- **Q2. Indefensible but important artists.** Resolved: **include them.** The
  `hook` field states what they changed and why they are on the map. It does
  not praise the music and it does not editorialize about the person. Where an
  artist's conduct is a documented part of why their standing changed, that
  goes in the adult register as fact, without adjectives. No data flag for now,
  writing discipline only. Logged as an open design question in `BACKLOG.md` in
  case it proves insufficient.

- **Q3. Political directness.** Resolved: **direct and factual, no softening,
  and the same facts at every reading level.** Registers change vocabulary and
  sentence length only. Redlining, deindustrialization, colonial economics,
  arson-for-insurance, and uncompensated session musicians are part of the
  causal story for Detroit, the Bronx, Kingston, and London, and they are
  stated plainly in every register. This rule is now in `CLAUDE.md` under
  "Writing rules" and it also constrains the Kid pass when it happens.
