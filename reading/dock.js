// The control dock, top left (Q42, A312). One round, coloured button per
// row of controls (Show, Reading level, Spotlight). Each opens
// its row sideways, one at a time, so the corner holds small buttons
// instead of rows of pills. Sound is not here: its volume lives in
// each demo, where the sound is (A317).
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

// `onLayout` runs when a row opens or closes, since the space the dock
// covers on the map changes with it. `yieldTo` lists other fixed
// controls: one an open row would run across steps out of its way until
// the row closes, which on a narrow screen is the search box and the goal
// pills at the top centre.
export function createDock(root, onLayout = () => {}, yieldTo = []) {
  let register = CONFIG.reading.defaultRegister;
  let openKey = null;
  let closeTimer = null;
  const items = new Map();

  for (const item of CONFIG.dock.items) {
    const flyout = document.getElementById(item.el);
    flyout.classList.add('dock-flyout');
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
    for (const [k, { button, wrap }] of items) {
      const open = k === key;
      button.setAttribute('aria-expanded', String(open));
      wrap.classList.toggle('open', open);
    }
    clearWay();
    armClose();
    onLayout();
  }

  // Where the open row will sit once it has slid out. Its slide only moves
  // and stretches it sideways, so its height is already final; its width
  // and offset are read untransformed.
  function clearWay() {
    const item = items.get(openKey);
    let row = null;
    if (item) {
      const { top, bottom } = item.flyout.getBoundingClientRect();
      const left = item.wrap.getBoundingClientRect().left + item.flyout.offsetLeft;
      row = { top, bottom, left, right: left + item.flyout.offsetWidth };
    }
    for (const el of yieldTo) {
      const r = el.getBoundingClientRect();
      const crossed = row !== null && r.width > 0 &&
        row.left < r.right && row.right > r.left && row.top < r.bottom && row.bottom > r.top;
      el.classList.toggle('yield-to-dock', crossed);
    }
  }

  // Slides the open row back in after CONFIG.dock.autoCloseMs unused. Any
  // use restarts the count. The pointer resting on it, or keyboard focus
  // in it, holds it open. Only keyboard focus: a mouse click leaves focus
  // on the pill clicked, which would hold the row open for good.
  function armClose() {
    clearTimeout(closeTimer);
    if (openKey === null) return;
    closeTimer = setTimeout(() => {
      const wrap = items.get(openKey)?.wrap;
      if (wrap && (wrap.matches(':hover') || wrap.querySelector(':focus-visible'))) armClose();
      else setOpen(null);
    }, CONFIG.dock.autoCloseMs);
  }
  for (const event of ['pointermove', 'pointerdown', 'input', 'keydown', 'focusin']) {
    root.addEventListener(event, armClose);
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
