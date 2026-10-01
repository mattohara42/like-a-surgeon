// Cards, the phone version (docs/cards-architecture.md): one record per
// screen, a connection card between records, and a bar with Back, Random
// and the reading level.
//
// A card is the drawer's own content (reading/nodePanel.js and
// reading/edgePanel.js) in a different shell. The context handed to those
// renderers has no demos and no producer list, so the audio block and
// "Follow the producer" do not draw (section 2, decision 4). Nothing here
// imports from render/graph.js, and the map never imports from cards/.
//
// Each card has an address (Q40). Moving to a card pushes a history entry
// carrying how many cards deep the reader is, so Back and the phone's own
// back gesture do the same thing, and Back is off on the first card.

import { CONFIG } from '../config.js';
import { loadRecord, SHARD_FOR_KIND } from '../render/loader.js';
import { lineageColor } from '../render/lineages.js';
import { availableRegisters, loadRegister, saveRegister, pick } from '../reading/registers.js';
import { buildNeighbours } from '../reading/neighbours.js';
import { createSceneMembers } from '../reading/members.js';
import { renderNodePanel } from '../reading/nodePanel.js';
import { renderEdgePanel } from '../reading/edgePanel.js';
import { COPY } from '../reading/copy.js';
import { h } from '../reading/dom.js';
import { connectionCounts, poolWithAtLeast, openingPool, pickFrom } from './pick.js';
import { isSmallScreen, parseRoute, routeFor } from './route.js';

export function startCards(data) {
  const nodesById = new Map(data.nodes.map((n) => [n.id, n]));
  const edgesById = new Map(data.edges.map((e) => [e.id, e]));
  const neighbours = buildNeighbours(data.edges);
  const sceneMembers = createSceneMembers(data.nodes, nodesById);
  const counts = connectionCounts(data.edges);
  const randomIds = poolWithAtLeast(counts, nodesById, 1);
  const openingIds = openingPool(counts, nodesById, CONFIG.cards.openingMinConnections);

  const registers = availableRegisters(data);
  let register = loadRegister(registers);

  // The map's chrome is hidden by the stylesheet under this class.
  const root = document.documentElement;
  root.classList.add('cards-view');
  root.style.setProperty('--cards-target', `${CONFIG.cards.minTargetPx}px`);
  root.style.setProperty('--cards-bar', `${CONFIG.cards.barHeightPx}px`);
  root.style.setProperty('--cards-gutter', `${CONFIG.cards.gutterPx}px`);
  root.style.setProperty('--cards-column', `${CONFIG.cards.maxWidthColumnPx}px`);
  root.style.setProperty('--cards-title-scale', String(CONFIG.cards.titleScale));
  root.style.setProperty('--cards-go-scale', String(CONFIG.cards.goTargetScale));

  const cardEl = h('main', { id: 'cards', class: 'cards' });
  const barEl = h('nav', { class: 'cards-bar', 'aria-label': 'Cards' });
  document.body.append(cardEl, barEl);

  let current = null;
  // The node card the reader was on before this one, so a connection card
  // can offer the far end as the way on.
  let cameFrom = null;
  let depth = 0;
  let drawToken = 0;

  const ctx = () => ({
    register,
    nodesById,
    neighbours,
    sceneMembers,
    goNode: (id) => go({ kind: 'node', id }),
    goEdge: (id) => go({ kind: 'edge', id }),
    producedBy: () => [],
    demoForNode: () => null,
    demos: {},
    threadStops: null,
  });

  const exists = (target) =>
    target && (target.kind === 'edge' ? edgesById.has(target.id) : nodesById.has(target.id));

  function go(target) {
    if (!exists(target)) return;
    if (current?.kind === 'node') cameFrom = current.id;
    depth += 1;
    history.pushState({ depth }, '', routeFor(target, nodesById));
    show(target);
  }

  function random() {
    go({ kind: 'node', id: pickFrom(randomIds, Math.random, current?.id) });
  }

  function countLine(id) {
    const n = counts.get(id) ?? 0;
    return h(
      'p',
      { class: 'cards-count' },
      h('span', { class: 'cards-count-n' }, String(n)),
      ` ${pick(n === 1 ? COPY.cards.connectionOne : COPY.cards.connectionMany, register)}`,
    );
  }

  // The way on from a connection card: the end the reader did not come
  // from, as one large button.
  function goButton(edge) {
    const far = cameFrom === edge.to.id ? edge.from : edge.to;
    return h(
      'button',
      {
        type: 'button',
        class: 'cards-go',
        style: `border-color:${lineageColor(far.lineage)}`,
        onClick: () => go({ kind: 'node', id: far.id }),
      },
      `${pick(COPY.cards.goTo, register)} ${far.name} →`,
    );
  }

  function render(target) {
    if (target.kind === 'node') {
      const node = nodesById.get(target.id);
      return loadRecord(SHARD_FOR_KIND[node.kind], node.id).then((raw) => {
        const card = renderNodePanel({ ...node, raw }, ctx());
        card.querySelector('.meta')?.after(countLine(node.id));
        return { card, title: node.name };
      });
    }
    const edge = edgesById.get(target.id);
    return loadRecord('edges', edge.id).then((full) => {
      const card = renderEdgePanel({ ...full, from: edge.from, to: edge.to }, ctx());
      card.querySelector('.hook')?.after(goButton(edge));
      card.append(goButton(edge));
      return { card, title: `${edge.from.name} → ${edge.to.name}` };
    });
  }

  function notice(text) {
    return h('article', { class: 'panel-body' }, h('p', { class: 'note' }, text));
  }

  // The way to the full map, offered only where it runs well. A phone does
  // not get it (A313); `?view=map` still opens the map there for testing.
  const offerMap = !isSmallScreen(
    window.innerWidth,
    Math.min(window.screen.width, window.screen.height),
    CONFIG.cards.maxWidthPx,
  );

  function foot() {
    if (!offerMap) return [];
    return [h(
      'p',
      { class: 'cards-foot' },
      h('a', { href: `?view=map`, class: 'search-link' }, pick(COPY.cards.fullMap, register)),
    )];
  }

  function show(target, { keepScroll = false } = {}) {
    current = target;
    const token = ++drawToken;
    drawBar();
    const scrollY = keepScroll ? window.scrollY : 0;
    cardEl.replaceChildren(notice(pick(COPY.headings.loading, register)));
    delete cardEl.dataset.route;
    render(target).then(
      ({ card, title }) => {
        if (token !== drawToken) return;
        cardEl.replaceChildren(card, ...foot());
        // Which card is on screen, for tools/cards-check.js.
        cardEl.dataset.route = routeFor(target, nodesById);
        document.title = `${title} · Lineage`;
        window.scrollTo(0, scrollY);
        if (!keepScroll) {
          const heading = card.querySelector('h2');
          if (heading) {
            heading.tabIndex = -1;
            heading.focus({ preventScroll: true });
          }
        }
      },
      (err) => {
        console.error(err);
        if (token !== drawToken) return;
        cardEl.replaceChildren(notice(pick(COPY.cards.loadFailed, register)), ...foot());
        cardEl.dataset.route = 'failed';
      },
    );
  }

  function drawBar() {
    const button = (label, onClick, attrs = {}) =>
      h('button', { type: 'button', class: 'cards-button', onClick, ...attrs }, label);
    barEl.replaceChildren(
      button(`← ${pick(COPY.cards.back, register)}`, () => history.back(), { disabled: depth === 0 }),
      button(pick(COPY.cards.random, register), random, { class: 'cards-button cards-random' }),
      h(
        'div',
        { class: 'cards-registers', role: 'group', 'aria-label': 'Reading level' },
        registers.map((r) =>
          button(r.label, () => setRegister(r.key), {
            class: 'cards-button cards-register',
            'aria-pressed': String(r.key === register),
          }),
        ),
      ),
    );
  }

  function setRegister(key) {
    if (key === register) return;
    register = key;
    saveRegister(register);
    show(current, { keepScroll: true });
  }

  // Back, the phone's back gesture, and an address typed or pasted in.
  window.addEventListener('popstate', (e) => {
    depth = e.state?.depth ?? 0;
    const target = parseRoute(location.hash);
    if (exists(target)) show(target);
    else openFresh();
  });

  function openFresh() {
    // A dataset with no edges at all still opens on something.
    const target = { kind: 'node', id: pickFrom(openingIds) ?? data.nodes[0].id };
    depth = 0;
    history.replaceState({ depth }, '', routeFor(target, nodesById));
    show(target);
  }

  // A shared link or a reload opens on its own card; anything else opens
  // on a random well-connected record.
  const linked = parseRoute(location.hash);
  if (exists(linked)) {
    depth = history.state?.depth ?? 0;
    show(linked);
  } else {
    openFresh();
  }
}
