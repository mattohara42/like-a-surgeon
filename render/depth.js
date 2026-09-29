// The map's edges, dissolved. Lane bands, axis ticks, the machine floor
// and the scene clouds are drawn past the content on every side and faded
// out through one mask, so zoomed all the way out the map reads as a
// region of a field that keeps going rather than a box floating in the
// void.
//
// One mask, not one per layer: a mask repaints with everything under it on
// every pan frame, so the fewer the better. Its gradients run in content
// coordinates (userSpaceOnUse), which is what keeps the fade pinned to the
// map's ends as the viewport transform moves it.

import { CONFIG } from '../config.js';
import { svgEl } from './svg.js';

// The content rectangle the fade runs out from: the time axis's full width
// and every lane (plus the machine floor, when it is drawn).
export function depthExtent(layout) {
  const fade = CONFIG.depth.fadePx;
  const x0 = layout.timeScale.toX(layout.timeScale.year0);
  const x1 = layout.totalWidth;
  const y0 = 0;
  const y1 = layout.substrate ? layout.substrate.horizonY + layout.substrate.depth : layout.totalHeight;
  return { x0, x1, y0, y1, fade };
}

function fadeGradient(id, axis, from, to, fade) {
  const span = to - from + fade * 2;
  const edge = fade / span;
  const gradient = svgEl('linearGradient', {
    id,
    gradientUnits: 'userSpaceOnUse',
    x1: axis === 'x' ? from - fade : 0,
    x2: axis === 'x' ? to + fade : 0,
    y1: axis === 'y' ? from - fade : 0,
    y2: axis === 'y' ? to + fade : 0,
  });
  // A mask reads luminance: white shows, black hides. The ease in the
  // middle stop keeps the fade from ending in a visible line.
  const stops = [
    [0, 0],
    [edge * 0.55, 0.28],
    [edge, 1],
    [1 - edge, 1],
    [1 - edge * 0.55, 0.28],
    [1, 0],
  ];
  gradient.append(
    ...stops.map(([offset, level]) =>
      svgEl('stop', { offset, 'stop-color': '#fff', 'stop-opacity': level }),
    ),
  );
  return gradient;
}

export function createDepthDefs(layout) {
  const { x0, x1, y0, y1, fade } = depthExtent(layout);
  const box = { x: x0 - fade, y: y0 - fade, width: x1 - x0 + fade * 2, height: y1 - y0 + fade * 2 };

  // Two fades multiply: the horizontal one is a rect inside the mask, and
  // that rect is itself masked by the vertical one.
  const maskY = svgEl('mask', { id: 'depth-fade-y', maskUnits: 'userSpaceOnUse', ...box });
  maskY.appendChild(svgEl('rect', { ...box, fill: 'url(#depth-grad-y)' }));

  const mask = svgEl('mask', { id: 'depth-fade', maskUnits: 'userSpaceOnUse', ...box });
  mask.appendChild(svgEl('rect', { ...box, fill: 'url(#depth-grad-x)', mask: 'url(#depth-fade-y)' }));

  return [
    fadeGradient('depth-grad-x', 'x', x0, x1, fade),
    fadeGradient('depth-grad-y', 'y', y0, y1, fade),
    maskY,
    mask,
  ];
}
