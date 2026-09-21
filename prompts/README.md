# Prompts

Paste these into Claude Code one at a time, in order. One session per prompt.

Each prompt follows `METHOD.md`: it names the milestone, states what is out of
scope, defines the deliverable, and defines the review artifact you will look
at before agreeing it is done.

Between sessions, actually look at the review artifact. The prompts are only
worth anything if the gates are real.

## Order

| Prompt | Session | Gate |
|---|---|---|
| `m1-01-architecture.md` | Data layer plan. No code. | You approve the layout and the file:// solution. |
| `m1-02-loader-validator.md` | Build the layout, manifest, validator, serve, bundle. | Validator passes on the migrated seed. |
| `m1-03-first-batch.md` | First 20 artists and their edges. | The batch report, read properly. |
| `m1-04-batch-review.md` | Agent audits its own batch. | Your call on whether batch 2 proceeds. |
| `TEMPLATES.md` | Reusable: further batches, drift correction, session wrap. | |

Batches 2 onward repeat `m1-03` and `m1-04` using the batch template. Expect
five or six rounds to reach the M1 targets.

## Before the first one

Read `data/seed.json` and hand-rewrite two `whatToListenFor` fields in your own
words. This is the highest-leverage ten minutes in the project.
