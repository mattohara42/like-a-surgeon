// Single source of tuning values for the whole app. No magic numbers in
// logic, ever (CLAUDE.md). Layout, color, and interaction code reads from
// this object instead of hardcoding numbers inline.

export const CONFIG = {
  layout: {
    pxPerYear: 18,
    marginYears: 2,
    laneHeight: 64,
    laneGap: 12,
    laneTopPadding: 40,
    nodeRowHeight: 22,
    machineBandHeight: 56,
    machineBandGap: 16,
    axisHeight: 32,
  },

  node: {
    radius: { collapsed: 3, mid: 7, detail: 10 },
    strokeWidth: 1.5,
    hoverStrokeWidth: 3,
    labelFontSize: 11,
    hookFontSize: 10,
    labelMaxChars: 28,
    // "Planet size" by graph connectedness (in+out edge count), not record
    // sales -- see ASSUMPTIONS.md. Multiplies the per-zoom-level base
    // radius above; sqrt of degree so area, not radius, scales roughly
    // linearly with connections (standard bubble-chart practice, avoids a
    // node with 4x the edges looking 16x the area).
    degreeRadiusFactor: { min: 0.7, max: 2.4 },
    glow: {
      blurStdDev: 4,
      radiusMultiplier: 2.2,
      opacity: 0.55,
    },
  },

  edge: {
    strokeWidth: { documented: 2, consensus: 1.5, asserted: 1 },
    dashArray: { documented: 'none', consensus: 'none', asserted: '4,3' },
    hitAreaWidth: 14,
    opacity: 0.5,
    hoverOpacity: 0.95,
    crossLineageOpacity: 0.75,
    // How far the trail's curve control point bows off the straight line
    // between endpoints, as a fraction of the straight-line distance.
    curveBow: 0.12,
    glow: {
      blurStdDev: 2.5,
      opacity: 0.5,
    },
  },

  zoom: {
    min: 0.2,
    max: 8,
    initial: 1,
    wheelSensitivity: 0.0015,
    // Semantic zoom levels: scale <= threshold selects that level.
    // Highest-threshold level with no match wins as the last (detail) level.
    levels: [
      { name: 'collapsed', maxScale: 0.6 },
      { name: 'mid', maxScale: 2.2 },
      { name: 'detail', maxScale: Infinity },
    ],
    transitionMs: 180,
    // Click-to-fly-to: how long the animated pan+zoom to a clicked node or
    // edge takes, and roughly what scale it settles at (still governed by
    // min/max above).
    flyToDurationMs: 650,
    flyToScale: 3,
  },

  viewport: {
    // Extra px beyond the visible viewport to still render, so nodes don't
    // visibly pop in/out right at the edge of the screen while panning.
    cullMarginPx: 200,
  },

  colors: {
    lineage: {
      rock: '#c0392b',
      electronic: '#2f6fd0',
      hiphop: '#d99a2b',
      dub: '#1f7a4d',
      funk: '#8e44ad',
      other: '#6b7280',
    },
    background: '#05060a',
    laneLabel: '#9aa0a8',
    axisLine: 'rgba(255,255,255,0.10)',
    axisText: 'rgba(255,255,255,0.45)',
    machineBandFill: 'rgba(255,255,255,0.035)',
    machineBandLabel: '#c7cbd1',
    edgeDefault: '#7d8590',
  },

  perf: {
    // BUILD_PLAN M2 gate: validated at this multiple of the M1 dataset
    // target size, simulated by duplication rather than real records.
    gateDuplicationFactor: 2,
  },
};
