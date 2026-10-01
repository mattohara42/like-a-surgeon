// Entry point: load the dataset, build the graph, mount it, and report a
// live node/edge/status readout so a person (or a Playwright check) can
// confirm what actually rendered.
//
// This is also the only place the graph and the reading surface meet
// (A73): the graph never imports from reading/, and reading/ reaches the
// graph only through the callbacks and focus calls wired up here.

import { CONFIG } from './config.js';
import { loadGraphData, loadRecord, SHARD_FOR_KIND } from './render/loader.js';
import { createGraph } from './render/graph.js';
import { loadLayers, saveLayers, createLayerToggles } from './render/layers.js';
import { loadArrange, saveArrange, createArrangeControl } from './render/arrange.js';
import { availableRegisters, loadRegister, saveRegister, createRegisterSelector, pick } from './reading/registers.js';
import { buildNeighbours } from './reading/neighbours.js';
import { createPanel } from './reading/panel.js';
import { renderNodePanel } from './reading/nodePanel.js';
import { renderEdgePanel } from './reading/edgePanel.js';
import { createLegend } from './reading/legend.js';
import { createSearch } from './reading/search.js';
import { applyTypeScale } from './reading/type.js';
import { COPY } from './reading/copy.js';
import { createWelcome, OPENING_FRAME_IDS } from './reading/welcome.js';
import { h } from './reading/dom.js';
import { createEngine } from './audio/engine.js';
import { stopDemo, withEdgeCaption } from './reading/demoBlock.js';
import { createThreads } from './reading/threads.js';
import { loadLens, saveLens, createLensControl, renderLensCard } from './reading/lens.js';
import { createSceneMembers } from './reading/members.js';
import { createDock } from './reading/dock.js';
import { chooseView } from './cards/route.js';
import { startCards } from './cards/app.js';

const statusEl = document.getElementById('status');
const appEl = document.getElementById('app');
const layersEl = document.getElementById('layers');
const registersEl = document.getElementById('registers');
const panelEl = document.getElementById('panel');
const legendEl = document.getElementById('legend');
const searchEl = document.getElementById('search');
const arrangeEl = document.getElementById('arrange');
const goalEl = document.getElementById('goal-chip');
const threadChipEl = document.getElementById('thread-chip');
const lensEl = document.getElementById('lens');
const dockEl = document.getElementById('dock');
const cardsLinkEl = document.getElementById('cards-link');

// One audio engine for the page. It creates nothing until a play button
// calls start(), so building it here costs nothing for a reader who never
// presses play.
const audio = createEngine();
window.__audio = audio; // for manual/automated inspection (tools/audio-check.js)

// Which layer toggle has to be on for a node of this kind to be drawn.
// Artists are always drawn, and scenes are framed through their members.
const LAYER_FOR_KIND = { label: 'labels', machine: 'machines' };

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle('error', isError);
}

async function main() {
  applyTypeScale();
  let data;
  try {
    data = await loadGraphData();
  } catch (err) {
    console.error(err);
    setStatus(`Failed to load data: ${err.message}`, true);
    return;
  }

  if (data.nodes.length === 0) {
    setStatus('No nodes in the dataset.', true);
    return;
  }

  // A phone gets cards instead of the map (docs/cards-architecture.md,
  // Q39, A313), upright or sideways. Decided once, here, so turning the
  // phone does not swap views.
  const screenShortSide = Math.min(window.screen.width, window.screen.height);
  if (chooseView(location.search, window.innerWidth, screenShortSide, CONFIG.cards.maxWidthPx) === 'cards') {
    startCards(data);
    return;
  }

  const nodesById = new Map(data.nodes.map((n) => [n.id, n]));
  const edgesById = new Map(data.edges.map((e) => [e.id, e]));
  const neighbours = buildNeighbours(data.edges);

  const sceneMembers = createSceneMembers(data.nodes, nodesById);

  // A label's roster: the artists that name it.
  function labelMembers(labelId) {
    return data.nodes.filter((n) => n.kind === 'artist' && n.raw.labels?.some((l) => l.labelId === labelId));
  }

  const registers = availableRegisters(data);
  let register = loadRegister(registers);
  let layers = loadLayers();
  let arrange = loadArrange();
  let lens = loadLens();
  let graph = null;

  const legend = createLegend(legendEl, data.meta);
  const dock = createDock(dockEl, () => measureOverlays(), [searchEl, goalEl.parentElement]);
  // On the root, not the dock: the controls that step aside for it use it too.
  document.documentElement.style.setProperty('--dock-slide', `${CONFIG.dock.slideMs}ms`);
  // Each dock button's dot: is its row away from the default?
  function updateDock() {
    dock.setChanged('show', Object.keys(CONFIG.layers.defaults).some((k) => layers[k] !== CONFIG.layers.defaults[k]));
    dock.setChanged('read', register !== CONFIG.reading.defaultRegister);
    dock.setChanged('arrange', arrange !== CONFIG.arrange.default);
    dock.setChanged('spotlight', lens !== null);
  }
  const search = createSearch(searchEl, {
    nodes: data.nodes,
    yearBounds: () => graph.yearBounds(),
    onSelectNode: (id) => goNode(id),
    onSelectYear: (year) => graph.focusYear(year),
    // A function: the thread player is created further down, and it
    // decides which threads are complete enough to offer.
    threads: () => threads.list(),
    onSelectThread: (id) => {
      const target = { kind: 'thread', id, step: -1 };
      panel.open(target);
      focusTarget(target);
    },
  });

  // Follow the producer: everyone a record's production edges reach, plus
  // any artist naming it in keyProducers (which can exist without an edge).
  function producedBy(id) {
    const ids = new Set();
    for (const edge of data.edges) {
      if (edge.type === 'production' && edge.from.id === id) ids.add(edge.to.id);
    }
    for (const node of data.nodes) {
      if (node.kind === 'artist' && node.raw.keyProducers?.includes(id)) ids.add(node.id);
    }
    ids.delete(id);
    return [...ids].filter((nid) => nodesById.has(nid));
  }

  const panelContext = () => ({
    register, nodesById, neighbours, sceneMembers, goNode, goEdge,
    producedBy,
    audio,
    demos: data.demos,
    // The first playable demo on an edge touching this node, else a
    // draft, else nothing. Used by artist panels; a machine shows its own.
    demoForNode: (id) => {
      const found = data.edges
        .filter((e) => e.demoId && (e.from.id === id || e.to.id === id))
        .map((e) => withEdgeCaption(data.demos[e.demoId], e))
        .filter(Boolean);
      return found.find((d) => d.status !== 'draft') ?? found[0] ?? null;
    },
    // Once a bar, every edge that carries the playing demo pulses.
    onDemoBar: (demoId) => {
      for (const edge of data.edges) if (edge.demoId === demoId) graph?.pulseEdge(edge.id);
    },
    showProduced: (id) => graph.showTouched(id, producedBy(id)),
  });

  // Golden edges (A263): the documented crossings between lineages that
  // reach furthest across time, earlier record to later record. A rule,
  // not a choice, so nothing here is editorial; ties break by id so the
  // set is stable between loads.
  const goldenIds = new Set(
    data.edges
      .filter((e) => e.confidence === 'documented' && e.crossLineage && Number.isFinite(e.leapYears))
      .sort((a, b) => b.leapYears - a.leapYears || a.id.localeCompare(b.id))
      .slice(0, CONFIG.golden.count)
      .map((e) => e.id),
  );

  const welcome = createWelcome(goalEl, {
    nodesById,
    edgesById,
    goldenIds,
    openCard: () => panel.open({ kind: 'welcome', id: 'welcome' }),
  });

  // The thread player (docs/m5-architecture.md section 3). Its stops are
  // ordinary node and edge panels, drawn by renderRecord below.
  const threads = createThreads(threadChipEl, {
    threads: data.threads,
    nodesById,
    edgesById,
    open: (target) => {
      panel.open(target);
      focusTarget(target);
    },
    renderRecord: (target, extra) => renderRecord(target, extra),
    focusRecord: (target) => focusTarget(target),
    frame: (ids) => graph.frameNodes(ids),
    setPath: (route) => graph?.setPath(route),
    setYear: (year) => graph?.setYear(year),
  });

  function renderTarget(target) {
    // A demo belongs to the panel it was opened from.
    stopDemo();
    threads.noticeTarget(target);
    if (target.kind === 'welcome') {
      const ctx = { ...panelContext(), close: () => panel.close() };
      return welcome.render({ ...ctx, threadList: threads.list().length ? threads.listButtons(threads.list(), ctx) : null });
    }
    if (target.kind === 'thread') return threads.render(target, panelContext());
    if (target.kind === 'lens') return renderLensCard(target.id, data.edges, { ...panelContext(), clearLens: () => applyLens(null) });
    return renderRecord(target);
  }

  // The map holds only the skeleton of each record (render/loader.js). A
  // panel loads the full record, then draws it over the skeleton so the
  // resolved from/to nodes and normalized years stay as the map has them.
  function renderRecord(target, extra = {}) {
    const ctx = { ...panelContext(), ...extra };
    // Every thread that stops here, unless this panel is a thread's stop.
    ctx.threadStops = extra.inThread ? null : threads.stopsSection(target, ctx);
    if (target.kind === 'node') {
      const node = nodesById.get(target.id);
      return loadRecord(SHARD_FOR_KIND[node.kind], node.id).then((raw) =>
        renderNodePanel({ ...node, raw }, ctx),
      );
    }
    const edge = edgesById.get(target.id);
    welcome.noticeEdge(edge.id);
    return loadRecord('edges', edge.id).then((full) =>
      renderEdgePanel({ ...full, from: edge.from, to: edge.to }, ctx),
    );
  }

  // What the panel shows while the full record loads, or if it cannot: the
  // name from the skeleton, so the reader knows the click landed.
  function panelNotice(target, copyKey) {
    const edge = target.kind === 'edge' ? edgesById.get(target.id) : null;
    const title = edge ? `${edge.from.name} → ${edge.to.name}` : nodesById.get(target.id)?.name;
    return h(
      'article',
      { class: 'panel-body' },
      h('h2', {}, title ?? ''),
      h('p', { class: 'note' }, pick(COPY.headings[copyKey], register)),
    );
  }

  const panel = createPanel(panelEl, {
    renderTarget,
    renderLoading: (target) => panelNotice(target, 'loading'),
    renderFailed: (target) => panelNotice(target, 'loadFailed'),
    onNavigate: focusTarget,
    onClose: () => {
      stopDemo();
      graph?.clearSelection();
      threads.noticeTarget(null);
    },
  });
  // Stops above the transport bar, so the year and play button stay usable
  // while reading.
  panelEl.style.bottom = `${CONFIG.viewport.fitBottomInsetPx}px`;

  // Turns on whatever layers the given node kinds need, in one rebuild.
  // A reader who follows a link to a label asked to see it (A74).
  function ensureLayersFor(kinds) {
    const next = { ...layers };
    for (const kind of kinds) {
      const key = LAYER_FOR_KIND[kind];
      if (key) next[key] = true;
    }
    if (Object.keys(next).some((k) => next[k] !== layers[k])) applyLayers(next);
  }

  function focusTarget(target) {
    // Stepping back to the welcome card or a lens card leaves the camera
    // where it is.
    if (target.kind === 'welcome' || target.kind === 'lens') return;
    if (target.kind === 'thread') {
      threads.focus(target);
      return;
    }
    if (target.kind === 'edge') {
      const edge = edgesById.get(target.id);
      if (!edge) return;
      ensureLayersFor([edge.from.kind, edge.to.kind]);
      graph.focusEdge(edge.id);
      return;
    }
    const node = nodesById.get(target.id);
    if (!node) return;
    if (node.kind === 'scene') {
      graph.frameNodes(sceneMembers(node.id).map((m) => m.id));
      return;
    }
    // Arranged by label, a label is its lane: frame the roster rather than
    // switching the Labels layer on underneath the reader.
    if (node.kind === 'label' && arrange === 'label') {
      graph.frameNodes([node.id, ...labelMembers(node.id).map((m) => m.id)]);
      return;
    }
    ensureLayersFor([node.kind]);
    graph.focusNode(node.id);
  }

  function goNode(id) {
    const target = { kind: 'node', id };
    panel.open(target);
    focusTarget(target);
  }

  function goEdge(id) {
    const target = { kind: 'edge', id };
    panel.open(target);
    focusTarget(target);
  }

  // Toggling a layer changes which records take a lane row, so the layout
  // has to be recomputed rather than restyled -- turning labels on moves
  // every artist below them. Rebuilding the whole graph is the honest way
  // to do that, and at this size it is imperceptible. The reader's camera,
  // year and selection are carried across so it doesn't feel like a reload.
  // The fixed controls drawn over the left of the map, which lane titles
  // step clear of (the play button since titles are held at the left edge,
  // A316). Measured when they change size (a layer toggle,
  // the legend collapsing, a resize), never per frame.
  let overlayRects = [];
  function measureOverlays() {
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    };
    // A closed row keeps its size while hidden, so only the open one counts.
    const rows = [layersEl, registersEl, arrangeEl, lensEl].filter((el) => el.parentElement.classList.contains('open'));
    const controls = [dockEl, ...rows].map(rect).filter((r) => r.right > r.left);
    const cluster = controls.length
      ? controls.reduce((a, b) => ({
          left: Math.min(a.left, b.left),
          top: Math.min(a.top, b.top),
          right: Math.max(a.right, b.right),
          bottom: Math.max(a.bottom, b.bottom),
        }))
      : null;
    // Drawn with the graph (render/transport.js), so looked up each time.
    const playEl = document.getElementById('transport-play');
    overlayRects = [cluster, rect(legendEl), playEl && rect(playEl)].filter(Boolean);
    graph?.rerender();
  }
  const overlayObserver = new ResizeObserver(measureOverlays);
  for (const el of [dockEl, layersEl, registersEl, arrangeEl, lensEl, legendEl]) overlayObserver.observe(el);
  window.addEventListener('resize', measureOverlays);

  function build({ opening = false } = {}) {
    const carried = graph
      ? { viewport: { ...graph.viewport }, year: graph.transport?.year() ?? null, selected: graph.selectedId(), path: graph.path() }
      : { viewport: null, year: null, selected: null, path: null };
    graph?.destroy();

    graph = createGraph(appEl, data, {
      transportEl: document.getElementById('transport'),
      layers,
      arrange,
      initialViewport: carried.viewport,
      initialYear: carried.year,
      initialSelectedId: carried.selected,
      rightInset: () => panel.coveredWidth(),
      // The opening view starts clear of the legend (M3 step 5).
      leftInset: () => legendEl.offsetLeft + legendEl.offsetWidth,
      overlays: () => overlayRects,
      // Only the first build frames the way in. A later rebuild without a
      // camera (Arrange by) re-fits the whole map, as it always has.
      openingFrameIds: opening ? OPENING_FRAME_IDS : [],
      goldenIds,
      playableDemoIds: new Set(Object.values(data.demos).filter((d) => d.status !== 'draft').map((d) => d.id)),
      // The graph has already flown the camera; the panel only opens.
      onSelectNode: (node) => panel.open({ kind: 'node', id: node.id }),
      onSelectEdge: (edge) => panel.open({ kind: 'edge', id: edge.id }),
      onSelectGroup: (id) => goNode(id),
    });

    // A rebuild keeps the lens and a thread's route, as it keeps the year.
    graph.setLens(lens);
    if (carried.path) graph.setPath(carried.path);

    window.__graph = graph; // for manual/automated inspection during dev

    // Report what the graph actually draws, not what the loader parsed:
    // scenes render as atmosphere, and labels and machines are only on
    // screen when their layer is.
    setStatus(`${graph.graphNodeCount} nodes, ${graph.graphEdgeCount} edges`);
  }

  function applyLayers(next) {
    layers = next;
    saveLayers(layers);
    createLayerToggles(layersEl, layers, applyLayers);
    updateDock();
    build();
  }

  // Re-laning moves every node, so like a layer toggle it rebuilds. The
  // camera is not carried across: the old view's coordinates point at a
  // different part of a different layout, so the map re-fits instead.
  function applyArrange(next) {
    if (next === arrange) return;
    arrange = next;
    saveArrange(arrange);
    createArrangeControl(arrangeEl, arrange, applyArrange);
    updateDock();
    graph?.destroy();
    graph = null;
    build();
  }

  // A lens relights the map in place; no rebuild. Choosing one opens its
  // card, and clearing it closes the card if that is what is showing.
  function applyLens(next) {
    lens = next;
    saveLens(lens);
    createLensControl(lensEl, lens, register, applyLens);
    updateDock();
    graph?.setLens(lens);
    if (lens) panel.open({ kind: 'lens', id: lens });
    else if (panel.current()?.kind === 'lens') panel.close();
  }

  function applyRegister(next) {
    register = next;
    saveRegister(register);
    createRegisterSelector(registersEl, registers, register, applyRegister);
    panel.redraw();
    legend.setRegister(register);
    search.setRegister(register);
    welcome.setRegister(register);
    threads.setRegister(register);
    createLensControl(lensEl, lens, register, applyLens);
    dock.setRegister(register);
    updateDock();
    cardsLinkEl.textContent = pick(COPY.cards.toCards, register);
  }

  createLayerToggles(layersEl, layers, applyLayers);
  createRegisterSelector(registersEl, registers, register, applyRegister);
  createArrangeControl(arrangeEl, arrange, applyArrange);
  createLensControl(lensEl, lens, register, applyLens);
  legend.setRegister(register);
  search.setRegister(register);
  welcome.setRegister(register);
  threads.setRegister(register);
  dock.setRegister(register);
  updateDock();
  // The way to the card view (Q39), in its own place (Q41).
  cardsLinkEl.textContent = pick(COPY.cards.toCards, register);
  // The card opens before the first build so the opening frame can leave
  // room for the drawer it sits in.
  if (welcome.shouldOpen()) {
    panel.open({ kind: 'welcome', id: 'welcome' });
    welcome.markSeen();
  }
  build({ opening: true });
}

main();
