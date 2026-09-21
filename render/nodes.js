// Draws one node: a horizontal line for its active-year span, a circle
// marking its start year (the primary hit target and label anchor), and,
// depending on the current semantic zoom level, a name label and a one-line
// hook. Elements are created once per node and mutated in place afterward
// so panning/zooming never rebuilds the DOM.
//
// Position (x1/x2/y) lives in content coordinates and is left for the
// viewport's own transform to scale, since a career's time span should
// visibly widen as you zoom into it. Everything else (marker radius, text,
// stroke widths, hit-area padding) is a UI adornment that should read as
// the same size on screen at any zoom level, so those values are divided
// by the current scale to counteract the group transform.

import { CONFIG } from '../config.js';
import { svgEl, setAttrs } from './svg.js';

function truncate(text, maxChars) {
  if (!text || text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1).trimEnd() + '…';
}

export function createNodeElement(node, onSelect, onHover) {
  const g = svgEl('g', { class: `node node-${node.kind}`, 'data-node-id': node.id });

  // Invisible, generously sized hit area: the visible shapes (a thin line,
  // a small circle, text) don't cover enough of the node's on-screen
  // footprint for pointer events to land reliably otherwise.
  const hitArea = svgEl('rect', { class: 'node-hit', fill: 'transparent' });
  const span = svgEl('line', { class: 'node-span' });
  const marker = svgEl('circle', { class: 'node-marker' });
  const label = svgEl('text', { class: 'node-label' });
  const hook = svgEl('text', { class: 'node-hook' });

  g.append(hitArea, span, marker, label, hook);

  g.addEventListener('click', () => onSelect(node));
  g.addEventListener('mouseenter', () => onHover(node, true));
  g.addEventListener('mouseleave', () => onHover(node, false));

  return g;
}

export function updateNodeElement(g, node, position, zoomLevel, scale) {
  const color = CONFIG.colors.lineage[node.lineage] ?? CONFIG.colors.lineage.other;
  const radius = (CONFIG.node.radius[zoomLevel] ?? CONFIG.node.radius.mid) / scale;
  const strokeWidth = (zoomLevel === 'collapsed' ? 1 : CONFIG.node.strokeWidth) / scale;
  const labelFontSize = CONFIG.node.labelFontSize / scale;
  const hookFontSize = CONFIG.node.hookFontSize / scale;

  const hitArea = g.querySelector('.node-hit');
  const span = g.querySelector('.node-span');
  const marker = g.querySelector('.node-marker');
  const label = g.querySelector('.node-label');
  const hook = g.querySelector('.node-hook');

  const hitHeight = (zoomLevel === 'detail' ? 26 : 18) / scale;
  const hitPadEnd = (zoomLevel === 'collapsed' ? 4 : 140) / scale;
  setAttrs(hitArea, {
    x: position.x1 - radius - 2 / scale,
    y: position.y - hitHeight / 2,
    width: Math.max(position.x2 - position.x1, 0) + radius * 2 + hitPadEnd,
    height: hitHeight,
  });

  setAttrs(span, {
    x1: position.x1,
    y1: position.y,
    x2: position.x2,
    y2: position.y,
    stroke: color,
    'stroke-width': strokeWidth,
    'stroke-opacity': node.kind === 'machine' ? 0.9 : 0.6,
  });

  setAttrs(marker, {
    cx: position.x1,
    cy: position.y,
    r: radius,
    fill: color,
    stroke: node.kind === 'machine' ? '#fff' : 'none',
    'stroke-width': node.kind === 'machine' ? 1.5 / scale : 0,
  });

  const showLabel = zoomLevel !== 'collapsed';
  const showHook = zoomLevel === 'detail';

  label.style.display = showLabel ? '' : 'none';
  if (showLabel) {
    setAttrs(label, {
      x: position.x1 + radius + 4 / scale,
      y: position.y - 3 / scale,
      'font-size': labelFontSize,
      fill: '#e8e9ec',
    });
    label.textContent = truncate(node.name, CONFIG.node.labelMaxChars);
  }

  hook.style.display = showHook ? '' : 'none';
  if (showHook) {
    setAttrs(hook, {
      x: position.x1 + radius + 4 / scale,
      y: position.y + 11 / scale,
      'font-size': hookFontSize,
      fill: '#9aa0a8',
    });
    hook.textContent = truncate(node.hook, 60);
  }
}

export function setNodeHovered(g, hovered, scale) {
  g.classList.toggle('node-hovered', hovered);
  const marker = g.querySelector('.node-marker');
  if (hovered) {
    marker.setAttribute('stroke', '#fff');
    marker.setAttribute('stroke-width', String(CONFIG.node.hoverStrokeWidth / scale));
  } else {
    const isMachine = g.classList.contains('node-machine');
    marker.setAttribute('stroke', isMachine ? '#fff' : 'none');
    marker.setAttribute('stroke-width', isMachine ? String(1.5 / scale) : '0');
  }
}
