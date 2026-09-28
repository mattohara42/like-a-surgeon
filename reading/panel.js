// The reading drawer: one panel on the right that overlays the map (Q13).
//
// It knows nothing about records. It holds a current target
// ({ kind: 'node' | 'edge', id }), asks `renderTarget` to draw it, and keeps
// a short back stack so a reader who follows three edges sideways can step
// back without hunting for where they were. The stack is in memory only;
// a shareable URL for a view is in the backlog.
//
// `renderTarget` may return a Promise, since a record's full text loads
// only when its panel opens (render/loader.js). Until it settles the panel
// shows `renderLoading(target)`, and `renderFailed(target, err)` if it
// fails. A result that arrives after the reader has moved on is dropped.

import { CONFIG } from '../config.js';
import { h } from './dom.js';

export function createPanel(el, { renderTarget, renderLoading, renderFailed, onNavigate, onClose }) {
  let current = null;
  const stack = [];
  let returnFocusTo = null;

  el.style.width = `min(${CONFIG.panel.widthPx}px, ${CONFIG.panel.maxViewportFraction * 100}vw)`;
  el.style.transitionDuration = `${CONFIG.panel.slideMs}ms`;
  el.setAttribute('role', 'complementary');
  el.setAttribute('aria-label', 'Details');
  el.setAttribute('aria-hidden', 'true');
  el.inert = true;

  // Bumped on every draw, so a slow load for a target the reader has left
  // cannot overwrite what they are reading now.
  let drawToken = 0;

  // `scrollTop` is where to leave the scroll once the content is in: 0 for
  // a new target, the old position for a redraw in place. `andFocus` moves
  // focus to the heading once the real content is in.
  function draw({ scrollTop = 0, andFocus = false } = {}) {
    const token = ++drawToken;
    const controls = h(
      'div',
      { class: 'panel-controls' },
      stack.length
        ? h('button', { type: 'button', class: 'panel-back', onClick: back }, '← Back')
        : null,
      h('button', { type: 'button', class: 'panel-close', 'aria-label': 'Close', onClick: close }, '×'),
    );
    const show = (body) => {
      if (token !== drawToken) return;
      el.replaceChildren(controls, body);
      el.scrollTop = scrollTop;
      if (andFocus) focusHeading();
    };
    const result = renderTarget(current);
    if (typeof result?.then !== 'function') {
      show(result);
      return;
    }
    const target = current;
    el.replaceChildren(controls, renderLoading(target));
    result.then(show, (err) => {
      console.error(err);
      show(renderFailed(target, err));
    });
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
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    el.inert = false;
    draw({ andFocus: true });
  }

  function back() {
    if (!stack.length) return;
    current = stack.pop();
    draw({ andFocus: true });
    onNavigate(current);
  }

  function close() {
    if (!isOpen()) return;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    el.inert = true;
    current = null;
    stack.length = 0;
    drawToken++;
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
      draw({ scrollTop: el.scrollTop });
    },
    // Width the drawer covers right now, for the camera inset. offsetWidth
    // ignores the slide transform, so this is correct mid-animation.
    coveredWidth: () => (isOpen() ? el.offsetWidth : 0),
  };
}
