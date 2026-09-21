// Pan/zoom transform state and the viewport-culling math built on top of
// it. The transform is applied as `translate(tx,ty) scale(s)` on a single
// root <g>, so content-space coordinates map to screen space as
// screen = content * scale + translate.

import { CONFIG } from '../config.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createViewportState() {
  return { tx: 0, ty: 0, scale: CONFIG.zoom.initial };
}

export function screenToContent(vp, sx, sy) {
  return { x: (sx - vp.tx) / vp.scale, y: (sy - vp.ty) / vp.scale };
}

// Zooms by `deltaScale` (a multiplier) while keeping the content point
// currently under the (sx, sy) screen point fixed in place.
export function zoomAt(vp, sx, sy, deltaScale) {
  const newScale = clamp(vp.scale * deltaScale, CONFIG.zoom.min, CONFIG.zoom.max);
  const content = screenToContent(vp, sx, sy);
  vp.scale = newScale;
  vp.tx = sx - content.x * newScale;
  vp.ty = sy - content.y * newScale;
}

export function pan(vp, dxScreen, dyScreen) {
  vp.tx += dxScreen;
  vp.ty += dyScreen;
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
