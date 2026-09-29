// The first-run card and the missions it sets.
//
// The card is a panel target ({ kind: 'welcome' }) rather than a modal of
// its own: the drawer already knows how to hold content, inset the camera
// and keep a back stack, so a reader who opens a door can step back to the
// card. It opens by itself once, on the first visit. After that a "Start
// here" button beside the mission chip, always on screen, opens it again.
//
// Missions are a chain: each is a crossing to find, and finding one moves
// the chip on to the next. Any mission counts when its edge is opened, in
// any order. The one shown is the first still unfound. Once all are found
// the card points at the rest of the map instead.
//
// Door and mission targets are record ids, kept out of COPY because
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

// Each mission is found by opening any one of its edges. Copy lives under
// COPY.welcome.missions[key]. A mission whose edges are all missing from
// the data is skipped, so a removed record never strands the chain.
const MISSIONS = [
  // Either edge into 'Planet Rock' counts: both are the record.
  { key: 'planetRock', edgeIds: ['e-kraftwerk-planetrock', 'e-808-planetrock'] },
  { key: 'stylophone', edgeIds: ['e-stylophone-bowie'] },
  // The Amen break's two crossings on the map: Compton, then jungle.
  { key: 'amen', edgeIds: ['e-winstons-nwa', 'e-winstons-shyfx'] },
  { key: 'elpico', edgeIds: ['e-elpico-kinks'] },
  { key: 'slengTeng', edgeIds: ['e-mt40-princejammy'] },
];

// Where the camera opens: Kingston's sound systems and the first Bronx
// generation, the stretch the first door leads into. Records missing from
// the map are skipped, and with none left the map fits everything.
export const OPENING_FRAME_IDS = ['king-tubby', 'u-roy', 'kool-herc', 'grandmaster-flash', 'afrika-bambaataa'];

// Guarded like every other storage access (registers.js): private mode or
// blocked site data must not stop the map from opening. Version 1 stored
// `found` as a boolean for the single Planet Rock goal, which carries over
// as that mission found.
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIG.welcome.storageKey) ?? '{}');
    const found = Array.isArray(saved.found) ? saved.found : saved.found === true ? ['planetRock'] : [];
    return { seen: saved.seen === true, found: new Set(found) };
  } catch {
    return { seen: false, found: new Set() };
  }
}

function saveState(state) {
  try {
    localStorage.setItem(CONFIG.welcome.storageKey, JSON.stringify({ seen: state.seen, found: [...state.found] }));
  } catch {
    // Nothing to do: progress starts over next visit.
  }
}

export function createWelcome(chipEl, { nodesById, edgesById, openCard }) {
  const state = loadState();
  const missions = MISSIONS.filter((m) => m.edgeIds.some((id) => edgesById.has(id)));
  let register = null;
  let justFound = null;
  let lingerTimer = null;

  const current = () => missions.find((m) => !state.found.has(m.key)) ?? null;
  const missionCopy = (m) => COPY.welcome.missions[m.key];

  function drawChip() {
    const mission = current();
    const text = justFound
      ? h('span', { class: 'goal-text found' }, pick(missionCopy(justFound).found, register))
      : mission
        ? h('button', { type: 'button', class: 'goal-text', onClick: openCard }, pick(missionCopy(mission).chip, register))
        : null;
    chipEl.hidden = false;
    chipEl.replaceChildren(
      h('button', { type: 'button', class: 'start-here', onClick: openCard }, pick(COPY.welcome.kicker, register)),
      text,
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

    const mission = current();
    const position = mission ? missions.indexOf(mission) + 1 : missions.length;
    const found = missions.filter((m) => state.found.has(m.key));

    return h(
      'article',
      { class: 'panel-body welcome' },
      h('div', { class: 'kicker' }, pick(COPY.welcome.kicker, ctx.register)),
      h('h2', {}, pick(COPY.welcome.title, ctx.register)),
      h('p', { class: 'body' }, pick(COPY.welcome.intro, ctx.register)),
      h('div', { class: 'doors' }, doors),
      missions.length
        ? h(
            'div',
            { class: 'goal' },
            h(
              'h3',
              {},
              mission
                ? `${pick(COPY.welcome.goalHeading, ctx.register)} · ${pick(COPY.welcome.progress, ctx.register)} ${position} / ${missions.length}`
                : pick(COPY.welcome.goalHeading, ctx.register),
            ),
            h(
              'p',
              { class: 'body' },
              mission ? pick(missionCopy(mission).goal, ctx.register) : pick(COPY.welcome.allFound, ctx.register),
            ),
            found.length
              ? h(
                  'div',
                  { class: 'found-list' },
                  h('div', { class: 'found-heading' }, pick(COPY.welcome.foundHeading, ctx.register)),
                  found.map((m) =>
                    h(
                      'button',
                      { type: 'button', class: 'link-row', onClick: () => ctx.goEdge(m.edgeIds.find((id) => edgesById.has(id))) },
                      h('span', { class: 'link-name' }, `✓ ${pick(missionCopy(m).title, ctx.register)}`),
                    ),
                  ),
                )
              : null,
          )
        : null,
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
    // Called whenever an edge's panel opens. Finding a mission shows its
    // found line for a moment, then the chip moves on to the next one.
    noticeEdge(id) {
      const mission = missions.find((m) => !state.found.has(m.key) && m.edgeIds.includes(id));
      if (!mission) return;
      state.found.add(mission.key);
      saveState(state);
      justFound = mission;
      drawChip();
      clearTimeout(lingerTimer);
      lingerTimer = setTimeout(() => {
        justFound = null;
        drawChip();
      }, CONFIG.welcome.foundLingerMs);
    },
    setRegister(next) {
      register = next;
      drawChip();
    },
  };
}
