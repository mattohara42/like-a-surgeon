// Pan/zoom transform state and the viewport-culling math built on top of
// it. The transform is applied as `translate(tx,ty) scale(s)` on a single
// root <g>, so content-space coordinates map to screen space as
// screen = content * scale + translate.

import { CONFIG } from '../config.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createViewportState() {
  return { tx: 0, ty: 0, scale: CONFIG.zoom.initial, _cancelAnimation: null };
}

export function screenToContent(vp, sx, sy) {
  return { x: (sx - vp.tx) / vp.scale, y: (sy - vp.ty) / vp.scale };
}

// Any user-initiated pan/zoom interrupts an in-flight fly-to animation
// rather than fighting it frame by frame.
function cancelAnimation(vp) {
  if (vp._cancelAnimation) {
    vp._cancelAnimation();
    vp._cancelAnimation = null;
  }
}

// Zooms by `deltaScale` (a multiplier) while keeping the content point
// currently under the (sx, sy) screen point fixed in place.
export function zoomAt(vp, sx, sy, deltaScale) {
  cancelAnimation(vp);
  const newScale = clamp(vp.scale * deltaScale, CONFIG.zoom.min, CONFIG.zoom.max);
  const content = screenToContent(vp, sx, sy);
  vp.scale = newScale;
  vp.tx = sx - content.x * newScale;
  vp.ty = sy - content.y * newScale;
}

export function pan(vp, dxScreen, dyScreen) {
  cancelAnimation(vp);
  vp.tx += dxScreen;
  vp.ty += dyScreen;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

// Animates tx/ty/scale to center (contentX, contentY) at targetScale,
// within viewport pixel dimensions (viewportWidthPx/viewportHeightPx).
// Calls onFrame() after each mutation (the caller schedules a render from
// it) and onDone() once the animation completes or is interrupted.
export function flyTo(vp, contentX, contentY, targetScale, viewportWidthPx, viewportHeightPx, onFrame, onDone) {
  cancelAnimation(vp);
  const clampedScale = clamp(targetScale, CONFIG.zoom.min, CONFIG.zoom.max);
  const startTx = vp.tx;
  const startTy = vp.ty;
  const startScale = vp.scale;
  const endTx = viewportWidthPx / 2 - contentX * clampedScale;
  const endTy = viewportHeightPx / 2 - contentY * clampedScale;
  const durationMs = CONFIG.zoom.flyToDurationMs;
  const startTime = performance.now();

  let cancelled = false;
  let rafId = null;
  vp._cancelAnimation = () => {
    cancelled = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
  };

  function step(now) {
    if (cancelled) return;
    const t = Math.min(1, (now - startTime) / durationMs);
    const eased = easeInOutCubic(t);
    vp.tx = startTx + (endTx - startTx) * eased;
    vp.ty = startTy + (endTy - startTy) * eased;
    vp.scale = startScale + (clampedScale - startScale) * eased;
    onFrame();
    if (t < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      vp._cancelAnimation = null;
      onDone?.();
    }
  }
  rafId = requestAnimationFrame(step);
}

export function transformString(vp) {
  return `translate(${vp.tx},${vp.ty}) scale(${vp.scale})`;
}

// The content-space rectangle currently on screen (plus a margin so nodes
// don't visibly pop in/out right at the viewport edge), used to decide
// which nodes/edges actually need DOM elements this frame.
export function visibleContentRange(vp, viewportWidthPx, viewportHeightPx) {
  const margin = CONFIG.viewport.cullMarginPx;
  const topLeft = screenToContent(vp, -margin, -margin);
  const bottomRight = screenToContent(vp, viewportWidthPx + margin, viewportHeightPx + margin);
  return { x1: topLeft.x, y1: topLeft.y, x2: bottomRight.x, y2: bottomRight.y };
}
