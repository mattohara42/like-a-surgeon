# M5 architecture: timeline, threads, overlays

> **Status: signed off 2026-09-30.** Matt took the recommended option on
> Q33 to Q37 (section 7). Build follows the order of work in section 6.

`BUILD_PLAN.md` scopes M5 as: timeline scrub with play/pause and keyboard
stepping; a thread player with framing text and an audio through-line;
and the four overlays. **Gate:** a cold reader can complete a thread start
to finish and explain what they learned.

**Where M4 stands.** Matt moved to M5 on 2026-09-30 with nine playable
demos. The gate asked for ten. Demos 5 (the Casio preset against a riddim)
and 10 (Herc's Merry-Go-Round) are skipped for now, and the Planet Rock
A/B is still a draft (Q30). The by-ear listen and the Safari and Firefox
check (Q27) have not happened yet. They can happen at any point, and M5
does not depend on them.

## 1. What already exists

More of M5 is built than the plan suggests.

- **The timeline is built.** `render/transport.js` has the scrubber across
  the full date range, a cursor line through the map, play and pause,
  arrow keys stepping one year and Shift+arrow five, and a "score" of
  pips where material arrives. The map already shows material after the
  cursor as not here yet.
- **Threads load and go unused.** `data/threads/` has two files (The Delay
  Line, The Machine Nobody Wanted), four steps each. The loader reads them.
  The validator checks that each step names exactly one node or edge and
  that its `demoId` resolves. Neither file has the per-step `framing` that
  SCHEMA.md describes.
- **The camera can already frame a step.** `graph.focusNode` and
  `graph.focusEdge` fly to a record, and `showTouched` and the ripple
  (A251) already light a set of records and dim the rest.
- **The drawer is a panel stack with a back button.** The welcome card
  (A249) is already a non-record panel target (`{ kind: 'welcome' }`),
  which is the pattern a thread needs.
- **Edges are tagged.** 244 of 266 edges carry overlay tags: production
  176, technology 78, labels 61, politics 14. 22 have none.

## 2. Timeline: an audit, not a build

SPEC says: "Nodes and edges arrive as they happen, earlier material recedes
but stays visible." The arriving half is built. The receding half is not:
material from 1960 looks the same whether the cursor is at 1965 or 2020.

Step 1 is an audit of the timeline against SPEC, which fixes small gaps
(for example, the scrubber's `aria-valuetext`) and brings the one real gap
to Matt as Q33. Nothing else about the timeline changes in M5.

## 3. The thread player

### What a reader sees

A thread opens in the drawer, like the welcome card. It has three kinds
of page:

1. **Intro:** the title, subtitle, the intro text in the reader's
   register, the number of stops, and a Start button.
2. **Each step:** "Stop 3 of 6", the step's `framing` (the thread's own
   voice, joining this stop to the last), then the node's or edge's own
   panel below it, unchanged (track pair, what to listen for, evidence,
   demo). Back and Next buttons, with Left and Right arrows too while the
   drawer has focus.
3. **Outro:** the outro text, and the threads the reader has not finished.

Framing is short, two or three sentences. The panel underneath already
carries the facts. Framing says why this stop comes next.

### What the map does

- The camera flies to each step's node or edge as it opens, as a click
  would.
- The timeline cursor moves to the step's year if it is behind it
  (`ensureVisible`), so a thread through time plays forward through time.
- The thread's path lights up and the rest of the map dims, using the
  existing `showTouched`. Steps already visited stay lit, so by the end
  the reader sees the whole route drawn across the map.

### Leaving and coming back

A reader will click away mid-thread. That is the map working, not a
failure. While a thread is open, a chip in the top centre (where the
mission chip sits) reads "The Delay Line · 3 of 6 · Back to thread".
Clicking anything else opens that thing's panel as usual, and the chip
brings the reader back to the step they left. Closing the chip ends the
thread. This is Q34.

### The audio through-line

A step can carry a `demoId`. When it does, the demo block shows on that
step. It never plays on its own: M4's rule is that every sound starts from
a press, and a thread does not change that (Q35). When the reader moves
to the next step, the demo stops, as it does when any panel changes.

### Progress

Finished threads are remembered in localStorage, with the same guarded
access the missions use, and marked on the welcome card. There is no
score.

### Where threads are found

- **The welcome card** gains a "Follow a thread" list under its doors.
- **A node or edge panel** that is part of a thread gets a short line:
  "Part of the thread: The Delay Line", which opens the thread at that
  step.
- **Search** finds threads by title.

## 4. Overlays

SPEC: "Recolor and refilter the whole graph by Production, Labels,
Politics, or Technology. Each overlay has its own short intro written at
all reading levels."

- **Control.** A fifth row in the top-left stack, "Lens", with None,
  Production, Labels, Politics and Technology. One lens at a time. It is
  stored like the reading level. "Lens" rather than "Overlay", because
  "overlay" already names the fixed controls in the code and docs (A257).
- **What it does.** Edges carrying the tag stay lit. Other edges drop to
  the quiet style, and nodes that touch no lit edge dim. It reuses the
  emphasis and dimming the map already has, and adds no new colour, so
  the colour-vision check (A258) stands (Q36).
- **The intro.** Choosing a lens opens a short card in the drawer: what
  this lens shows, and what to look for, in Teen and Adult. It closes like
  any panel. Teen and Adult are written first, per CLAUDE.md.
- **Thin lenses.** Politics has 14 edges. That is a finding: the map has
  said little about politics so far. The intro says so honestly, and
  tagging more edges is Track D work. The 22 untagged edges get a tag
  audit in the same data pass.
- **Labels.** "Arrange by label" (lanes by label) and the "Labels" layer
  toggle (label records shown) already exist. A Labels lens would be a
  third thing called Labels (Q37).

## 5. Data for the gate

The gate needs threads a cold reader can finish, which means data work
inside M5, not only in Track D.

- **Framing** for every step of the two existing threads.
- **Three more launch threads** from SPEC, all from edges already on the
  map:
  - **Breaks:** James Brown into Kool Herc, the Incredible Bongo Band,
    the Amen break into N.W.A and then into jungle.
  - **Trains to the Bronx:** Kraftwerk into 'Planet Rock', into the
    Belleville Three (Atkins, May and Saunderson).
  - **Loud Guitars:** the Kinks into the Who, the Sex Pistols, the Clash,
    PiL and Joy Division. SPEC ends it at OK Go, who are not on the map
    yet, so it ends at post-punk for now.
- The **Delay Line** thread ends at PiL. SPEC takes it on to Bristol,
  which has no records yet, so it stays shorter for now.

Framing restates what the step's own records say, and adds no new facts.
The accuracy rules apply as they do everywhere: no invented quotation,
date or credit.

**Validator.** A step must have `framing` in Teen and Adult. A thread must
have at least three steps. A step's `cameraHint` is dropped from
SCHEMA.md, since the camera frames the record itself and nothing reads
the hint.

## 6. Order of work

Each step is one PR, merged before the next.

1. Timeline audit against SPEC, small fixes only, and the receding
   question (Q33) answered.
2. Thread schema and validator, and framing for the two existing threads.
3. The thread player: the drawer pages, the camera, the path lighting, the
   thread chip, progress.
4. Where threads are found: the welcome card, panel lines, search.
5. Three launch threads (data).
6. Lenses: the control, the dimming, the four intros, and a tag audit of
   the 22 untagged edges.
7. The gate: a cold reader finishes a thread and explains what they
   learned. Matt runs it.

## 7. Questions for Matt (also in QUESTIONS.md)

- **Q33. Should earlier material recede?** SPEC says it should, and today
  it does not. (a) **Recommended.** Yes, gently: material more than about
  twenty years behind the cursor fades partway, and nothing disappears.
  It makes play-forward read as time passing. (b) No: leave the past at
  full strength, since a reader scrubbing back and forth may find the
  fade distracting.
  **Resolved 2026-09-30: (a).**
- **Q34. Can a reader wander off mid-thread?** (a) **Recommended.** Yes.
  A chip holds their place, anything else they click opens as usual, and
  the chip brings them back. (b) No: a thread is a guided tour, and the
  map is locked to it until the reader exits.
  **Resolved 2026-09-30: (a).**
- **Q35. Does a thread play its demos on arrival?** (a) **Recommended.**
  No. The demo shows on its step and waits for a press, as M4 decided for
  every sound. (b) Yes, on arrival, as a guided tour would, with the mute
  and volume as they are. This reverses an M4 rule.
  **Resolved 2026-09-30: (a).**
- **Q36. How does a lens look?** (a) **Recommended.** Dimming only: lit
  edges keep their lineage colours, and everything else goes quiet. No
  new colour. (b) Recolour: each lens gets its own colour for its edges.
  Four new colours need the colour-vision check redone.
  **Resolved 2026-09-30: (a).**
- **Q37. What is the Labels lens?** "Arrange by label" and the "Labels"
  layer toggle already exist. (a) **Recommended.** The Labels lens is a
  lens like the others: it lights edges tagged `labels` and dims the
  rest. Together with Arrange by label, it reads as "how labels shaped
  this". (b) Fold it in: choosing the Labels lens also switches to
  Arrange by label. (c) Drop it: three lenses, and the label arrangement
  covers labels.
  **Resolved 2026-09-30: (a).**
