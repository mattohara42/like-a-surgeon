// Loads the dataset in two parts and normalizes it into the shape the
// renderer needs.
//
// 1. The skeleton index, at startup: every record cut down to what the map
//    draws with (tools/skeleton.js has the field lists). Two sources,
//    picked automatically:
//      - window.LINEAGE_INDEX, set by the release bundle (dist/data.js, a
//        classic script per ASSUMPTIONS.md A18 and A84)
//      - dev mode: one fetch of data/index.json, which tools/serve.js builds
//        fresh from data/ on every request
// 2. Full records, one at a time, when a panel opens (loadRecord). Dev
//    fetches data/<shard>/<id>.json. The release adds dist/records/<shard>/
//    <id>.js as a <script> tag, since file:// blocks fetch() but not that.
//
// Startup cost scales with the roster, not with the prose, and never
// assumes the roster size: counts come entirely from what the index holds.

import { CONFIG } from '../config.js';
import { setLineages } from './lineages.js';

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

// Which shard holds each node kind's full record.
export const SHARD_FOR_KIND = { artist: 'artists', machine: 'machines', scene: 'scenes', label: 'labels' };

// "shard/id" -> Promise of the full record. A failed load is dropped from
// the cache so opening the panel again retries it.
const recordCache = new Map();

function loadRecordScript(key) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `records/${key}.js`;
    script.onload = () => {
      script.remove();
      const record = window.LINEAGE_RECORDS?.[key];
      // The cache below holds it from here on.
      if (window.LINEAGE_RECORDS) delete window.LINEAGE_RECORDS[key];
      if (record) resolve(record);
      else reject(new Error(`records/${key}.js loaded but did not register a record`));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error(`Failed to load records/${key}.js`));
    };
    document.head.appendChild(script);
  });
}

export function loadRecord(shard, id) {
  const key = `${shard}/${id}`;
  if (!recordCache.has(key)) {
    const promise = window.LINEAGE_INDEX ? loadRecordScript(key) : fetchJson(`data/${key}.json`);
    promise.catch(() => recordCache.delete(key));
    recordCache.set(key, promise);
  }
  return recordCache.get(key);
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
  const bundle = window.LINEAGE_INDEX ?? (await fetchJson('data/index.json'));
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
    // Register keys every data register object carries, computed when the
    // index is built, since the prose is not loaded yet (Q15).
    registers: bundle.registers ?? [],
  };
}
