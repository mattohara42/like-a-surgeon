// Pan/zoom input handling. Node/edge click and hover are wired directly on
// their own SVG elements in nodes.js/edges.js (native DOM hit testing is
// effectively free for SVG shapes); this module only owns the wheel/drag/
// keyboard gestures that move the shared viewport.

import { CONFIG } from '../config.js';
import { zoomAt, pan } from './viewport.js';

const KEY_PAN_PX = 60;
// Movement past this many screen px turns a pointerdown into a drag/pan.
// Below it, it's a click. This distinction matters beyond UX: calling
// setPointerCapture unconditionally on every pointerdown makes the browser
// retarget the click event synthesized right after pointerup to the
// capturing element instead of whatever's actually under the cursor, which
// silently breaks node/edge click handlers. So capture is only acquired
// once a real drag is confirmed, never for a plain click.
const DRAG_THRESHOLD_PX = 4;

export function attachPanZoomHandlers(svgEl, vp, onChange) {
  let tracking = false;
  let dragging = false;
  let pointerId = null;
  let downX = 0;
  let downY = 0;
  let lastX = 0;
  let lastY = 0;

  svgEl.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const rect = svgEl.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * CONFIG.zoom.wheelSensitivity);
      zoomAt(vp, sx, sy, factor);
      onChange();
    },
    { passive: false },
  );

  svgEl.addEventListener('pointerdown', (e) => {
    tracking = true;
    dragging = false;
    pointerId = e.pointerId;
    downX = lastX = e.clientX;
    downY = lastY = e.clientY;
  });

  svgEl.addEventListener('pointermove', (e) => {
    if (!tracking || e.pointerId !== pointerId) return;
    if (!dragging) {
      const movedPx = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (movedPx < DRAG_THRESHOLD_PX) return;
      dragging = true;
      // Can throw if the pointer session ended between events (observed
      // under synthetic/fast input); losing capture just means pan drags
      // stop working for this gesture, not worth failing the handler over.
      try {
        svgEl.setPointerCapture(pointerId);
      } catch {
        // ignored
      }
      svgEl.classList.add('dragging');
    }
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    pan(vp, dx, dy);
    onChange();
  });

  const stopDragging = (e) => {
    if (dragging && svgEl.hasPointerCapture(e.pointerId)) svgEl.releasePointerCapture(e.pointerId);
    tracking = false;
    dragging = false;
    svgEl.classList.remove('dragging');
  };
  svgEl.addEventListener('pointerup', stopDragging);
  svgEl.addEventListener('pointercancel', stopDragging);

  svgEl.tabIndex = 0;
  svgEl.addEventListener('keydown', (e) => {
    const rect = svgEl.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    switch (e.key) {
      case 'ArrowLeft':
        pan(vp, KEY_PAN_PX, 0);
        break;
      case 'ArrowRight':
        pan(vp, -KEY_PAN_PX, 0);
        break;
      case 'ArrowUp':
        pan(vp, 0, KEY_PAN_PX);
        break;
      case 'ArrowDown':
        pan(vp, 0, -KEY_PAN_PX);
        break;
      case '+':
      case '=':
        zoomAt(vp, cx, cy, 1.2);
        break;
      case '-':
        zoomAt(vp, cx, cy, 1 / 1.2);
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange();
  });
}
