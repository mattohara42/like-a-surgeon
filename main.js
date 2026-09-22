// Entry point: load the dataset, build the graph, mount it, and report a
// live node/edge/status readout so a person (or a Playwright check) can
// confirm what actually rendered.

import { loadGraphData } from './render/loader.js';
import { createGraph } from './render/graph.js';
import { loadLayers, saveLayers, createLayerToggles } from './render/layers.js';

const statusEl = document.getElementById('status');
const appEl = document.getElementById('app');
const layersEl = document.getElementById('layers');

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle('error', isError);
}

async function main() {
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

  let layers = loadLayers();
  let graph = null;

  // Toggling a layer changes which records take a lane row, so the layout
  // has to be recomputed rather than restyled -- turning labels on moves
  // every artist below them. Rebuilding the whole graph is the honest way
  // to do that, and at this size it is imperceptible. The reader's camera
  // and year are carried across so it doesn't feel like a reload.
  function build() {
    const carried = graph
      ? { viewport: { ...graph.viewport }, year: graph.transport?.year() ?? null }
      : { viewport: null, year: null };
    graph?.destroy();

    graph = createGraph(appEl, data, {
      transportEl: document.getElementById('transport'),
      layers,
      initialViewport: carried.viewport,
      initialYear: carried.year,
      onSelectNode: (node) => console.log('[select] node', node.id, node.name),
      onSelectEdge: (edge) => console.log('[select] edge', edge.id, edge.from.id, '->', edge.to.id),
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

  createLayerToggles(layersEl, layers, applyLayers);
  build();
}

main();
