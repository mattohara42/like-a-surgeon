// Shared helper: builds the skeleton index, the part of the dataset the map
// needs before it can draw. Called by serve.js (dev, fresh on every request
// for data/index.json) and bundle.js (release, dist/data.js), so both load
// exactly the same thing.
//
// The skeleton is every record cut down to the fields the graph, search,
// Arrange by and the scene atmosphere read: ids, names, years, lineage,
// hook, membership, places, and each edge's endpoints, type, tier and year.
// Everything else (blurbs, evidence, trackPairs, whatToListenFor, the
// scene essays) is loaded one record at a time when a panel opens
// (render/loader.js loadRecord). On today's data the skeleton is about a
// seventh of the bytes, and it grows with the roster, not with the prose.
//
// The field lists are whitelists. A new field that something outside the
// reading panels needs has to be added here, or the map will not see it.
// Lineages, demos and threads are small and ship whole.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildManifest } from './manifest.js';

const PERIOD = ['endUnknown'];

export const SKELETON_FIELDS = {
  artists: ['id', 'type', 'lineage', 'name', 'sortName', 'hook', 'activeFrom', 'activeTo', ...PERIOD,
    'originCity', 'originCountry', 'scenes', 'labels'],
  machines: ['id', 'type', 'lineage', 'name', 'sortName', 'hook', 'releasedYear', 'discontinuedYear', ...PERIOD],
  scenes: ['id', 'type', 'lineage', 'name', 'sortName', 'hook', 'yearFrom', 'yearTo', ...PERIOD,
    'city', 'country', 'memberIds', 'palette', 'motif'],
  labels: ['id', 'type', 'lineage', 'name', 'sortName', 'hook', 'foundedYear', 'closedYear', ...PERIOD, 'city'],
  edges: ['id', 'from', 'to', 'type', 'confidence', 'year', 'crossLineage', 'tags', 'demoId'],
};

// Shards whose full records are loaded on demand. The rest ship whole.
export const DETAIL_SHARDS = Object.keys(SKELETON_FIELDS);

function pickFields(record, fields) {
  const out = {};
  for (const field of fields) {
    if (field in record) out[field] = record[field];
  }
  return out;
}

// Every reader-facing register object in the data: blurbs, edge
// explanations, demo captions, thread text. Same set reading/registers.js
// used to walk on the client, moved here because the client no longer has
// the prose at startup.
function* registerObjects(records) {
  for (const shard of ['artists', 'machines', 'scenes', 'labels']) {
    for (const r of Object.values(records[shard])) if (r.blurb) yield r.blurb;
  }
  for (const e of Object.values(records.edges)) if (e.explanation) yield e.explanation;
  for (const d of Object.values(records.demos)) if (d.caption) yield d.caption;
  for (const t of Object.values(records.threads)) {
    if (t.intro) yield t.intro;
    if (t.outro) yield t.outro;
    for (const step of t.steps ?? []) if (step.framing) yield step.framing;
  }
}

// The register keys that every data register object carries, non-empty
// (Q15). The client intersects this with its own configured registers and
// interface copy, so the Kid register still appears on its own the day the
// Track D pass completes (A11).
function completeRegisters(records) {
  let complete = null;
  for (const obj of registerObjects(records)) {
    const keys = Object.keys(obj).filter((k) => typeof obj[k] === 'string' && obj[k].trim());
    complete = complete ? complete.filter((k) => keys.includes(k)) : keys;
    if (complete.length === 0) break;
  }
  return complete ?? [];
}

// Reads every record once and returns both halves: the skeleton index and
// the full records, so bundle.js can write the per-record files from the
// same read.
export function readDataset(dataDir) {
  const manifest = buildManifest(dataDir);
  const records = {};
  for (const [shard, ids] of Object.entries(manifest)) {
    if (shard === 'meta') continue;
    records[shard] = {};
    for (const id of ids) {
      const path = join(shard, `${id}.json`);
      try {
        records[shard][id] = JSON.parse(readFileSync(join(dataDir, path), 'utf8'));
      } catch (err) {
        throw new Error(`data/${path}: ${err.message}`);
      }
    }
  }
  const index = { meta: manifest.meta, registers: completeRegisters(records) };
  for (const shard of Object.keys(records)) {
    const fields = SKELETON_FIELDS[shard];
    index[shard] = {};
    for (const [id, record] of Object.entries(records[shard])) {
      index[shard][id] = fields ? pickFields(record, fields) : record;
    }
  }
  return { index, records };
}

export function buildIndex(dataDir) {
  return readDataset(dataDir).index;
}
