// Draws one edge as a gently curved, glowing "trail" between two anchor
// points (computed by the caller from each endpoint's position and the
// edge's own `year`, see graph.js) -- a quadratic curve rather than a
// straight line, bowed a small, deterministic amount off the direct path
// so parallel edges between nearby nodes don't overlap into one line. A
// wide, invisible hit-path sits under the thin visible line so edges stay
// clickable without needing to be drawn thick.
//
// Anchor coordinates are content-space and left for the viewport transform
// to scale (an edge should visibly stretch as you zoom into its span).
// Stroke width and dash length are UI adornments, so they're counter-scaled
// to stay a constant size on screen, same reasoning as nodes.js.

import { CONFIG } from '../config.js';
import { svgEl, setAttrs } from './svg.js';

function scaleDasharray(pattern, scale) {
  if (pattern === 'none') return 'none';
  return pattern
    .split(',')
    .map((n) => Number(n) / scale)
    .join(',');
}

// Small stable hash so the same edge always bows the same direction across
// renders, without needing to store extra state per edge.
function bowSign(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h % 2 === 0 ? 1 : -1;
}

function curvePath(anchors, edgeId) {
  const dx = anchors.x2 - anchors.x1;
  const dy = anchors.y2 - anchors.y1;
  const dist = Math.hypot(dx, dy);
  const bow = dist * CONFIG.edge.curveBow * bowSign(edgeId);
  const midX = (anchors.x1 + anchors.x2) / 2;
  const midY = (anchors.y1 + anchors.y2) / 2;
  // Perpendicular offset from the straight-line midpoint.
  const controlX = dist === 0 ? midX : midX - (dy / dist) * bow;
  const controlY = dist === 0 ? midY : midY + (dx / dist) * bow;
  return `M ${anchors.x1},${anchors.y1} Q ${controlX},${controlY} ${anchors.x2},${anchors.y2}`;
}

export function createEdgeElement(edge, onSelect, onHover) {
  const g = svgEl('g', { class: 'edge', 'data-edge-id': edge.id });

  const hitPath = svgEl('path', { class: 'edge-hit', stroke: 'transparent', fill: 'none' });
  const glow = svgEl('path', { class: 'edge-glow', fill: 'none', filter: 'url(#edge-glow-filter)' });
  const line = svgEl('path', { class: 'edge-line', fill: 'none' });

  g.append(hitPath, glow, line);

  g.addEventListener('click', () => onSelect(edge));
  g.addEventListener('mouseenter', () => onHover(edge, true));
  g.addEventListener('mouseleave', () => onHover(edge, false));

  return g;
}

export function updateEdgeElement(g, edge, anchors, scale) {
  const line = g.querySelector('.edge-line');
  const glow = g.querySelector('.edge-glow');
  const hitPath = g.querySelector('.edge-hit');

  const d = curvePath(anchors, edge.id);
  const baseWidth = (CONFIG.edge.strokeWidth[edge.confidence] ?? CONFIG.edge.strokeWidth.consensus) / scale;
  const baseOpacity = edge.crossLineage ? CONFIG.edge.crossLineageOpacity : CONFIG.edge.opacity;

  setAttrs(hitPath, { d, 'stroke-width': CONFIG.edge.hitAreaWidth / scale });
  setAttrs(glow, {
    d,
    stroke: CONFIG.colors.edgeDefault,
    'stroke-width': (baseWidth * 3),
    'stroke-opacity': CONFIG.edge.glow.opacity,
  });
  setAttrs(line, {
    d,
    stroke: CONFIG.colors.edgeDefault,
    'stroke-width': baseWidth,
    'stroke-dasharray': scaleDasharray(CONFIG.edge.dashArray[edge.confidence] ?? 'none', scale),
    'stroke-opacity': baseOpacity,
  });
}

export function setEdgeHovered(g, edge, hovered) {
  g.classList.toggle('edge-hovered', hovered);
  const line = g.querySelector('.edge-line');
  const baseOpacity = edge.crossLineage ? CONFIG.edge.crossLineageOpacity : CONFIG.edge.opacity;
  line.setAttribute('stroke-opacity', hovered ? CONFIG.edge.hoverOpacity : baseOpacity);
}
