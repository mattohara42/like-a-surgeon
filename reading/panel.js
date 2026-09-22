// The reading drawer: one panel on the right that overlays the map (Q13).
//
// It knows nothing about records. It holds a current target
// ({ kind: 'node' | 'edge', id }), asks `renderTarget` to draw it, and keeps
// a short back stack so a reader who follows three edges sideways can step
// back without hunting for where they were. The stack is in memory only;
// a shareable URL for a view is in the backlog.

import { CONFIG } from '../config.js';
import { h } from './dom.js';

export function createPanel(el, { renderTarget, onNavigate, onClose }) {
  let current = null;
  const stack = [];
  let returnFocusTo = null;

  el.style.width = `min(${CONFIG.panel.widthPx}px, ${CONFIG.panel.maxViewportFraction * 100}vw)`;
  el.style.transitionDuration = `${CONFIG.panel.slideMs}ms`;
  el.setAttribute('role', 'complementary');
  el.setAttribute('aria-label', 'Details');
  el.setAttribute('aria-hidden', 'true');
  el.inert = true;

  function draw() {
    const controls = h(
      'div',
      { class: 'panel-controls' },
      stack.length
        ? h('button', { type: 'button', class: 'panel-back', onClick: back }, '← Back')
        : null,
      h('button', { type: 'button', class: 'panel-close', 'aria-label': 'Close', onClick: close }, '×'),
    );
    el.replaceChildren(controls, renderTarget(current));
    el.scrollTop = 0;
  }

  function focusHeading() {
    const heading = el.querySelector('h2');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }

  function open(target) {
    if (!isOpen()) {
      returnFocusTo = document.activeElement;
    } else if (current && !(current.kind === target.kind && current.id === target.id)) {
      stack.push(current);
      if (stack.length > CONFIG.panel.backStackMax) stack.shift();
    }
    current = target;
    draw();
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    el.inert = false;
    focusHeading();
  }

  function back() {
    if (!stack.length) return;
    current = stack.pop();
    draw();
    focusHeading();
    onNavigate(current);
  }

  function close() {
    if (!isOpen()) return;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    el.inert = true;
    current = null;
    stack.length = 0;
    // Hand focus back to where the reader was, if that is still on the page.
    if (returnFocusTo?.isConnected) returnFocusTo.focus({ preventScroll: true });
    returnFocusTo = null;
    onClose();
  }

  function isOpen() {
    return el.classList.contains('open');
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      e.preventDefault();
      close();
    }
  });

  return {
    open,
    close,
    back,
    isOpen,
    current: () => current,
    // Re-draw in place, for a register change. Keeps the stack and scroll
    // position's meaning; does not move focus.
    redraw: () => {
      if (!current) return;
      const scroll = el.scrollTop;
      draw();
      el.scrollTop = scroll;
    },
    // Width the drawer covers right now, for the camera inset. offsetWidth
    // ignores the slide transform, so this is correct mid-animation.
    coveredWidth: () => (isOpen() ? el.offsetWidth : 0),
  };
}
