// The first-run card and the missions it sets.
//
// The card is a panel target ({ kind: 'welcome' }) rather than a modal of
// its own: the drawer already knows how to hold content, inset the camera
// and keep a back stack, so a reader who opens a door can step back to the
// card. It opens by itself once, on the first visit. After that a "Start
// here" button beside the mission chip, always on screen, opens it again.
//
// Golden edges (A263) are a second, open-ended hunt: the card counts how
// many the reader has opened, and the chip flashes when one is collected.
//
// Missions are a chain: each is a crossing to find, and finding one moves
// the chip on to the next. Any mission counts when its edge is opened, in
// any order. The one shown is the first still unfound. Once all are found
// the card points at the rest of the map instead.
//
// Door and mission targets are record ids, kept out of COPY, which holds
// only text the reader sees.

import { CONFIG } from '../config.js';
import { COPY } from './copy.js';
import { h } from './dom.js';

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

// Guarded like every other storage access: private mode or
// blocked site data must not stop the map from opening. Version 1 stored
// `found` as a boolean for the single Planet Rock goal, which carries over
// as that mission found.
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIG.welcome.storageKey) ?? '{}');
    const found = Array.isArray(saved.found) ? saved.found : saved.found === true ? ['planetRock'] : [];
    const golden = Array.isArray(saved.golden) ? saved.golden : [];
    return { seen: saved.seen === true, found: new Set(found), golden: new Set(golden) };
  } catch {
    return { seen: false, found: new Set(), golden: new Set() };
  }
}

function saveState(state) {
  try {
    localStorage.setItem(
      CONFIG.welcome.storageKey,
      JSON.stringify({ seen: state.seen, found: [...state.found], golden: [...state.golden] }),
    );
  } catch {
    // Nothing to do: progress starts over next visit.
  }
}

export function createWelcome(chipEl, { nodesById, edgesById, goldenIds = new Set(), openCard }) {
  const state = loadState();
  const missions = MISSIONS.filter((m) => m.edgeIds.some((id) => edgesById.has(id)));
  let justFound = null;
  // A golden edge just collected, shown in the chip like a found mission.
  let justGolden = false;
  const goldenCount = () => [...goldenIds].filter((id) => state.golden.has(id)).length;
  let lingerTimer = null;

  const current = () => missions.find((m) => !state.found.has(m.key)) ?? null;
  const missionCopy = (m) => COPY.welcome.missions[m.key];

  function drawChip() {
    const mission = current();
    const text = justFound
      ? h('span', { class: 'goal-text found' }, missionCopy(justFound).found)
      : justGolden
        ? h('span', { class: 'goal-text found' },
            `${COPY.welcome.golden.flash}: ${goldenCount()} / ${goldenIds.size}`)
      : mission
        ? h('button', { type: 'button', class: 'goal-text', onClick: openCard }, missionCopy(mission).chip)
        : null;
    chipEl.hidden = false;
    chipEl.replaceChildren(
      h('button', { type: 'button', class: 'start-here', onClick: openCard }, COPY.welcome.kicker),
      text,
    );
  }

  function render(ctx) {
    const doors = DOORS.filter((d) => nodesById.has(d.nodeId)).map((d) =>
      h(
        'button',
        { type: 'button', class: 'door', onClick: () => ctx.goNode(d.nodeId) },
        h('span', { class: 'door-title' }, COPY.welcome.doors[d.key].title),
        h('span', { class: 'door-line' }, COPY.welcome.doors[d.key].line),
      ),
    );

    const mission = current();
    const position = mission ? missions.indexOf(mission) + 1 : missions.length;
    const found = missions.filter((m) => state.found.has(m.key));

    return h(
      'article',
      { class: 'panel-body welcome' },
      h('div', { class: 'kicker' }, COPY.welcome.kicker),
      h('h2', {}, COPY.welcome.title),
      h('p', { class: 'body' }, COPY.welcome.intro),
      h('div', { class: 'doors' }, doors, ctx.gameDoor ?? null),
      ctx.threadList
        ? h(
            'div',
            { class: 'goal threads' },
            h('h3', {}, COPY.threads.listHeading),
            h('p', { class: 'body' }, COPY.threads.listLine),
            ctx.threadList,
          )
        : null,
      missions.length
        ? h(
            'div',
            { class: 'goal' },
            h(
              'h3',
              {},
              mission
                ? `${COPY.welcome.goalHeading} · ${COPY.welcome.progress} ${position} / ${missions.length}`
                : COPY.welcome.goalHeading,
            ),
            h(
              'p',
              { class: 'body' },
              mission ? missionCopy(mission).goal : COPY.welcome.allFound,
            ),
            found.length
              ? h(
                  'div',
                  { class: 'found-list' },
                  h('div', { class: 'found-heading' }, COPY.welcome.foundHeading),
                  found.map((m) =>
                    h(
                      'button',
                      { type: 'button', class: 'link-row', onClick: () => ctx.goEdge(m.edgeIds.find((id) => edgesById.has(id))) },
                      h('span', { class: 'link-name' }, `✓ ${missionCopy(m).title}`),
                    ),
                  ),
                )
              : null,
          )
        : null,
      goldenIds.size
        ? h(
            'div',
            { class: 'goal golden' },
            h('h3', {}, `${COPY.welcome.golden.heading} · ${goldenCount()} / ${goldenIds.size} ${COPY.welcome.golden.found}`),
            h('p', { class: 'body' }, COPY.welcome.golden.hint),
          )
        : null,
      h('button', { type: 'button', class: 'welcome-skip', onClick: ctx.close }, COPY.welcome.skip),
    );
  }

  drawChip();

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
      const golden = goldenIds.has(id) && !state.golden.has(id);
      if (!mission && !golden) return;
      if (mission) state.found.add(mission.key);
      if (golden) state.golden.add(id);
      saveState(state);
      // A mission's own line wins when one edge is both.
      justFound = mission ?? null;
      justGolden = !mission && golden;
      drawChip();
      clearTimeout(lingerTimer);
      lingerTimer = setTimeout(() => {
        justFound = null;
        justGolden = false;
        drawChip();
      }, CONFIG.welcome.foundLingerMs);
    },
  };
}
