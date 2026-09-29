// Orchestrator: owns the SVG root, the viewport transform, and the
// create/update/cull loop for node and edge elements. This is the only
// module that ties layout + viewport + zoom levels + node/edge drawing
// together; everything else here is a pure function or a small DOM helper.

import { CONFIG } from '../config.js';
import { computeLayout } from './layout.js';
import { buildLanePlan } from './arrange.js';
import { createViewportState, transformString, visibleContentRange, screenToContent, flyTo, pullBackIntoView } from './viewport.js';
import { zoomLevelForScale } from './zoomLevels.js';
import { attachPanZoomHandlers } from './interactions.js';
import { svgEl, setAttrs } from './svg.js';
import { createNodeElement, updateNodeElement, setNodeHovered } from './nodes.js';
import { createEdgeElement, updateEdgeElement, setEdgeHovered, isBeam, curvePath, approxCurveLength } from './edges.js';
import { createSparks } from './sparks.js';
import { createSubstrateDefs, drawSubstrate, updateSubstrateScale } from './substrate.js';
import { createEdgeGradients, createHaloGradients, trailGradientId, beamGradientId, colorFor } from './gradients.js';
import { createDustLayer, createNebulaDefs, drawNebulae } from './atmosphere.js';
import { createDepthDefs, depthExtent } from './depth.js';
import { createCursorLayer, createCursorDefs, updateCursor, createTransport } from './transport.js';

function clampYear(year, min, max) {
  return Math.min(max, Math.max(min, year));
}

// All shared defs in one place: gradients for edge trails, machine beams
// and node halos, the nebula blur, and the cursor wash. Every one of these
// is shared by id rather than instantiated per element -- viewport culling
// creates and destroys elements constantly while panning, and per-element
// defs would mean churning the <defs> subtree on every frame.
function createDefs(layout) {
  const defs = svgEl('defs');
  defs.append(
    ...createDepthDefs(layout),
    ...createEdgeGradients(),
    ...createHaloGradients(),
    ...createSubstrateDefs(),
    ...createNebulaDefs(),
    ...createCursorDefs(),
  );
  return defs;
}

// Graph connectedness (edge count touching a node) -> a radius multiplier
// in CONFIG.node.degreeRadiusFactor's range. Square root, not linear, so
// visual area rather than radius scales roughly with degree (standard
// bubble-chart practice) -- see ASSUMPTIONS.md for why degree and not
// record sales.
function computeDegreeFactors(nodes, edges) {
  const degreeById = new Map();
  const bump = (id) => degreeById.set(id, (degreeById.get(id) ?? 0) + 1);
  for (const edge of edges) {
    bump(edge.from.id);
    bump(edge.to.id);
  }
  const maxDegree = Math.max(1, ...degreeById.values());
  const { min, max } = CONFIG.node.degreeRadiusFactor;
  const factorById = new Map();
  for (const node of nodes) {
    const degree = degreeById.get(node.id) ?? 0;
    factorById.set(node.id, min + (max - min) * Math.sqrt(degree / maxDegree));
  }
  return factorById;
}

// Axis ticks and lane/band labels are drawn once. Their x/y stay in raw
// content coordinates (the viewport transform positions them correctly),
// but font-size and stroke-width are counter-scaled every frame via
// updateStaticLayerScale so text stays legible at any zoom level instead of
// shrinking to nothing zoomed out or ballooning zoomed in.

function drawAxis(axisG, layout) {
  const extent = depthExtent(layout);
  const span = layout.maxYear - layout.minYear;
  const step = span <= 40 ? 5 : span <= 100 ? 10 : 20;
  const startYear = Math.ceil(layout.timeScale.year0 / step) * step;
  for (let year = startYear; year <= layout.timeScale.yearEnd; year += step) {
    const x = layout.timeScale.toX(year);
    axisG.appendChild(
      svgEl('line', {
        class: 'axis-tick',
        x1: x,
        x2: x,
        y1: extent.y0 - extent.fade,
        y2: extent.y1 + extent.fade,
        stroke: CONFIG.colors.axisLine,
      }),
    );
    const label = svgEl('text', { class: 'axis-label', x: x, fill: CONFIG.colors.axisText });
    label.textContent = String(year);
    axisG.appendChild(label);
  }
}

// Lane bands and titles. A lane that stands for a scene or a label
// (Arrange by, Q19) titles itself with that record's name, next to its
// earliest member, and the title is a button that opens the record: this is
// how scenes, which are otherwise only atmosphere, become clickable.
// Band rectangles go in `bandsG`, under everything. Titles go in `titlesG`,
// which sits above the edges and nodes: a lane title is a button, and under
// the edges an edge's wide invisible hit area would swallow its clicks.
//
// Returns where each title sits, so label placement can keep node names
// clear of titles without measuring text in the DOM every frame.
function drawBands(bandsG, titlesG, layout, onSelectGroup) {
  const originX = layout.timeScale.toX(layout.timeScale.year0);
  const titleSpecs = [];
  const spec = (x, y, text, { isGroup = false, atContent = false } = {}) => ({
    // Screen px the title is pushed right this frame to clear a fixed
    // control drawn over it (updateTitleShifts).
    shiftPx: 0,
    x,
    y,
    chars: text.length,
    anchorEnd: atContent,
    fontPx: isGroup ? CONFIG.arrange.groupTitleFontSize : 11,
    dxPx: atContent ? -CONFIG.arrange.groupTitleLeadPx : 4,
    dyPx: isGroup ? 18 : 14,
    trackingEm: isGroup ? CONFIG.arrange.titleTrackingEm.group : CONFIG.arrange.titleTrackingEm.lane,
  });

  // Bands run past both ends of the axis, and the outermost lanes past the
  // top and bottom, into the fade (render/depth.js). The floor, when drawn,
  // is the bottom edge instead.
  const { fade, x0, x1 } = depthExtent(layout);
  const lastIndex = layout.lanes.length - 1;
  layout.lanes.forEach((lane, index) => {
    const top = index === 0 ? lane.y - fade : lane.y;
    const bottom = lane.y + lane.height + (index === lastIndex && !layout.substrate ? fade : 0);
    bandsG.appendChild(
      svgEl('rect', {
        x: x0 - fade,
        y: top,
        width: x1 - x0 + fade * 2,
        height: bottom - top,
        fill: lane.color,
        opacity: 0.024,
      }),
    );
    const isGroup = lane.groupId !== null;
    // Scene and label views title every lane next to its earliest member.
    // At the axis origin a title could sit on top of a marker from the
    // same years, and it was the part the legend covered.
    const atContent = lane.titleAtContent;
    const label = svgEl('text', {
      class: ['band-label', isGroup && 'band-link', atContent && 'band-at-content'].filter(Boolean).join(' '),
      x: atContent ? lane.firstX : originX,
      y: lane.y,
      fill: lane.color,
      'font-weight': 600,
      'text-anchor': atContent ? 'end' : 'start',
    });
    label.textContent = isGroup ? `${lane.title} ›` : lane.title;
    label.__spec = spec(atContent ? lane.firstX : originX, lane.y, label.textContent, { isGroup, atContent });
    titleSpecs.push(label.__spec);
    if (isGroup) {
      label.setAttribute('tabindex', '0');
      label.setAttribute('role', 'button');
      label.setAttribute('aria-label', `Open ${lane.title}`);
      label.addEventListener('click', () => onSelectGroup(lane.groupId));
      label.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        e.stopPropagation();
        onSelectGroup(lane.groupId);
      });
    }
    titlesG.appendChild(label);
  });

  if (!layout.substrate) return titleSpecs;

  const floorLabel = svgEl('text', {
    class: 'band-label',
    x: originX,
    y: layout.substrate.horizonY + CONFIG.substrate.labelOffset,
    fill: CONFIG.colors.machineBandLabel,
    'font-weight': 600,
  });
  floorLabel.textContent = 'THE MACHINES';
  titlesG.appendChild(floorLabel);
  floorLabel.__spec = spec(originX, layout.substrate.horizonY + CONFIG.substrate.labelOffset, floorLabel.textContent);
  titleSpecs.push(floorLabel.__spec);
  return titleSpecs;
}

// A lane title at the axis origin can land under a fixed control (the
// layer and reading toggles, the legend), where it prints through them as
// a collision. Each frame, a title that would sit under one steps right to
// just past it. Titles placed beside their content (scene and label views)
// already sit clear of the origin and are left alone. `overlays` are screen
// rects, cached by the caller, so this reads no layout.
function updateTitleShifts(titleSpecs, vp, overlays) {
  const { labelCharWidthEm } = CONFIG.node;
  const gap = CONFIG.arrange.titleOverlayGapPx;
  for (const t of titleSpecs) {
    t.shiftPx = 0;
    if (t.anchorEnd) continue;
    const width = t.chars * t.fontPx * (labelCharWidthEm + t.trackingEm);
    const baseline = t.y * vp.scale + vp.ty + t.dyPx;
    const top = baseline - t.fontPx;
    // Two passes, so stepping past one control can still clear the next.
    for (let pass = 0; pass < 2; pass++) {
      const x = t.x * vp.scale + vp.tx + t.dxPx + t.shiftPx;
      for (const o of overlays) {
        if (top < o.bottom && baseline > o.top && x < o.right && x + width > o.left) {
          t.shiftPx += o.right + gap - x;
        }
      }
    }
  }
}

// Re-applies counter-scaled font-size/stroke-width/offsets to the
// once-drawn axis ticks, axis labels, and band labels.
function updateStaticLayerScale(axisG, titlesG, scale) {
  for (const tick of axisG.querySelectorAll('.axis-tick')) {
    tick.setAttribute('stroke-width', 1 / scale);
  }
  for (const label of axisG.querySelectorAll('.axis-label')) {
    label.setAttribute('font-size', 11 / scale);
    label.setAttribute('y', 14 / scale);
    label.setAttribute('dx', 4 / scale);
  }
  for (const label of titlesG.querySelectorAll('.band-label')) {
    const isGroup = label.classList.contains('band-link');
    const atContent = label.classList.contains('band-at-content');
    label.setAttribute('font-size', (isGroup ? CONFIG.arrange.groupTitleFontSize : 11) / scale);
    label.setAttribute('dx', ((atContent ? -CONFIG.arrange.groupTitleLeadPx : 4) + (label.__spec?.shiftPx ?? 0)) / scale);
    label.setAttribute('dy', (isGroup ? 18 : 14) / scale);
    label.setAttribute('stroke-width', CONFIG.arrange.titleHaloPx / scale);
  }
}

function edgeAnchors(edge, layout) {
  const fromPos = layout.positions.get(edge.from.id);
  const toPos = layout.positions.get(edge.to.id);
  if (!fromPos || !toPos) return null;
  // Dot to dot: both ends sit on the records' own markers. Pinning both
  // ends to the year of influence drew almost every edge as a vertical
  // connector between lanes, and together they read as a wall. Putting
  // only the target end at that year made lines seem to end at whichever
  // neighbour sat there. The year stays on the edge's panel (A253).
  const fromYear = edge.from.startYear;
  const toYear = edge.to.startYear;
  return {
    x1: layout.timeScale.toX(fromYear),
    y1: fromPos.y,
    x2: layout.timeScale.toX(toYear),
    y2: toPos.y,
  };
}

export function createGraph(container, data, callbacks = {}) {
  const {
    onSelectNode = () => {},
    onSelectEdge = () => {},
    // A scene or label lane title was chosen (Arrange by, Q19).
    onSelectGroup = () => {},
    arrange = CONFIG.arrange.default,
    transportEl = null,
    layers = CONFIG.layers.defaults,
    initialViewport = null,
    initialYear = null,
    initialSelectedId = null,
    // Screen px covered on the right by the reading drawer. A function
    // because the drawer opens and closes; the camera centres selections
    // in whatever width is left uncovered.
    rightInset = () => 0,
    // Screen px on the left that the opening view keeps clear, for the
    // legend. Only the fit uses it: once the reader pans, the legend is an
    // overlay like any other.
    leftInset = () => 0,
    // Screen rects of fixed controls drawn over the map, which lane titles
    // step clear of. Cached by the caller: this runs every frame.
    overlays = () => [],
    // Records the very first view frames, instead of fitting the whole
    // map. Only the caller knows what makes a good way in, so it names
    // them; an empty list, or none of them on the map, falls back to the
    // fit.
    openingFrameIds = [],
    // Edge ids drawn gold for the reader to find (A263). Chosen by the
    // caller from the data.
    goldenIds = new Set(),
  } = callbacks;

  // The node or edge the reader is reading about, highlighted on the map.
  // Carried across rebuilds by the caller, since a layer toggle recreates
  // the whole graph.
  let selectedId = initialSelectedId;
  // The node under the pointer, whose edges light up like a selection's.
  let hoveredNodeId = null;
  // Nodes ringed as "what the selected node touched", for Follow the
  // producer. Cleared whenever the selection moves.
  let touchedIds = new Set();

  // Which record types draw, from the reader's layer toggles. Scenes render
  // as atmosphere and so never take a lane row even when on; labels and
  // machines are markers and do. See ASSUMPTIONS.md A48.
  const kinds = ['artist'];
  if (layers.labels) kinds.push('label');
  if (layers.machines) kinds.push('machine');

  const graphNodes = data.nodes.filter((n) => kinds.includes(n.kind));
  const sceneRecords = layers.scenes
    ? data.nodes.filter((n) => n.kind === 'scene').map((n) => n.raw)
    : [];
  const graphNodeIds = new Set(graphNodes.map((n) => n.id));
  const graphEdges = data.edges.filter((e) => graphNodeIds.has(e.from.id) && graphNodeIds.has(e.to.id));

  // Lanes come from every loaded record, not just the drawn ones, so a
  // scene or label lane exists even while that layer is off.
  const plan = buildLanePlan(arrange, data.nodes);
  const layout = computeLayout(graphNodes, { withSubstrate: layers.machines, plan });
  const vp = createViewportState();
  if (initialViewport) Object.assign(vp, { tx: initialViewport.tx, ty: initialViewport.ty, scale: initialViewport.scale });

  const dust = createDustLayer(container);

  const root = svgEl('svg', { class: 'graph-svg', width: '100%', height: '100%' });
  const defs = createDefs(layout);
  const viewportG = svgEl('g', { class: 'viewport' });
  const nebulaG = svgEl('g', { class: 'nebula-layer' });
  const bandsG = svgEl('g', { class: 'bands-layer' });
  const titlesG = svgEl('g', { class: 'titles-layer' });
  const floorG = svgEl('g', { class: 'floor-layer' });
  const axisG = svgEl('g', { class: 'axis-layer' });
  const edgesG = svgEl('g', { class: 'edges-layer' });
  const nodesG = svgEl('g', { class: 'nodes-layer' });
  // Every node's name and hook, above all the markers so no dot paints over
  // a name, and below the lane titles.
  const labelsG = svgEl('g', { class: 'labels-layer' });
  // Transient light over the markers and under the names (render/sparks.js).
  const fxG = svgEl('g', { class: 'fx-layer' });
  const cursorG = createCursorLayer(layout);
  // The layers that run past the content, under one fade (render/depth.js).
  const fieldG = svgEl('g', { class: 'field-layer', mask: 'url(#depth-fade)' });
  fieldG.append(nebulaG, bandsG, floorG, axisG);
  viewportG.append(fieldG, edgesG, nodesG, fxG, labelsG, titlesG, cursorG);
  root.append(defs, viewportG);
  container.appendChild(root);

  const titleSpecs = drawBands(bandsG, titlesG, layout, onSelectGroup);
  if (layout.substrate) drawSubstrate(floorG, layout);
  drawAxis(axisG, layout);
  drawNebulae(nebulaG, sceneRecords, layout);

  const degreeFactorById = computeDegreeFactors(graphNodes, graphEdges);

  const transport = transportEl
    ? createTransport(transportEl, layout, graphNodes, graphEdges, () => scheduleRender(), initialYear)
    : null;
  const currentYear = () => transport?.year() ?? layout.maxYear;
  // The year the last frame drew, for ignition. Null until the first frame,
  // so opening the map (or a rebuild) never sets everything off at once.
  let lastYear = null;

  // Node position and edge anchors are both static once computed (nodes
  // don't move, edge.year doesn't change), so both are precomputed once
  // here instead of being recalculated on every pan/zoom frame. Nodes are
  // also sorted by x1 so the per-frame scan can stop as soon as it passes
  // the visible range instead of always walking the full dataset.
  const positionedNodes = graphNodes
    .map((node) => ({ node, pos: layout.positions.get(node.id) }))
    .filter((entry) => entry.pos)
    .sort((a, b) => a.pos.x1 - b.pos.x1);

  const boundEdges = graphEdges
    .map((edge) => ({ edge, anchors: edgeAnchors(edge, layout) }))
    .filter((entry) => entry.anchors)
    .map((entry) => ({
      ...entry,
      minX: Math.min(entry.anchors.x1, entry.anchors.x2),
      maxX: Math.max(entry.anchors.x1, entry.anchors.x2),
      minY: Math.min(entry.anchors.y1, entry.anchors.y2),
      maxY: Math.max(entry.anchors.y1, entry.anchors.y2),
    }))
    .sort((a, b) => a.minX - b.minX);

  const sparks = createSparks(fxG);

  // Outgoing edges per node, for the ripple. Built here rather than taken
  // from reading/neighbours.js, since the graph never imports from
  // reading/ (A73), and it only needs one direction.
  const outgoing = new Map();
  for (const entry of boundEdges) {
    const from = entry.edge.from.id;
    if (!outgoing.has(from)) outgoing.set(from, []);
    outgoing.get(from).push(entry);
  }

  function pulseEdge({ edge, anchors }, delayMs, durationMs) {
    sparks.pulse(curvePath(anchors, edge.id), approxCurveLength(anchors, edge.id), colorFor(edge.to.lineage), vp.scale, delayMs, durationMs);
  }

  // Light running out from a node through what it changed, hop by hop:
  // its own edges first, then theirs. Only through edges the year cursor
  // has reached, so the ripple never runs ahead of the reader's year.
  // Each record lights once, so a cycle or two routes to the same artist
  // do not double up.
  function ripple(startId) {
    const { maxHops, hopMs, maxEdges } = CONFIG.sparks.ripple;
    const year = currentYear();
    const reached = new Set([startId]);
    let frontier = [startId];
    let lit = 0;
    for (let hop = 0; hop < maxHops && frontier.length && lit < maxEdges; hop++) {
      const next = [];
      for (const id of frontier) {
        for (const entry of outgoing.get(id) ?? []) {
          const target = entry.edge.to;
          if (entry.edge.year > year || reached.has(target.id) || lit >= maxEdges) continue;
          reached.add(target.id);
          next.push(target.id);
          lit++;
          pulseEdge(entry, hop * hopMs, hopMs);
          const pos = positionById.get(target.id);
          if (pos) sparks.flare(pos.x1, pos.y, target.lineage, vp.scale, (hop + 1) * hopMs);
        }
      }
      frontier = next;
    }
  }

  const nodeElements = new Map();
  const edgeElements = new Map();
  const positionById = new Map(positionedNodes.map((e) => [e.node.id, e.pos]));

  // Label placement (M3 step 5). Names and hooks are drawn at a constant
  // screen size while the nodes under them move closer together as the
  // reader zooms out, so in crowded years they overprint. Each frame, labels
  // are placed in priority order (the selected node, then by connectedness,
  // then earliest) and any label that would overlap one already placed is
  // hidden until the reader zooms in far enough for it to fit. Names are all
  // placed before any hook, so a long hook never costs a name its place.
  // O(visible labels squared), which stays well under a millisecond at the
  // few hundred labels a screen can show.
  function placeLabels(level) {
    if (level === 'collapsed') return;
    const { labelFontSize, hookFontSize, labelCharWidthEm, labelPadPx, labelMaxChars, hookMaxChars } = CONFIG.node;
    const entries = [];
    for (const [id, el] of nodeElements) {
      const pos = positionById.get(id);
      const node = el.__node;
      if (!pos || !node) continue;
      const sx = pos.x1 * vp.scale + vp.tx;
      const sy = pos.y * vp.scale + vp.ty;
      const r = (CONFIG.node.radius[level] ?? CONFIG.node.radius.mid) * (degreeFactorById.get(id) ?? 1);
      entries.push({ id, el, node, sx, sy, r, degree: degreeFactorById.get(id) ?? 0 });
    }
    entries.sort((a, b) =>
      (b.id === selectedId) - (a.id === selectedId) ||
      b.degree - a.degree ||
      (a.node.startYear ?? 0) - (b.node.startYear ?? 0));

    // Lane titles are placed first and never give way: a node name that
    // would print over one waits for more room instead.
    const placed = titleSpecs.map((t) => {
      const width = t.chars * t.fontPx * (labelCharWidthEm + t.trackingEm);
      const x = t.x * vp.scale + vp.tx + t.dxPx + t.shiftPx;
      const baseline = t.y * vp.scale + vp.ty + t.dyPx;
      return { x0: t.anchorEnd ? x - width : x, x1: t.anchorEnd ? x : x + width, y0: baseline - t.fontPx, y1: baseline + labelPadPx };
    });
    const fits = (box) => !placed.some((p) => box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0);
    const boxAround = (cx, baselineY, chars, fontSize) => {
      const halfW = (chars * fontSize * labelCharWidthEm) / 2 + labelPadPx;
      return { x0: cx - halfW, x1: cx + halfW, y0: baselineY - fontSize - labelPadPx, y1: baselineY + labelPadPx };
    };

    for (const e of entries) {
      const name = e.el.__labels.querySelector('.node-name');
      const chars = Math.min(labelMaxChars, e.node.name.length);
      const box = boxAround(e.sx, e.sy - e.r - CONFIG.node.labelGapPx, chars, labelFontSize);
      const ok = fits(box);
      if (ok) placed.push(box);
      name.style.visibility = ok ? '' : 'hidden';
    }
    if (level !== 'detail') return;
    for (const e of entries) {
      const hook = e.el.__labels.querySelector('.node-hook');
      if (!e.node.hook) continue;
      const chars = Math.min(hookMaxChars, e.node.hook.length);
      const box = boxAround(e.sx, e.sy + e.r + CONFIG.node.hookGapPx, chars, hookFontSize);
      const ok = fits(box);
      if (ok) placed.push(box);
      hook.style.visibility = ok ? '' : 'hidden';
    }
  }

  function nodeVisible(pos, range) {
    return pos.x2 >= range.x1 && pos.x1 <= range.x2 && pos.y >= range.y1 - 40 && pos.y <= range.y2 + 40;
  }

  // Frames the populated span (first start year to last) rather than the
  // full axis, and leaves the transport bar room at the bottom.
  function fitToContent(widthPx, heightPx) {
    const starts = positionedNodes.map((e) => e.pos.x1);
    if (starts.length === 0) return;
    const { fitPaddingPx, fitBottomInsetPx, fitMaxScale } = CONFIG.viewport;
    const pad = fitPaddingPx;
    const left = leftInset();
    const usableW = Math.max(1, widthPx - left - pad * 2);
    const usableH = Math.max(1, heightPx - pad * 2 - fitBottomInsetPx);
    const contentW = Math.max(1, Math.max(...starts) - Math.min(...starts));
    const contentH = Math.max(1, layout.totalHeight);

    const scale = Math.max(
      CONFIG.viewport.fitMinScale,
      Math.min(Math.min(usableW / contentW, usableH / contentH), fitMaxScale),
    );
    vp.scale = Math.min(CONFIG.zoom.max, Math.max(CONFIG.zoom.min, scale));
    const midX = (Math.min(...starts) + Math.max(...starts)) / 2;
    vp.tx = left + (widthPx - left) / 2 - midX * vp.scale;
    vp.ty = pad + Math.max(0, (usableH - contentH * vp.scale) / 2);
  }

  // The opening view: frames `ids` in the screen left over between the
  // legend, the drawer and the transport bar, instantly rather than as a
  // flight, since there is nowhere to fly from. Returns false when none of
  // the records is on the map.
  function frameOpening(ids, widthPx, heightPx) {
    const wanted = new Set(ids);
    const entries = positionedNodes.filter((e) => wanted.has(e.node.id));
    if (entries.length === 0) return false;
    const xs = entries.map((e) => e.pos.x1);
    const ys = entries.map((e) => e.pos.y);
    const { openingPaddingPx: pad, openingMaxScale } = CONFIG.welcome;
    const left = leftInset();
    const right = rightInset();
    const usableW = Math.max(1, widthPx - left - right - pad * 2);
    const usableH = Math.max(1, heightPx - CONFIG.viewport.fitBottomInsetPx - pad * 2);
    const scale = Math.min(
      openingMaxScale,
      usableW / Math.max(1, Math.max(...xs) - Math.min(...xs)),
      usableH / Math.max(1, Math.max(...ys) - Math.min(...ys)),
    );
    vp.scale = Math.min(CONFIG.zoom.max, Math.max(CONFIG.zoom.min, scale));
    const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
    vp.tx = left + (widthPx - left - right) / 2 - midX * vp.scale;
    vp.ty = (heightPx - CONFIG.viewport.fitBottomInsetPx) / 2 - midY * vp.scale;
    return true;
  }

  // Cached and only refreshed on resize. Calling getBoundingClientRect()
  // inside render() would force a synchronous layout reflow on every single
  // pan/zoom frame right after mutating the SVG transform (classic layout
  // thrashing), and the container's size doesn't change from panning or
  // zooming anyway.
  let containerRect = container.getBoundingClientRect();
  const viewWidth = () => Math.max(1, containerRect.width - rightInset());

  function flyToContent(contentX, contentY, scale) {
    flyTo(vp, contentX, contentY, scale, viewWidth(), containerRect.height, timedRender);
  }

  // Click-to-fly-to: center and zoom in on whatever was clicked, then tell
  // the caller what got selected. Runs against the render() driven directly
  // by the animation's own rAF loop (not the debounced scheduleRender)
  // since flyTo already paces itself frame by frame.
  // `scaleFor` runs after onSelect, so a scale that depends on the drawer's
  // width sees the drawer already open.
  function selectAndFlyTo(item, contentX, contentY, onSelect, scaleFor = () => CONFIG.zoom.flyToScale) {
    // Clicking something the cursor has not reached yet moves the cursor
    // to it. Flying to a node and leaving it dimmed would be absurd.
    transport?.ensureVisible(item.startYear ?? item.year);
    selectedId = item.id;
    touchedIds = new Set();
    onSelect(item);
    flyToContent(contentX, contentY, scaleFor());
    if (positionById.has(item.id)) ripple(item.id);
  }

  // Programmatic selection, for panel links and (later) search. Same camera
  // move and cursor rule as a click, without calling back into onSelect:
  // the caller is the one that asked. Returns false when the target is not
  // on the map (its layer is off, or it has no year to place it by).
  function focusNode(id) {
    const entry = positionedNodes.find((e) => e.node.id === id);
    if (!entry) return false;
    transport?.ensureVisible(entry.node.startYear);
    selectedId = id;
    touchedIds = new Set();
    flyToContent(entry.pos.x1, entry.pos.y, CONFIG.zoom.flyToScale);
    ripple(id);
    return true;
  }

  // How far to zoom so both ends of an edge are on screen. Flying to the
  // midpoint at the usual close-up scale left a long cross-lane edge with
  // both ends off screen and nothing but empty lanes in view. A short edge
  // still gets the close-up, since this only ever zooms out from it.
  function edgeFrameScale({ x1, y1, x2, y2 }) {
    const pad = CONFIG.panel.sceneFramePaddingPx;
    const usableW = Math.max(1, viewWidth() - pad * 2);
    const usableH = Math.max(1, containerRect.height - pad * 2 - CONFIG.viewport.fitBottomInsetPx);
    return Math.min(
      CONFIG.zoom.flyToScale,
      usableW / Math.max(1, Math.abs(x2 - x1)),
      usableH / Math.max(1, Math.abs(y2 - y1)),
    );
  }

  function focusEdge(id) {
    const entry = boundEdges.find((e) => e.edge.id === id);
    if (!entry) return false;
    transport?.ensureVisible(entry.edge.year);
    selectedId = id;
    const { x1, y1, x2, y2 } = entry.anchors;
    flyToContent((x1 + x2) / 2, (y1 + y2) / 2, edgeFrameScale(entry.anchors));
    return true;
  }

  // Moves the year cursor to `year` and frames that stretch of the time
  // axis, for a year typed into search. Vertically it centres the whole
  // map, since a year is a slice through every lane at once.
  function focusYear(year) {
    const clamped = clampYear(year, layout.minYear, layout.maxYear);
    transport?.setYear(clamped);
    const spanPx = CONFIG.search.yearFrameSpanYears * CONFIG.layout.pxPerYear;
    const scale = Math.min(CONFIG.zoom.flyToScale, viewWidth() / spanPx);
    selectedId = null;
    flyToContent(layout.timeScale.toX(clamped), layout.totalHeight / 2, scale);
  }

  // Frames a set of nodes, for a scene: scenes are atmosphere rather than
  // markers, so "go to this scene" means "show me its members together".
  function frameNodes(ids) {
    const wanted = new Set(ids);
    const entries = positionedNodes.filter((e) => wanted.has(e.node.id));
    if (entries.length === 0) return false;
    const xs = entries.map((e) => e.pos.x1);
    const ys = entries.map((e) => e.pos.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pad = CONFIG.panel.sceneFramePaddingPx;
    const usableW = Math.max(1, viewWidth() - pad * 2);
    const usableH = Math.max(1, containerRect.height - pad * 2 - CONFIG.viewport.fitBottomInsetPx);
    const scale = Math.min(
      CONFIG.panel.sceneMaxScale,
      usableW / Math.max(1, maxX - minX),
      usableH / Math.max(1, maxY - minY),
    );
    transport?.ensureVisible(Math.min(...entries.map((e) => e.node.startYear)));
    selectedId = null;
    flyToContent((minX + maxX) / 2, (minY + maxY) / 2, scale);
    return true;
  }

  // Which shared gradients this edge draws with. Beams are coloured by the
  // lineage they rise into, trails run source colour to target colour.
  function gradientIdsFor(edge) {
    return {
      trail: trailGradientId(edge.from.lineage, edge.to.lineage),
      beam: beamGradientId(edge.to.lineage),
      fromColor: colorFor(edge.from.lineage),
      toColor: colorFor(edge.to.lineage),
    };
  }

  function render() {
    viewportG.setAttribute('transform', transformString(vp));
    updateTitleShifts(titleSpecs, vp, overlays());
    updateStaticLayerScale(axisG, titlesG, vp.scale);
    if (layout.substrate) updateSubstrateScale(floorG, vp.scale);

    // Scene clouds sit fractionally behind the graph plane. That offset is
    // the only differential transform in the whole renderer, and it is
    // safe precisely because a blurred cloud carries no position anyone
    // reads off it. The floor and the beams that cross its horizon stay
    // locked to the graph.
    const drift = (1 - CONFIG.atmosphere.nebula.parallax) * vp.scale;
    nebulaG.setAttribute('transform', `translate(${-vp.tx * (drift / vp.scale)},${-vp.ty * (drift / vp.scale)})`);

    const year = currentYear();
    updateCursor(cursorG, layout, year, vp.scale);
    // The cursor moved forward a little since the last frame: whatever it
    // reached in between ignites, if it is on screen. A big jump reveals
    // quietly, and moving backwards never ignites anything.
    const ignitingFrom = lastYear !== null && year > lastYear && year - lastYear <= CONFIG.sparks.ignite.maxStepYears
      ? lastYear
      : null;
    lastYear = year;
    const ignites = (y) => ignitingFrom !== null && y > ignitingFrom && y <= year;

    const level = zoomLevelForScale(vp.scale);
    const range = visibleContentRange(vp, containerRect.width, containerRect.height);
    // The screen itself, without the culling margin. An edge with neither
    // end in here is only passing through the view, and is drawn faintly
    // so the lines that touch what the reader is looking at stand out.
    // Without this, long cross-lane edges read as a wall of verticals.
    const onScreenMin = screenToContent(vp, 0, 0);
    const onScreenMax = screenToContent(vp, containerRect.width, containerRect.height);
    const onScreen = (x, y) => x >= onScreenMin.x && x <= onScreenMax.x && y >= onScreenMin.y && y <= onScreenMax.y;

    // Sorted by x1/minX ascending: once an item starts after the visible
    // range's right edge, every remaining item (all with an even later
    // start) is out of view too. Past that point we skip the expensive
    // visibility math and element update, but still have to check for and
    // remove a leftover element from before the viewport moved -- an
    // unconditional break here would leak stale DOM nodes for anything
    // that scrolls out of view on this side.
    // A node is two elements now: its marker group and its labels group
    // in the labels layer. Both carry the state classes, so the "not yet"
    // fade and the selection highlight reach the name as well as the dot.
    const removeNode = (id, el) => {
      el.remove();
      el.__labels.remove();
      nodeElements.delete(id);
    };
    const setNodeState = (el, unborn, selected) => {
      const touched = touchedIds.has(el.__node?.id);
      for (const target of [el, el.__labels]) {
        target.classList.toggle('unborn', unborn);
        target.classList.toggle('selected', selected);
        target.classList.toggle('touched', touched);
      }
    };

    let pastRange = false;
    for (const { node, pos } of positionedNodes) {
      if (!pastRange && pos.x1 > range.x2) pastRange = true;
      const el = nodeElements.get(node.id);
      if (pastRange) {
        if (el) removeNode(node.id, el);
        continue;
      }
      const visible = nodeVisible(pos, range);
      if (visible && ignites(node.startYear)) sparks.flare(pos.x1, pos.y, node.lineage, vp.scale);
      const degreeFactor = degreeFactorById.get(node.id) ?? CONFIG.node.degreeRadiusFactor.min;
      if (visible) {
        if (!el) {
          const created = createNodeElement(
            node,
            (n) => selectAndFlyTo(n, pos.x1, pos.y, onSelectNode),
            (n, hovered) => {
              const current = nodeElements.get(n.id);
              if (current) setNodeHovered(current, hovered, vp.scale);
              if (hovered) hoveredNodeId = n.id;
              else if (hoveredNodeId === n.id) hoveredNodeId = null;
              scheduleRender();
            },
          );
          nodesG.appendChild(created);
          labelsG.appendChild(created.__labels);
          nodeElements.set(node.id, created);
          updateNodeElement(created, node, pos, level, vp.scale, degreeFactor);
          setNodeState(created, node.startYear > year, node.id === selectedId);
        } else {
          updateNodeElement(el, node, pos, level, vp.scale, degreeFactor);
          setNodeState(el, node.startYear > year, node.id === selectedId);
        }
      } else if (el) {
        removeNode(node.id, el);
      }
    }

    placeLabels(level);

    // Edges are quiet by default and lit only around what the reader is
    // looking at: the selected edge, and every edge touching the selected
    // or hovered node (A253). The quiet and lit looks live in index.html.
    const litNodes = new Set([selectedId, hoveredNodeId].filter((id) => id && positionById.has(id)));
    const isLit = (edge) => edge.id === selectedId || litNodes.has(edge.from.id) || litNodes.has(edge.to.id);

    let pastEdgeRange = false;
    for (const { edge, anchors, minX, maxX, minY, maxY } of boundEdges) {
      if (!pastEdgeRange && minX > range.x2) pastEdgeRange = true;
      const el = edgeElements.get(edge.id);
      if (pastEdgeRange) {
        if (el) {
          el.remove();
          edgeElements.delete(edge.id);
        }
        continue;
      }
      const visible = maxX >= range.x1 && maxY >= range.y1 && minY <= range.y2;
      const passing = !onScreen(anchors.x1, anchors.y1) && !onScreen(anchors.x2, anchors.y2);
      if (visible && ignites(edge.year)) pulseEdge({ edge, anchors }, 0, CONFIG.sparks.pulse.durationMs);
      if (visible) {
        if (!el) {
          const midX = (anchors.x1 + anchors.x2) / 2;
          const midY = (anchors.y1 + anchors.y2) / 2;
          const created = createEdgeElement(
            edge,
            (e) => selectAndFlyTo(e, midX, midY, onSelectEdge, () => edgeFrameScale(anchors)),
            (e, hovered) => {
              const current = edgeElements.get(e.id);
              if (current) setEdgeHovered(current, e, hovered);
            },
            goldenIds.has(edge.id),
          );
          edgesG.appendChild(created);
          edgeElements.set(edge.id, created);
          updateEdgeElement(created, edge, anchors, vp.scale, gradientIdsFor(edge));
          created.classList.toggle('unborn', edge.year > year);
          created.classList.toggle('selected', edge.id === selectedId);
          created.classList.toggle('passing', passing);
          created.classList.toggle('lit', isLit(edge));
        } else {
          updateEdgeElement(el, edge, anchors, vp.scale, gradientIdsFor(edge));
          el.classList.toggle('unborn', edge.year > year);
          el.classList.toggle('selected', edge.id === selectedId);
          el.classList.toggle('passing', passing);
          el.classList.toggle('lit', isLit(edge));
        }
      } else if (el) {
        el.remove();
        edgeElements.delete(edge.id);
      }
    }
  }

  let lastRenderMs = 0;
  function timedRender() {
    const start = performance.now();
    render();
    lastRenderMs = performance.now() - start;
  }

  let rafScheduled = false;
  function scheduleRender() {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(() => {
      rafScheduled = false;
      timedRender();
    });
  }

  // The content itself, not the faded field around it: the part a reader
  // would call "the map".
  const contentBounds = {
    x0: layout.timeScale.toX(layout.minYear),
    x1: layout.timeScale.toX(layout.maxYear),
    y0: 0,
    y1: layout.substrate ? layout.substrate.horizonY + layout.substrate.depth : layout.totalHeight,
  };
  attachPanZoomHandlers(root, vp, scheduleRender, () =>
    pullBackIntoView(vp, contentBounds, viewWidth(), containerRect.height, timedRender),
  );
  const resizeObserver = new ResizeObserver(() => {
    containerRect = container.getBoundingClientRect();
    dust.resize();
    scheduleRender();
  });
  resizeObserver.observe(container);

  // A rebuild (a layer toggle) keeps the reader where they were rather than
  // yanking the camera back to the opening view.
  if (!initialViewport && !frameOpening(openingFrameIds, containerRect.width, containerRect.height)) {
    fitToContent(containerRect.width, containerRect.height);
  }
  dust.start(vp);
  timedRender();

  return {
    svg: root,
    layout,
    viewport: vp,
    graphNodeCount: graphNodes.length,
    graphEdgeCount: graphEdges.length,
    renderedNodeCount: () => nodeElements.size,
    renderedEdgeCount: () => edgeElements.size,
    // The M2 perf gate cares about render() itself fitting the 60fps
    // budget (BUILD_PLAN.md), not the browser's own vsync-paced frame
    // interval, so this is exposed for that measurement rather than timing
    // from outside via rAF-to-rAF wall clock.
    lastRenderMs: () => lastRenderMs,
    rerender: scheduleRender,
    fit: () => {
      fitToContent(containerRect.width, containerRect.height);
      scheduleRender();
    },
    transport,
    layers,
    focusNode,
    focusEdge,
    frameNodes,
    focusYear,
    arrange,
    yearBounds: () => ({ min: layout.minYear, max: layout.maxYear }),
    selectedId: () => selectedId,
    // Follow the producer: keep `id` selected, ring every node in `ids`,
    // and frame them all together.
    showTouched(id, ids) {
      if (!frameNodes([id, ...ids])) return false;
      selectedId = id;
      touchedIds = new Set(ids);
      scheduleRender();
      return true;
    },
    clearSelection: () => {
      selectedId = null;
      touchedIds = new Set();
      scheduleRender();
    },
    destroy: () => {
      resizeObserver.disconnect();
      transport?.stop();
      dust.stop();
      root.remove();
      container.querySelector('.dust-layer')?.remove();
    },
  };
}
