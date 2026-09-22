#!/usr/bin/env node
// Generates the M1 gate report. Run: node tools/report.js [options]
//
// BUILD_PLAN.md's M1 gate is: "Matt reviews a generated report of counts by
// lineage, edge type, and confidence tier, plus the twenty edges you are
// least sure about, plus twenty randomly sampled whatToListenFor fields."
// This is the tool that produces that. It reads the same sharded tree as
// tools/validate.js and writes Markdown.
//
// Options:
//   --edges=N    how many least-certain edges to list (default 20)
//   --tracks=N   how many whatToListenFor fields to sample (default 20)
//   --seed=N     PRNG seed for the sample, so a report is reproducible
//   --out=PATH   write to a file instead of stdout
//
// This tool reports. It does not validate: run tools/validate.js for that.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest, SHARD_TYPES } from './manifest.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, 'data');

// M1 step 5 targets, from BUILD_PLAN.md. Kept here so the report can show
// distance-to-gate rather than bare counts.
const M1_TARGETS = {
  artists: 120,
  machines: 25,
  scenes: 20,
  labels: 30,
  edges: 350,
  threads: 5,
  crossLineageEdges: 60,
  edgesWithDemo: 30,
};

// How "least sure about" is computed. The dataset stores no authorial
// certainty field, so this is a derived proxy: confidence tier first, then
// flags readable off the record itself. Every flag that fires is printed
// next to its edge, so the ranking argues for itself rather than asking to
// be trusted. See ASSUMPTIONS.md A47.
const TIER_SCORE = { asserted: 100, consensus: 50, documented: 0 };

// Evidence wording that admits the claim is not nailed down. Matched
// against edge.evidence, case-insensitively.
const HEDGE_PATTERNS = [
  // Catches both "no documented connection" and the phrasing this dataset
  // reaches for more often: "without a single documented collaboration",
  // "no specific documented meeting". The bounded gap keeps it from
  // spanning a whole sentence and matching two unrelated clauses.
  [/\b(no|without an?y?|without the)\b[^.;]{0,40}?\b(documented|direct evidence|surviving|first-person)\b/i,
    'evidence says the connection is not documented'],
  [/\b(disputed|contested|apocryphal)\b/i, 'evidence calls the claim disputed'],
  [/\b(probably|likely|presumably)\b/i, 'evidence hedges with probably/likely'],
  [/\b(reportedly|said to|claimed|is credited with saying)\b/i, 'evidence is second-hand'],
  [/\b(often|widely|frequently) (repeated|told|cited)\b/i, 'evidence flags a popular-history claim'],
  [/\b(may|might|could) have\b/i, 'evidence hedges with may/might have'],
  [/\b(unclear|uncertain|not known|nobody has shown)\b/i, 'evidence admits the gap'],
];
const HEDGE_SCORE = 15;

// An evidence field this short has not described a source.
const THIN_EVIDENCE_CHARS = 120;
const THIN_EVIDENCE_SCORE = 20;

// A trackPair that cannot name a record is a claim with nothing to play.
const VAGUE_TITLE = /^(various|untitled|unknown|n\/a)\b/i;
const VAGUE_TRACK_SCORE = 15;
const MISSING_YEAR_SCORE = 10;

// An influence that lands before its source exists.
const BACKWARDS_CHRONOLOGY_SCORE = 25;

const DEFAULTS = { edges: 20, tracks: 20, seed: 1 };

function parseArgs(argv) {
  const opts = { ...DEFAULTS, out: null };
  for (const arg of argv) {
    const match = /^--(edges|tracks|seed|out)=(.*)$/.exec(arg);
    if (!match) {
      if (arg.startsWith('--')) {
        console.error(`Unknown option "${arg}". See the header of tools/report.js.`);
        process.exit(2);
      }
      continue;
    }
    const [, key, raw] = match;
    if (key === 'out') {
      opts.out = raw;
      continue;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) {
      console.error(`--${key} needs a non-negative integer, got "${raw}".`);
      process.exit(2);
    }
    opts[key] = value;
  }
  return opts;
}

// Deterministic PRNG (mulberry32), so "randomly sampled" stays reviewable:
// the same seed against the same dataset gives the same twenty fields, and
// a different seed gives a fresh draw.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sample(items, count, random) {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function loadRecords() {
  const manifest = buildManifest(DATA_DIR);
  const records = {};
  for (const shard of SHARD_TYPES) {
    records[shard] = new Map();
    for (const id of manifest[shard]) {
      const path = join(DATA_DIR, shard, `${id}.json`);
      records[shard].set(id, JSON.parse(readFileSync(path, 'utf8')));
    }
  }
  return records;
}

function countBy(records, keyFn) {
  const counts = new Map();
  for (const record of records) {
    const key = keyFn(record) ?? '(none)';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

// The uncertainty proxy. Returns a score and the human-readable reasons
// behind it, so the report can print both.
function scoreEdge(edge) {
  const reasons = [];
  let score = TIER_SCORE[edge.confidence] ?? 0;
  reasons.push(`${edge.confidence} tier`);

  const evidence = typeof edge.evidence === 'string' ? edge.evidence : '';
  for (const [pattern, reason] of HEDGE_PATTERNS) {
    if (pattern.test(evidence)) {
      score += HEDGE_SCORE;
      reasons.push(reason);
    }
  }
  if (evidence.trim().length < THIN_EVIDENCE_CHARS) {
    score += THIN_EVIDENCE_SCORE;
    reasons.push(`evidence is ${evidence.trim().length} chars, under ${THIN_EVIDENCE_CHARS}`);
  }

  const pair = edge.trackPair || {};
  for (const side of ['earlier', 'later']) {
    const track = pair[side];
    if (!track) continue;
    if (VAGUE_TITLE.test(String(track.title || ''))) {
      score += VAGUE_TRACK_SCORE;
      reasons.push(`${side} track names no specific record ("${track.title}")`);
    }
    if (track.year == null) {
      score += MISSING_YEAR_SCORE;
      reasons.push(`${side} track has no year`);
    }
  }
  if (pair.earlier?.year != null && pair.later?.year != null && pair.earlier.year > pair.later.year) {
    score += BACKWARDS_CHRONOLOGY_SCORE;
    reasons.push(`track pair runs backwards (${pair.earlier.year} after ${pair.later.year})`);
  }

  return { score, reasons };
}

function countsTable(rows, header) {
  const lines = [`| ${header} | count |`, '|---|---:|'];
  for (const [key, count] of rows) lines.push(`| ${key} | ${count} |`);
  return lines.join('\n');
}

function progressTable(records) {
  const edges = [...records.edges.values()];
  const actual = {
    artists: records.artists.size,
    machines: records.machines.size,
    scenes: records.scenes.size,
    labels: records.labels.size,
    edges: records.edges.size,
    threads: records.threads.size,
    crossLineageEdges: edges.filter((e) => e.crossLineage === true).length,
    edgesWithDemo: edges.filter((e) => e.demoId).length,
  };
  const lines = ['| | now | M1 target | |', '|---|---:|---:|---|'];
  for (const [key, target] of Object.entries(M1_TARGETS)) {
    const now = actual[key];
    const pct = Math.round((now / target) * 100);
    lines.push(`| ${key} | ${now} | ${target} | ${now >= target ? 'met' : `${pct}%`} |`);
  }
  return lines.join('\n');
}

function describeNode(id, records) {
  for (const shard of ['artists', 'machines', 'scenes', 'labels']) {
    const record = records[shard].get(id);
    if (record) return record.name;
  }
  return `${id} (unresolved)`;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const records = loadRecords();
  const edges = [...records.edges.values()];
  const nodes = [
    ...records.artists.values(),
    ...records.machines.values(),
    ...records.scenes.values(),
    ...records.labels.values(),
  ];

  const out = [];
  out.push('# M1 gate report');
  out.push('');
  out.push(`Generated by \`tools/report.js\` on ${new Date().toISOString().slice(0, 10)}.`);
  out.push('Regenerate with `npm run report`. This report describes the dataset only;');
  out.push('`npm run validate` is what checks it.');
  out.push('');

  out.push('## Distance to the M1 targets');
  out.push('');
  out.push(progressTable(records));
  out.push('');

  out.push('## Counts by lineage');
  out.push('');
  out.push('Every node type, since machines, scenes and labels carry a lineage too.');
  out.push('');
  out.push(countsTable(countBy(nodes, (r) => r.lineage), 'lineage'));
  out.push('');
  out.push('Artists alone:');
  out.push('');
  out.push(countsTable(countBy([...records.artists.values()], (r) => r.lineage), 'lineage'));
  out.push('');

  out.push('## Counts by edge type');
  out.push('');
  out.push(countsTable(countBy(edges, (r) => r.type), 'edge type'));
  out.push('');

  out.push('## Counts by confidence tier');
  out.push('');
  out.push(countsTable(countBy(edges, (r) => r.confidence), 'tier'));
  out.push('');

  const ranked = edges
    .map((edge) => ({ edge, ...scoreEdge(edge) }))
    .sort((a, b) => b.score - a.score || a.edge.id.localeCompare(b.edge.id))
    .slice(0, opts.edges);

  out.push(`## The ${ranked.length} edges to read hardest`);
  out.push('');
  out.push('Ranked by a derived uncertainty score, not by a stored judgement: the');
  out.push('dataset has no "how sure are you" field. Confidence tier sets the base,');
  out.push('then flags readable off the record itself add to it. Each edge prints the');
  out.push('flags that fired, so you can disagree with the ranking on the evidence.');
  out.push('Edges on the same score are ordered by id, which carries no meaning.');
  if (edges.length <= opts.edges) {
    out.push('');
    out.push(`At ${edges.length} edges the dataset is smaller than the requested ${opts.edges},`);
    out.push('so this is every edge, ordered worst-first rather than a shortlist.');
  }
  out.push('');
  for (const [index, { edge, score, reasons }] of ranked.entries()) {
    out.push(`### ${index + 1}. \`${edge.id}\` (score ${score})`);
    out.push('');
    out.push(`${describeNode(edge.from, records)} to ${describeNode(edge.to, records)}, `
      + `${edge.type}, ${edge.confidence}, ${edge.year}`);
    out.push('');
    out.push(`Flags: ${reasons.join('; ')}.`);
    out.push('');
    out.push(`Evidence: ${edge.evidence}`);
    out.push('');
  }

  const withTracks = edges.filter((e) => e.trackPair?.whatToListenFor);
  const random = mulberry32(opts.seed);
  const sampled = sample(withTracks, opts.tracks, random);

  out.push(`## ${sampled.length} sampled \`whatToListenFor\` fields`);
  out.push('');
  out.push(`Drawn with seed ${opts.seed} from the ${withTracks.length} edges that carry one.`);
  out.push('Reading these is the real quality check on the dataset (BUILD_PLAN.md).');
  out.push('Pass `--seed=N` for a different draw.');
  out.push('');
  for (const [index, edge] of sampled.entries()) {
    const pair = edge.trackPair;
    out.push(`### ${index + 1}. \`${edge.id}\``);
    out.push('');
    out.push(`${pair.earlier.artist}, "${pair.earlier.title}" (${pair.earlier.year}) `
      + `to ${pair.later.artist}, "${pair.later.title}" (${pair.later.year})`);
    out.push('');
    out.push(pair.whatToListenFor);
    out.push('');
  }

  const text = out.join('\n').replace(/\n{3,}/g, '\n\n');
  if (opts.out) {
    writeFileSync(join(ROOT, opts.out), text.endsWith('\n') ? text : `${text}\n`);
    console.log(`Wrote ${opts.out}`);
  } else {
    console.log(text);
  }
}

main();
