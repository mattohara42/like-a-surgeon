# M1, session 3: first data batch

Run after the validator passes on the migrated seed.

---

Data batch 1. No code this session. Data only.

Add 20 artists with their edges, machines, scenes, and labels. Subject matter:
the Jamaican dub and sound system lineage, electro, Detroit techno, and Chicago
house. Go deep on this material rather than broad. It is the spine of the
project and the standard everything later gets measured against.

Before writing anything, re-read five edges in data/seed.json, including
e-kraftwerk-planetrock and e-303-phuture. Match that depth. If your edges are
noticeably shorter or vaguer than those, you are under the bar.

Rules that are not negotiable:

- Never write a quotation attributed to a real person. Describe the source in
  prose. "Cited by Atkins in multiple interviews" is correct. A sentence in
  quotation marks is a project failure.
- Never invent a date, label, catalogue number, or producer credit. Null it and
  note it.
- Tier confidence honestly. `asserted` is a respectable answer and I would
  rather have thirty honest asserted edges than five inflated documented ones.
- `trackPair.whatToListenFor` is the single most important field you will
  write. Be specific about the sound. Name what happens, where in the bar, on
  which instrument. If a sentence would apply equally to any two records, it is
  filler and you should delete it and start again.
- Teen and Adult registers only. The Kid register is deferred to Track D.
- Registers differ in vocabulary and sentence length only, never in which facts
  are present. Political and economic context is stated plainly at every level.

Run the validator before reporting.

Then produce docs/batch-01-report.md containing:

1. Counts by lineage, node type, edge type, and confidence tier, with the tier
   ratio as percentages.
2. The five edges you are least confident about, with why.
3. Twenty randomly sampled `whatToListenFor` fields, verbatim, in full.
4. Anything you could not source and left null.

Stop there. I read the report before batch 2.
