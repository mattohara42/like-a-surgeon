// The first-run card and the goal it sets.
//
// The card is a panel target ({ kind: 'welcome' }) rather than a modal of
// its own: the drawer already knows how to hold content, inset the camera
// and keep a back stack, so a reader who opens a door can step back to the
// card. It opens by itself once, on the first visit. The goal chip stays on
// screen until the goal is found, and opens the card again when clicked.
//
// Door and goal targets are record ids, kept out of COPY because
// registers.js reads every all-string object there as register text.

import { CONFIG } from '../config.js';
import { COPY } from './copy.js';
import { h } from './dom.js';
import { pick } from './registers.js';

const DOORS = [
  { key: 'herc', nodeId: 'kool-herc' },
  { key: 'machine', nodeId: 'tr-808' },
  { key: 'tubby', nodeId: 'king-tubby' },
];

// Either edge into 'Planet Rock' counts: both are the record.
const GOAL_EDGE_IDS = ['e-kraftwerk-planetrock', 'e-808-planetrock'];

// Where the camera opens: Kingston's sound systems and the first Bronx
// generation, the stretch the first door leads into. Records missing from
// the map are skipped, and with none left the map fits everything.
export const OPENING_FRAME_IDS = ['king-tubby', 'u-roy', 'kool-herc', 'grandmaster-flash', 'afrika-bambaataa'];

// Guarded like every other storage access (registers.js): private mode or
// blocked site data must not stop the map from opening.
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIG.welcome.storageKey) ?? '{}');
    return { seen: saved.seen === true, found: saved.found === true };
  } catch {
    return { seen: false, found: false };
  }
}

function saveState(state) {
  try {
    localStorage.setItem(CONFIG.welcome.storageKey, JSON.stringify(state));
  } catch {
    // Nothing to do: the card shows again next visit.
  }
}

export function createWelcome(chipEl, { nodesById, openCard }) {
  const state = loadState();
  let register = null;
  let lingerTimer = null;

  function drawChip(justFound = false) {
    if (state.found && !justFound) {
      chipEl.replaceChildren();
      chipEl.hidden = true;
      return;
    }
    chipEl.hidden = false;
    chipEl.classList.toggle('found', justFound);
    chipEl.replaceChildren(
      justFound
        ? h('span', { class: 'goal-text' }, pick(COPY.welcome.found, register))
        : h('button', { type: 'button', class: 'goal-text', onClick: openCard }, pick(COPY.welcome.chip, register)),
    );
  }

  function render(ctx) {
    const doors = DOORS.filter((d) => nodesById.has(d.nodeId)).map((d) =>
      h(
        'button',
        { type: 'button', class: 'door', onClick: () => ctx.goNode(d.nodeId) },
        h('span', { class: 'door-title' }, pick(COPY.welcome.doors[d.key].title, ctx.register)),
        h('span', { class: 'door-line' }, pick(COPY.welcome.doors[d.key].line, ctx.register)),
      ),
    );
    return h(
      'article',
      { class: 'panel-body welcome' },
      h('div', { class: 'kicker' }, pick(COPY.welcome.kicker, ctx.register)),
      h('h2', {}, pick(COPY.welcome.title, ctx.register)),
      h('p', { class: 'body' }, pick(COPY.welcome.intro, ctx.register)),
      h('div', { class: 'doors' }, doors),
      state.found
        ? null
        : h(
            'div',
            { class: 'goal' },
            h('h3', {}, pick(COPY.welcome.goalHeading, ctx.register)),
            h('p', { class: 'body' }, pick(COPY.welcome.goal, ctx.register)),
          ),
      h('button', { type: 'button', class: 'welcome-skip', onClick: ctx.close }, pick(COPY.welcome.skip, ctx.register)),
    );
  }

  return {
    // True once per browser: the caller opens the card when this says so.
    shouldOpen: () => !state.seen,
    markSeen() {
      if (state.seen) return;
      state.seen = true;
      saveState(state);
    },
    render,
    // Called whenever an edge's panel opens. Finding the goal shows the
    // found line for a moment, then the chip goes for good.
    noticeEdge(id) {
      if (state.found || !GOAL_EDGE_IDS.includes(id)) return;
      state.found = true;
      saveState(state);
      drawChip(true);
      clearTimeout(lingerTimer);
      lingerTimer = setTimeout(() => drawChip(), CONFIG.welcome.foundLingerMs);
    },
    setRegister(next) {
      register = next;
      if (!chipEl.classList.contains('found')) drawChip();
    },
  };
}
