// The machine floor: a plane receding below the lineage lanes, drawn in
// real perspective so a machine reads as sitting *under* the music rather
// than beside it.
//
// Depth here comes from perspective alone -- a bright horizon hairline,
// rows bunching toward it, and verticals converging on a vanishing point.
// Deliberately not from moving this layer at a different rate to the
// graph: the beams in edges.js cross the horizon, and any differential
// transform would desynchronise them from the machines they rise out of.
//
// Drawn once. Only stroke widths are counter-scaled per frame, same
// reasoning as nodes.js/edges.js.

import { CONFIG } from '../config.js';
import { svgEl, setAttrs } from './svg.js';

export function createSubstrateDefs() {
  const shade = svgEl('linearGradient', { id: 'floor-shade', x1: '0', y1: '0', x2: '0', y2: '1' });
  shade.append(
    svgEl('stop', { offset: '0%', 'stop-color': '#000', 'stop-opacity': 0 }),
    svgEl('stop', { offset: '100%', 'stop-color': '#000', 'stop-opacity': 0.5 }),
  );

  const fade = svgEl('linearGradient', { id: 'floor-fade', x1: '0', y1: '0', x2: '0', y2: '1' });
  fade.append(
    svgEl('stop', { offset: '0%', 'stop-color': CONFIG.colors.floorFade, 'stop-opacity': 0 }),
    svgEl('stop', { offset: '100%', 'stop-color': CONFIG.colors.floorFade, 'stop-opacity': 0.34 }),
  );

  return [shade, fade];
}

export function drawSubstrate(floorG, layout) {
  const { horizonY, depth, vanishX } = layout.substrate;
  const { rows, rowCurve, converge } = CONFIG.substrate;
  const { totalWidth, timeScale } = layout;
  const overhang = totalWidth;

  floorG.appendChild(
    svgEl('rect', {
      x: -overhang,
      y: horizonY,
      width: totalWidth + overhang * 2,
      height: depth + 300,
      fill: 'url(#floor-shade)',
    }),
  );

  // Verticals, one every few years, converging on the vanishing point.
  const span = timeScale.yearEnd - timeScale.year0;
  const step = span <= 40 ? 2 : Math.ceil(span / 20);
  for (let year = timeScale.year0; year <= timeScale.yearEnd; year += step) {
    const x = timeScale.toX(year);
    floorG.appendChild(
      svgEl('line', {
        class: 'floor-vertical',
        x1: vanishX + (x - vanishX) * converge,
        y1: horizonY,
        x2: x,
        y2: horizonY + depth,
        stroke: 'url(#floor-fade)',
      }),
    );
  }

  // Horizontal rules, bunched toward the horizon.
  for (let i = 1; i <= rows; i++) {
    const t = i / rows;
    const spread = overhang * t;
    floorG.appendChild(
      svgEl('line', {
        class: 'floor-rule',
        x1: -spread,
        y1: horizonY + depth * t ** rowCurve,
        x2: totalWidth + spread,
        y2: horizonY + depth * t ** rowCurve,
        stroke: CONFIG.colors.floorRule,
        'stroke-opacity': 0.05 + t * 0.3,
      }),
    );
  }

  floorG.appendChild(
    svgEl('line', {
      class: 'floor-horizon',
      x1: -overhang,
      y1: horizonY,
      x2: totalWidth + overhang,
      y2: horizonY,
      stroke: CONFIG.colors.horizon,
      'stroke-opacity': 0.42,
    }),
  );
}

export function updateSubstrateScale(floorG, scale) {
  for (const line of floorG.querySelectorAll('line')) {
    line.setAttribute('stroke-width', 1 / scale);
  }
}
