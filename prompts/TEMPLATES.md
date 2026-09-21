# Reusable prompts

## Further data batches

> Data batch N. No code this session.
>
> Add 20 artists with their edges, machines, scenes, and labels. Subject
> matter: [AREA].
>
> Before writing, re-read three edges from batch 1 that I approved, plus
> e-kraftwerk-planetrock in the frozen seed. Match that depth.
>
> All the accuracy rules from CLAUDE.md apply. No quotations attributed to real
> people. No invented credits. Honest tiers. `whatToListenFor` specific enough
> that it could not describe a different pair of records.
>
> Run the validator, then produce docs/batch-0N-report.md in the same format as
> batch 1: counts and tier ratio, five least confident edges, twenty randomly
> sampled `whatToListenFor` fields verbatim, and anything left null.
>
> Stop there.

Follow every batch with `m1-04-batch-review.md`, changing the batch number.

## Drift correction

Use when the agent has started doing something outside the current milestone.

> Stop. You are outside the M[N] scope defined in BUILD_PLAN.md. [WHAT IT DID].
>
> Revert it if it has been committed. Write the idea into BACKLOG.md under
> Deferred features, with a sentence on why it seemed worth doing now, so we
> can evaluate it at the right time.
>
> Then tell me what the remaining M[N] work is and resume that.

## Quality correction

Use when a batch comes back thin. Blunter is better here.

> This batch is below the bar. Compare [SPECIFIC FIELD] against
> e-kraftwerk-planetrock in the frozen seed and tell me the difference in your
> own words before rewriting anything.
>
> Then rewrite the [N] weakest records in the batch to that standard. Do not
> touch the rest. Do not add new records.
>
> If you cannot write a specific `whatToListenFor` for an edge because you do
> not actually know the records well enough, delete the edge and tell me. A
> missing edge is better than a thin one.

## Session wrap

Run at the end of every session.

> Wrap the session. Update ASSUMPTIONS.md with anything you decided without
> asking. Update QUESTIONS.md with anything you need from me. Update BACKLOG.md
> with anything you wanted to build and did not.
>
> Then tell me in three sentences what changed, what is next, and what you are
> least confident about.

## Milestone gate

Run when the agent claims a milestone is done.

> Before I accept M[N] as complete, check it against the gate in BUILD_PLAN.md
> and tell me honestly whether it passes. Then tell me what in M[N] you
> finished to a standard you would not defend, and what you skipped. I would
> rather extend the milestone than discover it in M[N+1].
