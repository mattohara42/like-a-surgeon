// Draws one edge as a straight line between two anchor points (computed by
// the caller from each endpoint's position and the edge's own `year`, see
// graph.js). A wide, invisible hit-path sits under the thin visible line so
// edges stay clickable without needing to be drawn thick.
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

export function createEdgeElement(edge, onSelect, onHover) {
  const g = svgEl('g', { class: 'edge', 'data-edge-id': edge.id });

  const hitPath = svgEl('line', { class: 'edge-hit', stroke: 'transparent' });
  const line = svgEl('line', { class: 'edge-line' });

  g.append(hitPath, line);

  g.addEventListener('click', () => onSelect(edge));
  g.addEventListener('mouseenter', () => onHover(edge, true));
  g.addEventListener('mouseleave', () => onHover(edge, false));

  return g;
}

export function updateEdgeElement(g, edge, anchors, scale) {
  const line = g.querySelector('.edge-line');
  const hitPath = g.querySelector('.edge-hit');

  setAttrs(hitPath, { ...anchors, 'stroke-width': CONFIG.edge.hitAreaWidth / scale });
  setAttrs(line, {
    ...anchors,
    stroke: CONFIG.colors.edgeDefault,
    'stroke-width': (CONFIG.edge.strokeWidth[edge.confidence] ?? CONFIG.edge.strokeWidth.consensus) / scale,
    'stroke-dasharray': scaleDasharray(CONFIG.edge.dashArray[edge.confidence] ?? 'none', scale),
    'stroke-opacity': edge.crossLineage ? CONFIG.edge.crossLineageOpacity : CONFIG.edge.opacity,
  });
}

export function setEdgeHovered(g, edge, hovered) {
  g.classList.toggle('edge-hovered', hovered);
  const line = g.querySelector('.edge-line');
  const baseOpacity = edge.crossLineage ? CONFIG.edge.crossLineageOpacity : CONFIG.edge.opacity;
  line.setAttribute('stroke-opacity', hovered ? CONFIG.edge.hoverOpacity : baseOpacity);
}
