// The lineage lanes, read from data/lineages/ at load time. Each record
// carries its display name, colour and lane order, so adding a lineage is
// one data file and no code change (CLAUDE.md scope rule). The loader fills
// this registry once, before anything renders; every other module asks it
// rather than keeping its own list.

import { CONFIG } from '../config.js';

const byId = new Map();
const ordered = [];

export function setLineages(records) {
  byId.clear();
  ordered.length = 0;
  const sorted = [...records].sort((a, b) => a.order - b.order);
  for (const record of sorted) {
    byId.set(record.id, record);
    ordered.push(record.id);
  }
}

// Lineage ids in lane order, top to bottom.
export function lineageIds() {
  return ordered;
}

export function lineageColor(id) {
  return byId.get(id)?.color ?? CONFIG.colors.lineageFallback;
}

export function lineageName(id) {
  return byId.get(id)?.name ?? id;
}
