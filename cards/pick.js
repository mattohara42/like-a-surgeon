// Which record a card view opens on, and what Random picks from
// (docs/cards-architecture.md section 2). Pure functions of the edges, so
// the pools grow with the roster and nobody maintains a list.

// Node id -> how many edges touch it, in or out.
export function connectionCounts(edges) {
  const counts = new Map();
  for (const edge of edges) {
    for (const id of [edge.from.id, edge.to.id]) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

// Ids of the records with at least `min` connections, in id order so the
// pool is stable between loads. Only ids the map knows are kept.
export function poolWithAtLeast(counts, nodesById, min) {
  return [...counts]
    .filter(([id, n]) => n >= min && nodesById.has(id))
    .map(([id]) => id)
    .sort();
}

// The opening pool, falling back to every connected record if the
// threshold is ever set above what the data has.
export function openingPool(counts, nodesById, min) {
  const pool = poolWithAtLeast(counts, nodesById, min);
  return pool.length ? pool : poolWithAtLeast(counts, nodesById, 1);
}

// One id from the pool, never `avoid` (the card on screen) unless it is
// the only choice. `random` returns [0, 1), as Math.random does.
export function pickFrom(pool, random = Math.random, avoid = null) {
  const choices = pool.length > 1 ? pool.filter((id) => id !== avoid) : pool;
  if (!choices.length) return null;
  return choices[Math.floor(random() * choices.length)];
}
