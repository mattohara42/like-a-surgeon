// Entry point: load the dataset, build the graph, mount it, and report a
// live node/edge/status readout so a person (or a Playwright check) can
// confirm what actually rendered.

import { loadGraphData } from './render/loader.js';
import { createGraph } from './render/graph.js';

const statusEl = document.getElementById('status');
const appEl = document.getElementById('app');

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

  const graph = createGraph(appEl, data, {
    transportEl: document.getElementById('transport'),
    onSelectNode: (node) => console.log('[select] node', node.id, node.name),
    onSelectEdge: (edge) => console.log('[select] edge', edge.id, edge.from.id, '->', edge.to.id),
  });

  window.__graph = graph; // for manual/automated inspection during dev

  // Report what the graph actually draws, not what the loader parsed:
  // scenes render as atmosphere and labels are left to the labels overlay,
  // so neither is a marker on screen (CONFIG.layout.graphNodeKinds).
  setStatus(`${graph.graphNodeCount} nodes, ${graph.graphEdgeCount} edges`);
}

main();
