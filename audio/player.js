// Plays one demo (docs/m4-architecture.md sections 5 and 6). Every kind
// runs through here, because every kind is one loop plus the versions a
// reader can switch between:
//
//   machine-voice  one version, with pads and controls
//   ab             two versions, each its own pattern
//   pattern        one pattern, and versions that play its steps in a new
//                  order (a chop)
//   fx-chain       one pattern, dry or sent through an effect chain
//
// A switch between patterns or orders lands on the next bar. A switch in
// or out of an effect is immediate, as an engineer throws a send, and the
// effect's tail rings on.
//
// Signal path: each machine's AudioWorkletNode -> bus -> this demo's
// gain, set to the demo's safety.maxGain -> the engine's master input.
// An fx-chain demo also sends the bus through its chain into that gain.
//
// Nothing is created until start() or a pad press, and both go through
// engine.start(), which a press is always behind.

import { CONFIG } from '../config.js';
import { INSTRUMENTS, drumKnobValue, voiceParamValue } from './instruments.js';
import { parsePattern } from './pattern.js';
import { eventsForStep } from './seq303.js';
import { buildChain } from './fx.js';
import { Scheduler } from './scheduler.js';

const RAMP_S = CONFIG.audio.master.rampS;
const RELEASE_MS = CONFIG.audio.player.releaseMs;

// The versions a reader can switch between, in order: { key, label,
// pattern, order, wet }. `order` maps each step to the source step it
// plays (0-based, null for silence); `wet` sends through the chain.
export function demoVersions(demo) {
  const params = demo.params;
  const parse = (raw) => (raw ? parsePattern(raw).pattern : null);
  if (demo.kind === 'ab') {
    return ['a', 'b'].map((key) => ({ key, label: params[key].label, pattern: parse(params[key].pattern) }));
  }
  const pattern = parse(params.pattern);
  if (demo.kind === 'pattern') {
    return params.versions.map((v, i) => ({
      key: `v${i}`,
      label: v.label,
      pattern,
      order: v.order ? v.order.map((n) => (n === null ? null : n - 1)) : null,
    }));
  }
  if (demo.kind === 'fx-chain') {
    return [
      { key: 'dry', label: params.dry.label, pattern, wet: false },
      { key: 'wet', label: params.wet.label, pattern, wet: true },
    ];
  }
  return [{ key: 'a', label: null, pattern }];
}

export function createPlayer(engine, demo) {
  const params = demo.params;
  const versions = demoVersions(demo);
  const byKey = new Map(versions.map((v) => [v.key, v]));
  // Every machine any pattern or pad uses, created once.
  const machineIds = new Set([
    ...(params.machine ? [params.machine] : []),
    ...versions.flatMap((v) => (v.pattern ? Object.keys(v.pattern.parts) : [])),
  ]);

  // Control values as the reader has set them, 0..1, starting from each
  // control's default.
  // A drum demo's per-lane `levels` seed each lane's level first, so a
  // level control, where the demo has one, still wins.
  const values = new Map([
    ...Object.entries(params.levels ?? {}).map(([lane, v]) => [`${lane}.level`, v]),
    ...(params.controls ?? []).map((c) => [c.target, c.default]),
  ]);

  let ctx = null;
  let out = null;
  let bus = null;
  let chain = null;
  let send = null;
  const nodes = new Map(); // machineId -> AudioWorkletNode
  let scheduler = null;
  let side = versions[0].key;
  let queuedSide = null;
  let ready = null;
  const stepListeners = new Set();
  // Bumped on every stop, so step lights queued before it do not fire
  // after it.
  let generation = 0;

  // A drum lane's knobs as the worklet reads them.
  function laneParams(machineId, lane) {
    const p = {};
    for (const [target, value] of values) {
      const [l, knob] = target.split('.');
      if (l === lane) p[knob] = drumKnobValue(machineId, lane, knob, value);
    }
    return p;
  }

  function applyVoiceParams(machineId) {
    const node = nodes.get(machineId);
    if (!node || INSTRUMENTS[machineId].kind !== 'voice') return;
    for (const [param, value] of values) {
      const audioParam = node.parameters.get(param);
      if (audioParam) audioParam.setTargetAtTime(voiceParamValue(param, value), ctx.currentTime, RAMP_S);
    }
  }

  async function ensureReady() {
    if (!ready) {
      ready = (async () => {
        ctx = await engine.start();
        out = ctx.createGain();
        out.gain.value = demo.safety.maxGain;
        out.connect(engine.input);
        bus = ctx.createGain();
        bus.connect(out);
        if (params.chain) {
          chain = buildChain(ctx, params.chain, versions[0].pattern.bpm, RAMP_S);
          send = ctx.createGain();
          send.gain.value = byKey.get(side).wet ? 1 : 0;
          bus.connect(send).connect(chain.input);
          chain.output.connect(out);
          for (const [target, value] of values) chain.set(target, value);
        }
        for (const id of machineIds) {
          const node = new AudioWorkletNode(ctx, INSTRUMENTS[id].worklet, { numberOfInputs: 0, outputChannelCount: [1] });
          node.connect(bus);
          nodes.set(id, node);
          applyVoiceParams(id);
        }
      })();
    }
    await ready;
    await engine.start(); // resumes a context the browser suspended
  }

  // The scheduler calls this for every step, some milliseconds ahead of
  // when it sounds. An A/B switch waits for step 0, so it lands on the bar.
  function onStep(i, time, stepDur) {
    if (i === 0 && queuedSide) {
      side = queuedSide;
      queuedSide = null;
      scheduler.setTempo(byKey.get(side).pattern.bpm);
    }
    const { pattern, order } = byKey.get(side);
    if (!pattern) return;
    // A chop plays another step of the same pattern in this step's place.
    const src = order ? order[i] : i;
    for (const [machineId, part] of src === null ? [] : Object.entries(pattern.parts)) {
      const node = nodes.get(machineId);
      if (INSTRUMENTS[machineId].kind === 'voice') {
        for (const ev of eventsForStep(part, src, time, stepDur)) node.port.postMessage(ev);
      } else {
        for (const [lane, steps] of Object.entries(part)) {
          const hit = steps[src];
          if (hit) node.port.postMessage({ type: 'hit', time, lane, accent: hit.accent, params: laneParams(machineId, lane) });
        }
      }
    }
    // Tell the page when this step actually sounds, not when it was queued,
    // and which step of the pattern it is playing (-1 for none).
    const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
    const gen = generation;
    const shownSide = side;
    const shownStep = src ?? -1;
    setTimeout(() => {
      if (gen === generation) stepListeners.forEach((fn) => fn(i, shownSide, shownStep));
    }, delayMs);
  }

  return {
    // The versions to offer as buttons: none for a single-version demo.
    versions: versions.length > 1 ? versions.map(({ key, label }) => ({ key, label })) : [],
    get playing() {
      return Boolean(scheduler?.playing);
    },
    get side() {
      return queuedSide ?? side;
    },
    async start() {
      await ensureReady();
      if (scheduler?.playing || !byKey.get(side).pattern) return;
      out.gain.cancelScheduledValues(ctx.currentTime);
      out.gain.setTargetAtTime(demo.safety.maxGain, ctx.currentTime, RAMP_S);
      scheduler = new Scheduler(() => ctx.currentTime);
      scheduler.setTempo(byKey.get(side).pattern.bpm);
      scheduler.register({ onStep, onStop: () => nodes.forEach((n) => n.port.postMessage({ type: 'stop' })) });
      scheduler.start();
    },
    stop() {
      if (!scheduler?.playing) return;
      scheduler.stop();
      generation += 1;
      stepListeners.forEach((fn) => fn(-1, side, -1));
    },
    // One drum hit, now. Starts the engine on the first press.
    async hit(lane) {
      await ensureReady();
      const machineId = params.machine;
      nodes.get(machineId).port.postMessage({ type: 'hit', time: ctx.currentTime, lane, accent: false, params: laneParams(machineId, lane) });
    },
    setControl(target, value) {
      values.set(target, value);
      if (ctx) nodes.forEach((_, id) => applyVoiceParams(id));
      chain?.set(target, value);
    },
    // Switch version: an effect goes in or out now, anything else on the
    // next bar while playing, and at once when stopped.
    setSide(next) {
      if (!byKey.has(next)) return;
      if (params.chain) {
        side = next;
        send?.gain.setTargetAtTime(byKey.get(next).wet ? 1 : 0, ctx.currentTime, RAMP_S);
        return;
      }
      if (scheduler?.playing) {
        queuedSide = next === side ? null : next;
      } else {
        side = next;
        queuedSide = null;
      }
    },
    onStep(fn) {
      stepListeners.add(fn);
      return () => stepListeners.delete(fn);
    },
    // Stops and lets go of every node. The engine and its context stay.
    dispose() {
      this.stop();
      stepListeners.clear();
      if (!ctx) return;
      out.gain.setTargetAtTime(0, ctx.currentTime, RAMP_S);
      const toRelease = [...nodes.values(), bus, send, out].filter(Boolean);
      const chainToRelease = chain;
      setTimeout(() => {
        toRelease.forEach((n) => n.disconnect());
        chainToRelease?.dispose();
      }, RELEASE_MS);
    },
  };
}
