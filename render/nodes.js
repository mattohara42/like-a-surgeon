// Draws one node: a soft halo behind a crisp core, sized by graph
// connectedness (degree), plus a faint orbital track for its active-year
// span and, depending on the current semantic zoom level, a name label and
// a one-line hook.
//
// Artists are circles. Machines are dials -- a ticked ring around a square
// core -- because in a field of people, a made object should look made.
// Every node breathes at its own seeded rate so they never sync up.
//
// Position (x1/x2/y) lives in content coordinates and is left for the
// viewport's own transform to scale, since a career's time span should
// visibly widen as you zoom into it. Everything else (marker radius, text,
// stroke widths, hit-area padding) is a UI adornment that should read as
// the same size on screen at any zoom level, so those values are divided
// by the current scale to counteract the group transform.

import { CONFIG } from '../config.js';
import { svgEl, setAttrs } from './svg.js';
import { haloGradientId, colorFor } from './gradients.js';

function truncate(text, maxChars) {
  if (!text || text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1).trimEnd() + '…';
}

// Stable per-id hash, so a node's breathing rhythm is the same on every
// reload. Randomness that changed on refresh would make the map feel
// arbitrary rather than alive.
function hashId(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function breathe(el, id) {
  const seed = hashId(id);
  const spread = CONFIG.node.breath.maxMs - CONFIG.node.breath.minMs;
  const duration = CONFIG.node.breath.minMs + (seed % 1000) / 1000 * spread;
  const phase = (seed >>> 10) % 6000;
  return el.animate(
    [
      { transform: 'scale(1)' },
      { transform: `scale(${1 + CONFIG.node.breath.amount})` },
      { transform: 'scale(1)' },
    ],
    { duration, iterations: Infinity, easing: 'ease-in-out', delay: -phase },
  );
}

export function createNodeElement(node, onSelect, onHover) {
  const g = svgEl('g', { class: `node node-${node.kind}`, 'data-node-id': node.id });

  // Invisible, generously sized hit area: the visible shapes (a thin line,
  // a small circle, text) don't cover enough of the node's on-screen
  // footprint for pointer events to land reliably otherwise.
  const hitArea = svgEl('rect', { class: 'node-hit', fill: 'transparent' });
  const span = svgEl('line', { class: 'node-span' });

  // Two nested groups, not one. A Web Animations transform *replaces* the
  // element's transform attribute rather than composing with it, so a
  // single group carrying both the node's position and the breathing scale
  // loses the position the moment the animation starts and every node
  // stacks up at the origin. Position goes on the outer group, breath on
  // the inner one.
  const place = svgEl('g', { class: 'node-place' });
  const body = svgEl('g', { class: 'node-body' });
  place.appendChild(body);
  const halo = svgEl('circle', { class: 'node-halo' });
  const ring = svgEl('circle', { class: 'node-ring', fill: 'none' });
  const marker = node.kind === 'machine'
    ? svgEl('rect', { class: 'node-marker' })
    : svgEl('circle', { class: 'node-marker' });
  const pip = svgEl('circle', { class: 'node-pip', fill: '#fff' });
  body.append(halo, ring, marker, pip);

  if (node.kind === 'machine') {
    const ticks = svgEl('g', { class: 'node-ticks' });
    for (let i = 0; i < CONFIG.node.machineTicks; i++) ticks.appendChild(svgEl('line'));
    body.insertBefore(ticks, marker);
  }

  // `node-name`, not `node-label`: a label-kind node's group already
  // carries `node-label` from `node-${node.kind}`, and the text element's
  // `pointer-events: none` would then make every record label on the map
  // unclickable.
  const label = svgEl('text', { class: 'node-name' });
  const hook = svgEl('text', { class: 'node-hook' });

  g.append(hitArea, span, place, label, hook);
  breathe(body, node.id);

  g.addEventListener('click', () => onSelect(node));
  g.addEventListener('mouseenter', () => onHover(node, true));
  g.addEventListener('mouseleave', () => onHover(node, false));

  return g;
}

// degreeFactor: precomputed per-node multiplier from graph connectedness
// (see graph.js), already scaled into CONFIG.node.degreeRadiusFactor's
// min..max range.
export function updateNodeElement(g, node, position, zoomLevel, scale, degreeFactor) {
  const color = colorFor(node.lineage);
  const isMachine = node.kind === 'machine';
  const radius = ((CONFIG.node.radius[zoomLevel] ?? CONFIG.node.radius.mid) * degreeFactor) / scale;
  const strokeWidth = (zoomLevel === 'collapsed' ? 1 : CONFIG.node.strokeWidth) / scale;

  const hitArea = g.querySelector('.node-hit');
  const span = g.querySelector('.node-span');
  const place = g.querySelector('.node-place');
  const halo = g.querySelector('.node-halo');
  const ring = g.querySelector('.node-ring');
  const marker = g.querySelector('.node-marker');
  const pip = g.querySelector('.node-pip');
  const label = g.querySelector('.node-name');
  const hook = g.querySelector('.node-hook');

  // Shapes inside sit at the origin; this group carries the position so
  // the breathing scale inside it stays about the node's own centre.
  place.setAttribute('transform', `translate(${position.x1},${position.y})`);

  const hitHeight = (zoomLevel === 'detail' ? 26 : 18) / scale;
  const hitPadEnd = (zoomLevel === 'collapsed' ? 4 : 140) / scale;
  setAttrs(hitArea, {
    x: position.x1 - radius - 2 / scale,
    y: position.y - hitHeight / 2,
    width: Math.max(position.x2 - position.x1, 0) + radius * 2 + hitPadEnd,
    height: hitHeight,
  });

  // A faint "orbital track" for the active-year span rather than a bold
  // Gantt bar -- the marker should read as the dominant shape.
  setAttrs(span, {
    x1: position.x1,
    y1: position.y,
    x2: position.x2,
    y2: position.y,
    stroke: color,
    'stroke-width': strokeWidth,
    'stroke-opacity': isMachine ? 0.5 : 0.22,
    'stroke-dasharray': isMachine ? 'none' : `${1 / scale},${3 / scale}`,
  });

  setAttrs(halo, {
    cx: 0, cy: 0,
    r: radius * CONFIG.node.haloRadiusMultiplier,
    fill: `url(#${haloGradientId(node.lineage)})`,
    opacity: CONFIG.node.haloOpacity,
  });

  setAttrs(ring, {
    cx: 0, cy: 0,
    r: radius + CONFIG.node.ringGap / scale,
    stroke: color,
    'stroke-width': 0.9 / scale,
    'stroke-opacity': isMachine ? 0.55 : 0.38,
  });
  // Hover recolours the ring white and no render is scheduled on mouse
  // leave, so un-hover has to restore the colour itself rather than wait
  // for the next frame.
  ring.dataset.baseStroke = color;

  if (isMachine) {
    const ticks = g.querySelectorAll('.node-ticks line');
    const inner = radius + (CONFIG.node.ringGap + 3) / scale;
    const outer = radius + (CONFIG.node.ringGap + 7) / scale;
    ticks.forEach((tick, i) => {
      const angle = (i / CONFIG.node.machineTicks) * Math.PI * 2;
      setAttrs(tick, {
        x1: Math.cos(angle) * inner,
        y1: Math.sin(angle) * inner,
        x2: Math.cos(angle) * outer,
        y2: Math.sin(angle) * outer,
        stroke: color,
        'stroke-width': 1.1 / scale,
        'stroke-opacity': 0.45,
      });
    });
    setAttrs(marker, { x: -radius * 0.7, y: -radius * 0.7, width: radius * 1.4, height: radius * 1.4, rx: 1.5 / scale, fill: color });
  } else {
    setAttrs(marker, { cx: 0, cy: 0, r: radius, fill: color });
  }

  setAttrs(pip, { cx: 0, cy: 0, r: radius * 0.4, opacity: 0.85 });

  const showLabel = zoomLevel !== 'collapsed';
  const showHook = zoomLevel === 'detail';

  label.style.display = showLabel ? '' : 'none';
  if (showLabel) {
    setAttrs(label, {
      x: position.x1,
      y: position.y - radius - 9 / scale,
      'text-anchor': 'middle',
      'font-size': CONFIG.node.labelFontSize / scale,
      fill: CONFIG.colors.ink,
      'paint-order': 'stroke',
      stroke: CONFIG.colors.background,
      'stroke-width': 3.5 / scale,
      'stroke-linejoin': 'round',
    });
    label.textContent = truncate(node.name, CONFIG.node.labelMaxChars);
  }

  hook.style.display = showHook ? '' : 'none';
  if (showHook) {
    setAttrs(hook, {
      x: position.x1,
      y: position.y + radius + 14 / scale,
      'text-anchor': 'middle',
      'font-size': CONFIG.node.hookFontSize / scale,
      fill: CONFIG.colors.dim,
      'paint-order': 'stroke',
      stroke: CONFIG.colors.background,
      'stroke-width': 3 / scale,
      'stroke-linejoin': 'round',
    });
    hook.textContent = truncate(node.hook, 60);
  }
}

export function setNodeHovered(g, hovered, scale) {
  g.classList.toggle('node-hovered', hovered);
  const ring = g.querySelector('.node-ring');
  if (hovered) {
    ring.setAttribute('stroke', '#fff');
    ring.setAttribute('stroke-width', String(CONFIG.node.hoverStrokeWidth / scale));
    ring.setAttribute('stroke-opacity', '0.9');
  } else {
    const isMachine = g.classList.contains('node-machine');
    ring.setAttribute('stroke', ring.dataset.baseStroke ?? CONFIG.colors.lineage.other);
    ring.setAttribute('stroke-width', String(0.9 / scale));
    ring.setAttribute('stroke-opacity', isMachine ? '0.55' : '0.38');
  }
}
