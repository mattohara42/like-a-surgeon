// Loads the sharded dataset and normalizes it into the shape the renderer
// needs. Two data sources, picked automatically:
//   - window.LINEAGE_DATA, set by the release bundle (dist/data.js, a
//     classic script per ASSUMPTIONS.md A18 and A84)
//   - dev mode: fetch data/manifest.json, then fetch every record it lists,
//     served over http by tools/serve.js (solves the file:// fetch block)
//
// Never assumes the roster size: node/edge counts come entirely from what
// the manifest or bundle actually contains.

import { CONFIG } from '../config.js';
import { setLineages } from './lineages.js';

const SHARD_TYPES = ['lineages', 'artists', 'machines', 'scenes', 'labels', 'edges', 'demos', 'threads'];

const CURRENT_YEAR = new Date().getFullYear();

// Per-kind field mapping to a common {startYear, endYear} shape used by
// layout. `endYear: null` on the record (still active/open) maps to the
// current year so the node's span reaches the present on the time axis.
// `endUnknown: true` alongside a null end means the end is unsourced, not
// ongoing (Q20): the span stops a fixed distance past the start and is
// drawn fading out.
const YEAR_FIELDS = {
  artist: ['activeFrom', 'activeTo'],
  machine: ['releasedYear', 'discontinuedYear'],
  scene: ['yearFrom', 'yearTo'],
  label: ['foundedYear', 'closedYear'],
};

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.json();
}

async function loadFromDevServer() {
  const manifest = await fetchJson('data/manifest.json');
  const bundle = { meta: manifest.meta };
  for (const shard of SHARD_TYPES) {
    bundle[shard] = {};
    const ids = manifest[shard] || [];
    const records = await Promise.all(ids.map((id) => fetchJson(`data/${shard}/${id}.json`)));
    ids.forEach((id, i) => {
      bundle[shard][id] = records[i];
    });
  }
  return bundle;
}

function normalizeNode(kind, record) {
  const [startField, endField] = YEAR_FIELDS[kind];
  const startYear = record[startField] ?? null;
  const rawEnd = record[endField];
  const endUnknown = record.endUnknown === true && (rawEnd === null || rawEnd === undefined);
  let endYear = rawEnd;
  if (endUnknown) {
    endYear = Math.min(CURRENT_YEAR, (startYear ?? CURRENT_YEAR) + CONFIG.layout.unknownEndFadeYears);
  } else if (rawEnd === null || rawEnd === undefined) {
    endYear = CURRENT_YEAR;
  }
  return {
    id: record.id,
    kind,
    lineage: record.lineage,
    name: record.name,
    hook: record.hook ?? '',
    startYear,
    endYear,
    open: !endUnknown && (rawEnd === null || rawEnd === undefined),
    endUnknown,
    raw: record,
  };
}

export async function loadGraphData() {
  const bundle = window.LINEAGE_DATA ?? (await loadFromDevServer());
  setLineages(Object.values(bundle.lineages ?? {}));

  const nodesById = new Map();
  for (const [kind, shard] of [
    ['artist', 'artists'],
    ['machine', 'machines'],
    ['scene', 'scenes'],
    ['label', 'labels'],
  ]) {
    for (const record of Object.values(bundle[shard] ?? {})) {
      nodesById.set(record.id, normalizeNode(kind, record));
    }
  }

  const edges = [];
  for (const edge of Object.values(bundle.edges ?? {})) {
    const from = nodesById.get(edge.from);
    const to = nodesById.get(edge.to);
    if (!from || !to) {
      console.warn(`[loader] edge ${edge.id} references an unknown node (${edge.from} -> ${edge.to}), skipping`);
      continue;
    }
    if (from.startYear === null || to.startYear === null) {
      console.warn(`[loader] edge ${edge.id} touches a node with no start year, skipping`);
      continue;
    }
    edges.push({ ...edge, from, to });
  }

  // A node with no start year can't be placed on a time axis, so layout
  // drops it. Worth saying out loud now that labels are drawable: an
  // unplaceable record is a data gap, and silently missing is the one way
  // a reader would never find out.
  for (const node of nodesById.values()) {
    if (node.startYear === null) {
      console.warn(`[loader] ${node.kind} ${node.id} has no start year, so it cannot be placed on the time axis`);
    }
  }

  return {
    nodes: [...nodesById.values()],
    edges,
    demos: bundle.demos ?? {},
    threads: bundle.threads ?? {},
    meta: bundle.meta ?? {},
  };
}
