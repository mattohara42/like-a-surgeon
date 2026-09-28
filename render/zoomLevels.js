// The three semantic zoom levels BUILD_PLAN's M2 milestone calls for.
// Picked purely from the current viewport scale, read from CONFIG so the
// thresholds are tunable in one place.
//
//   collapsed - zoomed far out: small dots only, no labels. Lane shape is
//               still readable but individual nodes aren't meant to be read.
//   mid       - node circle + name label.
//   detail    - node circle + name label + a one-line hook, and edges pick
//               up their confidence-tier styling (dash for asserted, etc).

import { CONFIG } from '../config.js';

export function zoomLevelForScale(scale) {
  const level = CONFIG.zoom.levels.find((l) => scale <= l.maxScale);
  return level ? level.name : CONFIG.zoom.levels.at(-1).name;
}

export const ZOOM_LEVEL_RANK = Object.fromEntries(CONFIG.zoom.levels.map((l, i) => [l.name, i]));
