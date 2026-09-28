// Node id -> the edges leaving it and arriving at it, built once at load in
// one pass over whatever edges the loader returned. Nothing here knows the
// roster size. The same index is what focus dimming and spread-on-click
// will need when they are ported (BACKLOG, "Deferred from the Strata port").

export function buildNeighbours(edges) {
  const index = new Map();
  const entry = (id) => {
    if (!index.has(id)) index.set(id, { outbound: [], inbound: [] });
    return index.get(id);
  };
  for (const edge of edges) {
    entry(edge.from.id).outbound.push(edge);
    entry(edge.to.id).inbound.push(edge);
  }
  // Chronological, so a panel's connection list reads as a history.
  const byYear = (a, b) => (a.year ?? 0) - (b.year ?? 0);
  for (const { outbound, inbound } of index.values()) {
    outbound.sort(byYear);
    inbound.sort(byYear);
  }
  return {
    of: (id) => index.get(id) ?? { outbound: [], inbound: [] },
  };
}
