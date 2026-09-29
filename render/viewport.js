// Pan/zoom transform state and the viewport-culling math built on top of
// it. The transform is applied as `translate(tx,ty) scale(s)` on a single
// root <g>, so content-space coordinates map to screen space as
// screen = content * scale + translate.

import { CONFIG } from '../config.js';
import { reducedMotion } from './motion.js';

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
  const clampedScale = clamp(targetScale, CONFIG.zoom.min, CONFIG.zoom.max);
  const endTx = viewportWidthPx / 2 - contentX * clampedScale;
  const endTy = viewportHeightPx / 2 - contentY * clampedScale;
  animateTo(vp, endTx, endTy, clampedScale, CONFIG.zoom.flyToDurationMs, onFrame, onDone);
}

// Animates the transform itself to (endTx, endTy, endScale). flyTo and the
// pull-back both go through here. Under reduced motion the camera cuts
// rather than moves.
function animateTo(vp, endTx, endTy, clampedScale, durationMsIfMoving, onFrame, onDone) {
  cancelAnimation(vp);
  const startTx = vp.tx;
  const startTy = vp.ty;
  const startScale = vp.scale;
  const durationMs = reducedMotion() ? 0 : durationMsIfMoving;
  const startTime = performance.now();

  let cancelled = false;
  let rafId = null;
  vp._cancelAnimation = () => {
    cancelled = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
  };

  function step(now) {
    if (cancelled) return;
    const t = durationMs > 0 ? Math.min(1, (now - startTime) / durationMs) : 1;
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

// If less than `keepPx` of the content rectangle (content coordinates) is
// on screen, eases the camera back by the smallest move that shows that
// much again. The map fades into the field at its edges (A250), so there
// is nothing to bump into, and without this a reader can drag it out of
// sight entirely. Returns true when it moved.
export function pullBackIntoView(vp, bounds, viewportWidthPx, viewportHeightPx, onFrame) {
  const keep = CONFIG.viewport.pullBack.keepVisiblePx;
  const left = bounds.x0 * vp.scale + vp.tx;
  const right = bounds.x1 * vp.scale + vp.tx;
  const top = bounds.y0 * vp.scale + vp.ty;
  const bottom = bounds.y1 * vp.scale + vp.ty;
  // How far each axis needs to move so that `keep` px of content overlaps
  // the screen (or all of it, when the content is smaller than that).
  const need = (lo, hi, span) => {
    const k = Math.min(keep, hi - lo);
    if (hi < k) return k - hi;
    if (lo > span - k) return span - k - lo;
    return 0;
  };
  const dx = need(left, right, viewportWidthPx);
  const dy = need(top, bottom, viewportHeightPx);
  if (dx === 0 && dy === 0) return false;
  animateTo(vp, vp.tx + dx, vp.ty + dy, vp.scale, CONFIG.viewport.pullBack.durationMs, onFrame);
  return true;
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
