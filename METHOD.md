# METHOD

How this project was set up, written down so the pattern is reusable. The
subject is working with a coding agent on something large enough that it can go
wrong quietly.

## The core problem

A coding agent is very good at producing plausible output and has no stake in
whether the output is true, useful, or the thing you actually wanted. Left to
itself it will optimize for what it can see: the most recent instruction, the
most satisfying task, and the appearance of progress. On a small task that is
fine. On a project with a thousand records of prose that nobody will read
closely, it is how you end up with a polished interface wrapped around
generated filler.

Everything below is a defence against that.

## 1. Separate design from implementation, in different tools

Design in a conversation. Build in the agent. The conversation is where
pushback, reframing, and "actually that's the wrong shape" belong, because
that thinking is cheap there and expensive once code exists.

The artifact that crosses the boundary is a set of files, not a chat log.

## 2. Ask few questions, and only the forked ones

The useful questions are the ones where two reasonable answers lead to
different architectures. Stack, data ownership, deployment surface, scope
boundary. Everything else you decide and log.

Asking about things you could have decided wastes the person's attention and
trains them to skim the questions that matter.

## 3. Push back on the brief before building it

The original brief here was a rock family tree from the Kinks to OK Go. That
is a clean, well-documented, entirely conventional story, and it is the one
thing a hundred YouTube documentaries already tell. The reframe to three
crossing lineages came out of asking what a playlist algorithm could never do.

Second reframe: "maximize scope" and "protect milestone scope" sound
contradictory and are not. They act on different axes. The dataset is
unbounded, the build is milestoned. Finding the axis separation is usually what
resolves a contradictory brief.

An agent will not do either of these. It will build the brief as stated. The
reframing has to happen before the handoff.

## 4. Set the quality bar by example, not by adjective

"Write detailed, specific, high-quality explanations" is worth nothing. Ten
hand-checked records that demonstrate the standard are worth a great deal,
because the agent matches what it can see far more reliably than what it is
told.

`data/seed.json` exists for exactly this. It is not the dataset. It is the
ruler.

Corollary: read the seed yourself and rewrite two entries by hand. Your own
sentences in the file are the strongest signal available.

## 5. Name the failure mode in the contract

`CLAUDE.md` does not just say what to build. It says what going wrong looks
like: a beautiful graph wrapped around thin content, a fabricated quotation, a
confidence tier upgraded to look authoritative, a feature added mid-milestone.

An agent that has been told the specific shape of the failure can sometimes
catch itself. An agent told only the goal cannot.

## 6. Gates need a review artifact defined in advance

"Check the work" is not a gate. The M1 gate specifies exactly what gets
produced for review: counts by lineage, edge type and confidence tier, the
twenty edges the agent is least sure about, and twenty randomly sampled
`whatToListenFor` fields.

Defining the artifact in advance does two things. It makes review possible in
fifteen minutes instead of four hours, and it stops the agent choosing which
work you see.

## 7. Constraints that are legal or physical go in the file, not the chat

No licensed audio. No album art. No build step. Offline from `file://`. These
survive across sessions only if they live in `CLAUDE.md`. Anything said once in
chat is gone by the third session.

## 8. Logs as files: ASSUMPTIONS, QUESTIONS, BACKLOG

Three destinations, so nothing has to be resolved in the moment.

`ASSUMPTIONS.md` catches decisions made without asking, which is what you want
an agent doing rather than blocking. `QUESTIONS.md` catches what it genuinely
cannot decide. `BACKLOG.md` catches good ideas that arrive mid-milestone, which
is the main way scope creep gets in.

A good idea written down is a good idea kept. The backlog is what makes "no,
not now" a cheap answer instead of an argument.

## 9. Anti-goals

An explicit list of what this is not. Force-directed layout. Frameworks.
Runtime network calls. Genre purity. Without it the agent will helpfully add
the thing every similar project has.

## 10. Read the output adversarially, with known tells

For a prose-heavy dataset, two checks catch most problems in a minute.

Quotation marks. Any sentence in quotes attributed to a real person is
suspect. The contract says describe sources in prose, so quotations appearing
at all means the contract is being ignored, and everything else in the file
becomes suspect too.

Tier ratios. If most claims come back `documented`, it is almost certainly
inflating. Real music history is mostly consensus with a thin layer of
genuinely documented claims on top. A healthy ratio is roughly a quarter
documented, half consensus, a quarter asserted.

Every project has its own tells. Work out what yours are early and check them
on every batch rather than at the end.

## 11. One concern per session

A session that does architecture and data and a bit of UI produces work you
cannot review and cannot revert cleanly. Each prompt in `prompts/` covers one
slice, ends with a review artifact, and updates the logs.

## The pattern in one line

Decide the hard things yourself, write them where they survive, demonstrate the
standard instead of describing it, and define in advance what you will look at
before you agree the work is done.
