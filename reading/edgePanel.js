// Content for an edge's panel. The edge is the reading surface of this
// project (SPEC.md), and `whatToListenFor` is the highest-value text in the
// dataset, so it is set as the most prominent paragraph here.

import { COPY, EDGE_TYPE_LABELS } from './copy.js';
import { lineageColor } from '../render/lineages.js';
import { h, tierSwatch } from './dom.js';
import { trackPairQuery, youtubeLink } from './links.js';
import { renderDemoBlock, withEdgeCaption } from './demoBlock.js';

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
    youtubeLink(trackPairQuery(side)),
  );
}

// The edge's overlay tags, each named with what it covers. Listed in the
// order COPY.tags gives them, and any tag the copy does not know is left
// out rather than printed raw.
function tagsSection(edge) {
  const known = Object.keys(COPY.tags).filter((key) => key !== 'heading' && edge.tags?.includes(key));
  if (known.length === 0) return null;
  return [
    h('h3', {}, COPY.tags.heading),
    h(
      'ul',
      { class: 'edge-tags' },
      ...known.map((key) =>
        h('li', {}, h('strong', {}, COPY.tags[key].name), ' ', COPY.tags[key].line),
      ),
    ),
  ];
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
  const tier = COPY.tiers[edge.confidence];
  const tp = edge.trackPair;
  const color = lineageColor(edge.to.lineage);
  const heading = (key) => h('h3', {}, COPY.headings[key]);

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
      h('span', { class: `tier tier-${edge.confidence}` }, tierSwatch(edge.confidence), tier?.name),
    ),
    // Body size, not the hook's: one explanation now carries what the Teen
    // and Adult texts said between them, and runs to a paragraph (A343).
    h('p', { class: 'body' }, edge.explanation),
    ctx.threadStops ?? null,

    tp
      ? [
          heading('whatToListenFor'),
          trackLine(tp.earlier),
          trackLine(tp.later),
          tp.whatToListenFor ? h('p', { class: 'listen' }, tp.whatToListenFor) : null,
        ]
      : null,
    edge.demoId ? renderDemoBlock(withEdgeCaption(ctx.demos?.[edge.demoId], edge), ctx) : null,

    heading('howWeKnow'),
    h(
      'div',
      { class: 'tier-explain' },
      h('span', { class: `tier tier-${edge.confidence}` }, tierSwatch(edge.confidence), tier?.name),
      h('p', { class: 'note' }, tier?.explain),
    ),
    edge.evidence ? h('p', { class: 'body' }, edge.evidence) : null,

    tagsSection(edge),

    heading('eitherEnd'),
    endRow('from', edge.from, ctx),
    endRow('to', edge.to, ctx),
  );
}
