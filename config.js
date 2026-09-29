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
    // empty. data/lineages/ can carry a lineage before any record uses
    // it; reserving vertical space for it pushes the populated lanes apart
    // for no reading benefit.
    dropEmptyLanes: true,
    // A record whose end is unknown (`endUnknown: true`, Q20) draws its
    // span this many years past its start and fades it out, rather than
    // running it to the present as if it were still going. Long enough to
    // read as a span at the opening zoom, short enough not to claim a
    // decade we can't source.
    unknownEndFadeYears: 8,
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
      // Under reduced motion the comet holds still at this fraction of the
      // way along its edge, near the target, so direction still reads.
      stillPosition: 0.72,
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
    // When a pan or zoom leaves less than keepVisiblePx of the map on
    // screen, the camera eases back that far after settleDelayMs.
    pullBack: { keepVisiblePx: 160, settleDelayMs: 220, durationMs: 520 },
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
    // Follow the producer shows its button from this many acts produced.
    followProducerMin: 2,
  },

  // The first-run card and its goal chip (reading/welcome.js).
  welcome: {
    storageKey: 'lineage.welcome.v1',
    // How long the "found it" line stays before the chip goes.
    foundLingerMs: 9000,
    // Screen padding kept around the opening frame's records, and the
    // closest the opening view may zoom in.
    openingPaddingPx: 70,
    openingMaxScale: 1.3,
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
    // Screen px a lane title keeps from a fixed control it steps past.
    titleOverlayGapPx: 10,
    // A dark halo behind lane titles, in screen px, so a title that steps
    // onto a marker still reads.
    titleHaloPx: 3.5,
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

  // Golden edges (A263): the documented cross-lineage edges that reach
  // furthest across time, record to record. `count` of them shimmer gold
  // for the reader to find.
  golden: {
    count: 7,
    color: '#f3dfa6',
    widthFactor: 1.8,
  },

  // Transient light (render/sparks.js): the ripple a selected node sends
  // through what it changed, and the ignition of nodes and edges as the
  // year cursor reaches them.
  sparks: {
    // Live effects at once. Past this, new ones are skipped, not queued.
    maxLive: 140,
    // The white at the centre of every spark.
    hotColor: '#fffaf0',
    flare: { ringRadiusPx: 72, bloomRadiusPx: 64, coreRadiusPx: 9, ringWidthPx: 2, durationMs: 1500 },
    pulse: { lengthPx: 56, widthPx: 2.4, glowWidthFactor: 4, glowOpacity: 0.45, durationMs: 900 },
    ripple: {
      // Hops downstream from the selected node, the time each hop takes,
      // and the most edges one ripple lights.
      maxHops: 3,
      hopMs: 900,
      maxEdges: 60,
    },
    ignite: {
      // A cursor jump bigger than this (a click far along the scrubber)
      // reveals quietly instead of setting off everything it passed.
      maxStepYears: 3,
    },
  },

  // How far past the map's content the lanes, axis and floor run before
  // they have faded to nothing (render/depth.js), in content px. At the
  // widest zoom this is about 300 screen px, enough that no edge of the
  // map is ever a hard line.
  depth: {
    fadePx: 1500,
  },

  atmosphere: {
    // zoomParallax: how strongly motes spread and gather with zoom, as a
    // power of the zoom ratio. 0 turns it off.
    dust: { count: 480, parallax: 0.2, driftAmplitudePx: 8, zoomParallax: 0.45 },
    nebula: { blurStdDev: 56, opacity: 0.15, parallax: 0.9, minRadiusPx: 160, paddingPx: 150 },
  },

  colors: {
    // Each lineage's own colour lives on its record in data/lineages/, so
    // adding a lineage stays a one-file change. This is only for a node
    // whose lineage has no record.
    lineageFallback: '#8fa6c8',
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

  // M4 audio (docs/m4-architecture.md). Values from SQUELCH, tuned by ear
  // there.
  audio: {
    tempo: { minBpm: 60, maxBpm: 200, defaultBpm: 130 },
    stepsPerPattern: 16,
    // Shuffle swings the even 16ths (odd step index, 0-based) later by this
    // fraction of a step at full depth.
    shuffleMaxFraction: 0.3,
    scheduler: { tickMs: 25, lookaheadS: 0.12 },

    // What the worklets read, injected into each one as `CFG` by
    // audio/workletSource.js. SQUELCH's key names are kept as they are, so
    // the ported DSP stays line-for-line comparable with upstream (A268).
    dsp: {
      VOICE303: {
        RESONANCE_MAX_K: 4.2,
        ENV_MOD_MAX_OCT: 3.6,
        DECAY_MIN_MS: 200,
        DECAY_MAX_MS: 2000,
        ACCENT_DECAY_MS: 200,
        ACCENT_BOOST_GAIN: 0.9,
        RELEASE_MS: 30,
        WOW_MAX_MS: 15,
        OVERSAMPLE: 2,
        HPF_HZ: 40,
        TRIM: 0.85,
        CLAMP: 0.98,
        CUTOFF_MIN_HZ: 100,
        CUTOFF_MAX_HZ: 4000,
        GLIDE_MS: 35,
      },
      DRUM808: {
        ACCENT_BOOST_GAIN: 0.8,
        METALLIC_OSC_FREQS_HZ: [205.3, 304.4, 369.6, 522.7, 619.8, 845.4],
        LANES: {
          bd: { baseFreqHz: 55, pitchSweepHz: 150, pitchTauMs: 40, decayMinMs: 150, decayMaxMs: 800, decayDefaultMs: 400, toneDefault: 0.5 },
          sd: { toneFreqsHz: [180, 330], tonalDecayMs: 220, noiseDecayMinMs: 50, noiseDecayMaxMs: 400, noiseDecayDefaultMs: 150, toneDefault: 0.5, snappyDefault: 0.5 },
          lt: { freqHz: 90, decayMs: 300 },
          mt: { freqHz: 130, decayMs: 280 },
          ht: { freqHz: 180, decayMs: 250 },
          rs: { toneFreqHz: 400, decayMs: 15 },
          cp: { burstGapMs: 8, burstCount: 3, tailDecayMs: 150, bandHz: 1200 },
          cb: { freqsHz: [540, 800], decayMs: 300 },
          ch: { decayMs: 50, hpHz: 6000 },
          oh: { decayMinMs: 100, decayMaxMs: 500, decayDefaultMs: 250, hpHz: 5000 },
          cy: { decayMinMs: 300, decayMaxMs: 1500, decayDefaultMs: 700, hpHz: 3000 },
          ma: { decayMs: 20, bpHz: 6000 },
        },
      },
      DRUM909: {
        ACCENT_BOOST_GAIN: 0.8,
        METALLIC_OSC_FREQS_HZ: [239, 347.5, 419, 590, 700, 973],
        TUNE_RANGE_SEMITONES: 12,
        LANES: {
          bd: { baseFreqHz: 50, pitchSweepHz: 120, pitchTauMs: 35, decayMinMs: 150, decayMaxMs: 700, decayDefaultMs: 350, attackDefault: 0.5, attackClickMs: 3 },
          sd: { toneFreqsHz: [190, 340], tonalDecayMs: 180, noiseDecayMinMs: 40, noiseDecayMaxMs: 350, noiseDecayDefaultMs: 130, toneDefault: 0.5, snappyDefault: 0.5 },
          lt: { baseFreqHz: 100, decayMinMs: 150, decayMaxMs: 500, decayDefaultMs: 280 },
          mt: { baseFreqHz: 140, decayMinMs: 150, decayMaxMs: 500, decayDefaultMs: 260 },
          ht: { baseFreqHz: 190, decayMinMs: 150, decayMaxMs: 500, decayDefaultMs: 240 },
          rs: { toneFreqHz: 420, decayMs: 12 },
          cp: { burstGapMs: 7, burstCount: 3, tailDecayMs: 130, bandHz: 1300 },
          ch: { bufferLengthMs: 150, decayMs: 60, hpHz: 7000 },
          oh: { bufferLengthMs: 800, decayMinMs: 100, decayMaxMs: 500, decayDefaultMs: 250, hpHz: 6000 },
          cc: { bufferLengthMs: 2500, decayMs: 1800, hpHz: 4000 },
          rc: { bufferLengthMs: 1800, decayMs: 1200, hpHz: 3500 },
        },
      },
    },
  },
};
