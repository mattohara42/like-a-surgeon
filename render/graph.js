// Orchestrator: owns the SVG root, the viewport transform, and the
// create/update/cull loop for node and edge elements. This is the only
// module that ties layout + viewport + zoom levels + node/edge drawing
// together; everything else here is a pure function or a small DOM helper.

import { CONFIG } from '../config.js';
import { computeLayout } from './layout.js';
import { createViewportState, transformString, visibleContentRange } from './viewport.js';
import { zoomLevelForScale } from './zoomLevels.js';
import { attachPanZoomHandlers } from './interactions.js';
import { svgEl } from './svg.js';
import { createNodeElement, updateNodeElement, setNodeHovered } from './nodes.js';
import { createEdgeElement, updateEdgeElement, setEdgeHovered } from './edges.js';

function clampYear(year, min, max) {
  return Math.min(max, Math.max(min, year));
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
  const mb = layout.machineBand;
  bandsG.appendChild(
    svgEl('rect', {
      x: originX,
      y: mb.y,
      width: layout.totalWidth,
      height: mb.height,
      fill: CONFIG.colors.machineBandFill,
    }),
  );
  const mbLabel = svgEl('text', {
    class: 'band-label',
    x: originX,
    y: mb.y,
    fill: CONFIG.colors.machineBandLabel,
    'font-weight': 600,
  });
  mbLabel.textContent = 'MACHINES';
  bandsG.appendChild(mbLabel);

  for (const lane of layout.lanes) {
    const label = svgEl('text', {
      class: 'band-label',
      x: originX,
      y: lane.y,
      fill: CONFIG.colors.laneLabel,
      'font-weight': 600,
    });
    label.textContent = lane.lineage.toUpperCase();
    bandsG.appendChild(label);
  }
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
  const { onSelectNode = () => {}, onSelectEdge = () => {} } = callbacks;

  const layout = computeLayout(data.nodes);
  const vp = createViewportState();

  const root = svgEl('svg', { class: 'graph-svg', width: '100%', height: '100%' });
  const viewportG = svgEl('g', { class: 'viewport' });
  const bandsG = svgEl('g', { class: 'bands-layer' });
  const axisG = svgEl('g', { class: 'axis-layer' });
  const edgesG = svgEl('g', { class: 'edges-layer' });
  const nodesG = svgEl('g', { class: 'nodes-layer' });
  viewportG.append(bandsG, axisG, edgesG, nodesG);
  root.appendChild(viewportG);
  container.appendChild(root);

  drawBands(bandsG, layout);
  drawAxis(axisG, layout);

  // Node position and edge anchors are both static once computed (nodes
  // don't move, edge.year doesn't change), so both are precomputed once
  // here instead of being recalculated on every pan/zoom frame. Nodes are
  // also sorted by x1 so the per-frame scan can stop as soon as it passes
  // the visible range instead of always walking the full dataset.
  const positionedNodes = data.nodes
    .map((node) => ({ node, pos: layout.positions.get(node.id) }))
    .filter((entry) => entry.pos)
    .sort((a, b) => a.pos.x1 - b.pos.x1);

  const boundEdges = data.edges
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

  // Cached and only refreshed on resize. Calling getBoundingClientRect()
  // inside render() would force a synchronous layout reflow on every single
  // pan/zoom frame right after mutating the SVG transform (classic layout
  // thrashing), and the container's size doesn't change from panning or
  // zooming anyway.
  let containerRect = container.getBoundingClientRect();

  function render() {
    viewportG.setAttribute('transform', transformString(vp));
    updateStaticLayerScale(axisG, bandsG, vp.scale);
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
      if (visible) {
        if (!el) {
          const created = createNodeElement(
            node,
            onSelectNode,
            (n, hovered) => {
              const current = nodeElements.get(n.id);
              if (current) setNodeHovered(current, hovered, vp.scale);
            },
          );
          nodesG.appendChild(created);
          nodeElements.set(node.id, created);
          updateNodeElement(created, node, pos, level, vp.scale);
        } else {
          updateNodeElement(el, node, pos, level, vp.scale);
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
          const created = createEdgeElement(
            edge,
            onSelectEdge,
            (e, hovered) => {
              const current = edgeElements.get(e.id);
              if (current) setEdgeHovered(current, e, hovered);
            },
          );
          edgesG.appendChild(created);
          edgeElements.set(edge.id, created);
          updateEdgeElement(created, edge, anchors, vp.scale);
        } else {
          updateEdgeElement(el, edge, anchors, vp.scale);
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
  new ResizeObserver(() => {
    containerRect = container.getBoundingClientRect();
    scheduleRender();
  }).observe(container);

  timedRender();

  return {
    svg: root,
    layout,
    viewport: vp,
    renderedNodeCount: () => nodeElements.size,
    renderedEdgeCount: () => edgeElements.size,
    // The M2 perf gate cares about render() itself fitting the 60fps
    // budget (BUILD_PLAN.md), not the browser's own vsync-paced frame
    // interval, so this is exposed for that measurement rather than timing
    // from outside via rAF-to-rAF wall clock.
    lastRenderMs: () => lastRenderMs,
    rerender: scheduleRender,
  };
}
