// Cards, the phone version: the opening and random pools (cards/pick.js)
// and the view switch and card addresses (cards/route.js).
import assert from 'node:assert';
import { test } from 'node:test';
import { connectionCounts, poolWithAtLeast, openingPool, pickFrom } from '../cards/pick.js';
import { chooseView, parseRoute, routeFor } from '../cards/route.js';

const edge = (from, to) => ({ from: { id: from }, to: { id: to } });
const edges = [edge('a', 'b'), edge('a', 'c'), edge('a', 'd'), edge('b', 'c'), edge('ghost', 'a')];
const nodesById = new Map(['a', 'b', 'c', 'd', 'e'].map((id) => [id, { id, kind: id === 'd' ? 'machine' : 'artist' }]));

test('connections count both directions', () => {
  const counts = connectionCounts(edges);
  assert.strictEqual(counts.get('a'), 4);
  assert.strictEqual(counts.get('c'), 2);
  assert.strictEqual(counts.get('e'), undefined);
});

test('a pool keeps only known records at or over the threshold, in id order', () => {
  const counts = connectionCounts(edges);
  assert.deepStrictEqual(poolWithAtLeast(counts, nodesById, 1), ['a', 'b', 'c', 'd']);
  assert.deepStrictEqual(poolWithAtLeast(counts, nodesById, 2), ['a', 'b', 'c']);
});

test('the opening pool falls back to every connected record', () => {
  const counts = connectionCounts(edges);
  assert.deepStrictEqual(openingPool(counts, nodesById, 4), ['a']);
  assert.deepStrictEqual(openingPool(counts, nodesById, 99), ['a', 'b', 'c', 'd']);
});

test('random never repeats the card on screen unless it has to', () => {
  const pool = ['a', 'b', 'c'];
  for (const r of [0, 0.4, 0.99]) assert.notStrictEqual(pickFrom(pool, () => r, 'a'), 'a');
  assert.strictEqual(pickFrom(['a'], () => 0.5, 'a'), 'a');
  assert.strictEqual(pickFrom([], () => 0.5), null);
  assert.strictEqual(pickFrom(pool, () => 0), 'a');
  assert.strictEqual(pickFrom(pool, () => 0.999), 'c');
});

test('the view follows the screen unless the address asks', () => {
  assert.strictEqual(chooseView('', 390, 390, 700), 'cards');
  assert.strictEqual(chooseView('', 1280, 800, 700), 'map');
  // A phone held sideways: a wide window on a small screen.
  assert.strictEqual(chooseView('', 844, 390, 700), 'cards');
  // A narrowed desktop window.
  assert.strictEqual(chooseView('', 500, 1080, 700), 'cards');
  assert.strictEqual(chooseView('?view=map', 390, 390, 700), 'map');
  assert.strictEqual(chooseView('?view=cards', 1280, 800, 700), 'cards');
  assert.strictEqual(chooseView('?view=nonsense', 1280, 800, 700), 'map');
});

test('card addresses read and write', () => {
  assert.deepStrictEqual(parseRoute('#/artist/kraftwerk'), { kind: 'node', id: 'kraftwerk' });
  assert.deepStrictEqual(parseRoute('#/machine/tr-808'), { kind: 'node', id: 'tr-808' });
  assert.deepStrictEqual(parseRoute('#/edge/e-kraftwerk-planetrock'), { kind: 'edge', id: 'e-kraftwerk-planetrock' });
  for (const bad of ['', '#', '#/', '#/artist/', '#/planet/x', 'artist/x', '#/artist/%E0%A4%A', undefined]) {
    assert.strictEqual(parseRoute(bad), null, String(bad));
  }
  assert.strictEqual(routeFor({ kind: 'node', id: 'd' }, nodesById), '#/machine/d');
  assert.strictEqual(routeFor({ kind: 'edge', id: 'e-x' }, nodesById), '#/edge/e-x');
  const round = routeFor({ kind: 'node', id: 'a' }, nodesById);
  assert.deepStrictEqual(parseRoute(round), { kind: 'node', id: 'a' });
});
