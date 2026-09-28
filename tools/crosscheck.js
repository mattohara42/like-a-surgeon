#!/usr/bin/env node
// Cross-checks the dataset against outside reference sources and writes a
// Markdown list of disagreements to review. Run: npm run crosscheck
//
// This is the source verification pass (ASSUMPTIONS.md A155 onward) as a
// tool, so it can be re-run after every batch instead of rebuilt by hand.
// It is a dev tool and the only one that touches the network. The app
// itself never does, and nothing here is imported by the app.
//
// What it checks:
//   - Wikidata, via each node's English Wikipedia article: deaths and
//     dissolutions the map doesn't know about, and end years that differ.
//   - MusicBrainz: every signatureTracks and trackPair year against the
//     earliest release it can match.
//   - Locally: track pairs whose earlier record is dated after the later one.
//
// A disagreement is a place to look, not a correction. Most of them are
// conventions (our activeFrom is the first record that matters to the map,
// Wikidata's is often the start of a career) or search noise (MusicBrainz
// matching a reissue). docs/sources.md says how to settle them.
//
// Options:
//   --out=PATH      write the report to a file instead of stdout
//   --ids=a,b,c     only check these records (and edges touching them)
//   --skip=NAME     skip a source: wikidata, musicbrainz (repeatable)
//   --refresh       ignore cached responses and fetch again
//
// Responses are cached in .crosscheck/ (gitignored) for a week, so a
// re-run after a small batch only fetches what's new.
//
// Node's built-in fetch ignores HTTPS_PROXY. When a proxy is set, the tool
// re-launches itself with NODE_USE_ENV_PROXY=1 (Node 22.21 or later).
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { buildManifest } from './manifest.js';

if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
  const child = spawnSync(process.execPath, process.argv.slice(1), {
    stdio: 'inherit',
    env: { ...process.env, NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' },
  });
  process.exit(child.status ?? 1);
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, 'data');
const CACHE_DIR = join(ROOT, '.crosscheck');

// Wikimedia asks every client to identify itself, and throttles the ones
// that don't much sooner.
const USER_AGENT = 'LineageAtlasCrosscheck/0.1 (https://github.com/mattohara42/like-a-surgeon)';
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Minimum gap between requests to one host. MusicBrainz publishes one a
// second. Wikimedia publishes nothing firm but throttles a shared IP hard,
// so it gets more room. See docs/sources.md.
const HOST_GAP_MS = {
  'en.wikipedia.org': 3000,
  'query.wikidata.org': 5000,
  'musicbrainz.org': 1100,
};
const MAX_ATTEMPTS = 8;

// How far apart two years have to be before the report mentions it.
const START_YEAR_SLACK = 2;

// Wikipedia title candidates, most specific first. The first one that
// exists and isn't a disambiguation page wins, so "Can (band)" beats the
// modal verb. Scenes are skipped: their articles are genres, whose dates
// say nothing about our scene records.
const TITLE_CANDIDATES = {
  artists: (n) => [`${n} (band)`, `${n} (musician)`, `${n} (rapper)`, `${n} (DJ)`, `${n} (producer)`, n],
  labels: (n) => [`${n} (record label)`, `${n} Records`, n],
  machines: (n) => [n],
};

// Wikidata properties read for each node.
const WIKIDATA_PROPS = {
  P569: 'born',
  P570: 'died',
  P571: 'inception',
  P576: 'dissolved',
  P2031: 'workStart',
  P2032: 'workEnd',
};

const YEAR_FIELDS = {
  artists: ['activeFrom', 'activeTo'],
  machines: ['releasedYear', 'discontinuedYear'],
  scenes: ['yearFrom', 'yearTo'],
  labels: ['foundedYear', 'closedYear'],
};

function parseArgs(argv) {
  const opts = { out: null, ids: null, skip: new Set(), refresh: false };
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, '').split('=');
    if (key === 'out') opts.out = value;
    else if (key === 'ids') opts.ids = new Set(value.split(',').map((s) => s.trim()).filter(Boolean));
    else if (key === 'skip') opts.skip.add(value);
    else if (key === 'refresh') opts.refresh = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return opts;
}

function loadRecords() {
  const manifest = buildManifest(DATA_DIR);
  const records = {};
  for (const shard of ['artists', 'machines', 'scenes', 'labels', 'edges']) {
    records[shard] = (manifest[shard] ?? []).map((id) =>
      JSON.parse(readFileSync(join(DATA_DIR, shard, `${id}.json`), 'utf8')));
  }
  return records;
}

// ---------------------------------------------------------------- http

const lastRequestAt = new Map();
// A 403 is a refusal, not a rate limit: Wikimedia answers a client it has
// blocked under its robot policy with one. Retrying would be exactly the
// behaviour the block is for, so a 403 stops all requests to that host for
// the rest of the run, and the report says which checks were cut short.
const refusedHosts = new Set();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let refresh = false;

async function request(url, { body = null, accept = 'application/json' } = {}) {
  const key = createHash('sha1').update(`${url}\n${body ?? ''}`).digest('hex');
  const cacheFile = join(CACHE_DIR, `${key}.json`);
  if (!refresh && existsSync(cacheFile) && Date.now() - statSync(cacheFile).mtimeMs < CACHE_MAX_AGE_MS) {
    return JSON.parse(readFileSync(cacheFile, 'utf8'));
  }

  const host = new URL(url).host;
  if (refusedHosts.has(host)) return null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const wait = (lastRequestAt.get(host) ?? 0) + (HOST_GAP_MS[host] ?? 1000) - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt.set(host, Date.now());
    try {
      const res = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          'Api-User-Agent': USER_AGENT,
          Accept: accept,
          ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        },
        body,
        signal: AbortSignal.timeout(60000),
      });
      if (res.ok) {
        const json = await res.json();
        writeFileSync(cacheFile, JSON.stringify(json));
        return json;
      }
      if (res.status === 403) {
        refusedHosts.add(host);
        process.stderr.write(`  ${host} refused the request (403). Not asking it again this run.\n`);
        return null;
      }
      const retryAfter = Number(res.headers.get('retry-after')) || 5 * attempt;
      process.stderr.write(`  ${host} ${res.status}, waiting ${retryAfter}s\n`);
      await sleep(retryAfter * 1000);
    } catch (err) {
      process.stderr.write(`  ${host} ${err.name}, retrying\n`);
      await sleep(3000 * attempt);
    }
  }
  process.stderr.write(`  gave up on ${url.slice(0, 100)}\n`);
  return null;
}

// ---------------------------------------------------------- wikidata

async function resolveArticles(nodes) {
  const wanted = [];
  for (const { shard, record } of nodes) {
    const make = TITLE_CANDIDATES[shard];
    if (make) wanted.push({ id: record.id, candidates: make(record.name) });
  }

  const pages = new Map(); // requested title -> { title, qid, disambiguation }
  const titles = [...new Set(wanted.flatMap((w) => w.candidates))];
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const params = new URLSearchParams({
      action: 'query', format: 'json', redirects: '1',
      prop: 'pageprops', ppprop: 'wikibase_item|disambiguation',
      titles: batch.join('|'),
    });
    const res = await request(`https://en.wikipedia.org/w/api.php?${params}`);
    if (!res?.query) continue;
    const renamed = new Map();
    for (const n of [...(res.query.normalized ?? []), ...(res.query.redirects ?? [])]) renamed.set(n.from, n.to);
    const byTitle = new Map(Object.values(res.query.pages).map((p) => [p.title, p]));
    for (const requested of batch) {
      let title = requested;
      for (let hops = 0; renamed.has(title) && hops < 3; hops++) title = renamed.get(title);
      const page = byTitle.get(title);
      if (page && !('missing' in page)) {
        pages.set(requested, {
          title,
          qid: page.pageprops?.wikibase_item ?? null,
          disambiguation: page.pageprops ? 'disambiguation' in page.pageprops : false,
        });
      }
    }
  }

  const resolved = new Map();
  for (const w of wanted) {
    const hit = w.candidates.map((c) => pages.get(c)).find((p) => p && p.qid && !p.disambiguation);
    if (hit) resolved.set(w.id, hit);
  }
  return resolved;
}

async function fetchWikidataYears(qids) {
  const values = [...new Set(qids)].map((q) => `wd:${q}`).join(' ');
  const props = Object.keys(WIKIDATA_PROPS).map((p) => `wdt:${p}`).join(' ');
  const query = `SELECT ?i ?p ?v WHERE { VALUES ?i { ${values} } VALUES ?p { ${props} } ?i ?p ?v . }`;
  const res = await request('https://query.wikidata.org/sparql', {
    body: new URLSearchParams({ query }).toString(),
    accept: 'application/sparql-results+json',
  });
  const years = new Map(); // qid -> { died: [1999], ... }
  for (const b of res?.results?.bindings ?? []) {
    const qid = b.i.value.split('/').pop();
    const name = WIKIDATA_PROPS[b.p.value.split('/').pop()];
    const year = Number(/^(\d{4})-/.exec(b.v.value)?.[1]);
    if (!name || !year) continue;
    if (!years.has(qid)) years.set(qid, {});
    const entry = years.get(qid);
    (entry[name] ??= []).push(year);
  }
  return years;
}

async function checkWikidata(nodes) {
  const findings = { ended: [], endDiffers: [], startDiffers: [], unresolved: [] };
  const resolved = await resolveArticles(nodes);
  const years = resolved.size ? await fetchWikidataYears([...resolved.values()].map((r) => r.qid)) : new Map();

  for (const { shard, record } of nodes) {
    if (!TITLE_CANDIDATES[shard]) continue;
    const article = resolved.get(record.id);
    if (!article) {
      findings.unresolved.push(record);
      continue;
    }
    const y = years.get(article.qid) ?? {};
    const [startField, endField] = YEAR_FIELDS[shard];
    const ourStart = record[startField];
    const ourEnd = record[endField];
    const where = `\`${record.id}\` ([${article.title}](https://en.wikipedia.org/wiki/${encodeURIComponent(article.title.replace(/ /g, '_'))}))`;

    // A death or dissolution the record doesn't know about is the finding
    // that matters most: A155 found two.
    const theirEnd = y.died ? Math.max(...y.died) : y.dissolved ? Math.max(...y.dissolved) : null;
    const endKind = y.died ? 'died' : 'dissolved';
    if (theirEnd && ourEnd == null && !record.endUnknown) {
      findings.ended.push(`${where}: Wikidata says ${endKind} ${theirEnd}, the record has no end year.`);
    } else if (theirEnd && ourEnd != null && theirEnd !== ourEnd) {
      findings.endDiffers.push(`${where}: ours ends ${ourEnd}, Wikidata says ${endKind} ${theirEnd}.`);
    }

    const theirStarts = [...(y.workStart ?? []), ...(y.inception ?? [])];
    if (ourStart != null && theirStarts.length && theirStarts.every((s) => Math.abs(s - ourStart) > START_YEAR_SLACK)) {
      findings.startDiffers.push(`${where}: ours starts ${ourStart}, Wikidata has ${[...new Set(theirStarts)].sort().join(' or ')}.`);
    }
  }
  return { findings, resolvedCount: resolved.size };
}

// ------------------------------------------------------- musicbrainz

// Track titles carry notes for the reader ("(with Melle Mel)", ", produced
// for MC Shan", "(album)"). None of that is in MusicBrainz's title.
function cleanTitle(title) {
  return title
    .replace(/\s*\((?:album|single|EP|with|as|produced|remix|instrumental)[^)]*\)/gi, '')
    .replace(/,\s*(?:produced|as|from)\b.*$/i, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/["“”]/g, '')
    .trim();
}

function cleanArtist(artist) {
  return artist.replace(/\s*\([^)]*\)/g, '').replace(/^The\s+/i, '').trim();
}

const luceneEscape = (s) => s.replace(/([+\-&|!(){}[\]^"~*?:\\/])/g, '\\$1');

// Words long enough to identify an artist, lowercased. Used both to query
// (as loose terms, since an exact phrase misses "& The Soulsonic Force"
// against "& Soulsonic Force") and to check that a hit is the same artist.
function artistWords(artist) {
  return cleanArtist(artist).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !['and', 'the', 'feat'].includes(w));
}

const normalizeTitle = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// A producer's signatureTracks entry names the performing act in brackets,
// "Sinsemilla (Black Uhuru)", and that act is who MusicBrainz credits.
function actInTitle(title) {
  const m = /\(([^)]+)\)\s*$/.exec(title);
  if (!m || /^(album|single|ep|remix|instrumental)\b/i.test(m[1])) return '';
  // "(with Aerosmith)" names a guest, not the act, and matching on the
  // guest finds their own earlier record of the song.
  if (/^with\b/i.test(m[1])) return '';
  return m[1].replace(/^(as|produced (by|for))\s+/i, '').replace(/\s+with\s+.*$/i, '');
}

async function earliestRelease(artist, title) {
  // Each name's longest word is its most distinctive, and a hit has to
  // carry it: sharing "frankie" matched a 1955 'Your Love' by a different
  // Frankie, while "bambaataa" still matches "& The Soulsonic Force".
  const names = [artistWords(artist), artistWords(actInTitle(title))].filter((w) => w.length);
  if (!names.length) return null;
  const keyWords = names.map((w) => w.reduce((a, b) => (b.length > a.length ? b : a)));
  const words = [...new Set(names.flat())];
  const wantedTitle = normalizeTitle(cleanTitle(title));
  let earliest = null;
  for (const kind of ['release-group', 'recording']) {
    const field = kind === 'recording' ? 'recording' : 'releasegroup';
    const query = `${field}:"${luceneEscape(cleanTitle(title))}" AND artist:(${words.map(luceneEscape).join(' ')})`;
    const res = await request(`https://musicbrainz.org/ws/2/${kind}?${new URLSearchParams({ query, fmt: 'json', limit: '100' })}`);
    for (const hit of res?.[`${kind}s`] ?? []) {
      // Search score is no guide: remix EPs outscore the original single.
      // An exact title match plus a shared artist word is.
      if (normalizeTitle(hit.title) !== wantedTitle) continue;
      const credit = (hit['artist-credit'] ?? []).map((c) => `${c.name} ${c.artist?.name ?? ''}`).join(' ');
      const theirWords = new Set(artistWords(credit));
      if (!keyWords.some((w) => theirWords.has(w))) continue;
      const year = Number(hit['first-release-date']?.slice(0, 4));
      if (year && (earliest === null || year < earliest)) earliest = year;
    }
  }
  return earliest;
}

function trackJobs(records, include) {
  const jobs = [];
  for (const a of records.artists) {
    if (!include(a.id)) continue;
    for (const t of a.signatureTracks ?? []) {
      jobs.push({ where: `\`${a.id}\` signatureTracks`, artist: a.name, title: t.title, year: t.year });
    }
  }
  for (const e of records.edges) {
    if (!include(e.id) && !include(e.from) && !include(e.to)) continue;
    for (const side of ['earlier', 'later']) {
      const t = e.trackPair?.[side];
      if (!t || t.search === false || !t.title) continue;
      jobs.push({ where: `\`${e.id}\` ${side}`, artist: t.artist, title: t.title, year: t.year });
    }
  }
  return jobs;
}

async function checkMusicBrainz(records, include) {
  const findings = { earlier: [], later: [], unmatched: [] };
  const jobs = trackJobs(records, include);
  const seen = new Map();
  let done = 0;
  for (const job of jobs) {
    const key = `${job.artist}|${job.title}`;
    if (!seen.has(key)) seen.set(key, await earliestRelease(job.artist, job.title));
    const theirs = seen.get(key);
    const line = `${job.where}: ${job.artist}, '${job.title}'`;
    if (theirs === null) findings.unmatched.push(line);
    else if (job.year != null && theirs < job.year) findings.earlier.push(`${line}: ours ${job.year}, MusicBrainz ${theirs}.`);
    else if (job.year != null && theirs > job.year + 1) findings.later.push(`${line}: ours ${job.year}, earliest MusicBrainz match ${theirs}.`);
    if (++done % 25 === 0) process.stderr.write(`  musicbrainz ${done}/${jobs.length}\n`);
  }
  return { findings, checked: jobs.length };
}

// ------------------------------------------------------------- local

function checkLocal(records, include) {
  const inverted = [];
  for (const e of records.edges) {
    if (!include(e.id) && !include(e.from) && !include(e.to)) continue;
    const a = e.trackPair?.earlier?.year;
    const b = e.trackPair?.later?.year;
    if (a != null && b != null && a > b) inverted.push(`\`${e.id}\`: earlier record ${a}, later record ${b}.`);
  }
  return { inverted };
}

// ------------------------------------------------------------ report

function section(lines, title, intro, items) {
  lines.push(`## ${title}`, '', intro, '');
  if (!items.length) lines.push('None.', '');
  else lines.push(...items.map((i) => `- ${i}`), '');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  refresh = opts.refresh;
  mkdirSync(CACHE_DIR, { recursive: true });

  const records = loadRecords();
  const include = (id) => !opts.ids || opts.ids.has(id);
  const nodes = ['artists', 'machines', 'scenes', 'labels']
    .flatMap((shard) => records[shard].map((record) => ({ shard, record })))
    .filter(({ record }) => include(record.id));

  const lines = [
    '# Cross-check report',
    '',
    `Generated ${new Date().toISOString().slice(0, 10)} by \`tools/crosscheck.js\`${opts.ids ? ` for ${opts.ids.size} record(s)` : ''}.`,
    'Every line is a disagreement to look at, not a correction to make. See `docs/sources.md` for how to settle one.',
    '',
  ];

  const local = checkLocal(records, include);
  section(lines, 'Track pairs that run backwards',
    "The earlier record is dated after the later one. Either a year is wrong or the pair needs a note on why (A169).",
    local.inverted);

  if (!opts.skip.has('wikidata')) {
    process.stderr.write('Checking Wikidata...\n');
    const { findings, resolvedCount } = await checkWikidata(nodes);
    section(lines, 'Ended, according to Wikidata',
      'A death or dissolution for a record with no end year and no `endUnknown`. Check these first: the map may be out of date.',
      findings.ended);
    section(lines, 'End years that differ',
      'Often a convention (the last record rather than a death), sometimes an error.',
      findings.endDiffers);
    section(lines, 'Start years that differ by more than two years',
      "Usually convention: our start is the first work that matters to the map, Wikidata's is often a career start.",
      findings.startDiffers);
    section(lines, 'Not matched to a Wikipedia article',
      `${resolvedCount} records were matched by title. These weren't, so Wikidata wasn't checked for them.`,
      findings.unresolved.map((r) => `\`${r.id}\` (${r.name})`));
  }

  if (!opts.skip.has('musicbrainz')) {
    process.stderr.write('Checking MusicBrainz...\n');
    const { findings, checked } = await checkMusicBrainz(records, include);
    section(lines, 'MusicBrainz dates a track earlier',
      `Of ${checked} track years checked. A strong signal: an earlier match is rarely a reissue.`,
      findings.earlier);
    section(lines, "MusicBrainz's earliest match is later",
      'A weaker signal. Often it matched a reissue or compilation and missed the original, but this is how the 1982 date for a 1984 record was found (A157).',
      findings.later);
    section(lines, 'Not found in MusicBrainz',
      'Titles with reader notes, DJ sets and unreleased pieces land here. Nothing to fix unless a real record is missing.',
      findings.unmatched);
  }

  if (refusedHosts.size) {
    lines.push('## Sources that refused', '',
      `These hosts answered 403 and were not asked again, so their checks above are incomplete: ${[...refusedHosts].join(', ')}. ` +
      "Wikimedia sends 403 when it blocks a client under its robot policy. Don't retry until the block has lifted.", '');
  }

  const text = lines.join('\n');
  if (opts.out) {
    writeFileSync(join(ROOT, opts.out), text.endsWith('\n') ? text : `${text}\n`);
    process.stderr.write(`Wrote ${opts.out}\n`);
  } else {
    process.stdout.write(`${text}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
