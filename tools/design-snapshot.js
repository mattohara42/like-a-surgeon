// Freezes the current data/ tree into design/_data.js, a plain (non-module)
// script that sets window.LINEAGE.
//
// Why a snapshot rather than the real loader: the prototypes in design/ are
// throwaway visual explorations that have to open by double-clicking a file
// from disk, with no server. file:// blocks both fetch and ES module imports,
// but a classic <script src> still works. Nothing in design/ is app code and
// nothing in src/ should ever import this.
//
// Regenerate with: npm run design:snapshot
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest } from './manifest.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');
const outFile = join(root, 'design', '_data.js');

const manifest = buildManifest(dataDir);
const read = (shard, id) =>
  JSON.parse(readFileSync(join(dataDir, shard, `${id}.json`), 'utf8'));
const collect = (shard) => manifest[shard].map((id) => read(shard, id));

const snapshot = {
  generatedAt: new Date().toISOString().slice(0, 10),
  artists: collect('artists'),
  machines: collect('machines'),
  scenes: collect('scenes'),
  labels: collect('labels'),
  edges: collect('edges'),
  demos: collect('demos'),
  threads: collect('threads'),
};

const counts = Object.entries(snapshot)
  .filter(([, v]) => Array.isArray(v))
  .map(([k, v]) => `${v.length} ${k}`)
  .join(', ');

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(
  outFile,
  `// GENERATED FILE. Do not edit.\n` +
    `// Snapshot of data/ taken ${snapshot.generatedAt}: ${counts}.\n` +
    `// Regenerate with: npm run design:snapshot\n` +
    `window.LINEAGE = ${JSON.stringify(snapshot, null, 2)};\n`,
);

console.log(`design/_data.js written (${counts})`);
