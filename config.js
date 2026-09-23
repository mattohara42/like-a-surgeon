// Single source of tuning values for the whole app. No magic numbers in
// logic, ever (CLAUDE.md). Layout, color, and interaction code reads from
// this object instead of hardcoding numbers inline.

export const CONFIG = {
  layout: {
    pxPerYear: 62,
    marginYears: 2,
    laneHeight: 96,
    laneGap: 14,
    laneTopPadding: 34,
    nodeRowHeight: 56,
    // Used to size a node's label footprint for row packing, so names get
    // room along the time axis instead of stacking into a column.
    //
    // Labels are counter-scaled to a constant *screen* size, so their
    // width in content units grows as you zoom out -- which means there is
    // no single correct value here. These are sized for the opening fit
    // (roughly half scale); zoom in past that and the gaps only get
    // roomier.
    labelCharPx: 14,
    labelMinPx: 170,
    axisHeight: 32,
    // Lanes with no nodes in them are skipped entirely rather than drawn
    // empty. `colors.lineage` carries spines the dataset has not reached
    // yet (funk, other); reserving vertical space for them pushes the
    // populated lanes apart for no reading benefit.
    dropEmptyLanes: true,
  },

  // The machine substrate: a floor receding below the lineage lanes, with
  // a machine's influence rising out of it as a shaft of light. Machines
  // are the protagonist of large stretches of this history (SPEC.md), and
  // this is that argument expressed as the shape of the page rather than a
  // claim in a blurb. Supersedes the machine band above the lanes; see
  // ASSUMPTIONS.md A43.
  substrate: {
    gap: 46,           // lanes bottom -> horizon
    depth: 232,        // horizon -> front edge of the floor
    rows: 7,           // receding horizontal rules
    rowCurve: 2.4,     // >1 bunches rows toward the horizon
    converge: 0.07,    // how close the verticals meet at the vanishing point
    machineRowHeight: 34,
    labelOffset: 30,
  },

  node: {
    radius: { collapsed: 3, mid: 7, detail: 10 },
    strokeWidth: 1.5,
    hoverStrokeWidth: 3,
    labelFontSize: 11,
    hookFontSize: 10,
    labelMaxChars: 28,
    hookMaxChars: 60,
    // Screen px between a marker and its name above it / its hook below it.
    labelGapPx: 9,
    hookGapPx: 14,
    // Label placement (graph.js placeLabels): an average glyph is about this
    // wide in ems for the system sans the map uses, and each label keeps
    // this much clear space around it.
    labelCharWidthEm: 0.58,
    labelPadPx: 2,
    // "Planet size" by graph connectedness (in+out edge count), not record
    // sales -- see ASSUMPTIONS.md. Multiplies the per-zoom-level base
    // radius above; sqrt of degree so area, not radius, scales roughly
    // linearly with connections (standard bubble-chart practice, avoids a
    // node with 4x the edges looking 16x the area).
    degreeRadiusFactor: { min: 0.7, max: 2.4 },
    haloRadiusMultiplier: 5.5,
    haloOpacity: 0.5,
    ringGap: 5,
    machineTicks: 12,
    // Each node breathes at its own rate, seeded from its id so the rhythm
    // is stable across reloads. They never sync up, which is the
    // difference between a living thing and a loading spinner.
    breath: { minMs: 4600, maxMs: 7800, amount: 0.09 },
  },

  edge: {
    // The three confidence tiers must be told apart at a glance, because
    // telling "someone said so" from "critics agree" from "our reading" is
    // part of what the map teaches (SPEC.md). Width alone did not do it:
    // 2px against 1.5px was invisible at map opacity (BACKLOG). So each
    // tier differs on two channels: documented is solid and full strength,
    // consensus is thinner and fainter, and asserted is dotted.
    strokeWidth: { documented: 2.6, consensus: 1.4, asserted: 1.6 },
    dashArray: { documented: 'none', consensus: 'none', asserted: '0.5,4' },
    // Multiplies the line's base opacity (and the legend swatch's).
    tierOpacity: { documented: 1, consensus: 0.55, asserted: 0.9 },
    hitAreaWidth: 14,
    opacity: 0.5,
    hoverOpacity: 0.95,
    crossLineageOpacity: 0.75,
    crossLineageWidthFactor: 1.8,
    // How far the trail's curve control point bows off the straight line
    // between endpoints, as a fraction of the straight-line distance.
    curveBow: 0.12,
    // The travelling light. This is the single thing that makes a still
    // graph read as running rather than drawn.
    comet: {
      contentPxPerSecond: 150,
      lengthFraction: 0.16,
      opacity: 0.55,
      crossLineageOpacity: 0.92,
      // Cross-lineage edges get a second, wider comet in the *source*
      // colour trailing the first. Reads as chromatic split, and makes a
      // crossing identifiable without consulting a legend.
      ghostWidthFactor: 2.4,
      ghostOpacity: 0.2,
      ghostDelayMs: 130,
    },
  },

  // A machine -> artist edge is drawn as a tapered shaft of light instead
  // of a trail, rising off the floor and through the horizon.
  beam: {
    widthTop: 3,
    widthBottom: 9,
    // Kept low. The beam is atmosphere -- the fact of light coming off the
    // floor -- while the trail drawn on top of it carries the actual
    // claim. Turned up, it stops reading as light and starts reading as a
    // solid wedge lying across the map.
    stops: { near: 0.26, mid: 0.1, far: 0.2 },
  },

  zoom: {
    min: 0.2,
    max: 8,
    initial: 1,
    wheelSensitivity: 0.0015,
    // Semantic zoom levels: scale <= threshold selects that level.
    // Highest-threshold level with no match wins as the last (detail) level.
    // Retuned for pxPerYear 62. These are ratios against the content
    // scale, so they move whenever the time axis does; the opening fit
    // must land inside `mid` or the map opens with no names on it.
    levels: [
      { name: 'collapsed', maxScale: 0.34 },
      { name: 'mid', maxScale: 1.4 },
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
    // The opening view frames the years something actually happens in,
    // not the full axis. `endYear` for anyone still active runs to the
    // present, so fitting the whole axis would open on a mostly empty map.
    // A map that starts too far out reads as decoration; one that starts
    // close enough to read a name invites the first click.
    fitPaddingPx: 70,
    fitBottomInsetPx: 104,   // the transport bar
    fitMaxScale: 1.1,
    // The opening view never fits so far out that it lands in the
    // `collapsed` zoom level, where names are hidden. Reserving room for the
    // legend (M3 step 5) pushed a 1280px fit to exactly that edge, and a map
    // that opens with no names on it invites nobody. Just inside `mid`.
    fitMinScale: 0.36,
  },

  // Which record types are drawn, and how each one is drawn when it is.
  // These are defaults for the reader's layer toggles, not fixed decisions:
  // A44 originally settled scenes and labels one way for everyone, and the
  // honest answer is that the right set depends on what you came to read.
  // Artists are not listed because a map of nothing but scenes is not a
  // thing anyone wants.
  //
  //   scenes   - blurred colour behind their members (atmosphere.js)
  //   labels   - markers in the lineage lanes, same as artists
  //   machines - the substrate: floor, markers, and the beams rising off it
  //
  // Persisted per reader in localStorage under `storageKey`.
  layers: {
    defaults: { scenes: true, labels: false, machines: true },
    storageKey: 'lineage.layers.v1',
  },

  // The reading surface (docs/m3-architecture.md). Registers are offered in
  // this order, and only the ones every reader-facing record carries appear
  // at all (Q15), so `age7` stays listed here and stays hidden until the
  // Track D Kid pass is complete.
  reading: {
    registers: [
      { key: 'age7', label: 'Kid' },
      { key: 'age13', label: 'Teen' },
      { key: 'adult', label: 'Adult' },
    ],
    defaultRegister: 'age13',
    storageKey: 'lineage.register.v1',
  },

  // Type scale for the reading surface (M3 step 5). Applied as CSS custom
  // properties (--t-*, --lh-*) by reading/type.js, so the stylesheet holds
  // no sizes of its own for the panel and legend. Reading text has a 16px
  // floor for the primary reader. Secondary notes sit one step down, and
  // the monospaced kickers and headings are labels rather than text to read.
  type: {
    size: {
      kicker: 10.5, heading: 10.5, meta: 11.5, link: 11.5,
      control: 13, chip: 13.5,
      note: 15, row: 15.5,
      body: 16, track: 16,
      listen: 18.5, hook: 19, title: 30,
      legend: 13, 'legend-note': 12.5,
    },
    lineHeight: { body: 1.62, note: 1.55, listen: 1.55, hook: 1.45 },
  },

  // The detail drawer. Overlays the map from the right (Q13), so the camera
  // centres selections in whatever width the drawer leaves uncovered.
  panel: {
    widthPx: 430,
    maxViewportFraction: 0.42,
    slideMs: 520,
    // How many steps back the drawer remembers. In memory only.
    backStackMax: 30,
    // Scene framing: the widest a scene may be zoomed to, and the screen
    // padding kept around its members.
    sceneMaxScale: 2,
    sceneFramePaddingPx: 90,
  },

  // Search (docs/m3-architecture.md section 6). A linear scan, no index:
  // at the thousand-artist scale that is still well under a frame.
  search: {
    minQueryLength: 2,
    maxNameResults: 8,
    maxPlaceGroups: 3,
    maxPerPlace: 6,
    // Choosing a year result frames roughly this many years across the
    // uncovered width of the map.
    yearFrameSpanYears: 12,
  },

  // Outbound links (Q14): YouTube search only. The query is appended,
  // URL-encoded.
  links: {
    youtubeSearchUrl: 'https://www.youtube.com/results?search_query=',
  },

  // "Arrange by" (Q19, docs/m3-architecture.md section 7a): which lanes the
  // map is sorted into. Lane titles here are plain uppercase, like the
  // lineage lane titles and "THE MACHINES".
  arrange: {
    options: [
      { key: 'lineage', label: 'Lineage' },
      { key: 'scene', label: 'Scene' },
      { key: 'label', label: 'Label' },
    ],
    default: 'lineage',
    storageKey: 'lineage.arrange.v1',
    ungroupedTitles: { scene: 'NOT IN A SCENE YET', label: 'NO LABEL ON THE MAP YET' },
    // Marker kinds that are not the grouping get a lane of their own.
    kindLaneTitles: { label: 'LABELS' },
    // Scene and label lane titles are buttons, so they are drawn larger
    // than the lineage titles, and sit this far before the lane's first
    // member (screen px, counter-scaled like every other label).
    groupTitleFontSize: 14,
    groupTitleLeadPx: 14,
    // Letter-spacing of lane titles, mirroring `.band-label` and
    // `.band-link` in index.html, so label placement can size a title
    // without measuring the DOM on every frame.
    titleTrackingEm: { lane: 0.18, group: 0.02 },
  },

  // The confidence legend. Open on a first visit, because the tiers are
  // part of what the map teaches; after that it remembers the reader's
  // choice. Collapsed, it still shows all three swatches.
  legend: {
    defaultOpen: true,
    storageKey: 'lineage.legend.v1',
  },

  // The year cursor. Not a scrollbar with a graph attached: dragging it is
  // how the map performs its own history, and it is the first thing anyone
  // touches.
  transport: {
    msPerYear: 620,
    stepYears: 1,
    shiftStepYears: 5,
    unbornOpacity: 0.085,
    cursorWashWidth: 120,
    cursorWashMaxContentPx: 220,
  },

  atmosphere: {
    dust: { count: 480, parallax: 0.2, driftAmplitudePx: 8 },
    nebula: { blurStdDev: 56, opacity: 0.15, parallax: 0.9, minRadiusPx: 160, paddingPx: 150 },
  },

  colors: {
    lineage: {
      rock: '#ff6f55',
      dub: '#3ddfa4',
      hiphop: '#bd82ff',
      electronic: '#5fa8ff',
      funk: '#ffc46b',
      other: '#8fa6c8',
    },
    background: '#04060d',
    ink: '#eaf0ff',
    dim: '#7e8ca8',
    laneLabel: '#8fa6c8',
    axisLine: 'rgba(150,180,235,0.12)',
    axisText: 'rgba(234,240,255,0.45)',
    floorRule: 'rgba(120,160,225,0.18)',
    floorFade: '#7fb4ff',
    horizon: '#8cc0ff',
    machineBandLabel: '#8fa6c8',
    edgeDefault: '#8fa6c8',
    cursor: '#eaf0ff',
  },

  perf: {
    // BUILD_PLAN M2 gate: validated at this multiple of the M1 dataset
    // target size, simulated by duplication rather than real records.
    gateDuplicationFactor: 2,
  },
};
