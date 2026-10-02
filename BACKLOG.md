# BACKLOG

Everything deliberately not being built right now. Adding to this file is the
correct response to a good idea arriving mid-milestone.

## Deferred features

- Touch and wall-panel build. Larger hit targets, gesture pan/zoom, no hover.
- Hosted deployment with a share-a-view URL scheme.
- User-authored threads, saved locally.
- A "what should I listen to next" walk that respects what the reader clicked.
- **Leap / Dive random discovery.** A button that flies the camera along a
  random edge (weighted toward cross-lineage and demo-carrying edges) and
  opens the reading panel on the far side, for unscripted browsing. Holding
  it or pressing again chains hops from wherever the reader lands. Needs
  `reading/neighbours.js` re-exported or moved so `render/` can use it (see
  "Spread-on-click" under "Deferred from the Strata port"). Raised by Matt
  alongside the depth/leap visual pass; not prototyped yet.
- **Connect the Stars challenge mode.** "Get from X to Y in N leaps or
  fewer," played over the real graph, scored on the shortest real path and
  rewarding cross-lineage hops. Unlockables (a completed lineage crossing,
  a long Dive, etc.) tracked in localStorage, one reader per device. Raised
  by Matt alongside the depth/leap visual pass; not built or scoped yet.
- Printable poster export of a thread.
- Per-scene ambient generative bed that plays while browsing that region.
- Comparison mode: two artists side by side with their full edge sets.
- **Cards: open the map on the card's record.** "Open the full map"
  opens the map at its usual opening view. Passing the card's address
  through would let the map fly to that record and open its panel.
- **Cards: show edges that touch an undated record.** The loader drops
  them because the map cannot place them (A310), but a card needs no
  year. Only `e-brunswick-talmy` today.
- **Cards: audio demos,** once the Safari check (Q27) is done
  (docs/cards-architecture.md section 2, decision 4).
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
  Weird Al is now on the map (A232) with documented edges from Michael
  Jackson and the Rolling Stones, so a path exists: through Jackson to
  Motown and to Nas's 'Human Nature' sample, and through the Stones to
  Chess, the Kinks and the Verve. Still waiting on two things. The thread
  player is M5 work. And two anchors make a short thread, so a 90s/grunge
  or mainstream-pop batch (Nirvana, Coolio, Madonna) would give it the
  range the idea needs. Build it with the same evidence discipline as
  every other edge, not as an exception to it.
  **A third anchor landed:** Nirvana joins with `e-weirdal-nirvana`
  ("Smells Like Nirvana" parodying "Smells Like Teen Spirit"), and also
  a real, non-parody `e-bowie-nirvana` (their 1993 MTV Unplugged cover
  of "The Man Who Sold the World"), which connects Nirvana into the map
  through more than the novelty edge alone. Nirvana itself has no scene
  yet (no Seattle/grunge scene is authored), so its `scenes` is left
  empty, a natural next scene to write once a second grunge-era artist
  arrives.
  **A fourth anchor:** Madonna joins with `e-madonna-weirdal` ("Like a
  Surgeon" parodying "Like a Virgin"), which is also where this
  project's own repo name comes from.
  **A fifth, and the disputed one:** Coolio joins with `e-coolio-weirdal`
  ("Amish Paradise" parodying "Gangsta's Paradise"), tiered `consensus`
  rather than `documented` since Yankovic's and Coolio's own accounts of
  the permission story conflict, the CLAUDE.md rule 4 case this note
  had flagged. Both sides are stated in the edge's evidence rather than
  picking one. All five thread anchors (Michael Jackson, Rolling Stones,
  Nirvana, Madonna, Coolio) are now on the map; the thread player itself
  is still M5 work.
  **Shipped** (A292) as a six-stop thread into Yankovic in date order.

- **Six Degrees of Weird Al, the challenge.** Matt asked for this
  2026-10-01, as a game alongside the A292 thread: get from any artist to
  Yankovic in six hops or fewer. Held until the M5 gate passes, per Matt.
  **Shipped** (A340) on 2026-10-02, ahead of the M5 gate at Matt's request.
  Design as agreed in chat:
  - *Shape.* The player hops. The game starts on an artist, each click on
    a connected node is one hop, a counter sits in the dock, and reaching
    Yankovic wins. A "show me a route" button reveals one shortest path
    after a win or a give-up. Every hop opens an edge, so the reader learns
    something at each step.
  - *What counts as a hop.* Any edge, in either direction, through any node
    type. Scenes, labels and machines count as stops. Direction has to be
    ignored because every Yankovic edge points into him. An artist's own
    scene membership (its `scenes` field) is also a hop, since the scene
    panel already lists its members. Label membership is not, so that big
    labels never become shortcuts (A334, Matt's call on 2026-10-01).
  - *Reach today.* With those rules, 181 of 203 artists are within six
    hops (a BFS over the edge files on 2026-10-01). The 22 beyond six, or
    unreachable, are thinly connected rather than musically distant.
    George Clinton has one edge (to Dr. Dre), Pink Floyd one (to Kate
    Bush), and Curtis Mayfield and The Goats connect only to their labels.
    Daphne Oram, Delia Derbyshire, Curtis Mayfield and The Goats have no
    route at all. Every far artist has 1 to 4 edges against a median of 3.
    So the limit stays at six, and the far list is a Track D worklist.
  - *Starting artists.* Only artists within six hops, Matt's call on
    2026-10-01, so every game can be won. An artist further out is never
    offered as a start. If a reader asks for one by name, the game says
    honestly how many hops away it is on the map so far and suggests a
    closer start. `npm run report` lists the artists beyond six hops (A331).
  - *Naming.* The challenge keeps "Six Degrees of Weird Al". The A292
    thread is renamed "Songs Everyone Knew" (A331).
  - *Build notes.* The distances must be computed at load time from the
    edge data (a BFS from Yankovic), never a stored list, so artist 900
    costs what artist 9 did. The target and hop limit are already in
    `CONFIG.sixDegrees`, and `tools/report.js` has a BFS to reuse. A
    scene-membership hop has no edge evidence or `whatToListenFor`, so the
    game shows the scene's own text for that step instead.

- **Follow the producer (Q21).** Select a producer and see everything
  they touched lit up across the map, or an "Arrange by producer" lane
  option beside Lineage, Scene and Label. The data for it is `production`
  edges from producer nodes, which the hip-hop batches are adding now.
  Deferred until the M3 gate passes, per Matt's call on Q21.
  **Shipped** (A262) as a panel button that frames and rings every act a
  record produced. "Arrange by producer" as a lane option is not built.
  Framing does not yet keep clear of the legend, so a produced act can sit
  behind it.
- **Record nodes (Q21).** If the sampled-artist-as-hub approach stops
  working (for example a single record sampled by fifty acts crowds its
  artist's node), a `record` node type would let the break itself be the
  hub. It's a schema, validator, layout and panel change, so it's
  deferred until the data shows it's needed.

- **Golden edges to find.** A handful of edges shimmer faintly gold and the
  welcome card hints that they are hidden on the map, with a small count of
  how many the reader has found. Proposed alongside the ripple (A251) and
  backlogged by Matt. Needs a rule for what counts as golden that does not
  editorialize, for example documented cross-lineage edges only, which
  should come back to Matt before any build.
  **Shipped** (A263) with Matt's rule: the longest documented
  cross-lineage leaps, record to record.
- **Parallax starfield and node glints.** A multi-layer starfield drifting
  at several depths as the reader pans, plus a slow twinkle and specular
  glint on the most connected nodes. Proposed alongside the ripple (A251)
  and backlogged by Matt. The dust's zoom response (A250) is the small
  version of the first half.

## Deferred data

- Jazz and blues beyond what later music traces back to. Both are now
  roots lanes (A224), filled depth-first from documented connections.
  Covering either as its own full history would still triple the graph.
- Country and its production lineage.
- Classical minimalism into electronic music.
- Regional scenes outside the US, UK, Jamaica, and Germany.
- The full label ownership and catalogue-sale history, which is a project on its own.
- Machines researched for the TR-707 batch (A266) and held back:
  - TR-707 on Mr. Fingers, 'Washing Machine'. Some gear lists name it,
    but `e-909-heard` documents a 909 on that record, recorded in 1984,
    and the 707 came out in 1985. Needs a primary account before either
    edge changes.
  - LM-1 or LinnDrum on *Thriller*. Often repeated, but the "Billie Jean"
    drums are credited to Ndugu Chancler playing live, and the sources we
    found disagree about any machine's part. Disputed; worth an edge only with a sourced
    account of which machine did what, and then as a rule-4 sentence.
  - TR-606. No source better than forum posts for any specific record.

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
  **Closed** (A261): `scene.city` may now be a list. `uk-post-punk` reads
  London, Manchester, Leeds.
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
  **Shipped** in a lighter form (A253): every edge is quiet until the
  reader hovers or selects a node, and then that node's edges light up in
  full. Nodes and neighbours are not dimmed, only edges.
- **Spread-on-click.** Influence propagating outward hop by hop from a
  clicked node. Wanted, and cheap once there is a neighbour index.
  **Update:** the index exists now (`reading/neighbours.js`, M3 step 1). It
  would need moving or re-exporting for `render/` to use it, since the
  graph never imports from `reading/` (A73).
  **Shipped** as the influence ripple (A251), downstream only, with its own
  one-direction adjacency built in `render/graph.js` rather than moving the
  neighbour index. An upstream ripple ("what changed this") is not built.
  Hover still does not trigger it: selection does.
- **Thread playback.** `data/threads/` is loaded and unused. The prototypes
  played a thread as a camera tour; M5 owns this properly.
- **Reduced motion.** `prefers-reduced-motion` now drops the dust layer,
  the grain animation and the fade transitions. Node breathing and the edge
  comets are still running under it: both are Web Animations started in JS
  and need a matchMedia check, not a CSS rule.
  **Closed** (A255): breathing does not start, comets hold still near
  their target end, the camera cuts instead of flying, and sparks stay off.
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
  **Checked, and it fails** (A258). Simulated with Machado et al. (2009)
  matrices and measured as CIE76 distance in Lab. Under deuteranopia,
  hip-hop (#bd82ff) and electronic (#5fa8ff) are indistinguishable
  (distance 0) and funk and blues nearly so (3). Under protanopia, jazz
  and `other` nearly merge (4). For comparison, the closest pair under
  normal vision is 30. Lane titles and lane position still carry lineage
  in the Lineage view, but edge colour (source to target gradient) and the
  scene and label views rely on colour alone. A candidate that keeps every
  hue and separates the confused pairs by lightness raises the worst pair
  to 10 (deuteranopia) and 12 (protanopia): hip-hop `#e0b8ff`, electronic
  `#4a8cf0`, jazz `#ff9ad6`, blues `#8fc43c`, other `#66758e`. It changes
  the map's identity colours, so it waits for Matt. Applying it is five
  one-line edits in `data/lineages/`.
  **Applied** (A259) at Matt's request.
- Reduced-motion handling. All three prototypes animate continuously and
  none of them respect `prefers-reduced-motion`. Whichever direction wins
  needs a still version that loses no information.
  **Closed** for the app (A255). The comet was the one animation carrying
  information (direction), and it keeps that as a still dash.

## Observed problems

- **`coolio.json` calls 'Pastime Paradise' a sample.** Wikipedia's
  article on 'Gangsta's Paradise' says it is an interpolation, replayed
  rather than lifted from the record, with Wonder credited as a writer.
  The new `e-steviewonder-coolio` says so; the Coolio record's hook,
  blurb and signature track still say sample. A one-word fix in a data
  pass, left alone here because it is outside the batch (found during
  A320).

- ~~**A thread step's `demoId` is validated but never read (A284).**~~
  **Fixed** (A289): the validator now requires a step's `demoId` to match
  the demo its record shows. The
  player shows each stop's record panel, and so that record's own demo.
  A step `demoId` that named a different demo would pass the validator
  and never appear. Either the player shows it (one demo per page still
  holds only if the record has none of its own), or the validator
  requires it to match the record's demo, or the field goes.

- ~~**`CONFIG.transport.unbornOpacity` is unused.**~~
  **Fixed** (A289): `reading/type.js` publishes it as `--unborn-opacity`. The "not yet" fade is
  `.unborn { opacity: 0.085 }` in index.html, the same number written a
  second time. Changing the CONFIG value does nothing. Either the CSS
  should read it (as a custom property set from CONFIG) or the CONFIG key
  should go. Found in M5 step 1 (A283), not changed there.

- ~~**Demo captions name one edge's record, so a demo cannot travel
  (A293).**~~ **Fixed** (A297): an edge can carry its own `demoCaption`. Of four edges that could carry an existing demo, three were
  blocked only because the caption names another record (Tubby,
  'Flash Light', Knuckles). Either captions move to the edge (a
  `demoCaption` on the edge, falling back to the demo's), or demo
  captions drop record names. Either would let most machine edges carry
  a demo, which is the fastest route to the 30 edges-with-demo target.
  Not changed: it is a schema choice for Matt.

- **`loadPlaywright` is copied between `tools/audio-check.js` and
  `tools/cards-check.js`.** Both load Playwright the same way (local,
  then the global install). A third browser check would make it worth
  a shared `tools/playwright.js`. Found while writing cards-check.

- **`tools/report.js --out` breaks on an absolute path.** It writes to
  `join(ROOT, opts.out)`, so `--out=/tmp/x.md` becomes
  `<repo>/tmp/x.md` and fails with ENOENT. `resolve(ROOT, opts.out)`
  would handle both. Found while reading the report outside the repo,
  not changed there.

- **Demo peaks cluster just under the safety knee, whatever their cap
  (A280).** Four of the nine playable demos (tape echo, synth bass,
  distortion, 808 against 909) peak between 0.37 and 0.395 at their
  loudest against a 0.4 knee, and the kick-led ones sit at 0.358. Cutting a demo's `safety.maxGain`
  from 0.6 to 0.55 moved its peak by only about 0.01, because the master
  limiter holds peaks at roughly the same level. So the per-demo cap is
  a weak lever, and each new demo tends to land close to the knee.
  Worth a look as one change: a lower `volumeMaxGain`, or a limiter
  threshold, set so the loudest demo has real margin. Not changed here,
  since it moves every demo's level and Matt has been judging them by
  ear.

- ~~**`e-909-knuckles` may put a 1984 machine in the Warehouse.**~~
  **Fixed** (A290), checked against Wikipedia's article on Knuckles. The
  edge dates the 909 reaching Knuckles to 1984, names "Warehouse and
  Power Plant DJ sets" as the later track, and ends its listening note
  on "what a Warehouse night turned into". My understanding is that
  Knuckles left the Warehouse around 1982 and opened the Power Plant
  after that, which would mean a 1984 machine was a Power Plant tool.
  I have not checked this against a source, so the edge is unchanged
  (found while writing demo 3, A278; the demo caption names neither club).

- ~~**SQUELCH: the 808 kick's decay knob gives a click (A270).**~~
  **Fixed** upstream in SQUELCH #8 and re-ported (A276).
  `js/worklets/drum808.js` reads `params.decay` for the kick as
  milliseconds, while `js/panelDrum.js` sends every knob as 0..1, so any
  decay setting gives a kick of about 2 ms. The oh and cy lanes convert
  0..1 to their range; the kick does not. Fix in SQUELCH (convert with
  `decayMinMs`/`decayMaxMs` as the other lanes do), then re-port and
  drop the workaround in `audio/instruments.js`.

- **Inline DSP literals in the ported worklets (A268).** SQUELCH's
  drum and 303 processors carry a handful of unnamed numbers in their
  render code: mix weights, filter corners, and the default hit level.
  They were kept so the port matches upstream. Name them in SQUELCH's
  `CFG` first, then re-port into `CONFIG.audio.dsp`, so the two repos
  do not drift.

- ~~`render/loader.js` loads every record before anything renders.~~
  **Fixed** (A235): startup loads a skeleton index and each record's full
  text loads when its panel opens. Still open: the time from click to text
  was only measured in headless Chromium, where software rendering makes
  every camera-flight frame slow and the numbers swing from 40 ms to 2 s
  (the old synchronous panel shows the same long frames). It needs a spot
  check in a real browser, alongside the M2 one below.
- `data/labels/brunswick.json` has no `foundedYear`, so it cannot be placed
  on the time axis and is silently absent whenever the Labels layer is on
  (12 of 13 labels draw). `render/loader.js` now warns, but the real fix is
  either the founding year or an explicit decision that undated records are
  acceptable and should render somewhere. `tools/validate.js` does not
  currently treat a missing year as worth flagging.
  **Half closed** (A254): the validator now warns on any node with no start
  year. Brunswick's founding year itself is still unsourced.
  **Researched, left null** (A265). No single year holds up for "Brunswick
  (UK)". British Brunswick Ltd issued American Brunswick masters in Britain
  from the late 1920s. British Decca took over the UK Brunswick business in
  the early 1930s, with 1932 given in secondary summaries but not stated
  in Wikipedia's own Decca Records article. It could only carry American
  Decca recordings once US Decca existed (1934). Which of those is the
  founding of the imprint this record describes is itself a judgement,
  and none of them is solidly sourced yet. A primary source (a Decca
  history or a label discography with dates) would settle it.

(Claude Code: record code smells and architectural concerns here rather than
fixing them inline.)

- ~~**Focusing a long edge shows an empty map.**~~ **Fixed:** focusing or
  clicking an edge now zooms out as far as it needs to keep both ends on
  screen beside the drawer (`edgeFrameScale` in `render/graph.js`). A short
  edge still gets the `flyToScale` close-up. It was seen while testing the
  welcome goal (A249), where Kraftwerk → Afrika Bambaataa landed the camera
  between two lanes with neither end in view.
- ~~**The year readout opens at 2028.**~~ **Fixed:** the transport, the
  year search and the cursor now run over the records' own span
  (`layout.minYear` to `layout.maxYear`, currently 1948 to 2026) instead
  of the axis, which is padded by `layout.marginYears` on each side. The
  padding is still drawn, but the cursor cannot reach it.
- ~~**The welcome card cannot be reopened once the goal is found.**~~
  **Fixed** (A252): a "Start here" button beside the mission chip is always
  on screen, and the single goal became a chain of five missions.
- **The map can be panned right off screen.** Since A250 the field around
  the map fades out rather than stopping, so there is no edge to bump
  into, and a reader can drag the whole map out of view into empty dust.
  If readers get lost, a soft pull back toward the content when it leaves
  the screen, or a "back to the map" control, would fix it.
  **Closed** (A260): Matt picked the soft pull-back.

- `j-dilla.json`'s adult text states "Donuts was mostly made in hospital" as
  plain fact. Researching the new `stones-throw` label for this batch turned
  up Dan Charnas's biography 'Dilla Time' (2022, built on nearly 200
  interviews), which argues that account is largely myth: the album began
  as a shorter beat tape made at home, and Stones Throw's own art director,
  Jeff Jank, expanded and sequenced it into the released 31-track record.
  Charnas reports Stones Throw didn't correct the hospital story at the time
  because it helped sales, and founder Chris Manak has since corrected it
  himself in interviews. This is exactly the CLAUDE.md rule 4 case (a
  widely repeated popular-history claim that turns out to be disputed), but
  no edge in this batch touches Dilla's own record directly enough to carry
  the correction, so it's left as a data fix for the next Dilla-adjacent
  batch rather than edited inline here.
  **Closed** (A256): the adult blurb now states the dispute and the
  Donuts track's `whyThisOne` no longer repeats the hospital claim.

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
  **Closed** (A261): `signatureTracks[].search`, same rules as trackPair,
  set on 69 tracks whose titles carry a credit note.

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
  **Closed:** a duplicate of the entry further down, fixed there.
- At 1280x800 the bottom lineage lane (`other`) draws under the timeline
  transport, so Schaeffer, Stockhausen, Oram, Ahmad Jamal and their labels
  sit behind the play bar and are hard to read or click. The outré
  electronic batch made it more visible by adding six nodes to that lane.
  Either the lane stack should reserve the transport's height, or the
  transport should not overlap the plot. Not touched, since it's layout
  work outside Track D.
  **No longer applies** (A257): the map opens on a framed stretch rather
  than trying to fit every lane (A249), and pan is unlimited (A250), so any
  lane can be brought above the transport. The transport stays a
  translucent overlay, like the legend.
- `label.founders` holds plain names ("Juan Atkins") rather than ids, so the
  label panel prints founders as text while the artist panel links the same
  person. Resolving names to ids at render time would be guesswork. An id
  convention for founders, like the one `keyProducers` uses, would fix it
  properly.

- `keyProducers` already uses an id convention, but existing entries were
  not all updated when the producer later got their own artist record:
  `the-clash.json` lists `keyProducers: ["Lee \"Scratch\" Perry", ...]`
  as a plain name, even though `lee-perry.json` exists and would resolve
  and link if the entry read `"lee-perry"` instead. `tools/validate.js`
  correctly warns on this ("may be a plain name") rather than erroring,
  since it can't tell a genuinely off-map name from a stale one, but a
  pass that diffed `keyProducers` values against `records.artists` ids
  by rough name match, and flagged the near-misses for a human to confirm,
  would catch cases like this one. Not fixed here since it is pre-existing
  data outside this session's task.
  **Partly closed, twice.** `the-clash.json`/`lee-perry` fixed in the
  Juice Crew batch. A producer batch then gave five more plain-name
  entries their own artist records and resolved them: George Martin (the
  Beatles), Quincy Jones (Michael Jackson), Tony Visconti (David Bowie),
  Chas Chandler (Jimi Hendrix), and Martin Hannett (Joy Division). Each
  got at least one real production edge rather than arriving as a bare
  fix. Many more plain names remain (Shel Talmy-style producers with a
  single credited act each: Larry Smith, the Bomb Squad, Q-Tip as a
  producer credit, etc.), each a candidate for the same treatment when
  there's a real edge to write, not just a name to resolve.

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
  **Closed.** `on-u-sound.json` authored and referenced from
  `adrian-sherwood.json`'s `labels[]`. No edge touches it directly, per
  A69's founder-relationships-stay-out-of-the-graph convention (same
  situation as Kling Klang), so it shows as an orphan warning, expected
  rather than a gap. Also added African Head Charge and Tackhead, both
  already named in Sherwood's own `signatureTracks`, each with a real
  production edge from Sherwood. Tackhead's edge doubles as a documented
  connection between two labels already on the map: its rhythm section
  (McDonald, Wimbish, LeBlanc) were Sugar Hill's house band before
  reforming on On-U Sound.
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
  **Closed** (A254): the validator now checks membership both ways, and
  eight missing `memberIds` were backfilled across `kingston-dub`,
  `detroit-techno` and `chicago-house`.
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
  **Closed** (A261): `effect` and `amplifier` kinds added. Five effects and
  two amplifiers refiled. The TEAC 4-track and Tubby's console keep their
  old kinds, since no one asked to move them.
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
  **Closed** (A264): birthplace for people, formation city for groups.
  Flash is Bridgetown, Barbados.
- `tools/validate.js` counts `signatureTracks` entries but never checks
  their shape, so an entry missing `whyThisOne` passes clean. That is
  reader-facing text, and four records shipped from this batch's first pass
  without it (caught by reading the schema, not by the validator). The same
  gap applies to `labels` entries, where a malformed object surfaces only
  indirectly as an unresolved-reference warning for `"undefined"`. Worth a
  shape check on both in the next tooling pass. See A70.
  **Closed** (A254): both are shape-checked now, as warnings.
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
  **Closed.** `enjoy-records` and `e-enjoy-flash` carry a different
  shape of A69 claim than the label's other edges: not a creative
  decision but a distribution limitation. Enjoy's inability to sell
  'Superrappin'' outside New York is what moved Grandmaster Flash to
  Sugar Hill within the year.
- `duke-bootee` carries one `signatureTracks` entry against the schema's
  two to three. Rather than pad it with a record I could not verify, it
  stands at one and warns. His catalogue outside 'The Message' needs real
  research rather than a guess.
  **Closed** in the source verification pass: 'Message II (Survival)'
  (Sugar Hill, 1982), credited to Melle Mel and Duke Bootee in every
  Discogs listing, is his second entry.
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
  **Partly closed** by the Q21 batch 1, which added the Beastie Boys and
  much of the 90s, and further by the sample-hub/Native Tongues batch
  (A191), which added De La Soul, Prince Paul and Mantronix, and gave
  Tommy Boy its label edge along with the Turtles suit (`e-tommyboy-delasoul`).
  Big Daddy Kane and the rest of the Juice Crew, and the West Coast, are
  still waiting.
  **Further closed:** the West Coast landed with George Clinton and
  Dr. Dre (A204-A205). Big Daddy Kane is now on the map with a
  consensus-tier direct edge into Nas (`e-kane-nas`); the rest of the
  Juice Crew (Kool G Rap, Roxanne Shanté, MC Shan, Craig G) is still
  waiting.
  **Mostly closed:** MC Shan, Kool G Rap and Roxanne Shanté are all now
  on the map, each with a documented production edge from Marley Marl.
  MC Shan's own entry also covers the Bridge Wars in full, which had
  previously existed only as a plain-name trackPair reference inside
  `e-marleymarl-bizmarkie`. Craig G is still waiting, and so is a KRS-One
  node, which would let the Bridge Wars' other side (`e-marleymarl-mcshan`'s
  own trackPair names 'The Bridge Is Over' but has nowhere on the map for
  Boogie Down Productions to land) become a real edge rather than prose.
  **Closed.** Craig G joins the Juice Crew (`e-marleymarl-craigg`, both
  'Droppin' Science' and his verse on 'The Symphony'), which finishes the
  named Juice Crew roster. The Bridge Wars' other side lands as
  `boogie-down-productions` (the group, not a solo KRS-One node, since
  both 'South Bronx' and 'The Bridge Is Over' are group-credited) with
  `e-bdp-mcshan`, the dataset's third `reaction-against` edge. Left his
  `scenes` empty: BDP's 1986-87 run falls outside `south-bronx`'s
  1973-1984 window, and no later-Bronx scene exists yet to hold him.
- The batch added two more null end years of the "could not find it"
  kind that Q20 is about: `akai-mpc60` and `akai-mpc3000`. Both will read
  as still on sale until Q20 is answered.
  **Closed** by Q20 (A172): both now carry `endUnknown` and draw as
  fading spans ending in "?".
- Sampled-artist hubs the Q21 batch 1 records already point at, ready
  for batch 2: Sly and the Family Stone ('Life', in 'Insane in the
  Brain'), The Charmels ('C.R.E.A.M.'), Ahmad Jamal ('The World Is
  Yours'), Sade ('Doomsday'), Joni Mitchell ('Got 'til It's Gone'),
  Ronnie Foster ('Electric Relaxation'), Michael Jackson ('It Ain't Hard
  to Tell') and Daedelus ('Accordion'). Each is named in a track pair
  now, and each becomes a `sample` edge once its artist is a node.
- Producers held as plain names until a second act needs them (A127):
  Q-Tip, K-Def, A-Plus, the Dust Brothers, Joe Nicolo, Questlove, and
  Paul C, Large Professor's teacher, who also engineered for Ultramagnetic
  MCs.
- Stones Throw is the label behind Donuts, Champion Sound and
  Madvillainy, and is not on the map yet. It needs a causal label edge
  under A69, not just a roster.
- Sample hubs still waiting after Q21 batch 2 (A137): Isaac Hayes,
  Joni Mitchell (needs Janet Jackson or a producer target), Michael
  Jackson (needs careful adult-register handling), Bob James, Syl
  Johnson, the Isley Brothers, and Stan Getz and Luiz Bonfá (whose
  'Saudade Vem Correndo' is in 'Runnin'').
  **Partly closed** by the sample-hub/Native Tongues batch (A191):
  Isaac Hayes, Bob James, Syl Johnson and the Isley Brothers are now on
  the map, each with a documented single-song sample credit into an
  artist already there. Joni Mitchell, Michael Jackson, and Stan Getz
  and Luiz Bonfá are still waiting.
  **Closed.** Stan Getz and Luiz Bonfá landed with the Stones Throw
  batch (`e-getzbonfa-dilla`). Michael Jackson is on the map with
  `e-mjackson-nas` and the careful adult (and Teen) register handling
  A137 called for (A201). Joni Mitchell got her producer target: not
  Nas, but Janet Jackson, whose 'Got 'til It's Gone' (1997) sampled and
  featured new vocals from Mitchell herself (`e-jonimitchell-janetjackson`).
- The Amen break's larger story is in jungle and drum and bass, which
  aren't on the map. Adding one or two jungle producers would give
  `the-winstons` its cross-lineage edge into electronic music, which is
  the break's real significance.
  **Closed** by `shy-fx` and `e-winstons-shyfx`: 'Original Nuttah' (1994)
  is a documented, sourced use of the same break, and the first jungle
  or drum and bass record to chart in Britain.
  **Further closed:** `uk-jungle` (1991-1997) now authors the scene
  itself, joining Shy FX with Goldie, whose Metalheadz residency and
  `e-goldie-bowie` (a rare edge running from a younger dance producer
  into an older rock legend, documented in Goldie's own account of
  inspiring David Bowie's 'Earthling') gives the scene real depth rather
  than a single hub edge.
- Dr. Dre and G-funk: N.W.A is now on the map, so the BACKLOG note about
  the West Coast waiting on Parliament-Funkadelic now blocks only Dre's
  post-1991 work.
  **Partly closed:** Parliament-Funkadelic is now on the map (funk/dub
  batch 1, A180), with a sample edge to Public Enemy's 'Bring the Noise'
  rather than to N.W.A, since the specific sample sourced was Public
  Enemy's. Dre's post-1991 solo work, and the 'Atomic Dog' credit itself
  (a George Clinton solo release, not band-credited, so it needs its own
  artist node rather than attaching to Parliament-Funkadelic), are still
  waiting.
  **Closed:** `george-clinton` and `dr-dre` are both now on the map,
  with `e-clinton-dre` carrying 'Atomic Dog' into 'Fuck Wit Dre Day'.
  `nwa.json`'s `keyProducers` now points at `dr-dre` instead of the
  plain name it carried before the node existed.
- The Casio MT-40's "rock" preset, programmed by Casio employee Okuda
  Hiroko, is the entire backing track of Wayne Smith's 'Under Mi Sleng
  Teng' (1985, produced by Prince Jammy), the record that began reggae's
  digital era and is one of the most re-recorded riddims in the genre's
  history. It's exactly the kind of machine-as-protagonist story
  CLAUDE.md's audio section is built around, on the model of the TR-808
  and the Roland TB-303 already on the map, but adding it was out of
  scope for a session focused on funk/dub artists and labels (A180). The
  MT-40 has no machine record yet; `e-tubby-princejammy`'s adult text
  flags the gap rather than inventing an edge to a machine that isn't
  there.
  **Resolved** by the sample-hub/Native Tongues batch (A191, A196):
  `casio-mt40` is now a machine record, with `e-mt40-princejammy` closing
  the edge and `e-tubby-princejammy`'s adult text updated to point at it.

- The transport's year readout ends at 2028. `layout.timeScale.yearEnd` is
  the latest year in the data plus `CONFIG.layout.marginYears` (2), and
  anyone still active runs to the present, so the cursor's resting year is
  two years in the future. The margin is right for drawing room. The
  cursor's maximum probably wants to clamp to the current year instead.
  Seen while taking the social preview screenshot.
  **Closed:** the transport now runs over `layout.minYear` to
  `layout.maxYear`, so the readout opens at the current year (PR #74).

- At 1280x800 in the lineage arrangement, the "ROCK" lane title draws
  under the reading-level toggle, so "ADULT" and "ROCK" overlap. Lane
  titles give way to node names (A106) but not to the fixed controls.
  **Closed** (A257): a lane title that would sit under a fixed control (the
  top-left toggles or the legend) steps right to clear it, and every lane
  title has a dark halo so it still reads if it lands on a marker.

- An inverted track pair (the earlier record dated after the later one)
  is flagged by `tools/report.js` but not by `tools/validate.js`, so it
  only surfaces at gate review. e-dilla-roots sat in the report flagged
  that way until the source verification pass fixed it (A169).
  e-baker-bambaataa was worse: a wrong year (1982 for a 1984 record) made
  the pair look fine to both tools (A158). A validator warning would
  catch the first kind at authoring time. Nothing but source checking
  catches the second.
  **Closed** (A254): the validator warns on the first kind now.
- **Built** as `tools/crosscheck.js` (A173). The source verification pass (A155 onward) was run from throwaway
  scripts: a Wikidata diff of every node, a MusicBrainz year check of
  every track, and Discogs credit checks. They could live in `tools/`
  as a dev-only `npm run crosscheck`, which reads the data, queries the
  sources politely, and writes a report of disagreements to review. That
  would make re-checking cheap after each batch. It needs network access,
  which the app must never have but a dev tool can. Worth deciding
  whether that line is acceptable before building it.
- Storing a Wikidata QID on each node would make every future cross-check
  exact rather than a title match (the first pass had to hand-map 150
  titles). It's a schema change and an extra field on every record, so
  it wants Matt's view. It fits the one-file-per-record rule, since the
  ID lives in the record itself.

- Two nodes are still orphans after the orphans batch (A177) and the orphan-
  closing batch (A184). **Transmat**, **KMS**, and **Rockers International**
  are closed: Carl Craig, Chez Damier, and Hugh Mundell respectively. **Kling
  Klang** (the label) may never have an A69 edge, since it only ever released
  Kraftwerk. The Düsseldorf scene record now carries the studio's effect
  (e-dusseldorf-kraftwerk). **Brunswick** was only Decca's imprint for Shel
  Talmy's lease deal, and its honest edge probably runs through Talmy if he
  becomes a node. It may be better merged into a note on the Who than kept
  as a label node.
  **Closed.** Shel Talmy is now a node (`shel-talmy.json`), which both
  `the-kinks.json` and `the-who.json` already named as a plain-text
  `keyProducers` entry. `e-brunswick-talmy` (a `label` edge, the unusual
  direction where the causal claim runs through the producer's contract
  rather than an editorial decision by the label) closes Brunswick's
  orphan status, kept as its own node rather than merged into a Who note
  as this entry had floated, since it now has a real edge to justify it.


- Left open by the four-label batch (A228 to A231). **Atlantic** still
  has no node. Its Led Zeppelin edge fails A69, and its real causal
  stories (Jerry Wexler taking Aretha Franklin to Muscle Shoals, the
  Stax masters clause) need either an artist not yet on the map or an
  edge `e-stax-isaachayes` already covers. **Elektra** is the obvious
  source for the Stooges' and MC5's edges once either band arrives.
  **Sly and Robbie's** Island deal has no sourced start or end year, so
  their `labels` field stays empty. **Loud Records** has no sourced home
  city (`city` is null). **ABKCO** and the 'Bitter Sweet Symphony'
  settlement are a strong story for The Verve, but as a publishing claim
  rather than a label decision. It probably wants a `sample` edge from
  the Andrew Oldham Orchestra if that record ever becomes a node.

- `tools/validate.js` checks that every id in a scene's `memberIds` array
  resolves to a real artist, but never checks the reverse: that a matching
  scene-to-artist edge actually exists. Autechre sat in `sheffield-idm`'s
  `memberIds` for several batches with no `e-sheffieldidm-*` edge, while
  Aphex Twin, listed right next to it, had one (fixed this batch, A248).
  A `memberIds` entry with no corresponding edge is exactly the kind of
  silent, structural gap the validator exists to catch, and right now it
  can only be found by hand.
  **Decided against** (A254): the check was built and found 53 members
  with no scene edge, most of the dataset. That makes it the convention,
  not a gap. A scene edge is a specific causal claim, and membership stays
  out of the graph like other roster relationships (A69). Autechre's edge
  was worth adding because the claim was already written in its blurb, not
  because it was a member.
