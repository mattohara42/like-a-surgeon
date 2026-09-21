#!/usr/bin/env node
// Generates the M1 gate review artifacts from BUILD_PLAN.md: the edges
// Claude is least sure about, and a sample of trackPair.whatToListenFor
// text, the actual quality check on the dataset. Counts by lineage/type/
// confidence are already printed by tools/validate.js on every run.
// Run: node tools/report.js [--sample N]
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeManifest } from './manifest.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, 'data');

const sampleFlagIndex = process.argv.indexOf('--sample');
const SAMPLE_SIZE = sampleFlagIndex !== -1 ? Number(process.argv[sampleFlagIndex + 1]) : 20;

const manifest = writeManifest(DATA_DIR);
const edges = manifest.edges.map((id) =>
  JSON.parse(readFileSync(join(DATA_DIR, 'edges', `${id}.json`), 'utf8')),
);

const CONFIDENCE_RANK = { asserted: 0, consensus: 1, documented: 2 };
const leastSure = [...edges]
  .sort((a, b) => CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence])
  .slice(0, SAMPLE_SIZE);

console.log(`--- ${Math.min(SAMPLE_SIZE, edges.length)} edges Claude is least sure about (lowest confidence tier first) ---\n`);
for (const e of leastSure) {
  console.log(`[${e.confidence}] ${e.id}: ${e.from} -> ${e.to} (${e.type}, ${e.year})`);
  console.log(`  evidence: ${e.evidence}`);
  console.log('');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const sampled = shuffle(edges).slice(0, SAMPLE_SIZE);
console.log(`--- ${sampled.length} randomly sampled whatToListenFor fields ---\n`);
for (const e of sampled) {
  console.log(`${e.id} (${e.trackPair.earlier.artist} "${e.trackPair.earlier.title}" -> ${e.trackPair.later.artist} "${e.trackPair.later.title}"):`);
  console.log(`  ${e.trackPair.whatToListenFor}`);
  console.log('');
}
