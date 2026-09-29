// Plays one demo (docs/m4-architecture.md sections 5 and 6). Both playable
// kinds run through here: a machine-voice demo is a loop with pads and
// controls, and an A/B demo is a loop with two patterns and a switch that
// lands on the next bar. One module rather than one per kind, because the
// A/B is the same loop with a second pattern.
//
// Signal path: each machine's AudioWorkletNode -> this demo's gain, set to
// the demo's safety.maxGain -> the engine's master input.
//
// Nothing is created until start() or a pad press, and both go through
// engine.start(), which a press is always behind.

import { CONFIG } from '../config.js';
import { INSTRUMENTS, drumKnobValue, voiceParamValue } from './instruments.js';
import { parsePattern } from './pattern.js';
import { eventsForStep } from './seq303.js';
import { Scheduler } from './scheduler.js';

const RAMP_S = CONFIG.audio.master.rampS;
const RELEASE_MS = CONFIG.audio.player.releaseMs;

export function createPlayer(engine, demo) {
  const params = demo.params;
  const isAB = demo.kind === 'ab';
  const patterns = isAB
    ? { a: parsePattern(params.a.pattern).pattern, b: parsePattern(params.b.pattern).pattern }
    : { a: params.pattern ? parsePattern(params.pattern).pattern : null };
  // Every machine any pattern or pad uses, created once.
  const machineIds = new Set([
    ...(params.machine ? [params.machine] : []),
    ...Object.values(patterns).flatMap((p) => (p ? Object.keys(p.parts) : [])),
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
  const nodes = new Map(); // machineId -> AudioWorkletNode
  let scheduler = null;
  let side = 'a';
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
        for (const id of machineIds) {
          const node = new AudioWorkletNode(ctx, INSTRUMENTS[id].worklet, { numberOfInputs: 0, outputChannelCount: [1] });
          node.connect(out);
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
      scheduler.setTempo(patterns[side].bpm);
    }
    const pattern = patterns[side];
    if (!pattern) return;
    for (const [machineId, part] of Object.entries(pattern.parts)) {
      const node = nodes.get(machineId);
      if (INSTRUMENTS[machineId].kind === 'voice') {
        for (const ev of eventsForStep(part, i, time, stepDur)) node.port.postMessage(ev);
      } else {
        for (const [lane, steps] of Object.entries(part)) {
          const hit = steps[i];
          if (hit) node.port.postMessage({ type: 'hit', time, lane, accent: hit.accent, params: laneParams(machineId, lane) });
        }
      }
    }
    // Tell the page when this step actually sounds, not when it was queued.
    const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
    const gen = generation;
    const shownSide = side;
    setTimeout(() => {
      if (gen === generation) stepListeners.forEach((fn) => fn(i, shownSide));
    }, delayMs);
  }

  return {
    get playing() {
      return Boolean(scheduler?.playing);
    },
    get side() {
      return queuedSide ?? side;
    },
    async start() {
      await ensureReady();
      if (scheduler?.playing || !patterns[side]) return;
      out.gain.cancelScheduledValues(ctx.currentTime);
      out.gain.setTargetAtTime(demo.safety.maxGain, ctx.currentTime, RAMP_S);
      scheduler = new Scheduler(() => ctx.currentTime);
      scheduler.setTempo(patterns[side].bpm);
      scheduler.register({ onStep, onStop: () => nodes.forEach((n) => n.port.postMessage({ type: 'stop' })) });
      scheduler.start();
    },
    stop() {
      if (!scheduler?.playing) return;
      scheduler.stop();
      generation += 1;
      stepListeners.forEach((fn) => fn(-1, side));
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
    },
    // A/B: switch on the next bar while playing, at once when stopped.
    setSide(next) {
      if (!isAB || (next !== 'a' && next !== 'b')) return;
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
      const toRelease = [...nodes.values(), out];
      setTimeout(() => toRelease.forEach((n) => n.disconnect()), RELEASE_MS);
    },
  };
}
