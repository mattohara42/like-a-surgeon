// Native-node effects for fx-chain demos (docs/m4-architecture.md section
// 5). An effect is described here once, as data the validator reads in
// Node, and built into Web Audio nodes by buildChain() in the browser.
//
// A demo's chain entry fixes an effect's structure in real units
// ({ "fx": "tape-echo", "steps": 3, "lowCutHz": 400, "highCutHz": 2500 }).
// What the reader can turn is a control, 0..1, targeted as "fx.knob"
// ("tape-echo.feedback"), like a drum lane's knob.

import { CONFIG } from '../config.js';

const T = CONFIG.audio.fx.tapeEcho;

// settings: the chain entry's fixed fields, with their allowed range.
// knobs: control targets, each 0..1 with the default used when the demo
// has no control for it.
export const FX = {
  'tape-echo': {
    settings: {
      steps: { min: T.stepsMin, max: T.stepsMax, integer: true },
      lowCutHz: T.lowCutHz,
      highCutHz: T.highCutHz,
    },
    knobs: { feedback: 0.5, level: 0.8 },
  },
};

// Every control target an effect accepts.
export function fxTargets(fxId) {
  return Object.keys(FX[fxId]?.knobs ?? {}).map((k) => `${fxId}.${k}`);
}

// A tanh curve: unity for small signals, squashing loud ones.
function saturationCurve(drive) {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  return curve;
}

// A tape echo, as a send: input -> high-pass -> delay, whose output feeds
// back through a low-pass and a saturation stage, and goes out through the
// return level.
function tapeEcho(ctx, setting, bpm) {
  const stepS = 60 / bpm / 4;
  const input = ctx.createBiquadFilter();
  input.type = 'highpass';
  input.frequency.value = setting.lowCutHz;
  const delay = ctx.createDelay(T.stepsMax * stepS + 1);
  delay.delayTime.value = setting.steps * stepS;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = setting.highCutHz;
  const tape = ctx.createWaveShaper();
  tape.curve = saturationCurve(T.saturationDrive);
  const feedback = ctx.createGain();
  const level = ctx.createGain();
  input.connect(delay);
  delay.connect(tone).connect(tape).connect(feedback).connect(delay);
  tape.connect(level);

  const wow = ctx.createOscillator();
  wow.frequency.value = T.wowHz;
  const wowDepth = ctx.createGain();
  wowDepth.gain.value = T.wowDepthS;
  wow.connect(wowDepth).connect(delay.delayTime);
  wow.start();

  return {
    input,
    output: level,
    knobs: { feedback: (v) => [feedback.gain, v * T.feedbackMax], level: (v) => [level.gain, v] },
    nodes: [input, delay, tone, tape, feedback, level, wow, wowDepth],
    stop: () => wow.stop(),
  };
}

const BUILDERS = { 'tape-echo': tapeEcho };

// Builds a demo's chain in order. Returns { input, output, set(target,
// value), dispose() }.
export function buildChain(ctx, chain, bpm, rampS) {
  const stages = chain.map((entry) => ({ id: entry.fx, ...BUILDERS[entry.fx](ctx, entry, bpm) }));
  for (let i = 1; i < stages.length; i++) stages[i - 1].output.connect(stages[i].input);
  const set = (target, value) => {
    const [fxId, knob] = target.split('.');
    const stage = stages.find((s) => s.id === fxId);
    const knobFn = stage?.knobs[knob];
    if (!knobFn) return;
    const [param, v] = knobFn(value);
    param.setTargetAtTime(v, ctx.currentTime, rampS);
  };
  // Every knob starts at its effect's default until a control says otherwise.
  for (const s of stages) for (const [knob, v] of Object.entries(FX[s.id].knobs)) set(`${s.id}.${knob}`, v);
  return {
    input: stages[0].input,
    output: stages[stages.length - 1].output,
    set,
    dispose() {
      for (const s of stages) {
        s.stop();
        s.nodes.forEach((n) => n.disconnect());
      }
    },
  };
}
