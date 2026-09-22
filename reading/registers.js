// Which reading registers exist, which one the reader picked, and the
// selector that switches between them.
//
// A register is offered only when every reader-facing register object
// carries it (Q15). That is read from the data at load, never hardcoded,
// so the Kid register appears on its own the day the Track D pass is
// complete and not a day before (A11). Half a register would give a
// 9-year-old a map that silently switches back to teenage text mid-panel.

import { CONFIG } from '../config.js';
import { COPY } from './copy.js';
import { h } from './dom.js';

// Every register object a reader can reach: blurbs, edge explanations, demo
// captions, thread text, and the interface's own copy.
function* registerObjects(data) {
  for (const node of data.nodes) {
    if (node.raw.blurb) yield node.raw.blurb;
  }
  for (const edge of data.edges) {
    if (edge.explanation) yield edge.explanation;
  }
  for (const demo of Object.values(data.demos)) {
    if (demo.caption) yield demo.caption;
  }
  for (const thread of Object.values(data.threads)) {
    if (thread.intro) yield thread.intro;
    if (thread.outro) yield thread.outro;
    for (const step of thread.steps ?? []) {
      if (step.framing) yield step.framing;
    }
  }
  yield* copyObjects(COPY);
}

// Walks the copy tree for leaf register objects: any object whose values
// are all strings.
function* copyObjects(node) {
  const values = Object.values(node);
  if (values.length && values.every((v) => typeof v === 'string')) {
    yield node;
    return;
  }
  for (const value of values) {
    if (value && typeof value === 'object') yield* copyObjects(value);
  }
}

export function availableRegisters(data) {
  const candidates = CONFIG.reading.registers.map((r) => r.key);
  const complete = new Set(candidates);
  for (const obj of registerObjects(data)) {
    for (const key of complete) {
      if (typeof obj[key] !== 'string' || !obj[key].trim()) complete.delete(key);
    }
    if (complete.size === 0) break;
  }
  return CONFIG.reading.registers.filter((r) => complete.has(r.key));
}

// localStorage can throw outright (private mode, blocked site data), so
// every access is guarded, same as render/layers.js. A saved register that
// is no longer offered falls back to the default.
export function loadRegister(available) {
  const keys = available.map((r) => r.key);
  const fallback = keys.includes(CONFIG.reading.defaultRegister)
    ? CONFIG.reading.defaultRegister
    : keys[0];
  try {
    const saved = localStorage.getItem(CONFIG.reading.storageKey);
    if (saved && keys.includes(saved)) return saved;
  } catch {
    // ignored: fall through to the default
  }
  return fallback;
}

export function saveRegister(key) {
  try {
    localStorage.setItem(CONFIG.reading.storageKey, key);
  } catch {
    // ignored: the map works, it just will not remember
  }
}

// The text for `key` from a register object. Falls back through the
// offered order rather than printing nothing, which only matters for a
// malformed record the validator would already have flagged.
export function pick(obj, key) {
  if (!obj) return '';
  if (obj[key]) return obj[key];
  for (const r of CONFIG.reading.registers) {
    if (obj[r.key]) return obj[r.key];
  }
  return '';
}

export function createRegisterSelector(root, available, current, onChange) {
  root.replaceChildren(
    h('span', { class: 'register-caption', id: 'register-caption' }, 'Reading'),
    ...available.map((r) =>
      h(
        'button',
        {
          type: 'button',
          class: 'layer-toggle',
          'aria-pressed': String(r.key === current),
          onClick: () => onChange(r.key),
        },
        r.label,
      ),
    ),
  );
  root.setAttribute('aria-labelledby', 'register-caption');
}
