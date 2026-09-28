# M2 architecture: the static graph renderer

Built, not just planned, unlike the M1 doc. This records what's actually in
`render/` and why, so the shape doesn't have to be reverse-engineered later.
Decisions are logged in `ASSUMPTIONS.md`; the one real fork is logged there
too rather than asked, since `BACKLOG.md` already flagged it as needing a
call and a reasonable default costs nothing to reverse (it's layout code).

## 1. File layout

```
config.js              CONFIG object, root level per CLAUDE.md
index.html, main.js    page shell + entry point
render/
  loader.js            skeleton index at startup (data/index.json in dev, window.LINEAGE_INDEX
                       in release), full records on demand via loadRecord (A235)
  layout.js             time scale + lineage-lane/machine-band row packing
  viewport.js            pan/zoom transform state, visible-range math
  zoomLevels.js           scale -> collapsed/mid/detail
  svg.js                  tiny createElementNS/setAttribute helpers
  nodes.js, edges.js       create/update/hover for one node or edge
  interactions.js          wheel/drag/keyboard input
  graph.js                orchestrator: owns the SVG root, the create/update/
                           cull loop, and ties everything above together
```

No build step, no framework: everything is a plain ES module loaded by
`index.html`, served in dev by the M1 `tools/serve.js`.

> **Superseded in part (Strata port).** Section 2's machine band no longer
> matches the code: machines now sit on a receding floor *below* the lanes
> rather than a band above them, and a machine's influence is drawn rising
> out of it. See `ASSUMPTIONS.md` **A43**, `render/substrate.js`, and
> `design/README.md` for why. The rest of this document, the row packing,
> the counter-scaling rule, culling and semantic zoom, still holds, with
> one change: rows pack a node's *label footprint*, not its career span
> (**A45**).

## 2. Layout: lineage lanes plus a machine band

`BUILD_PLAN.md`/A5 fix the shape (left-to-right time axis, lineage lanes).
What they don't fix is where machines go, and `BACKLOG.md`'s "Open design
questions" flagged exactly this as undecided. Resolved here: **machines get
their own band, drawn above the six lineage lanes, not folded into whichever
lane matches their `lineage` field.** A2 already treats machines as
first-class, "the protagonist," rather than artist metadata; a dedicated band
reads that way visually too. `machine.lineage` still does real work (it's
what `edge.crossLineage` computation resolves through), it just isn't what
positions a machine vertically. Logged as **A30**.

Within a band or lane, nodes are packed into rows by a greedy interval-
scheduling pass (`packIntoRows` in `layout.js`): sort by start year, place
each node in the first row whose last-placed end year doesn't overlap it,
open a new row only when none exists. Row count, and therefore band/lane
height, is computed from whatever's actually loaded, never a fixed number.

## 3. Nodes and edges

A node draws as a horizontal line spanning its active years (`activeFrom` to
`activeTo`, or the per-kind equivalent, `loader.js` normalizes all four kinds
to the same `startYear`/`endYear` shape) plus a circle marking the start.
Label and hook text anchor to that start point.

An edge connects two anchor points, one per endpoint, each computed as
`edge.year` clamped into that endpoint's own active-year span and converted
through the shared time scale. Both ends usually land at the same x (a
straight vertical-ish connector at the moment the influence landed); they
diverge only when `edge.year` falls outside one endpoint's known span,
which is itself informative (a posthumous or rediscovery-type connection).

## 4. Counter-scaling

Node/edge position (x1/x2/y) is left in content coordinates and scales with
the viewport transform on purpose: a career's active span should visibly
widen as you zoom into it, same as a Gantt bar. Everything else -- marker
radius, stroke width, font size, hit-area padding, dash length -- is a UI
adornment that should read as a constant size on screen at any zoom level,
so those values are divided by the current scale before being set. Getting
this wrong was the first real bug found in browser testing: at high zoom,
unscaled marker radii and hit areas were blowing up to hundreds of screen
pixels; at low zoom they shrank to nothing. See **A31**.

## 5. Viewport culling

`viewport.js` computes the content-space rectangle currently on screen (plus
a margin so nodes don't visibly pop in/out right at the edge). `graph.js`
only creates/keeps a DOM element for a node or edge whose position
intersects that rectangle; everything else is removed from the DOM, not just
hidden. Nodes and edges are also pre-sorted by their start x once at graph
creation, so the per-frame scan can stop as soon as it passes the visible
range's right edge instead of always walking the full dataset -- with the
one subtlety that a previously-visible element scrolling past that point
still needs its stale DOM element removed, not just skipped (worth calling
out because it was a real bug in the first version of this optimization:
an unconditional early `break` silently leaked elements on one pan
direction).

Edge anchors are computed once at graph creation and cached, not recomputed
every frame -- they're static (nodes don't move, `edge.year` doesn't
change), so recalculating them per frame was pure waste.

## 6. Semantic zoom levels

Three levels, picked from viewport scale via `CONFIG.zoom.levels`:
`collapsed` (dot only), `mid` (+ name label), `detail` (+ one-line hook).
No collapse/expand animation beyond a CSS transition duration constant in
`CONFIG`; the level switch itself is instant since the underlying elements
are mutated in place, not recreated, when the level changes.

## 7. Perf validation

`BUILD_PLAN.md`'s M2 gate: validated at 2x the M1 dataset target, simulated
by duplication. Done by generating a synthetic `window.LINEAGE_DATA` bundle
(each record duplicated 22x with suffixed ids, edges rewritten to stay
self-consistent within each copy) and driving the real page with Playwright/
Chromium rather than eyeballing it:

- **1122 nodes, 704 edges** loaded (exceeds the gate's implied ~390 node /
  700 edge scale on every count but artists).
- **DOM element count stayed at 44 nodes / 43 edges** regardless of total
  dataset size, confirming culling actually bounds the DOM rather than just
  hiding elements.
- **`render()`'s own execution time: 1.9ms average, 2.9ms max** across 90
  sampled pan frames, against a 16.7ms/60fps budget -- comfortable margin.
  (An earlier measurement attempt timed wall-clock between a pointer event
  and the next `requestAnimationFrame` callback and found ~16.5ms average;
  that number turned out to mostly reflect the browser's own vsync pacing,
  not actual JS cost, which is why `graph.js` now exposes `lastRenderMs()`
  and that's what the gate is actually measured against.)

Passes with real margin. Not yet measured: real GPU-accelerated paint/
composite cost in a non-headless browser, which this harness can't reach;
worth a spot check once the dataset is closer to its real 120/350 M1 size
and there's an actual reason to worry about it.

## 8. The galaxy restyle

After seeing the first static version, Matt asked for something closer to
a 3D galaxy: glowing colored planets sized by popularity, linked by trails,
click one to fly to another. That's a real conflict with `SPEC.md`'s
"Explicitly not force-directed" and `CLAUDE.md`'s anti-goal against
force-directed layout, both there because chronological position is core
to how this project teaches. Raised before building anything; Matt chose
restyling the existing time-axis/lineage-lane layout rather than replacing
it, so position still means what it always meant. What actually changed:

- **Node size by connectedness, not sales.** No sales/certification data
  exists in the schema, and it's the kind of number `CLAUDE.md`'s accuracy
  rules would need real sourcing for. Radius scales with `sqrt(degree /
  maxDegree)` against `CONFIG.node.degreeRadiusFactor`'s range, layered on
  top of the existing per-zoom-level base radius. See **A32**.
- **Glow.** Each node/edge gets a second, larger, blurred, lower-opacity
  copy of itself behind the crisp shape (an SVG `feGaussianBlur` filter).
  Two *shared* filter instances, not one per element (filters are
  expensive; a shared instance whose blur radius is updated once per frame,
  same counter-scaling pattern as radius/stroke-width elsewhere, costs two
  attribute writes regardless of node/edge count). Re-measured the perf
  gate after this: `render()` averages 3.2ms, up from 1.9ms, still nowhere
  near the 16.7ms budget.
- **Curved trails.** Edges are now a quadratic Bezier (`M ... Q ... `)
  instead of a straight line, bowed a small amount off the direct path.
  The bow direction is a deterministic hash of the edge's own id, not
  random, so the same edge always curves the same way across renders
  without needing to store anything extra.
- **Orbital tracks, not Gantt bars.** The node's active-year span line
  dropped from a bold, readable bar to a faint dotted track (opacity 0.22
  for artists, kept more visible at 0.5 for machines) -- the glowing
  planet marker is now the dominant shape, the span line is a quiet
  reference rather than the main event.
- **Starfield background.** Pure CSS (`index.html`), a couple of repeating
  radial-gradient dot layers. No new render logic, nothing to tune in
  `CONFIG`, so it isn't one.
- **Click-to-fly-to.** `render/viewport.js`'s `flyTo` animates tx/ty/scale
  to center and zoom in on whatever was clicked (ease-in-out cubic,
  `CONFIG.zoom.flyToDurationMs`/`flyToScale`), instead of the previous
  instant jump. A user-initiated pan or zoom always interrupts an in-flight
  fly-to rather than fighting it. See **A33**.
