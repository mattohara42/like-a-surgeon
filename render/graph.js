// Orchestrator: owns the SVG root, the viewport transform, and the
// create/update/cull loop for node and edge elements. This is the only
// module that ties layout + viewport + zoom levels + node/edge drawing
// together; everything else here is a pure function or a small DOM helper.

import { CONFIG } from '../config.js';
import { computeLayout } from './layout.js';
import { createViewportState, transformString, visibleContentRange, flyTo } from './viewport.js';
import { zoomLevelForScale } from './zoomLevels.js';
import { attachPanZoomHandlers } from './interactions.js';
import { svgEl, setAttrs } from './svg.js';
import { createNodeElement, updateNodeElement, setNodeHovered } from './nodes.js';
import { createEdgeElement, updateEdgeElement, setEdgeHovered, isBeam } from './edges.js';
import { createSubstrateDefs, drawSubstrate, updateSubstrateScale } from './substrate.js';
import { createEdgeGradients, createHaloGradients, trailGradientId, beamGradientId, colorFor } from './gradients.js';
import { createDustLayer, createNebulaDefs, drawNebulae } from './atmosphere.js';
import { createCursorLayer, createCursorDefs, updateCursor, createTransport } from './transport.js';

function clampYear(year, min, max) {
  return Math.min(max, Math.max(min, year));
}

// All shared defs in one place: gradients for edge trails, machine beams
// and node halos, the nebula blur, and the cursor wash. Every one of these
// is shared by id rather than instantiated per element -- viewport culling
// creates and destroys elements constantly while panning, and per-element
// defs would mean churning the <defs> subtree on every frame.
function createDefs() {
  const defs = svgEl('defs');
  defs.append(
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
        y1: 0,
        y2: layout.totalHeight,
        stroke: CONFIG.colors.axisLine,
      }),
    );
    const label = svgEl('text', { class: 'axis-label', x: x, fill: CONFIG.colors.axisText });
    label.textContent = String(year);
    axisG.appendChild(label);
  }
}

function drawBands(bandsG, layout) {
  const originX = layout.timeScale.toX(layout.timeScale.year0);

  for (const lane of layout.lanes) {
    bandsG.appendChild(
      svgEl('rect', {
        x: originX,
        y: lane.y,
        width: layout.totalWidth,
        height: lane.height,
        fill: colorFor(lane.lineage),
        opacity: 0.024,
      }),
    );
    const label = svgEl('text', {
      class: 'band-label',
      x: originX,
      y: lane.y,
      fill: colorFor(lane.lineage),
      'font-weight': 600,
    });
    label.textContent = lane.lineage.toUpperCase();
    bandsG.appendChild(label);
  }

  if (!layout.substrate) return;

  const floorLabel = svgEl('text', {
    class: 'band-label',
    x: originX,
    y: layout.substrate.horizonY + CONFIG.substrate.labelOffset,
    fill: CONFIG.colors.machineBandLabel,
    'font-weight': 600,
  });
  floorLabel.textContent = 'THE MACHINES';
  bandsG.appendChild(floorLabel);
}

// Re-applies counter-scaled font-size/stroke-width/offsets to the
// once-drawn axis ticks, axis labels, and band labels.
function updateStaticLayerScale(axisG, bandsG, scale) {
  for (const tick of axisG.querySelectorAll('.axis-tick')) {
    tick.setAttribute('stroke-width', 1 / scale);
  }
  for (const label of axisG.querySelectorAll('.axis-label')) {
    label.setAttribute('font-size', 11 / scale);
    label.setAttribute('y', 14 / scale);
    label.setAttribute('dx', 4 / scale);
  }
  for (const label of bandsG.querySelectorAll('.band-label')) {
    label.setAttribute('font-size', 11 / scale);
    label.setAttribute('dx', 4 / scale);
    label.setAttribute('dy', 14 / scale);
  }
}

function edgeAnchors(edge, layout) {
  const fromPos = layout.positions.get(edge.from.id);
  const toPos = layout.positions.get(edge.to.id);
  if (!fromPos || !toPos) return null;
  const fromYear = clampYear(edge.year, edge.from.startYear, edge.from.endYear);
  const toYear = clampYear(edge.year, edge.to.startYear, edge.to.endYear);
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
    transportEl = null,
    layers = CONFIG.layers.defaults,
    initialViewport = null,
    initialYear = null,
  } = callbacks;

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

  const layout = computeLayout(graphNodes, { withSubstrate: layers.machines });
  const vp = createViewportState();
  if (initialViewport) Object.assign(vp, { tx: initialViewport.tx, ty: initialViewport.ty, scale: initialViewport.scale });

  const dust = createDustLayer(container);

  const root = svgEl('svg', { class: 'graph-svg', width: '100%', height: '100%' });
  const defs = createDefs();
  const viewportG = svgEl('g', { class: 'viewport' });
  const nebulaG = svgEl('g', { class: 'nebula-layer' });
  const bandsG = svgEl('g', { class: 'bands-layer' });
  const floorG = svgEl('g', { class: 'floor-layer' });
  const axisG = svgEl('g', { class: 'axis-layer' });
  const edgesG = svgEl('g', { class: 'edges-layer' });
  const nodesG = svgEl('g', { class: 'nodes-layer' });
  const cursorG = createCursorLayer(layout);
  viewportG.append(nebulaG, bandsG, floorG, axisG, edgesG, nodesG, cursorG);
  root.append(defs, viewportG);
  container.appendChild(root);

  drawBands(bandsG, layout);
  if (layout.substrate) drawSubstrate(floorG, layout);
  drawAxis(axisG, layout);
  drawNebulae(nebulaG, sceneRecords, layout);

  const degreeFactorById = computeDegreeFactors(graphNodes, graphEdges);

  const transport = transportEl
    ? createTransport(transportEl, layout, graphNodes, graphEdges, () => scheduleRender(), initialYear)
    : null;
  const currentYear = () => transport?.year() ?? layout.timeScale.yearEnd;

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

  const nodeElements = new Map();
  const edgeElements = new Map();

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
    const usableW = Math.max(1, widthPx - pad * 2);
    const usableH = Math.max(1, heightPx - pad * 2 - fitBottomInsetPx);
    const contentW = Math.max(1, Math.max(...starts) - Math.min(...starts));
    const contentH = Math.max(1, layout.totalHeight);

    const scale = Math.min(
      Math.min(usableW / contentW, usableH / contentH),
      fitMaxScale,
    );
    vp.scale = Math.min(CONFIG.zoom.max, Math.max(CONFIG.zoom.min, scale));
    const midX = (Math.min(...starts) + Math.max(...starts)) / 2;
    vp.tx = widthPx / 2 - midX * vp.scale;
    vp.ty = pad + Math.max(0, (usableH - contentH * vp.scale) / 2);
  }

  // Cached and only refreshed on resize. Calling getBoundingClientRect()
  // inside render() would force a synchronous layout reflow on every single
  // pan/zoom frame right after mutating the SVG transform (classic layout
  // thrashing), and the container's size doesn't change from panning or
  // zooming anyway.
  let containerRect = container.getBoundingClientRect();

  // Click-to-fly-to: center and zoom in on whatever was clicked, then tell
  // the caller what got selected. Runs against the render() driven directly
  // by the animation's own rAF loop (not the debounced scheduleRender)
  // since flyTo already paces itself frame by frame.
  function selectAndFlyTo(item, contentX, contentY, onSelect) {
    // Clicking something the cursor has not reached yet moves the cursor
    // to it. Flying to a node and leaving it dimmed would be absurd.
    transport?.ensureVisible(item.startYear ?? item.year);
    onSelect(item);
    flyTo(vp, contentX, contentY, CONFIG.zoom.flyToScale, containerRect.width, containerRect.height, timedRender);
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
    updateStaticLayerScale(axisG, bandsG, vp.scale);
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

    const level = zoomLevelForScale(vp.scale);
    const range = visibleContentRange(vp, containerRect.width, containerRect.height);

    // Sorted by x1/minX ascending: once an item starts after the visible
    // range's right edge, every remaining item (all with an even later
    // start) is out of view too. Past that point we skip the expensive
    // visibility math and element update, but still have to check for and
    // remove a leftover element from before the viewport moved -- an
    // unconditional break here would leak stale DOM nodes for anything
    // that scrolls out of view on this side.
    let pastRange = false;
    for (const { node, pos } of positionedNodes) {
      if (!pastRange && pos.x1 > range.x2) pastRange = true;
      const el = nodeElements.get(node.id);
      if (pastRange) {
        if (el) {
          el.remove();
          nodeElements.delete(node.id);
        }
        continue;
      }
      const visible = nodeVisible(pos, range);
      const degreeFactor = degreeFactorById.get(node.id) ?? CONFIG.node.degreeRadiusFactor.min;
      if (visible) {
        if (!el) {
          const created = createNodeElement(
            node,
            (n) => selectAndFlyTo(n, pos.x1, pos.y, onSelectNode),
            (n, hovered) => {
              const current = nodeElements.get(n.id);
              if (current) setNodeHovered(current, hovered, vp.scale);
            },
          );
          nodesG.appendChild(created);
          nodeElements.set(node.id, created);
          updateNodeElement(created, node, pos, level, vp.scale, degreeFactor);
          created.classList.toggle('unborn', node.startYear > year);
        } else {
          updateNodeElement(el, node, pos, level, vp.scale, degreeFactor);
          el.classList.toggle('unborn', node.startYear > year);
        }
      } else if (el) {
        el.remove();
        nodeElements.delete(node.id);
      }
    }

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
      if (visible) {
        if (!el) {
          const midX = (anchors.x1 + anchors.x2) / 2;
          const midY = (anchors.y1 + anchors.y2) / 2;
          const created = createEdgeElement(
            edge,
            (e) => selectAndFlyTo(e, midX, midY, onSelectEdge),
            (e, hovered) => {
              const current = edgeElements.get(e.id);
              if (current) setEdgeHovered(current, e, hovered);
            },
          );
          edgesG.appendChild(created);
          edgeElements.set(edge.id, created);
          updateEdgeElement(created, edge, anchors, vp.scale, gradientIdsFor(edge));
          created.classList.toggle('unborn', edge.year > year);
        } else {
          updateEdgeElement(el, edge, anchors, vp.scale, gradientIdsFor(edge));
          el.classList.toggle('unborn', edge.year > year);
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

  attachPanZoomHandlers(root, vp, scheduleRender);
  const resizeObserver = new ResizeObserver(() => {
    containerRect = container.getBoundingClientRect();
    dust.resize();
    scheduleRender();
  });
  resizeObserver.observe(container);

  // A rebuild (a layer toggle) keeps the reader where they were rather than
  // yanking the camera back to the opening view.
  if (!initialViewport) fitToContent(containerRect.width, containerRect.height);
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
    destroy: () => {
      resizeObserver.disconnect();
      transport?.stop();
      dust.stop();
      root.remove();
      container.querySelector('.dust-layer')?.remove();
    },
  };
}
