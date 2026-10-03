// The confidence legend and the version stamp (docs/m3-architecture.md
// section 5).
//
// The reader can put it away (Matt's review, A311). Closed, it is a small
// pill in the corner that still shows the three line styles, so the key
// is one click from anywhere. The swatches come from tierSwatch, which
// reads the same CONFIG.edge stroke values the map draws with, so the key
// cannot drift from the map.
//
// The tiers are the curriculum (SPEC.md): a reader learning that "sounds
// obviously true" and "is actually documented" are different things gets
// more from this corner than from any single fact on the map.

import { CONFIG } from '../config.js';
import { COPY } from './copy.js';
import { h, tierSwatch } from './dom.js';

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

  function stamp() {
    const parts = [];
    if (meta.version) parts.push(`${COPY.legend.version} ${meta.version}`);
    const date = readableDate(meta.generatedAt);
    if (date) parts.push(`${COPY.legend.updated} ${date}`);
    // The link to the card view moved to its own place (Q41, main.js).
    return parts.length ? h('p', { class: 'legend-stamp' }, parts.join(' · ')) : null;
  }

  function setOpen(next) {
    open = next;
    saveOpen(open);
    draw();
    // Keep focus on the control that replaced the one just pressed.
    root.querySelector(open ? '.legend-close' : '.legend-reopen')?.focus();
  }

  function draw() {
    root.classList.toggle('open', open);
    root.classList.toggle('closed', !open);
    if (!open) {
      root.replaceChildren(
        h(
          'button',
          {
            type: 'button',
            class: 'legend-reopen',
            'aria-expanded': 'false',
            'aria-label': COPY.legend.reopen,
            onClick: () => setOpen(true),
          },
          h('span', { class: 'legend-reopen-swatches', 'aria-hidden': 'true' }, TIERS.map((tier) => tierSwatch(tier))),
          h('span', {}, COPY.legend.title),
        ),
      );
      return;
    }

    const header = h(
      'div',
      { class: 'legend-header' },
      h('span', { class: 'legend-title' }, COPY.legend.title),
      h(
        'button',
        {
          type: 'button',
          class: 'legend-close',
          'aria-expanded': 'true',
          'aria-label': COPY.legend.close,
          onClick: () => setOpen(false),
        },
        '×',
      ),
    );
    const body = h(
      'div',
      { id: 'legend-body' },
      h('p', { class: 'legend-intro' }, COPY.legend.intro),
      TIERS.map((tier) =>
        h(
          'div',
          { class: 'legend-row' },
          h('span', { class: 'tier' }, tierSwatch(tier), COPY.tiers[tier].name),
          h('p', { class: 'legend-explain' }, COPY.tiers[tier].explain),
        ),
      ),
    );
    root.replaceChildren(header, body, stamp());
  }

  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', 'Confidence legend');
  root.style.bottom = `${CONFIG.viewport.fitBottomInsetPx}px`;

  draw();
}
