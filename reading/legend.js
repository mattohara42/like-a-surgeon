// The confidence legend and the version stamp (docs/m3-architecture.md
// section 5).
//
// Permanent, never hidden: collapsed, it is still a three-swatch key. The
// swatches come from tierSwatch, which reads the same CONFIG.edge stroke
// values the map draws with, so the key cannot drift from the map.
//
// The tiers are the curriculum (SPEC.md): a reader learning that "sounds
// obviously true" and "is actually documented" are different things gets
// more from this corner than from any single fact on the map.

import { CONFIG } from '../config.js';
import { COPY } from './copy.js';
import { h, tierSwatch } from './dom.js';
import { pick } from './registers.js';

const TIERS = ['documented', 'consensus', 'asserted'];

function loadOpen() {
  try {
    const saved = localStorage.getItem(CONFIG.legend.storageKey);
    if (saved === 'open') return true;
    if (saved === 'closed') return false;
  } catch {
    // ignored: fall through to the default
  }
  return CONFIG.legend.defaultOpen;
}

function saveOpen(open) {
  try {
    localStorage.setItem(CONFIG.legend.storageKey, open ? 'open' : 'closed');
  } catch {
    // ignored: the legend works, it just will not remember
  }
}

// "2026-09-22" -> a date a person reads. Parsed and printed as UTC so the
// day cannot shift with the reader's timezone.
function readableDate(iso) {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function createLegend(root, meta) {
  let open = loadOpen();
  let register = CONFIG.reading.defaultRegister;

  function stamp() {
    const parts = [];
    if (meta.version) parts.push(`${pick(COPY.legend.version, register)} ${meta.version}`);
    const date = readableDate(meta.generatedAt);
    if (date) parts.push(`${pick(COPY.legend.updated, register)} ${date}`);
    return parts.length ? h('p', { class: 'legend-stamp' }, parts.join(' · ')) : null;
  }

  function draw() {
    const toggle = h(
      'button',
      {
        type: 'button',
        class: 'legend-toggle',
        'aria-expanded': String(open),
        'aria-controls': 'legend-body',
        onClick: () => {
          open = !open;
          saveOpen(open);
          draw();
        },
      },
      h('span', {}, pick(COPY.legend.title, register)),
      h('span', { class: 'legend-caret', 'aria-hidden': 'true' }, open ? '−' : '+'),
    );

    const body = open
      ? h(
          'div',
          { id: 'legend-body' },
          h('p', { class: 'legend-intro' }, pick(COPY.legend.intro, register)),
          TIERS.map((tier) =>
            h(
              'div',
              { class: 'legend-row' },
              h('span', { class: 'tier' }, tierSwatch(tier), pick(COPY.tiers[tier].name, register)),
              h('p', { class: 'legend-explain' }, pick(COPY.tiers[tier].explain, register)),
            ),
          ),
        )
      : h(
          'div',
          { id: 'legend-body', class: 'legend-compact' },
          TIERS.map((tier) => h('span', { class: 'tier' }, tierSwatch(tier), pick(COPY.tiers[tier].name, register))),
        );

    root.classList.toggle('open', open);
    root.replaceChildren(toggle, body, stamp());
  }

  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', 'Confidence legend');
  root.style.bottom = `${CONFIG.viewport.fitBottomInsetPx}px`;

  return {
    setRegister(next) {
      register = next;
      draw();
    },
  };
}
