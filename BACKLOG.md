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
- A sticky time axis (year ticks fixed to the top of the viewport while
  content pans/zooms underneath, like a frozen header row). M2's axis
  currently lives inside the same pannable/zoomable group as everything
  else, which is simpler and works, but means the tick labels shrink/grow
  with zoom and scroll away vertically. Worth doing once there's a reason
  to prioritize it over other M3+ work.
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
- Whether historically important but indefensible artists need a data flag, or
  whether careful `hook` writing is sufficient. Starting with writing only.
- `edge.type: "label"` still has no worked example anywhere in the dataset
  (no direction convention for label-to-artist vs. artist-to-label, no
  sense of what the edge is claiming). **Resolved in the Bronx batch:**
  `e-sugarhill-mellemel` is the worked example, and the convention is label
  to artist, claiming the label's decisions changed the artist's output.
  Founding and roster relationships stay out of the graph. See A69. `edge.type: "scene"` *does* now have
  two examples on `main` (`e-knuckles-atkins`, `e-hardy-phuture`: a
  scene-level cultural influence reaching a specific artist, `from` the
  influencing figure `to` the influenced artist), so treat that one as
  settled precedent for the next batch that wants it.
- Mad Professor (Ariwa Sounds, London, active from 1979) doesn't fit any
  authored scene: `kingston-dub` is the wrong city and ends in 1980, and
  there's no UK/diaspora "second wave" dub scene yet. Left his `scenes: []`
  empty rather than force a wrong-city membership. A `uk-dub` or
  `ariwa-sounds` scene is a natural addition once there's more than one
  artist to put in it.

## Deferred from the Strata port

- **Residual label collisions.** Packing gives each name room along the time
  axis, but a label can still clip a marker in an adjacent row in the
  crowded years (1976-79 rock, 1983-87 Chicago/Detroit). Zooming in clears
  it. The real fix is label placement that alternates side and offset, which
  belongs with M3's typography pass rather than in layout.
  **Resolved in M3 step 5** by label placement rather than alternation. See
  A100.
- **Detail panels.** The prototype's reading panel (hook, register toggle,
  signature tracks, evidence, navigable edge list) is not ported: it is M3,
  and M3 has not been opened. `onSelectNode`/`onSelectEdge` still only log.
  This is the single biggest thing the port does not carry over, and the
  thing that made the prototype feel finished.
  **Resolved in M3 step 1:** ported as `reading/`. See
  `docs/m3-architecture.md` section 4.
- **Focus dimming on hover.** The prototype dimmed the whole field to just
  the hovered node, its edges and its neighbours. Not ported: it needs a
  neighbour index and a render path that can dim culled-but-adjacent
  elements, which is real work rather than a style change. The neighbour
  index now exists (see Spread-on-click). The render path does not.
- **Spread-on-click.** Influence propagating outward hop by hop from a
  clicked node. Wanted, and cheap once there is a neighbour index.
  **Update:** the index exists now (`reading/neighbours.js`, M3 step 1). It
  would need moving or re-exporting for `render/` to use it, since the
  graph never imports from `reading/` (A73).
- **Thread playback.** `data/threads/` is loaded and unused. The prototypes
  played a thread as a camera tour; M5 owns this properly.
- **Reduced motion.** `prefers-reduced-motion` now drops the dust layer,
  the grain animation and the fade transitions. Node breathing and the edge
  comets are still running under it: both are Web Animations started in JS
  and need a matchMedia check, not a CSS rule.
- **Beam overlap.** Two machines close together on the time axis put two
  vertical shafts through the same space. Fine at two machines; wants
  attention before the machine roster grows.

## Deferred from the visual pass

- Viewport culling. The `design/` prototypes draw everything once with no
  culling, which is fine at twelve nodes and wrong at five hundred. M2's
  brief already requires culling "from the first commit"; this is a note
  that the prototypes do not demonstrate it.
- Semantic zoom (Continent / Country / Street) with collapse-and-expand
  animation. The prototypes only fade labels by zoom level. The real
  three-level collapse is M2 work and is the largest unproven piece of
  `SPEC.md`'s interaction model.
- Scene hero cards composed from `palette` + `motif`. The prototypes use
  `palette` for atmospheric colour only and ignore `motif` entirely. The
  motif vocabulary (op-art grids, sound system stacks, sequencer step grids,
  turntable circles) is still completely undrawn.
- Colour-vision-deficiency check on the proposed lineage palette. See A29.
- Reduced-motion handling. All three prototypes animate continuously and
  none of them respect `prefers-reduced-motion`. Whichever direction wins
  needs a still version that loses no information.

## Observed problems

- `data/labels/brunswick.json` has no `foundedYear`, so it cannot be placed
  on the time axis and is silently absent whenever the Labels layer is on
  (12 of 13 labels draw). `render/loader.js` now warns, but the real fix is
  either the founding year or an explicit decision that undated records are
  acceptable and should render somewhere. `tools/validate.js` does not
  currently treat a missing year as worth flagging.

(Claude Code: record code smells and architectural concerns here rather than
fixing them inline.)

- Node labels are placed so they never overlap each other (A100), but they
  can still run under a neighbouring node's marker: each node's group
  paints its own label, and a later node paints over it. "Bunny 'Striker'
  Lee" under King Tubby is the visible case. The fix is to draw every name
  and hook in one labels layer above all the markers, the same move A97 made
  for lane titles. It touches the node drawing code, so it gets its own
  change. The machine floor has the same issue between "The dubplate" and
  the "THE MACHINES" title.
  **Resolved:** names and hooks now draw in one labels layer above every
  marker, and placement gives way to lane titles. See A106.

- The expanded legend covers the left ends of the lowest lane titles in
  every arrangement ("NOT IN A SCENE YET", "THE MACHINES", and the lineage
  titles before it). A lane title drawn at the axis origin can also collide
  with a member marker in the same years. Both are for the step 5
  typography pass, which already owns label collisions.
  **Mostly resolved in M3 step 5:** lane titles in scene and label views sit
  beside their content, and the opening view keeps the legend's width clear
  (A101, A105). Once the reader pans, the legend is an ordinary overlay.

- `signatureTracks` titles mix the title with credit notes ("Big Fun (Inner
  City)", "The Bridge (produced for MC Shan)"), so the YouTube query built
  from them is looser than it could be. Either the same optional `search`
  field trackPair has (A78), or moving the credit into its own field, would
  tighten it. A schema change, so it waits for a decision (A93).

- The map barely distinguishes `documented` from `consensus`: the only
  difference is stroke width, 2px against 1.5px (`CONFIG.edge.strokeWidth`),
  and at the map's opacity that half pixel does not read. The legend draws
  from the same values, so it shows the problem plainly rather than hiding
  it. `asserted` is fine, because it is dashed. The fix is a clearer
  encoding, such as a wider gap in width, a second dash pattern, or
  consensus drawn slightly fainter. That is a renderer decision, so it
  belongs in the typography pass (M3 step 5) or with Matt, not in the legend.
  **Resolved in M3 step 5:** each tier now differs on two channels. See A99.

- The app has never run from `file://`: the ES module entry point is
  blocked as cross-origin, and `index.html` does not load the data bundle.
  Raised as **Q18** rather than fixed, because every fix touches the "no
  build step" or "ES modules" constraint.
  **Resolved:** `npm run build` writes `dist/`, which runs from disk. See
  A84.
- The transport opens at `layout.timeScale.yearEnd`, which includes the
  axis's two margin years, so the year readout shows 2028 in 2026. It reads
  as the map claiming to know the future. The cursor should probably clamp
  to the current year. Not touched, since the transport is not M3 work.
- `label.founders` holds plain names ("Juan Atkins") rather than ids, so the
  label panel prints founders as text while the artist panel links the same
  person. Resolving names to ids at render time would be guesswork. An id
  convention for founders, like the one `keyProducers` uses, would fix it
  properly.

- The SessionStart hook cannot protect a session whose branch was created
  from a commit older than the hook itself. This session's branch pointed
  at PR #2's merge, which predates `.claude/`, so the hook never ran and
  the checkout was 30-plus commits behind `main` with no warning. The
  session nearly redid data batch 1. Fixed for this branch by
  fast-forwarding to `main`. The durable fix is outside the repo: create
  session branches from `main`'s head. Failing that, a line in `CLAUDE.md`
  telling a session to run `git fetch origin main` and compare before
  reading anything else would work even at an old commit, as long as the
  commit is newer than that line.

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
- M2's perf gate (2x-M1-scale, simulated by duplication) was validated with
  a headless Chromium session via Playwright: `render()` itself averages
  1.9ms against a 16.7ms budget. That's not the same as a real GPU-
  accelerated browser's paint/composite cost, which this harness can't
  reach. Worth a spot check in an actual browser session once the dataset
  is closer to its real M1 size (120 artists, 350 edges) and there's an
  actual reason to worry about it. See `docs/m2-architecture.md` section 7.
- Still-active nodes (`activeTo`/`closedYear`/etc. null, drawn extending to
  the current year) produce long horizontal span lines that run in parallel
  across most of the timeline's width once a lane has more than a few of
  them, visible already in the current ~30-artist dataset. Not a bug, just
  worth a styling pass (fainter stroke, or fading the line's far end)
  before the roster gets a lot bigger and lanes get busier.
- A separate parallel session's Track D batch (the one merged as this
  entry's predecessor) added 8 artists whose `scenes[]` already point at
  `detroit-techno` and `kingston-dub`, but those two scenes' own
  `memberIds` were never updated to include them: `detroit-techno.json`
  still lists only `juan-atkins` despite Derrick May and Kevin Saunderson
  both declaring it, and `kingston-dub.json` lists only `king-tubby` and
  `lee-perry` despite Augustus Pablo and Sly and Robbie both declaring it.
  `tools/validate.js` has no check in either direction (artist-declares-
  scene vs. scene-lists-member), so this passes silently. Worth adding
  that consistency check to the validator, and backfilling the four
  missing memberIds, in a tooling-focused pass.
- This session's own Track D batch (8 artists, 6 labels, 2 scenes) turned
  out to duplicate work from two other Track D batches that merged into
  `main` first. Reconciled by keeping `main`'s versions of everything both
  sides wrote and rebuilding this branch to carry only the genuinely new
  content: Man Parrish, Mad Professor, the Ariwa and Rockers International
  labels, and four new edges. See `ASSUMPTIONS.md` A34-A36 for the detail
  and for why this reads as convergent validation rather than a process
  failure. Worth a lighter-weight coordination signal (a claimed-artists
  list, or just checking `main` right before starting a batch rather than
  only at the start of a long session) so the next parallel collision costs
  less rework than this one did.
- `machine.kind` has no value for an effect unit, a mixing desk, or a
  turntable. The machines batch filed the Roland Space Echo under
  `studio-technique` and both King Tubby's console and the Technics SL-1200
  under `instrument` (see A58), which works but leans on an editorial
  reading rather than on the schema. An `effect` kind, or a rename of
  `studio-technique` to cover hardware processors explicitly, would make
  this unambiguous. Schema change, so not done inline.
  **Update, second machines batch:** the gap now covers the Fuzz-Tone,
  the Harmonizer, the AMS delay and the Mu-Tron as well, and two
  guitar amplifiers are filed as `instrument` for want of anything better
  (A109). An `effect` kind and an `amplifier` kind would cover all of them.
- The lineage enum has no disco value, so the 12-inch single is filed under
  `funk` (A57). Disco is load-bearing for house, for the remix as an
  authored object, and for a large part of what the map will eventually
  need to say about New York. Adding a value touches `SCHEMA.md`,
  `tools/validate.js` and the renderer's lineage palette, so it needs a
  decision rather than a quiet edit.
  **Decided: no.** The enum stays as it is and disco stays filed under
  `funk`. See A71, which explains at some length why we would rather not
  discuss this.
- The link from Jamaican sound system practice to the Bronx has no node to
  run through. DJ Kool Herc is the documented carrier, and he is not on the
  map, so the machines batch did not draw a `dubplate` to `grandmaster-flash`
  edge that it would otherwise have wanted. Herc is the obvious first
  addition to any hip-hop batch.
  **Corrected when Herc was added:** "documented carrier" was wrong, and I
  wrote it from the same popular-history assumption the research then
  undercut. Herc himself has rejected the toasting connection as often as
  he has affirmed his Jamaican roots, and the scholarship is split. Herc is
  now on the map and the crossing is still not drawn, deliberately. See
  **A63** and **Q12**: whether this map should carry that edge at all is
  now an open question for Matt rather than a gap waiting on a node.
  **Closed:** Matt answered Q12 yes. The crossing is drawn as
  `e-kingston-bronx`, scene to scene at `consensus` tier, not through Herc.
  See A65.
- Demos are now the furthest-behind gate metric after edges: 4 of 30 edges
  carry a `demoId`, against 11 machines that could each plausibly have one.
  The machines batch deliberately did not invent demo records, since
  `data/demos/` is M4's contract and inventing params for an engine that
  does not exist yet would be writing fiction. Worth planning the demo
  roster against the machine roster before M4 opens.
- The machines batch made the long-span-line problem above worse before
  anyone fixes it. `dubplate` runs from 1950 to the present and the
  melodica, the SL-1200, the 12-inch single and the Space Echo are all open
  ended too, so the machine floor now carries several lines spanning most
  of the axis. Formats and practices genuinely do not end, so this is
  honest data hitting a styling gap rather than a data problem.
- `grandmaster-flash.json` gives `originCity: "South Bronx, New York"`, but
  Flash was born in Barbados and came to the Bronx as a child. That is not
  obviously wrong, because the dataset has no stated convention for
  `originCity`: `mad-professor` and `kool-herc` both use birthplace
  (Georgetown, Kingston) while Flash uses the city he formed in. Worth
  settling, since Caribbean birth across the founding Bronx generation is
  part of the evidence for `e-kingston-bronx` and the map currently hides
  it for one of the three people it most applies to. Left alone rather than
  edited inline, because it is a convention decision and not a typo.
- `tools/validate.js` counts `signatureTracks` entries but never checks
  their shape, so an entry missing `whyThisOne` passes clean. That is
  reader-facing text, and four records shipped from this batch's first pass
  without it (caught by reading the schema, not by the validator). The same
  gap applies to `labels` entries, where a malformed object surfaces only
  indirectly as an unresolved-reference warning for `"undefined"`. Worth a
  shape check on both in the next tooling pass. See A70.
- Two labels this batch wanted and did not author: Enjoy Records (Bobby
  Robinson), where Grandmaster Flash recorded 'Superrappin'' before Sugar
  Hill, and Cold Chillin' (1986), Marley Marl's home as in-house producer.
  Both were left out because neither had a label-to-artist causal claim
  strong enough to justify the edge under the A69 convention, and adding
  them without one would have produced two more orphan labels. Worth
  revisiting with the artists who make the claim land.
  **Half closed:** Cold Chillin' arrived with the hip-hop production
  batch, carried by the Biz Markie sampling case (A121). Enjoy Records is
  still waiting.
- `duke-bootee` carries one `signatureTracks` entry against the schema's
  two to three. Rather than pad it with a record I could not verify, it
  stands at one and warns. His catalogue outside 'The Message' needs real
  research rather than a guess.
- The second machines batch brought the machine floor to 25, and the
  opening view now hides several machine names in 1963 to 1985 because
  the label placement (A100) has no room for them. Nothing overlaps, but
  a reader has to zoom to find the Fuzz-Tone or the Mu-Tron. Machines are
  unbounded like everything else, so the floor will need a second row or
  lane-style packing well before 50 machines.
- Machines worth adding once their artists are on the map (A107): the
  Akai MPC60 (late-80s hip-hop production), the Casio MT-40 with King
  Jammy and Wayne Smith's 'Under Mi Sleng Teng', the Roland TR-707 and
  TR-606, and the LinnDrum. Each needs an artist before it can connect,
  so they belong with the batches that add those artists.
  **Partly closed:** the MPC60 arrived with the hip-hop production
  batch, along with the Oberheim DMX and the MPC3000 (A119). The MT-40,
  TR-707, TR-606 and LinnDrum are still waiting on artists.
- The hip-hop production batch left out artists it should have had
  (A118), to keep the batch small enough to check line by line: Public
  Enemy and the Bomb Squad, whose dense collage is the clearest casualty
  of the 1991 ruling, but for whom no sourced edge to a node already on
  the map turned up;
  De La Soul and Prince Paul, which would give `tommy-boy` its first edge
  and bring in the Turtles sampling suit; Mantronix; Big Daddy Kane and
  the rest of the Juice Crew; and the whole West Coast (N.W.A, Dr. Dre,
  G-funk), which needs Parliament-Funkadelic on the map first. Def Jam
  as a label node also waits: every causal claim about it found so far
  is really Rubin's, and A69 keeps roster relationships out of edges.
- The batch added two more null end years of the "could not find it"
  kind that Q20 is about: `akai-mpc60` and `akai-mpc3000`. Both will read
  as still on sale until Q20 is answered.
