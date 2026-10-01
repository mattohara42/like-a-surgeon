// The control dock, top left (Q42, A312). One round, coloured button per
// row of controls (Show, Reading level, Arrange by, Sound, Spotlight).
// Each opens its row sideways, one at a time, so the corner holds five
// small buttons instead of five rows of pills.
//
// The rows themselves are drawn by their own modules, into the elements
// CONFIG.dock names, exactly as before. The dock only moves each one into
// a flyout and shows or hides it. A dot on a button says its row is not at
// its default, so a reader can see something is switched without opening
// anything.

import { CONFIG } from '../config.js';
import { COPY } from './copy.js';
import { h } from './dom.js';
import { pick } from './registers.js';

export function createDock(root) {
  let register = CONFIG.reading.defaultRegister;
  let openKey = null;
  const items = new Map();

  for (const item of CONFIG.dock.items) {
    const flyout = document.getElementById(item.el);
    flyout.classList.add('dock-flyout');
    flyout.hidden = true;
    const button = h(
      'button',
      {
        type: 'button',
        class: 'dock-button',
        'aria-expanded': 'false',
        'aria-controls': item.el,
        onClick: () => setOpen(openKey === item.key ? null : item.key),
      },
      h('span', { class: 'dock-glyph', 'aria-hidden': 'true' }, item.glyph),
      h('span', { class: 'dock-badge', 'aria-hidden': 'true' }),
    );
    const wrap = h('div', { class: 'dock-item', style: `--dock-color:${item.color}` }, button, flyout);
    root.appendChild(wrap);
    items.set(item.key, { button, flyout, wrap, changed: false });
  }

  function setOpen(key) {
    openKey = key;
    for (const [k, { button, flyout, wrap }] of items) {
      const open = k === key;
      flyout.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      wrap.classList.toggle('open', open);
    }
  }

  function label(key) {
    const { button, changed } = items.get(key);
    const name = pick(COPY.dock[key], register);
    const text = changed ? `${name} (${pick(COPY.dock.changed, register)})` : name;
    button.setAttribute('aria-label', text);
    button.title = name;
  }

  // Closed by Escape, or by pressing anywhere outside the dock: on the map,
  // that is also the start of a pan or a click, which still happens.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || openKey === null) return;
    const button = items.get(openKey).button;
    setOpen(null);
    button.focus();
  });
  document.addEventListener('pointerdown', (e) => {
    if (openKey !== null && !root.contains(e.target)) setOpen(null);
  });

  root.setAttribute('aria-label', pick(COPY.dock.label, register));
  for (const key of items.keys()) label(key);

  return {
    // Marks a row as not at its default.
    setChanged(key, changed) {
      const item = items.get(key);
      item.changed = changed;
      item.wrap.classList.toggle('changed', changed);
      label(key);
    },
    setRegister(next) {
      register = next;
      root.setAttribute('aria-label', pick(COPY.dock.label, register));
      for (const key of items.keys()) label(key);
    },
  };
}
