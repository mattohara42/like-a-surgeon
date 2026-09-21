# SPEC: Lineage

## Premise

Popular music is a conversation between people who were listening to each
other, usually across the boundaries that record shops and streaming services
later drew between them. Lineage makes that conversation visible and audible.

A streaming algorithm can tell a 13-year-old that people who liked X also liked
Y. It cannot tell him that a Jamaican engineer who rewired his own mixing desk
in the early 1970s changed the sound of English punk records, that a German
group's record about trains became the skeleton of a Bronx dance track, and
that a Japanese bass machine nobody wanted turned into the defining sound of
Chicago house because it was cheap and secondhand. Those are the stories.

## The three spines and the crossings

Three lineages run in parallel from the 1950s to now:

- **Rock and guitar music.** The Kinks through punk, post-punk, indie,
  alternative, and modern art-pop like OK Go.
- **Electronic music.** Musique concrete and the BBC Radiophonic Workshop
  through Kraftwerk, Detroit techno, Chicago house, acid, jungle, IDM, and
  whatever outre corner is worth mapping.
- **Hip-hop.** Sound systems and funk breaks through the Bronx, the golden age,
  the underground, boom bap, and its production lineage.

Plus a fourth, structural one: **Jamaican sound system and dub**, which feeds
all three and is the clearest single argument for why the map cannot be
organized by genre.

The **cross-lineage edges are the highest-value content in the project.** They
are what a playlist cannot do. They get visual emphasis, they get the best
writing, and they are protected in every scope decision.

## Core objects

Four kinds of node and one kind of edge.

**Artist.** A person or group. Name, lineage, active years, origin city,
primary label at the moment that mattered, key producer, signature tracks with
a reason each one is listed, and a hook sentence that justifies their presence
on the map.

**Machine.** A piece of gear or a technique that changed music on its own.
TR-808, TB-303, SP-1200, Mellotron, four-track cassette, dub plate cutting
lathe, Auto-Tune, the Amen break as raw material. These are first-class nodes
because for large parts of this history the machine is the protagonist.

**Place / Scene.** A city and a window of years. Swinging London, Kingston
1970-78, the South Bronx 1973-82, Detroit 1981-88, Sheffield, Bristol, Compton.
Carries the geopolitical context: conscription, unemployment, rent, immigration
policy, who controlled the radio, what the gear cost in a pawn shop.

**Label.** Who paid, who owned the masters, who got robbed.

**Edge.** A claim that one node's music changed because of another. An edge is
a content object with its own writing, evidence, confidence tier, listening
example, and where possible a playable demonstration. Edges are the reading
surface of this project. A thin edge is worse than a missing edge.

## Confidence tiers as curriculum

Three tiers, rendered differently and explained in a permanent legend.

- **documented.** Someone said so on the record. An interview, a credit, a
  lawsuit, a liner note.
- **consensus.** Historians and critics broadly agree, but nobody involved
  spelled it out.
- **asserted.** We are claiming a resemblance. This is our reading.

Making this visible is deliberate. A teenager learning that "sounds obviously
true" and "is actually documented" are different things gets more out of this
project than he gets from any single fact in it.

## The audio layer

Every demonstration is synthesized in-browser. Five kinds:

1. **Machine voices.** Trigger and tweak synthesized recreations of the drum
   machines and synths that shaped each era. Hear a 909 kick against an 808
   kick. Slow a 303 down and open the filter.
2. **Technique demonstrations.** A dry synthesized stem, then the same stem
   through a dub chain of spring reverb, tape delay, and high-pass. Switch the
   chain in and out. Watch the mixer move.
3. **Pattern demonstrations.** Classic rhythmic patterns reconstructed on
   synthesized kits. Hear a straight funk break, then hear the same pattern
   chopped and rearranged the way a sampler operator would have done it.
4. **A/B comparisons.** Two patterns or two timbres side by side, switchable
   mid-playback, tied directly to a specific edge's claim.
5. **Lineage players.** A short generative sequence that morphs from one era's
   characteristic sound to the next along a chosen path.

Audio is tied to edges and machines by id. Edges without a demo are normal.
Edges with one get visual emphasis.

*Reuse note: the custom 303 AudioWorklet voice from SQUELCH is the right
starting point for the acid demonstrations. Port it rather than rewriting.*

## Threads

A completionist graph is unreadable without curated routes through it. A
**thread** is a hand-authored ordered path of nodes and edges with its own
title, framing text, and audio through-line. Threads are how a reader enters.

Launch threads:

- **The Delay Line.** King Tubby and Lee Perry, into post-punk bass and space,
  into Bristol, into the way delay is used everywhere now.
- **The Machine Nobody Wanted.** The TB-303 from commercial failure through
  Chicago secondhand shops to acid house.
- **Breaks.** A handful of funk drum patterns becoming the raw material of
  hip-hop, then jungle, then everything.
- **Trains to the Bronx.** Kraftwerk into electro into Detroit.
- **Loud Guitars.** The Kinks through the Who, punk, post-punk, and out to OK Go.

Threads are cheap to add. Expect dozens eventually.

## Interaction

**Timeline.** A scrubber spanning the full date range. Dragging moves a "now"
line through the graph. Nodes and edges arrive as they happen, earlier material
recedes but stays visible. Play/pause auto-advance. Arrow keys step a year,
shift-arrow steps five.

**Zoom levels.** Three semantic levels, not just scale. Continent (lineages and
decades), Country (scenes and cities), Street (individual artists and edges).
Collapsing and expanding animates from the collapsed node so the reader never
loses their place.

**Selection.** Clicking an edge opens a panel with the claim, the track pair
and what to listen for, the evidence, the confidence tier explained plainly,
and the demo if one exists. Clicking a node opens its panel with inbound and
outbound edges as navigable links. Panels are the primary reading surface and
deserve real typographic care.

**Overlays.** Recolor and refilter the whole graph by Production, Labels,
Politics, or Technology. Each overlay has its own short intro written at all
reading levels.

**Reading level.** Persistent three-way selector: Kid, Teen, Adult. Swaps every
blurb in the interface. Stored in localStorage. Not buried in a settings menu.

**Search.** Type anything. Artists, machines, cities, labels, years. Jumps and
frames.

## Visual identity

No photographs and no album art, for licensing reasons that arrive the day this
gets hosted. Every scene gets a **hero card** composed at runtime from a
palette and an abstract SVG motif: op-art grids, sound system stacks, sequencer
step grids, tower blocks, cassette geometry, oscilloscope traces, turntable
circles. These carry the visual identity of the project and should be genuinely
good, not placeholders.

Layout is a left-to-right time axis with horizontal lanes by lineage. Explicitly
not force-directed.

## Success test

A 13-year-old opens it, clicks something because it looks interesting, hears a
sound he has never heard isolated before, follows an edge sideways into a genre
he thought he did not like, and comes back the next day.
