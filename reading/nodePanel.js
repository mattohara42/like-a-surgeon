// Content for a node's panel: artist, machine, scene, or label.
//
// `ctx` carries the reader's register and the ways out of this panel:
//   register, nodesById, neighbours, sceneMembers(id),
//   goNode(id), goEdge(id)

import { CONFIG } from '../config.js';
import { COPY, KIND_LABELS, LINEAGE_LABELS, EDGE_TYPE_LABELS } from './copy.js';
import { h, tierSwatch } from './dom.js';
import { pick } from './registers.js';

export function yearSpan(from, to) {
  return `${from ?? '?'}–${to ?? 'now'}`;
}

function heading(key, register) {
  return h('h3', {}, pick(COPY.headings[key], register));
}

function lineageColor(lineage) {
  return CONFIG.colors.lineage[lineage] ?? CONFIG.colors.lineage.other;
}

function metaLine(node) {
  const r = node.raw;
  switch (node.kind) {
    case 'artist':
      return [[r.originCity, r.originCountry].filter(Boolean).join(', '), yearSpan(r.activeFrom, r.activeTo)];
    case 'machine':
      return [r.maker, yearSpan(r.releasedYear, r.discontinuedYear)];
    case 'scene':
      return [[r.city, r.country].filter(Boolean).join(', '), yearSpan(r.yearFrom, r.yearTo)];
    case 'label':
      return [r.city, yearSpan(r.foundedYear, r.closedYear)];
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

export function connectionRow(edge, other, ctx) {
  return h(
    'button',
    { type: 'button', class: 'link-row', onClick: () => ctx.goEdge(edge.id) },
    h('span', { class: 'link-name' }, other.name),
    h(
      'span',
      { class: 'link-meta' },
      EDGE_TYPE_LABELS[edge.type] ?? edge.type,
      edge.year ? ` · ${edge.year}` : '',
      tierSwatch(edge.confidence),
    ),
  );
}

function artistSections(r, ctx) {
  const reg = ctx.register;
  return [
    r.signatureTracks?.length
      ? [
          heading('listenTo', reg),
          r.signatureTracks.map((t) =>
            h(
              'div',
              { class: 'track' },
              h('div', { class: 't' }, `“${t.title}”`, t.year ? h('span', { class: 'year' }, ` ${t.year}`) : null),
              para(t.whyThisOne, 'w'),
            ),
          ),
        ]
      : null,
    r.scenes?.length ? [heading('scenes', reg), chipRow(r.scenes.map((id) => nodeRef(id, null, ctx)))] : null,
    r.labels?.length
      ? [heading('labels', reg), chipRow(r.labels.map((l) => nodeRef(l.labelId, null, ctx)))]
      : null,
    r.keyProducers?.length
      ? [heading('producers', reg), chipRow(r.keyProducers.map((p) => nodeRef(p, p, ctx)))]
      : null,
  ];
}

function machineSections(r, ctx) {
  const reg = ctx.register;
  return [
    r.originalPurpose ? [heading('whatItWasFor', reg), para(r.originalPurpose)] : null,
    r.whatActuallyHappened ? [heading('whatHappened', reg), para(r.whatActuallyHappened)] : null,
    r.priceStory ? [heading('whatItCost', reg), para(r.priceStory)] : null,
  ];
}

// The five backing fields are adult-only by schema (SCHEMA.md, Q7): they
// inform the blurb, which carries the same facts at every level.
function sceneSections(node, ctx) {
  const r = node.raw;
  const reg = ctx.register;
  const members = ctx.sceneMembers(node.id);
  const backing = reg === 'adult'
    ? [
        ['geopolitics', r.geopolitics],
        ['whatWasNew', r.whatWasNew],
        ['production', r.production],
        ['sceneLabels', r.labels],
        ['politics', r.politics],
      ].map(([key, text]) => (text ? [heading(key, reg), para(text)] : null))
    : [];
  return [
    members.length
      ? [heading('members', reg), chipRow(members.map((m) => nodeRef(m.id, null, ctx)))]
      : null,
    backing,
  ];
}

function labelSections(r, ctx) {
  const reg = ctx.register;
  const founders = Array.isArray(r.founders) ? r.founders : [r.founders].filter(Boolean);
  return [
    founders.length ? [heading('founders', reg), para(founders.join(', '))] : null,
    r.ownershipStory ? [heading('ownership', reg), para(r.ownershipStory)] : null,
  ];
}

function connectionSections(node, ctx) {
  const reg = ctx.register;
  const { outbound, inbound } = ctx.neighbours.of(node.id);
  if (!outbound.length && !inbound.length) {
    return [h('h3', {}, pick(COPY.headings.changed, reg)), para(pick(COPY.headings.noConnections, reg), 'note')];
  }
  return [
    outbound.length
      ? [heading('changed', reg), outbound.map((e) => connectionRow(e, e.to, ctx))]
      : null,
    inbound.length
      ? [heading('changedBy', reg), inbound.map((e) => connectionRow(e, e.from, ctx))]
      : null,
  ];
}

export function renderNodePanel(node, ctx) {
  const r = node.raw;
  const reg = ctx.register;
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
      `${KIND_LABELS[node.kind] ?? node.kind} · ${LINEAGE_LABELS[node.lineage] ?? node.lineage}`,
    ),
    h('h2', {}, node.name),
    h('div', { class: 'meta' }, metaLine(node).filter(Boolean).join(' · ')),
    para(r.hook, 'hook'),
    para(pick(r.blurb, reg)),
    node.startYear === null ? para(pick(COPY.headings.offMap, reg), 'note') : null,
    kindSections ? kindSections() : null,
    connectionSections(node, ctx),
  );
}
