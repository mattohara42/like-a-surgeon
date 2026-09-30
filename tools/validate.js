#!/usr/bin/env node
// Validates the sharded data/ tree. Run: node tools/validate.js [--strict]
//
// Hard errors always fail the run (exit 1). Warnings are reported but only
// fail the run under --strict. Counts by lineage, edge type, and confidence
// tier are always printed, pass or fail. See data/SCHEMA.md and
// docs/m1-architecture.md section 4 for the rules this enforces.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeManifest, SHARD_TYPES } from './manifest.js';
import { checkDemo } from './demoSchema.js';
import { CONFIG } from '../config.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, 'data');
const STRICT = process.argv.includes('--strict');

const EDGE_TYPES = [
  'direct',
  'production',
  'technological',
  'label',
  'scene',
  'sample',
  'reaction-against',
  'rediscovery',
  'cover',
];
const CONFIDENCE_TIERS = ['documented', 'consensus', 'asserted'];
const MACHINE_KINDS = [
  'drum-machine',
  'synth',
  'sampler',
  'studio-technique',
  'format',
  'instrument',
  'effect',
  'amplifier',
];

// Shard directory name -> expected `type` field value.
const SHARD_TO_TYPE = {
  lineages: 'lineage',
  artists: 'artist',
  machines: 'machine',
  scenes: 'scene',
  labels: 'label',
  edges: 'edge',
  demos: 'demo',
  threads: 'thread',
};

// The four node types that share one id namespace (section 1 of
// docs/m1-architecture.md), since edge.from/to and thread nodeId carry no
// type tag.
const NODE_SHARDS = ['artists', 'machines', 'scenes', 'labels'];

const REGISTER_FIELDS = {
  artists: ['blurb'],
  machines: ['blurb'],
  scenes: ['blurb'],
  labels: ['blurb'],
  edges: ['explanation'],
  demos: ['caption'],
  threads: ['intro', 'outro'],
};

const REQUIRED_FIELDS = {
  lineages: ['id', 'name', 'color', 'order'],
  artists: [
    'id', 'name', 'sortName', 'type', 'lineage', 'activeFrom', 'activeTo',
    'originCity', 'originCountry', 'scenes', 'labels', 'keyProducers',
    'hook', 'blurb', 'signatureTracks',
  ],
  machines: [
    'id', 'name', 'type', 'kind', 'lineage', 'maker', 'releasedYear',
    'discontinuedYear', 'originalPurpose', 'whatActuallyHappened',
    'priceStory', 'hook', 'blurb',
  ],
  scenes: [
    'id', 'name', 'type', 'lineage', 'yearFrom', 'yearTo', 'city', 'country',
    'hook', 'blurb', 'geopolitics', 'whatWasNew', 'production', 'labels',
    'politics', 'memberIds', 'palette', 'motif',
  ],
  labels: [
    'id', 'name', 'type', 'lineage', 'foundedYear', 'closedYear', 'city',
    'founders', 'ownershipStory', 'hook', 'blurb',
  ],
  edges: [
    'id', 'from', 'to', 'type', 'confidence', 'evidence', 'year',
    'crossLineage', 'trackPair', 'explanation', 'tags',
  ],
  demos: ['id', 'title', 'kind', 'params', 'caption', 'safety'],
  threads: ['id', 'title', 'subtitle', 'intro', 'steps', 'outro'],
};

// The start-year field per node shard. A record without one cannot be
// placed on the time axis, so the map skips it (render/loader.js).
const START_FIELDS = {
  artists: 'activeFrom',
  machines: 'releasedYear',
  scenes: 'yearFrom',
  labels: 'foundedYear',
};

// The end-year field per node shard, for the endUnknown check (Q20).
const END_FIELDS = {
  artists: 'activeTo',
  machines: 'discontinuedYear',
  scenes: 'yearTo',
  labels: 'closedYear',
};

const errors = [];
const warnings = [];
function fail(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

const manifest = writeManifest(DATA_DIR);

// shard -> id -> record
const records = {};
for (const shard of SHARD_TYPES) {
  records[shard] = new Map();
  for (const id of manifest[shard]) {
    const path = join(DATA_DIR, shard, `${id}.json`);
    let record;
    try {
      record = JSON.parse(readFileSync(path, 'utf8'));
    } catch (err) {
      fail(`${shard}/${id}.json: invalid JSON (${err.message})`);
      continue;
    }
    if (record.id !== id) {
      fail(`${shard}/${id}.json: filename does not match id "${record.id}"`);
    }
    records[shard].set(id, record);
  }
}

// The legal lineage values are whatever data/lineages/ holds, so adding a
// lineage is one file there and nothing here.
const LINEAGES = [...records.lineages.keys()];
const lineageOrders = new Map();
for (const [id, lineage] of records.lineages) {
  const where = `lineages/${id}.json`;
  if (typeof lineage.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(lineage.color)) {
    fail(`${where}: color must be a six-digit hex colour like "#5fa8ff"`);
  }
  if (!Number.isFinite(lineage.order)) {
    fail(`${where}: order must be a number`);
  } else if (lineageOrders.has(lineage.order)) {
    fail(`${where}: order ${lineage.order} is already used by "${lineageOrders.get(lineage.order)}"`);
  } else {
    lineageOrders.set(lineage.order, id);
  }
}

// Shared node namespace, and per-group duplicate checks.
const nodeOwner = new Map(); // id -> shard, across artists/machines/scenes/labels
for (const shard of NODE_SHARDS) {
  for (const id of records[shard].keys()) {
    if (nodeOwner.has(id)) {
      fail(`Duplicate id "${id}" in both ${nodeOwner.get(id)} and ${shard}`);
    } else {
      nodeOwner.set(id, shard);
    }
  }
}

function resolveNode(id) {
  const shard = nodeOwner.get(id);
  return shard ? records[shard].get(id) : undefined;
}

// keyProducers and songsAboutLabel[].artist take an artist id or a plain
// name (SCHEMA.md). A plain name ("Hank Shocklee") is valid data and draws
// as text, so only an id-shaped value (lowercase words joined by hyphens)
// that resolves to nothing is worth a warning: that is a typo, or a record
// not yet written.
function looksLikeId(value) {
  return typeof value === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
}

function checkRegisterObject(where, fieldName, value) {
  if (value == null || typeof value !== 'object') {
    fail(`${where}: ${fieldName} must be a register object`);
    return;
  }
  for (const key of ['age13', 'adult']) {
    if (!value[key] || typeof value[key] !== 'string' || !value[key].trim()) {
      fail(`${where}: ${fieldName}.${key} is required and must be non-empty`);
    }
  }
}

for (const shard of SHARD_TYPES) {
  const expectedType = SHARD_TO_TYPE[shard];
  for (const [id, record] of records[shard]) {
    const where = `${shard}/${id}.json`;

    // Only artist/machine/scene/label carry a literal type marker
    // ("type": "artist"). Edge repurposes `type` for its relationship enum
    // (checked separately below); demo and thread have no type field at all.
    if (NODE_SHARDS.includes(shard) && record.type !== expectedType) {
      fail(`${where}: type must be "${expectedType}", got "${record.type}"`);
    }

    for (const field of REQUIRED_FIELDS[shard]) {
      if (!(field in record) || record[field] === '') {
        fail(`${where}: missing required field "${field}"`);
      }
    }

    for (const field of REGISTER_FIELDS[shard] || []) {
      if (record[field] !== undefined) checkRegisterObject(where, field, record[field]);
    }

    // A warning, not an error: an unsourced founding year stays null
    // rather than being invented (CLAUDE.md accuracy rule 2), and the map
    // copes by leaving the record off the axis. But it is invisible there,
    // so it should be seen here.
    const startField = START_FIELDS[shard];
    if (startField && record[startField] == null) {
      warn(`${where}: ${startField} is null, so the record cannot be placed on the time axis and does not draw`);
    }

    if (record.lineage !== undefined && !LINEAGES.includes(record.lineage)) {
      fail(`${where}: illegal lineage "${record.lineage}"`);
    }
    if (shard === 'machines' && record.kind !== undefined && !MACHINE_KINDS.includes(record.kind)) {
      fail(`${where}: illegal machine kind "${record.kind}"`);
    }

    // Q20: `endUnknown: true` separates "the end is unsourced" from a plain
    // null end, which means "still going". It only makes sense beside a
    // null end year.
    if ('endUnknown' in record) {
      const endField = END_FIELDS[shard];
      if (!endField) {
        fail(`${where}: endUnknown is only allowed on artists, machines, scenes and labels`);
      } else if (record.endUnknown !== true) {
        fail(`${where}: endUnknown must be true when present (omit it otherwise)`);
      } else if (record[endField] !== null) {
        fail(`${where}: endUnknown is set but ${endField} is ${record[endField]}, not null`);
      }
    }
  }
}

// artist references
//
// artist.scenes[] and artist.labels[].labelId are warnings, not hard
// errors, when unresolved: CLAUDE.md's scope rule says data expansion "is a
// permanent parallel track with no gate at all," and an artist naming a
// scene or label that hasn't been authored yet is exactly that in-progress
// roster growth, not a bug. Structural references (scene.memberIds,
// edge.from/to, demoId, thread steps) stay hard errors below, since those
// are graph edges added alongside the nodes they connect, not backlog.
for (const [id, artist] of records.artists) {
  const where = `artists/${id}.json`;
  for (const sceneId of artist.scenes || []) {
    if (!records.scenes.has(sceneId)) {
      warn(`${where}: scenes references unresolved scene "${sceneId}" (not yet authored?)`);
    }
  }
  for (const labelRef of artist.labels || []) {
    if (!records.labels.has(labelRef.labelId)) {
      warn(`${where}: labels references unresolved label "${labelRef.labelId}" (not yet authored?)`);
    }
  }
  for (const producer of artist.keyProducers || []) {
    if (looksLikeId(producer) && !records.artists.has(producer)) {
      warn(`${where}: keyProducers entry "${producer}" looks like an artist id but none exists (a typo, or a record not yet written)`);
    }
  }
  // Entry shapes. A malformed entry otherwise surfaces only indirectly
  // (an unresolved "undefined" label) or not at all (a track with no
  // whyThisOne, which is reader-facing text).
  for (const [i, labelRef] of (artist.labels || []).entries()) {
    if (!labelRef || typeof labelRef.labelId !== 'string') {
      warn(`${where}: labels[${i}] must be an object with a string labelId`);
    }
  }
  for (const [i, track] of (artist.signatureTracks || []).entries()) {
    if (typeof track?.title !== 'string' || !track.title.trim()) {
      warn(`${where}: signatureTracks[${i}] has no title`);
    }
    if (typeof track?.whyThisOne !== 'string' || !track.whyThisOne.trim()) {
      warn(`${where}: signatureTracks[${i}] ("${track?.title}") has no whyThisOne`);
    }
    // Same rule as trackPair search: a bad value would quietly draw a
    // wrong link, so it is an error.
    const search = track?.search;
    if (search !== undefined && search !== false && (typeof search !== 'string' || !search.trim())) {
      fail(`${where}: signatureTracks[${i}].search must be a non-empty string or false, got ${JSON.stringify(search)}`);
    }
  }
  const trackCount = (artist.signatureTracks || []).length;
  if (trackCount < 2 || trackCount > 3) {
    warn(`${where}: signatureTracks has ${trackCount} entries, expected 2 to 3`);
  }
}

// label references: songsAboutLabel[].artist follows the same convention as
// artist.keyProducers above (an id when the artist is on the map, a plain
// name otherwise), so an unresolved value is a warning, not an error.
for (const [id, label] of records.labels) {
  const where = `labels/${id}.json`;
  for (const song of label.songsAboutLabel || []) {
    if (looksLikeId(song.artist) && !records.artists.has(song.artist)) {
      warn(`${where}: songsAboutLabel entry "${song.title}" artist "${song.artist}" looks like an artist id but none exists (a typo, or a record not yet written)`);
    }
  }
}

// scene city: one name, or a list of names for a scene spread across
// several cities.
for (const [id, scene] of records.scenes) {
  const city = scene.city;
  const ok = typeof city === 'string'
    ? city.trim() !== ''
    : Array.isArray(city) && city.length > 0 && city.every((c) => typeof c === 'string' && c.trim());
  if (!ok) fail(`scenes/${id}.json: city must be a non-empty string or a non-empty list of strings`);
}

// scene references
//
// Membership is written on both sides (artist.scenes and scene.memberIds)
// and nothing kept them in step, so each side is checked against the other.
// The reading surface unions the two (main.js sceneMembers), so a mismatch
// loses no one on screen, but it is still a record that disagrees with
// itself. Membership without a scene-to-artist edge is deliberately not
// checked: a scene edge is a specific causal claim, most members have none,
// and membership stays out of the graph like other roster relationships
// (A69, A254).
for (const [id, scene] of records.scenes) {
  const where = `scenes/${id}.json`;
  for (const memberId of scene.memberIds || []) {
    const artist = records.artists.get(memberId);
    if (!artist) {
      fail(`${where}: memberIds references unresolved artist "${memberId}"`);
      continue;
    }
    if (!(artist.scenes || []).includes(id)) {
      warn(`${where}: memberIds lists "${memberId}", but artists/${memberId}.json does not list this scene`);
    }
  }
}
for (const [id, artist] of records.artists) {
  for (const sceneId of artist.scenes || []) {
    const scene = records.scenes.get(sceneId);
    if (scene && !(scene.memberIds || []).includes(id)) {
      warn(`artists/${id}.json: lists scene "${sceneId}", but scenes/${sceneId}.json does not list this artist in memberIds`);
    }
  }
}

// demo params: what a player needs to make the demo sound
// (tools/demoSchema.js, docs/m4-architecture.md section 5)
for (const [id, demo] of records.demos) {
  const where = `demos/${id}.json`;
  const errs = checkDemo(demo, (field, value) => checkRegisterObject(where, field, value));
  for (const e of errs) fail(`${where}: ${e}`);
}

// machine/edge/thread demoId references
function checkDemoId(where, demoId) {
  if (demoId !== undefined && !records.demos.has(demoId)) {
    fail(`${where}: demoId references unresolved demo "${demoId}"`);
  }
}
for (const [id, machine] of records.machines) {
  checkDemoId(`machines/${id}.json`, machine.demoId);
}

// edge references and crossLineage check
for (const [id, edge] of records.edges) {
  const where = `edges/${id}.json`;
  const fromNode = resolveNode(edge.from);
  const toNode = resolveNode(edge.to);
  if (!fromNode) fail(`${where}: from references unresolved node "${edge.from}"`);
  if (!toNode) fail(`${where}: to references unresolved node "${edge.to}"`);
  if (edge.type !== undefined && !EDGE_TYPES.includes(edge.type)) {
    fail(`${where}: illegal edge type "${edge.type}"`);
  }
  if (edge.confidence !== undefined && !CONFIDENCE_TIERS.includes(edge.confidence)) {
    fail(`${where}: illegal confidence tier "${edge.confidence}"`);
  }
  checkDemoId(where, edge.demoId);
  // trackPair side `search` (Q17, A78): absent means "artist title", a
  // non-empty string replaces the query, false means no link. Anything else
  // would quietly draw a wrong link, so it is a hard error.
  for (const side of ['earlier', 'later']) {
    const search = edge.trackPair?.[side]?.search;
    if (search === undefined || search === false) continue;
    if (typeof search !== 'string' || !search.trim()) {
      fail(`${where}: trackPair.${side}.search must be a non-empty string or false, got ${JSON.stringify(search)}`);
    }
  }
  // tools/report.js flags this at gate review. Flagging it here catches
  // it while the edge is being written.
  const pair = edge.trackPair;
  if (pair?.earlier?.year != null && pair?.later?.year != null && pair.earlier.year > pair.later.year) {
    warn(`${where}: trackPair runs backwards (earlier ${pair.earlier.year} is after later ${pair.later.year})`);
  }
  if (fromNode && toNode && typeof edge.crossLineage === 'boolean') {
    const expected = fromNode.lineage !== toNode.lineage;
    if (edge.crossLineage !== expected) {
      fail(`${where}: crossLineage is ${edge.crossLineage}, but from.lineage (${fromNode.lineage}) vs to.lineage (${toNode.lineage}) computes to ${expected}`);
    }
  }
}

// thread steps: references, and the framing the thread player shows
// (docs/m5-architecture.md section 5)
for (const [id, thread] of records.threads) {
  const where = `threads/${id}.json`;
  const steps = thread.steps || [];
  if (steps.length < CONFIG.threads.minSteps) {
    fail(`${where}: a thread needs at least ${CONFIG.threads.minSteps} steps, has ${steps.length}`);
  }
  for (const [i, step] of steps.entries()) {
    checkRegisterObject(where, `steps[${i}].framing`, step.framing);
    for (const key of Object.keys(step)) {
      if (!['nodeId', 'edgeId', 'framing', 'demoId'].includes(key)) fail(`${where}: steps[${i}].${key} is not a step field`);
    }
    const hasNode = step.nodeId !== undefined;
    const hasEdge = step.edgeId !== undefined;
    if (hasNode === hasEdge) {
      fail(`${where}: steps[${i}] must have exactly one of nodeId or edgeId`);
    }
    if (hasNode && !resolveNode(step.nodeId)) {
      fail(`${where}: steps[${i}] references unresolved node "${step.nodeId}"`);
    }
    if (hasEdge && !records.edges.has(step.edgeId)) {
      fail(`${where}: steps[${i}] references unresolved edge "${step.edgeId}"`);
    }
    checkDemoId(`${where}: steps[${i}]`, step.demoId);
    // The player shows each stop's own record panel, and so that record's
    // own demo (A284). A step demo naming anything else would never appear.
    if (step.demoId !== undefined) {
      const shown = hasEdge ? records.edges.get(step.edgeId)?.demoId : resolveNode(step.nodeId)?.demoId;
      if (shown !== step.demoId) {
        fail(`${where}: steps[${i}].demoId is "${step.demoId}", but the stop shows its record's own demo (${shown ? `"${shown}"` : 'none'}); drop it or make them match`);
      }
    }
  }
}

// orphan node warning
const touchedNodes = new Set();
for (const edge of records.edges.values()) {
  touchedNodes.add(edge.from);
  touchedNodes.add(edge.to);
}
for (const shard of NODE_SHARDS) {
  for (const id of records[shard].keys()) {
    if (!touchedNodes.has(id)) {
      warn(`${shard}/${id}.json: orphan node, no edges touch it`);
    }
  }
}

// counts report, always printed
function countBy(map, keyFn) {
  const counts = {};
  for (const record of map.values()) {
    const key = keyFn(record);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

console.log('--- Counts ---');
console.log('Nodes by lineage:', countBy(
  new Map([...records.artists, ...records.machines, ...records.scenes, ...records.labels]),
  (r) => r.lineage,
));
console.log('Edges by type:', countBy(records.edges, (r) => r.type));
console.log('Edges by confidence:', countBy(records.edges, (r) => r.confidence));
console.log('Record counts:', Object.fromEntries(SHARD_TYPES.map((s) => [s, records[s].size])));

if (warnings.length) {
  console.log(`\n--- Warnings (${warnings.length}) ---`);
  for (const w of warnings) console.log('WARN:', w);
}

if (errors.length) {
  console.log(`\n--- Errors (${errors.length}) ---`);
  for (const e of errors) console.log('ERROR:', e);
}

const failed = errors.length > 0 || (STRICT && warnings.length > 0);
console.log(`\n${failed ? 'FAILED' : 'PASSED'}: ${errors.length} error(s), ${warnings.length} warning(s)${STRICT ? ' [--strict]' : ''}`);
process.exit(failed ? 1 : 0);
