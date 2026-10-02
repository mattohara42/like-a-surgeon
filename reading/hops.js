// The Six Degrees hop graph (BACKLOG.md, A334): every edge in either
// direction, plus each scene's membership, as undirected links between node
// ids. Shared by the game (reading/sixDegrees.js) and `npm run report`, so
// both count a hop the same way. No DOM, no roster size: it is built from
// whatever links it is handed.
//
// A link is { a, b, edgeId }, with edgeId null for a scene membership.

export function buildHops(links) {
  const adjacent = new Map();
  const add = (from, to, edgeId) => {
    if (!adjacent.has(from)) adjacent.set(from, []);
    adjacent.get(from).push({ id: to, edgeId });
  };
  for (const { a, b, edgeId = null } of links) {
    if (a === b) continue;
    add(a, b, edgeId);
    add(b, a, edgeId);
  }

  // Breadth-first from `start`: each node's hop count and the step it was
  // reached by, so a shortest route can be walked back.
  function search(start) {
    const hops = new Map([[start, 0]]);
    const via = new Map();
    const queue = [start];
    for (let i = 0; i < queue.length; i += 1) {
      const here = queue[i];
      for (const step of adjacent.get(here) ?? []) {
        if (hops.has(step.id)) continue;
        hops.set(step.id, hops.get(here) + 1);
        via.set(step.id, { from: here, edgeId: step.edgeId });
        queue.push(step.id);
      }
    }
    return { hops, via };
  }

  return {
    // The distinct nodes one hop away, each with the first link that
    // reaches it (an edge before a membership, since edges carry evidence).
    neighbours(id) {
      const seen = new Map();
      for (const step of adjacent.get(id) ?? []) {
        const known = seen.get(step.id);
        if (!known || (known.edgeId === null && step.edgeId !== null)) seen.set(step.id, step);
      }
      return [...seen.values()];
    },
    // Hop counts from `target` to every node that can reach it.
    distancesTo(target) {
      return search(target).hops;
    },
    // One shortest route from `from` to `to`, as the steps taken after
    // `from`: [{ id, edgeId }]. Null when there is no route.
    shortestPath(from, to) {
      const { hops, via } = search(to);
      if (!hops.has(from)) return null;
      // Searching from the target means walking `via` leads from `from`
      // towards it, one step at a time.
      const steps = [];
      let here = from;
      while (here !== to) {
        const back = via.get(here);
        steps.push({ id: back.from, edgeId: back.edgeId });
        here = back.from;
      }
      return steps;
    },
  };
}
