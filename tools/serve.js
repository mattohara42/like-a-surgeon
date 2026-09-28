#!/usr/bin/env node
// Stdlib-only dev static file server. Solves the file:// fetch problem for
// development: served over http://, fetch() works same-origin with no CORS
// issue. Run: node tools/serve.js [port]
// See docs/m1-architecture.md section 3.
//
// data/index.json, the skeleton the map loads at startup, is not a file on
// disk: it is built fresh from data/ on every request (tools/skeleton.js),
// so an edit to any record shows on the next page reload with no restart.
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeManifest } from './manifest.js';
import { buildIndex } from './skeleton.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2]) || 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.wasm': 'application/wasm',
};

writeManifest(join(ROOT, 'data'));

const INDEX_PATH = '/data/index.json';

const server = createServer((req, res) => {
  const requestPath = decodeURIComponent(req.url.split('?')[0]);

  if (requestPath === INDEX_PATH) {
    try {
      const body = JSON.stringify(buildIndex(join(ROOT, 'data')));
      res.writeHead(200, { 'Content-Type': MIME_TYPES['.json'] });
      res.end(body);
    } catch (err) {
      // A malformed record should say which one, not hang the page.
      console.error(err);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Could not build ${INDEX_PATH}: ${err.message}`);
    }
    return;
  }
  const resolved = normalize(join(ROOT, requestPath));

  // Reject any path that escapes the project root.
  if (!resolved.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  let filePath = resolved;
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const contentType = MIME_TYPES[extname(filePath)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Serving ${ROOT} at http://localhost:${PORT}`);
});
