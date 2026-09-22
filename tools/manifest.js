// Shared helper: walks the sharded data/ tree and builds the manifest
// structure. Called by serve.js, validate.js, and bundle.js so all three
// see the same file list. data/manifest.json is generated output; nothing
// hand-edits it (see data/SCHEMA.md).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
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

// What the reader sees as the map's version stamp (A20, Q16, A77). The
// version is bumped by hand in package.json when the dataset changes in a
// way worth announcing. The date is when this manifest was generated: in
// dev that is every server start, and in dist/ it is the build.
function buildMeta(dataDir) {
  const pkg = JSON.parse(readFileSync(join(dataDir, '..', 'package.json'), 'utf8'));
  return {
    version: pkg.version ?? null,
    generatedAt: new Date().toISOString().slice(0, 10),
  };
}

export function buildManifest(dataDir) {
  const manifest = { meta: buildMeta(dataDir) };
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
