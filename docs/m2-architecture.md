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
  loader.js            data/manifest.json fetch (dev) or window.LINEAGE_DATA (release)
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
