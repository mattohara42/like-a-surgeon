// Lenses (docs/m5-architecture.md section 4): a row in the top-left stack
// that lights the edges carrying one overlay tag and quiets the rest, and
// the short card each lens opens in the drawer to say what it shows.
//
// The tags come from CONFIG.lenses.tags, the enum in data/SCHEMA.md. The
// card counts the edges each lens lights from the loaded data, so its
// numbers stay true as the map grows.

import { CONFIG } from '../config.js';
import { COPY } from './copy.js';
import { h } from './dom.js';
import { pick } from './registers.js';

export function loadLens() {
  try {
    const saved = localStorage.getItem(CONFIG.lenses.storageKey);
    if (CONFIG.lenses.tags.includes(saved)) return saved;
  } catch {
    // ignored: no lens
  }
  return null;
}

export function saveLens(tag) {
  try {
    if (tag) localStorage.setItem(CONFIG.lenses.storageKey, tag);
    else localStorage.removeItem(CONFIG.lenses.storageKey);
  } catch {
    // ignored: the map works, it just will not remember
  }
}

// `current` is a tag or null; `onChange(tagOrNull)`.
export function createLensControl(root, current, register, onChange) {
  const caption = h('span', { class: 'register-caption', id: 'lens-caption' }, pick(COPY.lenses.caption, register));
  const button = (key, label) =>
    h(
      'button',
      { type: 'button', class: 'layer-toggle', 'aria-pressed': String(key === current), onClick: () => onChange(key) },
      label,
    );
  root.setAttribute('aria-labelledby', 'lens-caption');
  root.replaceChildren(
    caption,
    button(null, pick(COPY.lenses.none, register)),
    ...CONFIG.lenses.tags.map((tag) => button(tag, pick(COPY.lenses[tag].name, register))),
  );
}

// The drawer card for a lens: what it lights, how many, and what to look
// for.
export function renderLensCard(tag, edges, ctx) {
  const lit = edges.filter((e) => e.tags?.includes(tag)).length;
  const copy = COPY.lenses[tag];
  return h(
    'article',
    { class: 'panel-body lens-card' },
    h('div', { class: 'kicker' }, pick(COPY.lenses.caption, ctx.register)),
    h('h2', {}, pick(copy.name, ctx.register)),
    h('p', { class: 'meta' }, `${lit} ${pick(COPY.lenses.of, ctx.register)} ${edges.length} ${pick(COPY.lenses.connections, ctx.register)}`),
    h('p', { class: 'body' }, pick(copy.intro, ctx.register)),
    h('p', { class: 'note' }, pick(COPY.lenses.howTo, ctx.register)),
    h('button', { type: 'button', class: 'welcome-skip', onClick: ctx.clearLens }, pick(COPY.lenses.clear, ctx.register)),
  );
}
