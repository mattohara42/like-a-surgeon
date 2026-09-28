// A tiny element builder for the reading surface. Every string that reaches
// the page goes in through textContent, never innerHTML: the data is
// hand-edited JSON, and a stray angle bracket in a blurb should print as an
// angle bracket rather than become markup.

import { CONFIG } from '../config.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// h('p', { class: 'body' }, 'text', otherNode, null)
// Attributes starting with "on" are event listeners. null, undefined and
// false children are skipped, so optional sections can be written inline.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value === true ? '' : String(value));
    }
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

// A short sample of line drawn exactly the way the map draws an edge of
// this tier, read from the same CONFIG values rather than restated, so the
// panel and the map cannot drift apart.
export function tierSwatch(confidence) {
  const width = CONFIG.edge.strokeWidth[confidence] ?? CONFIG.edge.strokeWidth.consensus;
  const dash = CONFIG.edge.dashArray[confidence] ?? 'none';
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'tier-swatch');
  svg.setAttribute('viewBox', '0 0 24 6');
  svg.setAttribute('aria-hidden', 'true');
  const line = document.createElementNS(SVG_NS, 'line');
  for (const [k, v] of Object.entries({
    x1: 1, y1: 3, x2: 23, y2: 3,
    stroke: 'currentColor',
    'stroke-width': width,
    'stroke-dasharray': dash,
    'stroke-linecap': 'round',
    'stroke-opacity': CONFIG.edge.tierOpacity[confidence] ?? 1,
  })) line.setAttribute(k, v);
  svg.appendChild(line);
  return svg;
}
