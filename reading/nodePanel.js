// Content for a node's panel: artist, machine, scene, or label.
//
// `ctx` carries the ways out of this panel:
//   nodesById, neighbours, sceneMembers(id), goNode(id), goEdge(id)

import { CONFIG } from '../config.js';
import { COPY, KIND_LABELS, EDGE_TYPE_LABELS } from './copy.js';
import { lineageColor, lineageName } from '../render/lineages.js';
import { h, tierSwatch } from './dom.js';
import { youtubeLink } from './links.js';
import { renderDemoBlock } from './demoBlock.js';

// A null end means "still going" unless the record says the end is
// unknown (Q20), which prints as a question mark instead of "now".
export function yearSpan(from, to, endUnknown = false) {
  return `${from ?? '?'}–${to ?? (endUnknown ? '?' : 'now')}`;
}

function heading(key) {
  return h('h3', {}, COPY.headings[key]);
}

function metaLine(node) {
  const r = node.raw;
  switch (node.kind) {
    case 'artist':
      return [[r.originCity, r.originCountry].filter(Boolean).join(', '), yearSpan(r.activeFrom, r.activeTo, r.endUnknown)];
    case 'machine':
      return [r.maker, yearSpan(r.releasedYear, r.discontinuedYear, r.endUnknown)];
    case 'scene':
      // A scene's city may be a list (SCHEMA.md): "London · Manchester · Leeds, UK".
      return [[[r.city].flat().join(' · '), r.country].filter(Boolean).join(', '), yearSpan(r.yearFrom, r.yearTo, r.endUnknown)];
    case 'label':
      return [r.city, yearSpan(r.foundedYear, r.closedYear, r.endUnknown)];
    default:
      return [];
  }
}

// A button to another record when it exists on the map, plain text when it
// does not (keyProducers may be plain names; scenes and labels may not be
// authored yet, A26).
function nodeRef(id, fallbackText, ctx) {
  const target = ctx.nodesById.get(id);
  if (!target) return fallbackText ? h('span', { class: 'chip chip-static' }, fallbackText) : null;
  return h('button', { type: 'button', class: 'chip', onClick: () => ctx.goNode(target.id) }, target.name);
}

function chipRow(refs) {
  const present = refs.filter(Boolean);
  return present.length ? h('div', { class: 'chips' }, present) : null;
}

function para(text, cls = 'body') {
  return text ? h('p', { class: cls }, text) : null;
}

// Coloured as the map draws the line: a dot in the other record's lineage
// colour, and the edge's own swatch running cause colour to effect colour
// in its tier's stroke, so a row can be matched to its line by eye.
export function connectionRow(edge, other, ctx) {
  const color = lineageColor(other.lineage);
  return h(
    'button',
    { type: 'button', class: 'link-row', style: `--link-color:${color}`, onClick: () => ctx.goEdge(edge.id) },
    h('span', { class: 'link-dot', 'aria-hidden': 'true' }),
    h('span', { class: 'link-name' }, other.name),
    h(
      'span',
      { class: 'link-meta' },
      EDGE_TYPE_LABELS[edge.type] ?? edge.type,
      edge.year ? ` · ${edge.year}` : '',
      tierSwatch(edge.confidence, { from: lineageColor(edge.from.lineage), to: lineageColor(edge.to.lineage) }),
    ),
  );
}

// Follow the producer: when a record produced two or more acts on the map,
// one button frames all of them and rings each one.
function producerButton(node, ctx) {
  const produced = ctx.producedBy?.(node.id) ?? [];
  if (produced.length < CONFIG.panel.followProducerMin) return null;
  return h(
    'button',
    { type: 'button', class: 'follow-producer', onClick: () => ctx.showProduced(node.id) },
    `${COPY.headings.followProducer} (${produced.length})`,
  );
}

// A signature track's search (SCHEMA.md): its own `search` when set, else
// "<artist> <title>", or no link at all when `search` is false.
function signatureQuery(r, t) {
  if (t.search === false) return null;
  return typeof t.search === 'string' ? t.search : `${r.name} ${t.title}`;
}

// Shared by an artist's signature tracks and a label's songs-about-it list:
// a title, an optional year, a line of prose, and a YouTube search link.
function trackRow(title, year, note, ytQuery, lead = null) {
  return h(
    'div',
    { class: 'track' },
    h(
      'div',
      { class: 't' },
      lead,
      `“${title}”`,
      year ? h('span', { class: 'year' }, ` ${year}`) : null,
    ),
    para(note, 'w'),
    youtubeLink(ytQuery),
  );
}

function artistSections(r, ctx) {
  // A demo reached from the artist (Matt: from the machine, the artist, or
  // the line). The first playable demo on any edge touching this artist;
  // one per panel, since only one demo plays at a time.
  const demo = ctx.demoForNode?.(r.id);
  return [
    demo ? renderDemoBlock(demo, ctx) : null,
    // Q32: a record with fewer tracks than usual says why in
    // signatureTracksNote (a DJ known for sets, a one-record act), shown
    // above whatever tracks it has.
    r.signatureTracks?.length || r.signatureTracksNote
      ? [
          heading('listenTo'),
          para(r.signatureTracksNote),
          (r.signatureTracks ?? []).map((t) => trackRow(t.title, t.year, t.whyThisOne, signatureQuery(r, t))),
        ]
      : null,
    r.scenes?.length ? [heading('scenes'), chipRow(r.scenes.map((id) => nodeRef(id, null, ctx)))] : null,
    r.labels?.length
      ? [heading('labels'), chipRow(r.labels.map((l) => nodeRef(l.labelId, null, ctx)))]
      : null,
    r.keyProducers?.length
      ? [heading('producers'), chipRow(r.keyProducers.map((p) => nodeRef(p, p, ctx)))]
      : null,
  ];
}

function machineSections(r, ctx) {
  return [
    r.originalPurpose ? [heading('whatItWasFor'), para(r.originalPurpose)] : null,
    r.whatActuallyHappened ? [heading('whatHappened'), para(r.whatActuallyHappened)] : null,
    r.priceStory ? [heading('whatItCost'), para(r.priceStory)] : null,
    r.demoId ? renderDemoBlock(ctx.demos?.[r.demoId], ctx) : null,
  ];
}

// The five backing fields go deeper than the blurb, which carries the same
// facts in brief (SCHEMA.md, Q7).
function sceneSections(node, ctx) {
  const r = node.raw;
  const members = ctx.sceneMembers(node.id);
  const backing = [
    ['geopolitics', r.geopolitics],
    ['whatWasNew', r.whatWasNew],
    ['production', r.production],
    ['sceneLabels', r.labels],
    ['politics', r.politics],
  ].map(([key, text]) => (text ? [heading(key), para(text)] : null));
  return [
    members.length
      ? [heading('members'), chipRow(members.map((m) => nodeRef(m.id, null, ctx)))]
      : null,
    backing,
  ];
}

function labelSections(r, ctx) {
  const founders = Array.isArray(r.founders) ? r.founders : [r.founders].filter(Boolean);
  return [
    founders.length ? [heading('founders'), para(founders.join(', '))] : null,
    r.ownershipStory ? [heading('ownership'), para(r.ownershipStory)] : null,
    r.songsAboutLabel?.length
      ? [
          heading('songsAboutLabel'),
          r.songsAboutLabel.map((s) => {
            const artistNode = ctx.nodesById.get(s.artist);
            const artistName = artistNode ? artistNode.name : s.artist;
            return trackRow(s.title, s.year, s.note, `${artistName} ${s.title}`, [
              nodeRef(s.artist, s.artist, ctx),
              ' — ',
            ]);
          }),
        ]
      : null,
  ];
}

function connectionSections(node, ctx) {
  const { outbound, inbound } = ctx.neighbours.of(node.id);
  if (!outbound.length && !inbound.length) {
    return [h('h3', {}, COPY.headings.changed), para(COPY.headings.noConnections, 'note')];
  }
  return [
    outbound.length
      ? [heading('changed'), outbound.map((e) => connectionRow(e, e.to, ctx))]
      : null,
    inbound.length
      ? [heading('changedBy'), inbound.map((e) => connectionRow(e, e.from, ctx))]
      : null,
  ];
}

export function renderNodePanel(node, ctx) {
  const r = node.raw;
  const kindSections = {
    artist: () => artistSections(r, ctx),
    machine: () => machineSections(r, ctx),
    scene: () => sceneSections(node, ctx),
    label: () => labelSections(r, ctx),
  }[node.kind];

  return h(
    'article',
    { class: 'panel-body' },
    h(
      'div',
      { class: 'kicker', style: `color:${lineageColor(node.lineage)}` },
      `${KIND_LABELS[node.kind] ?? node.kind} · ${lineageName(node.lineage)}`,
    ),
    h('h2', {}, node.name),
    h('div', { class: 'meta' }, metaLine(node).filter(Boolean).join(' · ')),
    para(r.hook, 'hook'),
    // Near the top, so what this record touched is found without
    // scrolling (Matt's review, A311).
    h('div', { class: 'connections' }, connectionSections(node, ctx)),
    para(r.blurb),
    node.startYear === null ? para(COPY.headings.offMap, 'note') : null,
    producerButton(node, ctx),
    ctx.sixDegreesStart?.(node) ?? null,
    ctx.threadStops ?? null,
    kindSections ? kindSections() : null,
  );
}
