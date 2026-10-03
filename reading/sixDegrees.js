// Six Degrees of Weird Al, the game (BACKLOG.md, A340).
//
// Start on an artist and hop, one connection at a time, until you reach
// CONFIG.sixDegrees.target. A hop is any edge in either direction, or a
// scene membership (A334), the same graph `npm run report` measures, from
// reading/hops.js. There is no dead end: past the hop limit the counter
// turns amber and the game goes on, and the finish scores the route
// against the shortest one possible (par). "Show me a route" lights one
// shortest route from where the reader stands and lists it.
//
// The game is a drawer page like a thread ({ kind: 'six', id: 'game' }).
// Each hop redraws it in place, flies the camera to the new stop and
// lights the route walked so far. While a game is in progress and the
// reader is reading something else, a chip beside the mission chip offers
// the way back, as the thread chip does. Random starts come only from
// artists within the hop limit, so every game handed out can be won.

import { CONFIG } from '../config.js';
import { COPY, EDGE_TYPE_LABELS } from './copy.js';
import { h } from './dom.js';
import { buildHops } from './hops.js';

const TARGET = { kind: 'six', id: 'game' };

// The callbacks come from main.js:
//   open(target)         opens a panel target and focuses it
//   focusRecord(target)  flies the camera to a node or edge
//   setPath(route)       lights a route on the map, or clears it
export function createSixDegrees(chipEl, { nodes, nodesById, edges, edgesById, sceneMembers, open, focusRecord, setPath }) {
  const { target: targetId, maxHops, minStartHops, minStartLinks } = CONFIG.sixDegrees;
  const links = edges.map((e) => ({ a: e.from.id, b: e.to.id, edgeId: e.id }));
  for (const node of nodes) {
    if (node.kind !== 'scene') continue;
    for (const member of sceneMembers(node.id)) links.push({ a: member.id, b: node.id, edgeId: null });
  }
  const hops = buildHops(links);
  const available = nodesById.has(targetId);
  const toTarget = available ? hops.distancesTo(targetId) : new Map();
  const starts = nodes.filter((n) => {
    const d = toTarget.get(n.id);
    return n.kind === 'artist' && d >= minStartHops && d <= maxHops && hops.neighbours(n.id).length >= minStartLinks;
  });

  // { start, steps: [{ id, edgeId }], route: [{ id, edgeId }] | null }
  // `route` is the revealed shortest route from the current stop.
  let game = null;
  // A start that cannot be played: { id, reason: 'target' | 'far' | 'none' }.
  let refused = null;
  let showing = false;

  const nameOf = (id) => nodesById.get(id)?.name ?? id;
  const here = () => (game.steps.length ? game.steps[game.steps.length - 1].id : game.start);
  const won = () => game && here() === targetId;
  const par = () => toTarget.get(game.start);

  function randomStart() {
    // Not the artist just played, when there is any other choice.
    const pool = starts.length > 1 && game ? starts.filter((n) => n.id !== game.start) : starts;
    return pool[Math.floor(Math.random() * pool.length)]?.id;
  }

  // The walked route, and the revealed one if any, for the map.
  function lit() {
    const nodeIds = new Set([game.start]);
    const edgeIds = new Set();
    for (const s of [...game.steps, ...(game.route ?? [])]) {
      nodeIds.add(s.id);
      if (s.edgeId) edgeIds.add(s.edgeId);
    }
    return { nodeIds: [...nodeIds], edgeIds: [...edgeIds] };
  }

  function show() {
    open(TARGET);
  }

  function begin(startId = randomStart()) {
    const d = toTarget.get(startId);
    if (startId === targetId) refused = { id: startId, reason: 'target' };
    else if (d === undefined) refused = { id: startId, reason: 'none' };
    else if (d > maxHops) refused = { id: startId, reason: 'far', hops: d };
    else refused = null;
    game = refused ? null : { start: startId, steps: [], route: null };
    show();
  }

  function hop(step) {
    game.steps.push(step);
    game.route = null;
    show();
  }

  function reveal() {
    game.route = hops.shortestPath(here(), targetId);
    show();
  }

  function end() {
    game = null;
    refused = null;
    setPath();
    drawChip();
  }

  function drawChip() {
    if (!game || showing || won()) {
      chipEl.hidden = true;
      chipEl.replaceChildren();
      return;
    }
    const label = `${COPY.sixDegrees.chip} · ${game.steps.length} ${COPY.sixDegrees.hopsWord}`;
    chipEl.hidden = false;
    chipEl.replaceChildren(
      h('button', { type: 'button', class: 'thread-back', 'aria-label': `${COPY.sixDegrees.backTo}: ${label}`, onClick: show }, `↩ ${label}`),
      h('button', { type: 'button', class: 'thread-end', 'aria-label': COPY.sixDegrees.end, onClick: end }, '×'),
    );
  }

  // What links two stops, in a few words: the edge type, or the scene.
  function linkLabel(step, ctx) {
    if (!step.edgeId) return COPY.sixDegrees.sceneLink;
    return EDGE_TYPE_LABELS[edgesById.get(step.edgeId)?.type] ?? '';
  }

  function routeList(steps, from, ctx) {
    let prev = from;
    return h(
      'ol',
      { class: 'six-route' },
      steps.map((s) => {
        const row = h(
          'li',
          {},
          h(
            'button',
            { type: 'button', class: 'link-row', onClick: () => (s.edgeId ? ctx.goEdge(s.edgeId) : ctx.goNode(s.id)) },
            h('span', { class: 'link-name' }, `${nameOf(prev)} → ${nameOf(s.id)}`),
            h('span', { class: 'link-meta' }, ` · ${linkLabel(s, ctx)}`),
          ),
        );
        prev = s.id;
        return row;
      }),
    );
  }

  function againButtons(ctx) {
    return h(
      'div',
      { class: 'thread-nav' },
      h('button', { type: 'button', class: 'thread-again', onClick: () => begin(game.start) }, COPY.sixDegrees.sameStart),
      h('button', { type: 'button', class: 'thread-next', onClick: () => begin() }, `${COPY.sixDegrees.newStart} →`),
    );
  }

  function page(ctx, ...children) {
    return h('article', { class: 'panel-body thread six' }, h('div', { class: 'kicker' }, COPY.sixDegrees.kicker), ...children);
  }

  function render(ctx) {
    if (refused) {
      const name = nameOf(refused.id);
      const why = refused.reason === 'target'
        ? COPY.sixDegrees.isTarget
        : refused.reason === 'none'
          ? `${name} ${COPY.sixDegrees.noRoute}`
          : `${name} ${COPY.sixDegrees.isAway} ${refused.hops} ${COPY.sixDegrees.tooFar}`;
      return page(
        ctx,
        h('h2', {}, name),
        h('p', { class: 'body' }, why),
        h('div', { class: 'thread-nav' }, h('button', { type: 'button', class: 'thread-next', onClick: () => begin() }, `${COPY.sixDegrees.newStart} →`)),
      );
    }

    const taken = game.steps.length;
    if (won()) {
      const best = par();
      const score = taken === best
        ? COPY.sixDegrees.onPar
        : `${COPY.sixDegrees.shortestWas} ${best}.`;
      return page(
        ctx,
        h('h2', {}, COPY.sixDegrees.won),
        h('p', { class: 'body' }, `${nameOf(game.start)} → ${nameOf(targetId)}: ${taken} ${COPY.sixDegrees.hopsWord}. ${score}`),
        h('h3', {}, COPY.sixDegrees.yourRoute),
        routeList(game.steps, game.start, ctx),
        againButtons(ctx),
      );
    }

    const at = here();
    const last = game.steps[taken - 1];
    const over = taken > maxHops;
    const choices = hops
      .neighbours(at)
      .filter((n) => nodesById.has(n.id))
      .sort((a, b) => nameOf(a.id).localeCompare(nameOf(b.id)));

    return page(
      ctx,
      h('h2', {}, `${nameOf(game.start)} → ${nameOf(targetId)}`),
      taken === 0 ? h('p', { class: 'body' }, COPY.sixDegrees.intro) : null,
      h(
        'p',
        { class: `six-count${over ? ' over' : ''}` },
        `${COPY.sixDegrees.hopsLabel} ${taken} / ${maxHops}`,
        over ? ` · ${COPY.sixDegrees.overLimit}` : '',
      ),
      h('h3', {}, `${COPY.sixDegrees.youAreAt} ${nameOf(at)}`),
      h(
        'div',
        { class: 'six-here' },
        h('button', { type: 'button', class: 'link-row', onClick: () => ctx.goNode(at) }, COPY.sixDegrees.readStop),
        last?.edgeId
          ? h('button', { type: 'button', class: 'link-row', onClick: () => ctx.goEdge(last.edgeId) }, COPY.sixDegrees.readLink)
          : null,
      ),
      game.route
        ? h('div', { class: 'six-reveal' }, h('h3', {}, COPY.sixDegrees.routeHeading), routeList(game.route, at, ctx))
        : null,
      h('h3', {}, COPY.sixDegrees.whereNext),
      h(
        'div',
        { class: 'six-choices' },
        choices.map((c) =>
          h(
            'button',
            { type: 'button', class: 'door six-choice', onClick: () => hop(c) },
            h('span', { class: 'door-title' }, nameOf(c.id)),
            h('span', { class: 'door-line' }, linkLabel(c, ctx)),
          ),
        ),
      ),
      h(
        'div',
        { class: 'thread-nav' },
        game.route ? null : h('button', { type: 'button', class: 'thread-again', onClick: reveal }, COPY.sixDegrees.showRoute),
        h('button', { type: 'button', class: 'thread-again', onClick: () => begin() }, COPY.sixDegrees.newStart),
      ),
    );
  }

  drawChip();

  return {
    available: () => available && starts.length > 0,
    // Starts a game: from `id`, or a random playable artist.
    begin,
    // Whether an artist panel should offer a start from this node.
    canStartFrom: (node) => available && node.kind === 'artist' && node.id !== targetId,
    render,
    // Camera and route, whenever the game page is shown.
    focus() {
      if (!game) return;
      setPath(lit());
      focusRecord({ kind: 'node', id: here() });
    },
    // Called on every panel change (null when the drawer closes).
    noticeTarget(target) {
      showing = target?.kind === 'six';
      drawChip();
    },
  };
}
