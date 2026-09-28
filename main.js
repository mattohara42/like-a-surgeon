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
import { h } from './reading/dom.js';

const statusEl = document.getElementById('status');
const appEl = document.getElementById('app');
const layersEl = document.getElementById('layers');
const registersEl = document.getElementById('registers');
const panelEl = document.getElementById('panel');
const legendEl = document.getElementById('legend');
const searchEl = document.getElementById('search');
const arrangeEl = document.getElementById('arrange');

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

  const nodesById = new Map(data.nodes.map((n) => [n.id, n]));
  const edgesById = new Map(data.edges.map((e) => [e.id, e]));
  const neighbours = buildNeighbours(data.edges);

  // A scene's members are the artists that name it, plus whoever the scene
  // lists itself. Both directions, because the two are not kept in sync
  // (BACKLOG, "Observed problems") and a reader should not lose a member
  // to that gap.
  function sceneMembers(sceneId) {
    const ids = new Set(nodesById.get(sceneId)?.raw.memberIds ?? []);
    for (const node of data.nodes) {
      if (node.kind === 'artist' && node.raw.scenes?.includes(sceneId)) ids.add(node.id);
    }
    return [...ids]
      .map((id) => nodesById.get(id))
      .filter(Boolean)
      .sort((a, b) => (a.startYear ?? 0) - (b.startYear ?? 0));
  }

  // A label's roster: the artists that name it.
  function labelMembers(labelId) {
    return data.nodes.filter((n) => n.kind === 'artist' && n.raw.labels?.some((l) => l.labelId === labelId));
  }

  const registers = availableRegisters(data);
  let register = loadRegister(registers);
  let layers = loadLayers();
  let arrange = loadArrange();
  let graph = null;

  const legend = createLegend(legendEl, data.meta);
  const search = createSearch(searchEl, {
    nodes: data.nodes,
    yearBounds: () => graph.yearBounds(),
    onSelectNode: (id) => goNode(id),
    onSelectYear: (year) => graph.focusYear(year),
  });

  const panelContext = () => ({ register, nodesById, neighbours, sceneMembers, goNode, goEdge });

  // The map holds only the skeleton of each record (render/loader.js). A
  // panel loads the full record, then draws it over the skeleton so the
  // resolved from/to nodes and normalized years stay as the map has them.
  function renderTarget(target) {
    if (target.kind === 'node') {
      const node = nodesById.get(target.id);
      return loadRecord(SHARD_FOR_KIND[node.kind], node.id).then((raw) =>
        renderNodePanel({ ...node, raw }, panelContext()),
      );
    }
    const edge = edgesById.get(target.id);
    return loadRecord('edges', edge.id).then((full) =>
      renderEdgePanel({ ...full, from: edge.from, to: edge.to }, panelContext()),
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
    onClose: () => graph?.clearSelection(),
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
  function build() {
    const carried = graph
      ? { viewport: { ...graph.viewport }, year: graph.transport?.year() ?? null, selected: graph.selectedId() }
      : { viewport: null, year: null, selected: null };
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
      // The graph has already flown the camera; the panel only opens.
      onSelectNode: (node) => panel.open({ kind: 'node', id: node.id }),
      onSelectEdge: (edge) => panel.open({ kind: 'edge', id: edge.id }),
      onSelectGroup: (id) => goNode(id),
    });

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
    graph?.destroy();
    graph = null;
    build();
  }

  function applyRegister(next) {
    register = next;
    saveRegister(register);
    createRegisterSelector(registersEl, registers, register, applyRegister);
    panel.redraw();
    legend.setRegister(register);
    search.setRegister(register);
  }

  createLayerToggles(layersEl, layers, applyLayers);
  createRegisterSelector(registersEl, registers, register, applyRegister);
  createArrangeControl(arrangeEl, arrange, applyArrange);
  legend.setRegister(register);
  search.setRegister(register);
  build();
}

main();
