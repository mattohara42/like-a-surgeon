// The demo inside a panel (docs/m4-architecture.md section 6): play and
// stop, the switch between versions (A/B, straight or chopped, dry or
// through an effect), pads, sliders, a row of step lights, and the
// caption in the reader's register.
//
// Controls are native buttons and range inputs, so keyboard, touch and
// screen readers work without custom widgets.
//
// One demo plays at a time. Opening another panel, or closing this one,
// stops it: main.js calls stopDemo() on every panel change.

import { COPY, LANE_LABELS, CONTROL_LABELS, FX_LABELS } from './copy.js';
import { h } from './dom.js';
import { pick } from './registers.js';
import { createPlayer } from '../audio/player.js';
import { CONFIG } from '../config.js';

let current = null;

export function stopDemo() {
  current?.dispose();
  current = null;
}

const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1);

function controlLabel(target) {
  const [a, b] = target.split('.');
  return b ? `${LANE_LABELS[a] ?? FX_LABELS[a] ?? a} ${CONTROL_LABELS[b] ?? b}` : capitalise(CONTROL_LABELS[a] ?? a);
}

// An edge may carry its own demoCaption, so one demo can be reused on edges
// its own caption does not describe. A copy keeps the demo's id, so the
// player and the edge pulse (both keyed by id) are unaffected.
export function withEdgeCaption(demo, edge) {
  return demo && edge?.demoCaption ? { ...demo, caption: edge.demoCaption } : demo;
}

export function renderDemoBlock(demo, ctx) {
  const reg = ctx.register;
  const heading = h('h3', {}, pick(COPY.demo.heading, reg));
  if (!demo) return null;
  if (demo.status === 'draft') return [heading, h('p', { class: 'note' }, pick(COPY.demo.draft, reg))];

  stopDemo();
  const player = createPlayer(ctx.audio, demo);
  current = player;
  const params = demo.params;
  const failed = h('p', { class: 'note demo-failed', hidden: true }, pick(COPY.demo.failed, reg));
  const guard = (promise) =>
    promise.catch((err) => {
      console.error(err);
      failed.hidden = false;
    });

  // Step lights. Each lights the step of the pattern being played, so a
  // chop's lights jump about.
  const cells = Array.from({ length: CONFIG.audio.stepsPerPattern }, () => h('span', { class: 'demo-step' }));
  const steps = h('div', { class: 'demo-steps', 'aria-hidden': 'true' }, cells);
  let lit = null;
  player.onStep((i, _side, played) => {
    if (i === 0) ctx.onDemoBar?.(demo.id);
    lit?.classList.remove('on');
    lit = played >= 0 ? cells[played] : null;
    lit?.classList.add('on');
    if (i < 0) setPlaying(false);
  });

  // Play / stop.
  const playButton = h('button', { type: 'button', class: 'demo-play', 'aria-pressed': 'false' });
  function setPlaying(on) {
    playButton.textContent = `${on ? '■' : '▶'} ${pick(on ? COPY.demo.stop : COPY.demo.play, reg)}`;
    playButton.setAttribute('aria-pressed', String(on));
  }
  setPlaying(false);
  const hasLoop = Boolean(params.pattern || params.a);
  const letters = 'ABCDEFGH';
  playButton.addEventListener('click', () => {
    if (player.playing) {
      player.stop();
      setPlaying(false);
    } else {
      setPlaying(true);
      guard(player.start().then(() => setPlaying(player.playing)));
    }
  });

  // Versions: A/B, straight and chopped, dry and wet.
  let sides = null;
  if (player.versions.length) {
    const buttons = player.versions.map((v, idx) =>
      h(
        'button',
        { type: 'button', class: 'demo-side', 'aria-pressed': String(idx === 0) },
        `${letters[idx]} · ${pick(v.label, reg)}`,
      ),
    );
    buttons.forEach((button, idx) =>
      button.addEventListener('click', () => {
        player.setSide(player.versions[idx].key);
        buttons.forEach((b, j) => b.setAttribute('aria-pressed', String(j === idx)));
      }),
    );
    sides = h('div', { class: 'demo-sides', role: 'group', 'aria-label': pick(COPY.demo.version, reg) }, buttons);
  }

  // Pads.
  const pads = params.pads
    ? h(
        'div',
        { class: 'demo-pads', role: 'group', 'aria-label': pick(COPY.demo.pads, reg) },
        params.pads.map((lane) =>
          h('button', { type: 'button', class: 'demo-pad', onClick: () => guard(player.hit(lane)) }, LANE_LABELS[lane] ?? lane),
        ),
      )
    : null;

  // Keys: a note sounds while a key is held, by pointer or by Space or
  // Enter, and stops when it is let go.
  let keys = null;
  if (params.keys) {
    const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
    const release = (key) => {
      if (!key.classList.contains('on')) return;
      key.classList.remove('on');
      player.keyUp();
    };
    const press = (key, note) => {
      key.parentElement.querySelectorAll('.demo-key.on').forEach((k) => k.classList.remove('on'));
      key.classList.add('on');
      guard(player.keyDown(note));
    };
    keys = h(
      'div',
      { class: 'demo-keys', role: 'group', 'aria-label': pick(COPY.demo.keys, reg) },
      params.keys.map((note) => {
        const name = NAMES[note % 12];
        const key = h('button', { type: 'button', class: `demo-key${name.length > 1 ? ' sharp' : ''}` }, `${name}${Math.floor(note / 12) - 1}`);
        key.addEventListener('pointerdown', (e) => {
          key.setPointerCapture?.(e.pointerId);
          press(key, note);
        });
        for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) key.addEventListener(type, () => release(key));
        key.addEventListener('keydown', (e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
            e.preventDefault();
            press(key, note);
          }
        });
        key.addEventListener('keyup', (e) => {
          if (e.key === ' ' || e.key === 'Enter') release(key);
        });
        key.addEventListener('blur', () => release(key));
        return key;
      }),
    );
  }

  // Sliders.
  const controls = (params.controls ?? []).map((c) => {
    const input = h('input', { type: 'range', min: c.min, max: c.max, step: 'any', value: c.default });
    input.addEventListener('input', () => player.setControl(c.target, Number(input.value)));
    return h('label', { class: 'demo-control' }, h('span', {}, controlLabel(c.target)), input);
  });

  return h(
    'section',
    { class: 'demo' },
    heading,
    h('div', { class: 'demo-title' }, demo.title),
    hasLoop ? h('div', { class: 'demo-transport' }, playButton, sides) : null,
    hasLoop ? steps : null,
    pads,
    keys,
    controls.length ? h('div', { class: 'demo-controls' }, controls) : null,
    h('p', { class: 'demo-caption' }, pick(demo.caption, reg)),
    h('p', { class: 'note' }, pick(COPY.demo.synthesized, reg)),
    failed,
  );
}
