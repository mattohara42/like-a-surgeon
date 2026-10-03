// The thread player (docs/m5-architecture.md section 3).
//
// A thread opens in the drawer as a panel target, like the welcome card:
// { kind: 'thread', id, step }, where step -1 is the intro, 0 to n-1 are
// the stops, and n is the outro. Moving between stops replaces the target
// in place, so the drawer's own Back still returns to wherever the reader
// was before the thread began.
//
// Each stop shows the thread's framing above the stop's own record panel,
// unchanged. The camera flies to the stop, and the route so far stays lit
// on the map (graph.setPath) while the thread is active, even when the
// reader wanders off to read something else. A chip beside the mission
// chip then offers the way back (Q34). A stop's demo never plays on its
// own (Q35): it waits for a press like every other sound.
//
// Finished threads are remembered per browser, with the same guarded
// storage access as the missions.

import { CONFIG } from '../config.js';
import { COPY } from './copy.js';
import { h } from './dom.js';

function loadFinished() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIG.threads.storageKey) ?? '{}');
    return new Set(Array.isArray(saved.finished) ? saved.finished : []);
  } catch {
    return new Set();
  }
}

function saveFinished(finished) {
  try {
    localStorage.setItem(CONFIG.threads.storageKey, JSON.stringify({ finished: [...finished] }));
  } catch {
    // Nothing to do: progress resets next visit.
  }
}

// `threads` is data.threads (id -> record). `chipEl` is where the "back to
// the thread" chip is drawn. The callbacks come from main.js:
//   open(target)         opens a panel target
//   renderRecord(target, extra) the node or edge panel for a stop, as a
//                        Promise; `extra` is merged into its context
//   focusRecord(target)  flies the camera to a node or edge
//   frame(nodeIds)       frames a set of nodes
//   setPath(route)       lights the route on the map, or clears it
//   setYear(year)        moves the timeline cursor
export function createThreads(chipEl, { threads, nodesById, edgesById, open, renderRecord, focusRecord, frame, setPath, setYear }) {
  // Only threads whose every stop is on the map: a removed record never
  // strands a reader halfway.
  const list = Object.values(threads).filter((t) =>
    t.steps.every((s) => (s.nodeId ? nodesById.has(s.nodeId) : edgesById.has(s.edgeId))),
  );
  const byId = new Map(list.map((t) => [t.id, t]));
  const finished = loadFinished();
  let active = null; // { id, step } while a thread is in progress
  let showing = false; // is a thread page in the drawer right now

  const recordTarget = (step) => (step.nodeId ? { kind: 'node', id: step.nodeId } : { kind: 'edge', id: step.edgeId });
  // When a stop happened: an edge's year, or when a node began.
  const yearOf = (step) => (step.nodeId ? nodesById.get(step.nodeId).startYear : edgesById.get(step.edgeId).year);

  // The nodes and edges of the route up to and including `upTo`.
  function route(thread, upTo) {
    const nodeIds = new Set();
    const edgeIds = new Set();
    for (const step of thread.steps.slice(0, upTo + 1)) {
      if (step.nodeId) nodeIds.add(step.nodeId);
      else {
        const edge = edgesById.get(step.edgeId);
        edgeIds.add(edge.id);
        nodeIds.add(edge.from.id);
        nodeIds.add(edge.to.id);
      }
    }
    return { nodeIds: [...nodeIds], edgeIds: [...edgeIds] };
  }

  function drawChip() {
    const thread = active && byId.get(active.id);
    if (!thread || showing) {
      chipEl.hidden = true;
      chipEl.replaceChildren();
      return;
    }
    const n = thread.steps.length;
    const where = active.step < 0 ? '' : active.step >= n ? ` · ${COPY.threads.finished}` : ` · ${active.step + 1} ${COPY.threads.of} ${n}`;
    chipEl.hidden = false;
    chipEl.replaceChildren(
      h(
        'button',
        {
          type: 'button',
          class: 'thread-back',
          'aria-label': `${COPY.threads.backTo}: ${thread.title}${where}`,
          title: COPY.threads.backTo,
          onClick: () => open({ kind: 'thread', id: thread.id, step: active.step }),
        },
        `↩ ${thread.title}${where}`,
      ),
      h('button', { type: 'button', class: 'thread-end', 'aria-label': COPY.threads.end, onClick: end }, '×'),
    );
  }

  function end() {
    active = null;
    setPath();
    drawChip();
  }

  // Previous and next, as buttons and as the arrow keys while the page
  // has focus. Sliders keep their own arrows.
  function navigation(thread, step, ctx) {
    const n = thread.steps.length;
    const go = (to) => open({ kind: 'thread', id: thread.id, step: to });
    const prev = step >= 0 ? h('button', { type: 'button', class: 'thread-prev', onClick: () => go(step - 1) }, `← ${COPY.threads.previous}`) : null;
    const nextLabel = step < 0 ? COPY.threads.start : step === n - 1 ? COPY.threads.finish : COPY.threads.next;
    const next = step < n ? h('button', { type: 'button', class: 'thread-next', onClick: () => go(step + 1) }, `${nextLabel} →`) : null;
    const nav = h('div', { class: 'thread-nav' }, prev, next);
    const keys = (e) => {
      if (e.target.closest('input, select, textarea')) return;
      if (e.key === 'ArrowRight' && step < n) go(step + 1);
      else if (e.key === 'ArrowLeft' && step >= 0) go(step - 1);
      else return;
      e.preventDefault();
    };
    return { nav, keys };
  }

  function others(thread, ctx) {
    const rest = list.filter((t) => t.id !== thread.id);
    if (!rest.length) return null;
    return h('div', { class: 'thread-more' }, h('h3', {}, COPY.threads.more), listButtons(rest, ctx));
  }

  function listButtons(threadsToList, ctx) {
    return h(
      'div',
      { class: 'thread-list' },
      threadsToList.map((t) =>
        h(
          'button',
          { type: 'button', class: 'door thread-door', onClick: () => open({ kind: 'thread', id: t.id, step: -1 }) },
          h('span', { class: 'door-title' }, `${finished.has(t.id) ? '✓ ' : ''}${t.title}`),
          h('span', { class: 'door-line' }, `${t.subtitle} · ${t.steps.length} ${COPY.threads.stops}`),
        ),
      ),
    );
  }

  function render(target, ctx) {
    const thread = byId.get(target.id);
    const n = thread.steps.length;
    const step = Math.max(-1, Math.min(n, target.step));
    active = { id: thread.id, step };
    if (step === n) {
      finished.add(thread.id);
      saveFinished(finished);
    }
    const { nav, keys } = navigation(thread, step, ctx);
    const page = (...children) => {
      const article = h('article', { class: 'panel-body thread' }, ...children);
      article.addEventListener('keydown', keys);
      return article;
    };

    if (step < 0) {
      return page(
        h('div', { class: 'kicker' }, `${COPY.threads.kicker} · ${n} ${COPY.threads.stops}`),
        h('h2', {}, thread.title),
        h('p', { class: 'thread-subtitle' }, thread.subtitle),
        h('p', { class: 'body' }, thread.intro),
        nav,
      );
    }
    if (step === n) {
      return page(
        h('div', { class: 'kicker' }, `${thread.title} · ${COPY.threads.ended}`),
        h('h2', {}, thread.title),
        h('p', { class: 'body' }, thread.outro),
        nav,
        h('button', { type: 'button', class: 'thread-again', onClick: () => open({ kind: 'thread', id: thread.id, step: -1 }) }, COPY.threads.again),
        others(thread, ctx),
      );
    }

    const s = thread.steps[step];
    const heading = `${COPY.threads.stop} ${step + 1} ${COPY.threads.of} ${n}`;
    return renderRecord(recordTarget(s), { inThread: true }).then((record) =>
      page(
        h('div', { class: 'kicker' }, thread.title),
        h('h2', { class: 'thread-heading' }, heading),
        h('p', { class: 'thread-framing' }, s.framing),
        nav,
        h('div', { class: 'thread-record' }, record),
        navigation(thread, step, ctx).nav,
      ),
    );
  }

  // A small section for a record's own panel: every thread that stops at
  // it, each opening at that stop. Left out when the panel is already
  // shown inside a thread.
  function stopsSection(target, ctx) {
    const stops = [];
    for (const t of list) {
      t.steps.forEach((s, i) => {
        if ((target.kind === 'node' && s.nodeId === target.id) || (target.kind === 'edge' && s.edgeId === target.id)) {
          stops.push({ thread: t, step: i });
        }
      });
    }
    if (!stops.length) return null;
    return h(
      'div',
      { class: 'thread-stops' },
      h('h3', {}, COPY.threads.partOf),
      stops.map(({ thread, step }) =>
        h(
          'button',
          { type: 'button', class: 'link-row', onClick: () => open({ kind: 'thread', id: thread.id, step }) },
          h('span', { class: 'link-name' }, `${finished.has(thread.id) ? '✓ ' : ''}${thread.title}`),
          h('span', { class: 'link-meta' }, ` · ${COPY.threads.stop} ${step + 1} ${COPY.threads.of} ${thread.steps.length}`),
        ),
      ),
    );
  }

  drawChip();

  return {
    list: () => list,
    stopsSection,
    listButtons,
    render,
    // Camera and route for a thread target, called whenever one is shown.
    focus(target) {
      const thread = byId.get(target.id);
      if (!thread) return;
      const n = thread.steps.length;
      const step = Math.max(-1, Math.min(n, target.step));
      if (step < 0 || step === n) {
        // Intro and outro frame the whole route; the outro draws it all.
        // The intro leaves the year alone; the outro stays at the last stop.
        const whole = route(thread, n - 1);
        frame(whole.nodeIds);
        setPath(step === n ? whole : undefined);
        return;
      }
      // Each stop sets the timeline to its own year, so the reader sees the
      // map as it was then, and a thread through time plays forward
      // through it. The record itself is never behind the cursor.
      const s = thread.steps[step];
      if (Number.isFinite(yearOf(s))) setYear(yearOf(s));
      focusRecord(recordTarget(s));
      setPath(route(thread, step));
    },
    // Called on every panel change (null when the drawer closes), so the
    // chip shows only while a thread is in progress and not on screen.
    noticeTarget(target) {
      showing = target?.kind === 'thread';
      drawChip();
    },
  };
}
