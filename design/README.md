# design/ — visual direction exploration

Three prototypes of the current dataset (32 artists, 2 machines, 36 edges,
8 scenes), each answering "make it feel alive" a different way. Nothing here
is app code. Pick one, and it gets ported into `render/`.

Open any file by double-clicking it. No server, no build step.

    npm run design:snapshot     # only needed after data/ changes
    open design/01-deep-field.html

## How this relates to the renderer already on main

`render/` on main is a working M2: chronological layout, lineage lanes,
semantic zoom, viewport culling, click-to-fly-to. That architecture is sound
and this pass throws none of it away. What these prototypes question is the
visual language sitting on top of it, and two layout calls underneath.

None of the three import `render/`, on purpose: sharing code would have meant
three variations on one look rather than three arguments. Whichever wins gets
ported into `render/` and `config.js`, keeping the culling and zoom-level
machinery already there.

Two places where a prototype disagrees with what main does, and which need
your call rather than mine:

- **Scenes and labels as graph nodes.** `render/` draws Pye Records,
  Swinging London and Chicago House as nodes in the lanes alongside artists.
  All three prototypes treat scenes as atmosphere (coloured volume behind
  their members, from the `palette` field) and omit labels entirely. That
  roughly halves what competes for attention, at the cost of making a label
  reachable only through an artist. If the labels overlay in `SPEC.md` is the
  real home for label data, dropping them from the graph is the right trade.
  If not, it is not.
- **Where machines go.** `ASSUMPTIONS.md` **A30** already settled this for
  `render/`: their own band above the lineage lanes. 01 keeps a dedicated
  band but puts it below, 02 reopens the question by mixing machines among
  the artists, 03 argues for a separate plane entirely. A30 calls itself
  "cheap to reverse if it reads wrong once there's more machine data", and
  there are still only two machines, so all four answers rest on thin
  evidence.

## What is being decided

1. **Which visual language.** Deep field, living system, or the synthesis.
2. **Where machines live.** `BACKLOG.md` has this open under "Open design
   questions". Each prototype answers it differently, so this pass settles
   it by looking rather than arguing.
3. **What the primary interaction is.** Hovering, clicking, or scrubbing time.

## The three

### 01 — Deep Field

Light is the material. A dark volume with parallax dust, scene colour
hanging as nebulae behind their members, and every edge carrying a comet
that travels from cause to effect. Cross-lineage edges get a second comet
in the source colour, so a crossing reads as chromatic split and is
unmistakable at a glance.

Machines get their own lane at the bottom and are drawn as dials, not stars.

Hovering is the primary interaction: the field dims to just the node, its
edges and its neighbours.

### 02 — Living System

The map as an organism rather than a diagram. Nodes are seeded irregular
cells that breathe, each at its own rate so they never sync up. Every edge
is a bundle of four to six filaments that share a course and disagree about
the detail, the way roots do. The whole map assembles itself in
chronological order on load.

Machines are angular and sit among the artists rather than below them: in a
field of cells, a made object should look made.

Clicking is the primary interaction: influence spreads outward from what you
clicked, one connection per beat, and keeps going after the obvious answer.

### 03 — Strata *(the one I would build)*

The synthesis, plus the one idea neither of the others has.

Two physical planes. Artists occupy lineage lanes up top. Machines sit on a
floor that recedes below all of it, drawn in real perspective, and a
machine's influence rises out of that floor as a shaft of light crossing the
horizon. The project's machine-as-protagonist argument stops being a claim in
a blurb and becomes the shape of the page.

Depth comes from perspective alone, never from moving one layer at a
different rate to another, so the beams that cross the horizon stay
registered no matter how you pan.

The timeline is the instrument, not a scrollbar. Drag the year and material
arrives: everything after the cursor is present but clearly not here yet.
The transport is pipped at every year something happens, so it reads as a
score rather than an empty slider, and the readout names what just arrived.
Space bar plays it.

## What all three share

- Left-to-right time axis, lineage lanes, no force-directed layout.
- Every tuning value in one `CONFIG` object at the top of the script.
- Pan, wheel-zoom, keyboard, detail panels for nodes and edges.
- Teen/Adult register toggle inside the panel, reading whatever the data has.
- Confidence tier rendered honestly: `asserted` edges are dashed and faint,
  and the panel says which tier a claim sits in and why.
- Thread playback from `data/threads/`, since "where do I start" is the real
  problem on a map that is eventually a thousand nodes wide.
- Crossings-only filter, because the cross-lineage edges are the point.

## Honest limits

- **Thirty-four nodes is not a load test.** These prove a visual language,
  not that it survives 500 visible nodes. Everything here is drawn once with
  no viewport culling, which `render/viewport.js` on main already does
  properly and which any port must keep.
- **Filters are the risk.** The nebula blur in 01 and 03 is one filter over a
  handful of shapes and is fine; a per-node glow filter would not be. If the
  winning direction needs more blur than this, profile it before committing.
- **`design/data-snapshot.js` is a frozen snapshot**, regenerated by
  `npm run design:snapshot`. It exists because `file://` blocks both `fetch`
  and ES module imports, and a classic `<script src>` does not. Nothing in a
  real `src/` should ever import it; that problem gets its proper answer from
  `tools/serve.js` and `tools/bundle.js`.
- **Lineage colour is a proposal, not data.** The `palette` on each scene
  record drives the scene clouds. The four lineage colours are separate and
  invented here, chosen for separation on a dark ground.
