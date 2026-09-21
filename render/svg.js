// Minimal SVG DOM helpers. No framework, no virtual DOM: nodes/edges are
// created once and mutated in place on pan/zoom/culling updates.

const SVG_NS = 'http://www.w3.org/2000/svg';

export function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  setAttrs(el, attrs);
  return el;
}

export function setAttrs(el, attrs) {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined) continue;
    el.setAttribute(key, String(value));
  }
  return el;
}
