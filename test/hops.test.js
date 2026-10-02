// The Six Degrees hop graph (reading/hops.js).
import assert from 'node:assert';
import { test } from 'node:test';
import { buildHops } from '../reading/hops.js';

// a - b - c - target, plus a scene s that a and d belong to.
const links = [
  { a: 'a', b: 'b', edgeId: 'e-ab' },
  { a: 'c', b: 'b', edgeId: 'e-cb' },
  { a: 'c', b: 'target', edgeId: 'e-ct' },
  { a: 'a', b: 's', edgeId: null },
  { a: 'd', b: 's', edgeId: null },
];

test('edges count in either direction', () => {
  const hops = buildHops(links);
  assert.deepStrictEqual(hops.neighbours('b').map((n) => n.id).sort(), ['a', 'c']);
});

test('scene membership is a hop with no edge', () => {
  const hops = buildHops(links);
  assert.deepStrictEqual(hops.neighbours('d'), [{ id: 's', edgeId: null }]);
});

test('an edge is preferred over a membership to the same node', () => {
  const hops = buildHops([{ a: 'x', b: 'y', edgeId: null }, { a: 'x', b: 'y', edgeId: 'e-xy' }]);
  assert.deepStrictEqual(hops.neighbours('x'), [{ id: 'y', edgeId: 'e-xy' }]);
});

test('distances to the target', () => {
  const dist = buildHops(links).distancesTo('target');
  assert.strictEqual(dist.get('target'), 0);
  assert.strictEqual(dist.get('a'), 3);
  assert.strictEqual(dist.get('d'), 5);
});

test('shortest path walks towards the target', () => {
  const path = buildHops(links).shortestPath('a', 'target');
  assert.deepStrictEqual(path, [
    { id: 'b', edgeId: 'e-ab' },
    { id: 'c', edgeId: 'e-cb' },
    { id: 'target', edgeId: 'e-ct' },
  ]);
});

test('no route gives null, and the target to itself is empty', () => {
  const hops = buildHops([...links, { a: 'p', b: 'q', edgeId: 'e-pq' }]);
  assert.strictEqual(hops.shortestPath('p', 'target'), null);
  assert.deepStrictEqual(hops.shortestPath('target', 'target'), []);
});
