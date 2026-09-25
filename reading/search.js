// Search (docs/m3-architecture.md section 6): names, places, and years.
//
// The index is one pass over whatever nodes the loader returned, built once.
// Matching is a linear scan with no library: lowercased, accent-folded, and
// punctuation-blind, so "motorhead", "Motörhead" and "Atkins, Juan" all find
// what a 13-year-old would expect them to find. Name matches rank by how
// they matched (whole name, start of a word, anywhere). Place matches come
// back grouped by place, because "who is from Detroit" is a question and a
// list of names with "Detroit" somewhere in small print is not an answer.
//
// A four-digit query inside the time axis becomes a year result, which
// moves the year cursor there and frames that stretch of the map.

import { CONFIG } from '../config.js';
import { COPY, KIND_LABELS } from './copy.js';
import { h } from './dom.js';
import { pick } from './registers.js';
import { lineageColor } from '../render/lineages.js';

// "Motörhead!" -> "motorhead", "Atkins, Juan" -> "atkins juan"
export function fold(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// 0 = the whole string, 1 = the start of a word, 2 = anywhere, null = no.
function matchRank(haystack, needle) {
  if (!haystack) return null;
  if (haystack === needle) return 0;
  if (haystack.startsWith(needle) || haystack.includes(` ${needle}`)) return 1;
  if (haystack.includes(needle)) return 2;
  return null;
}

// A record's place split into the parts a reader might type:
// "Waterhouse, Kingston" + "Jamaica" -> Waterhouse / Kingston / Jamaica.
// Grouping by the part that matched keeps every Kingston record in one
// "From Kingston" group, whether the record names the neighbourhood, the
// city, or (for labels, which carry no country) the city alone.
function placeParts(node) {
  const r = node.raw;
  const city = r.originCity ?? r.city ?? '';
  const country = r.originCountry ?? r.country ?? '';
  return [...String(city).split(','), String(country)]
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ text, folded: fold(text) }));
}

export function buildSearchIndex(nodes) {
  return nodes.map((node) => {
    return {
      node,
      names: [...new Set([fold(node.name), fold(node.raw.sortName)].filter(Boolean))],
      places: placeParts(node),
    };
  });
}

// Returns { year, names, places } for a raw query. Pure, so it can be
// checked without a page.
export function runQuery(index, rawQuery, bounds) {
  const q = fold(rawQuery);
  const result = { year: null, names: [], places: [] };
  if (/^\d{4}$/.test(q)) {
    const year = Number(q);
    if (year >= bounds.min && year <= bounds.max) result.year = year;
  }
  if (q.length < CONFIG.search.minQueryLength) return result;

  const named = [];
  const byPlace = new Map();
  for (const entry of index) {
    const ranks = entry.names.map((n) => matchRank(n, q)).filter((r) => r !== null);
    if (ranks.length) {
      named.push({ entry, rank: Math.min(...ranks) });
      continue;
    }
    let best = null;
    for (const part of entry.places) {
      const rank = matchRank(part.folded, q);
      if (rank !== null && (best === null || rank < best.rank)) best = { part, rank };
    }
    if (best) {
      const key = best.part.folded;
      if (!byPlace.has(key)) byPlace.set(key, { label: best.part.text, rank: best.rank, nodes: [] });
      const group = byPlace.get(key);
      group.rank = Math.min(group.rank, best.rank);
      group.nodes.push(entry.node);
    }
  }

  const byStart = (a, b) => (a.startYear ?? Infinity) - (b.startYear ?? Infinity) || a.name.localeCompare(b.name);
  result.names = named
    .sort((a, b) => a.rank - b.rank || byStart(a.entry.node, b.entry.node))
    .slice(0, CONFIG.search.maxNameResults)
    .map((m) => m.entry.node);
  result.places = [...byPlace.values()]
    .sort((a, b) => a.rank - b.rank || b.nodes.length - a.nodes.length)
    .slice(0, CONFIG.search.maxPlaceGroups)
    .map((g) => ({ label: g.label, nodes: g.nodes.sort(byStart).slice(0, CONFIG.search.maxPerPlace) }));
  return result;
}

function isTyping(el) {
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

// `yearBounds` is a function because the axis moves when a layer toggle
// rebuilds the graph (labels reach back to 1953).
export function createSearch(root, { nodes, yearBounds, onSelectNode, onSelectYear }) {
  const index = buildSearchIndex(nodes);
  let register = CONFIG.reading.defaultRegister;
  let options = []; // [{ el, select }]
  let active = -1;

  const input = h('input', {
    type: 'search',
    id: 'search-input',
    autocomplete: 'off',
    spellcheck: 'false',
    role: 'combobox',
    'aria-autocomplete': 'list',
    'aria-expanded': 'false',
    'aria-controls': 'search-results',
  });
  const list = h('div', { id: 'search-results', role: 'listbox', hidden: true });
  root.replaceChildren(input, list);

  function setActive(i) {
    options.forEach((o, n) => o.el.setAttribute('aria-selected', String(n === i)));
    active = i;
    if (i >= 0) {
      input.setAttribute('aria-activedescendant', options[i].el.id);
      options[i].el.scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function close() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    setActive(-1);
  }

  function choose(i) {
    const option = options[i];
    if (!option) return;
    input.value = '';
    close();
    option.select();
  }

  function option(content, select) {
    const n = options.length;
    const el = h(
      'div',
      {
        id: `search-option-${n}`,
        role: 'option',
        class: 'search-option',
        'aria-selected': 'false',
        // Keep focus in the box, so a click chooses rather than blurs.
        onPointerdown: (e) => e.preventDefault(),
        onClick: () => choose(n),
      },
      content,
    );
    options.push({ el, select });
    return el;
  }

  function nodeRow(node) {
    const color = lineageColor(node.lineage);
    return option(
      [
        h('span', { class: 'search-dot', style: `background:${color}` }),
        h('span', { class: 'search-name' }, node.name),
        h(
          'span',
          { class: 'search-meta' },
          [KIND_LABELS[node.kind] ?? node.kind, node.startYear].filter(Boolean).join(' · '),
        ),
      ],
      () => onSelectNode(node.id),
    );
  }

  function render() {
    options = [];
    const res = runQuery(index, input.value, yearBounds());
    const parts = [];
    if (res.year !== null) {
      parts.push(
        option(
          [
            h('span', { class: 'search-name' }, `${pick(COPY.search.goToYear, register)} ${res.year}`),
          ],
          () => onSelectYear(res.year),
        ),
      );
    }
    if (res.names.length) {
      parts.push(h('div', { class: 'search-group', role: 'presentation' }, pick(COPY.search.names, register)));
      parts.push(...res.names.map(nodeRow));
    }
    for (const group of res.places) {
      parts.push(
        h('div', { class: 'search-group', role: 'presentation' }, `${pick(COPY.search.from, register)} ${group.label}`),
      );
      parts.push(...group.nodes.map(nodeRow));
    }

    const typed = fold(input.value);
    if (!typed) {
      close();
      return;
    }
    if (!options.length) {
      // Only say "nothing" once the query is long enough to have been
      // searched; one letter is still typing.
      if (typed.length < CONFIG.search.minQueryLength) {
        close();
        return;
      }
      parts.push(h('div', { class: 'search-empty' }, pick(COPY.search.none, register)));
    }
    list.replaceChildren(...parts);
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    setActive(options.length ? 0 : -1);
  }

  input.addEventListener('input', render);
  input.addEventListener('focus', () => {
    if (input.value) render();
  });
  input.addEventListener('blur', close);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (list.hidden) render();
      if (!options.length) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((active + step + options.length) % options.length);
    } else if (e.key === 'Enter') {
      choose(active >= 0 ? active : 0);
    } else if (e.key === 'Escape') {
      // Handled here rather than by the drawer's own Escape: in the box,
      // Escape means "stop searching", not "close what I was reading".
      e.stopPropagation();
      if (input.value) {
        input.value = '';
        close();
      } else {
        input.blur();
      }
    } else {
      return;
    }
    e.preventDefault();
  });

  // "/" jumps to search from anywhere that is not already a text box. A
  // courtesy for keyboards; the box itself is always visible for touch.
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !isTyping(document.activeElement) && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      input.focus();
    }
  });

  return {
    setRegister(next) {
      register = next;
      input.placeholder = pick(COPY.search.placeholder, register);
      input.setAttribute('aria-label', pick(COPY.search.label, register));
      if (!list.hidden) render();
    },
  };
}
