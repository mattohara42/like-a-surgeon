// Shared gradient defs for edge trails and machine beams.
//
// One gradient per *lineage pair* (lineages^2) rather
// than one per edge: viewport culling creates and destroys edge elements
// constantly while panning, and per-edge defs would mean adding and
// removing <linearGradient> nodes on every frame. Trails use
// objectBoundingBox units so one horizontal gradient serves any trail
// regardless of where it sits on the time axis.

import { CONFIG } from '../config.js';
import { svgEl } from './svg.js';
import { lineageIds, lineageColor } from './lineages.js';

export const trailGradientId = (from, to) => `lg-${from}-${to}`;
export const beamGradientId = (lineage) => `bm-${lineage}`;

export function colorFor(lineage) {
  return lineageColor(lineage);
}

export function createEdgeGradients() {
  const out = [];

  for (const from of lineageIds()) {
    for (const to of lineageIds()) {
      const g = svgEl('linearGradient', {
        id: trailGradientId(from, to),
        x1: '0', y1: '0', x2: '1', y2: '0',
      });
      g.append(
        svgEl('stop', { offset: '0%', 'stop-color': colorFor(from) }),
        svgEl('stop', { offset: '100%', 'stop-color': colorFor(to) }),
      );
      out.push(g);
    }
  }

  // Beams run bottom (machine, on the floor) to top (artist, in a lane),
  // so these are vertical and in objectBoundingBox units too. Kept
  // coloured the whole way: a beam that fades to transparent at the top
  // reads as grey smoke as soon as two of them overlap.
  const { near, mid, far } = CONFIG.beam.stops;
  for (const lineage of lineageIds()) {
    const g = svgEl('linearGradient', {
      id: beamGradientId(lineage),
      x1: '0', y1: '0', x2: '0', y2: '1',
    });
    g.append(
      svgEl('stop', { offset: '0%', 'stop-color': colorFor(lineage), 'stop-opacity': near }),
      svgEl('stop', { offset: '45%', 'stop-color': colorFor(lineage), 'stop-opacity': mid }),
      svgEl('stop', { offset: '100%', 'stop-color': colorFor(lineage), 'stop-opacity': far }),
    );
    out.push(g);
  }

  return out;
}

// Radial halo fills, one per lineage, referenced by every node of that
// lineage rather than one gradient each.
export const haloGradientId = (lineage) => `halo-${lineage}`;

export function createHaloGradients() {
  return lineageIds().map((lineage) => {
    const g = svgEl('radialGradient', { id: haloGradientId(lineage) });
    g.append(
      svgEl('stop', { offset: '0%', 'stop-color': colorFor(lineage), 'stop-opacity': 0.6 }),
      svgEl('stop', { offset: '52%', 'stop-color': colorFor(lineage), 'stop-opacity': 0.16 }),
      svgEl('stop', { offset: '100%', 'stop-color': colorFor(lineage), 'stop-opacity': 0 }),
    );
    return g;
  });
}
