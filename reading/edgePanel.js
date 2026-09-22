// Content for an edge's panel. The edge is the reading surface of this
// project (SPEC.md), and `whatToListenFor` is the highest-value text in the
// dataset, so it is set as the most prominent paragraph here.

import { CONFIG } from '../config.js';
import { COPY, EDGE_TYPE_LABELS } from './copy.js';
import { h, tierSwatch } from './dom.js';
import { pick } from './registers.js';

function trackLine(side) {
  if (!side) return null;
  return h(
    'div',
    { class: 'track' },
    h(
      'div',
      { class: 't' },
      side.artist ? `${side.artist}, ` : '',
      `“${side.title}”`,
      side.year ? h('span', { class: 'year' }, ` ${side.year}`) : null,
    ),
  );
}

function endRow(label, node, ctx) {
  return h(
    'button',
    { type: 'button', class: 'link-row', onClick: () => ctx.goNode(node.id) },
    h('span', { class: 'link-dir' }, label),
    h('span', { class: 'link-name' }, node.name),
  );
}

export function renderEdgePanel(edge, ctx) {
  const reg = ctx.register;
  const tier = COPY.tiers[edge.confidence];
  const tp = edge.trackPair;
  const color = CONFIG.colors.lineage[edge.to.lineage] ?? CONFIG.colors.lineage.other;
  const heading = (key) => h('h3', {}, pick(COPY.headings[key], reg));

  return h(
    'article',
    { class: 'panel-body' },
    h(
      'div',
      { class: 'kicker', style: `color:${color}` },
      `${edge.crossLineage ? 'Crossing' : 'Connection'} · ${EDGE_TYPE_LABELS[edge.type] ?? edge.type}`,
    ),
    h('h2', {}, edge.from.name, h('span', { class: 'arrow' }, ' → '), edge.to.name),
    h(
      'div',
      { class: 'meta' },
      edge.year ? `${edge.year} · ` : '',
      h('span', { class: `tier tier-${edge.confidence}` }, tierSwatch(edge.confidence), pick(tier?.name, reg)),
    ),
    h('p', { class: 'hook' }, pick(edge.explanation, reg)),

    tp
      ? [
          heading('whatToListenFor'),
          trackLine(tp.earlier),
          trackLine(tp.later),
          tp.whatToListenFor ? h('p', { class: 'listen' }, tp.whatToListenFor) : null,
        ]
      : null,

    heading('howWeKnow'),
    h(
      'div',
      { class: 'tier-explain' },
      h('span', { class: `tier tier-${edge.confidence}` }, tierSwatch(edge.confidence), pick(tier?.name, reg)),
      h('p', { class: 'note' }, pick(tier?.explain, reg)),
    ),
    edge.evidence ? h('p', { class: 'body' }, edge.evidence) : null,
    edge.demoId ? h('p', { class: 'note' }, pick(COPY.headings.demoLater, reg)) : null,

    heading('eitherEnd'),
    endRow('from', edge.from, ctx),
    endRow('to', edge.to, ctx),
  );
}
