// Shared helper: walks the sharded data/ tree and builds the manifest
// structure. Called by serve.js, validate.js, and bundle.js so all three
// see the same file list. data/manifest.json is generated output; nothing
// hand-edits it (see data/SCHEMA.md).
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const SHARD_TYPES = [
  'artists',
  'machines',
  'scenes',
  'labels',
  'edges',
  'demos',
  'threads',
];

export function buildManifest(dataDir) {
  const manifest = {};
  for (const shard of SHARD_TYPES) {
    const dir = join(dataDir, shard);
    let entries = [];
    try {
      entries = readdirSync(dir);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    manifest[shard] = entries
      .filter((name) => name.endsWith('.json'))
      .map((name) => name.slice(0, -'.json'.length))
      .sort();
  }
  return manifest;
}

// Regenerates data/manifest.json on disk from the current directory
// contents. Called on every serve.js/validate.js/bundle.js run, so the
// file is always a fresh reflection of the filesystem, never stale.
export function writeManifest(dataDir) {
  const manifest = buildManifest(dataDir);
  writeFileSync(
    join(dataDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  return manifest;
}
