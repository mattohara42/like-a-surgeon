// Native-node effects for fx-chain demos (docs/m4-architecture.md section
// 5). An effect is described here once, as data the validator reads in
// Node, and built into Web Audio nodes by buildChain() in the browser.
//
// A demo's chain entry fixes an effect's structure in real units
// ({ "fx": "tape-echo", "steps": 3, "lowCutHz": 400, "highCutHz": 2500 }).
// What the reader can turn is a control, 0..1, targeted as "fx.knob"
// ("tape-echo.feedback"), like a drum lane's knob.
//
// A chain is routed one of two ways (A280):
//   send    the dry sound always plays; the chain is added beside it, as a
//           dub engineer sends a channel to an echo. A version either
//           sends to the whole chain or to none of it.
//   insert  the sound passes through the chain; each effect in it is
//           switched in or bypassed on its own, as a pedal is.
// Either way, switching is a short crossfade, now.

import { CONFIG } from '../config.js';

const F = CONFIG.audio.fx;
const T = F.tapeEcho;

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
  fuzz: {
    settings: { driveDb: F.fuzz.driveDb, toneHz: F.fuzz.toneHz, outDb: F.fuzz.outDb },
    knobs: {},
  },
  'torn-speaker': {
    settings: {
      driveDb: F.tornSpeaker.driveDb,
      rattleHz: F.tornSpeaker.rattleHz,
      rattleDb: F.tornSpeaker.rattleDb,
      outDb: F.tornSpeaker.outDb,
    },
    knobs: {},
  },
  crusher: {
    settings: { rateHz: F.crusher.rateHz, bits: { ...F.crusher.bits, integer: true } },
    knobs: {},
  },
};

export const ROUTES = ['send', 'insert'];

// Every control target an effect accepts.
export function fxTargets(fxId) {
  return Object.keys(FX[fxId]?.knobs ?? {}).map((k) => `${fxId}.${k}`);
}

const dbToGain = (db) => Math.pow(10, db / 20);

// A curve for a WaveShaperNode from a function on -1..1.
function curve(fn, n = 2048) {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) c[i] = fn((i / (n - 1)) * 2 - 1);
  return c;
}

let noiseBuffer = null;
function noise(ctx) {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    noiseBuffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * F.noiseSeconds), ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  return src;
}

// A tape echo: input -> high-pass -> delay, whose output feeds back
// through a low-pass and a saturation stage, and goes out through the
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
  tape.curve = curve((x) => Math.tanh(x * T.saturationDrive) / Math.tanh(T.saturationDrive), 1024);
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

// A transistor fuzz: drive into an asymmetric tanh, the DC the asymmetry
// leaves removed, then a tone low-pass.
function fuzz(ctx, setting) {
  const Z = F.fuzz;
  const input = ctx.createGain();
  input.gain.value = dbToGain(setting.driveDb);
  const shaper = ctx.createWaveShaper();
  const k = Math.tanh(Z.bias);
  shaper.curve = curve((x) => (Math.tanh(x + Z.bias) - k) / (1 + k));
  shaper.oversample = '4x';
  const dcCut = ctx.createBiquadFilter();
  dcCut.type = 'highpass';
  dcCut.frequency.value = Z.dcCutHz;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = setting.toneHz;
  tone.Q.value = CONFIG.audio.voices.flatQDb;
  const output = ctx.createGain();
  output.gain.value = dbToGain(setting.outDb);
  input.connect(shaper).connect(dcCut).connect(tone).connect(output);
  return { input, output, knobs: {}, nodes: [input, shaper, dcCut, tone, output], stop: () => {} };
}

// A torn speaker into an overdriven amp. The rattle is the driven sound
// multiplied by noise (a GainNode whose gain is the noise), band-passed:
// it crackles in proportion to the chord and dies away with it.
function tornSpeaker(ctx, setting) {
  const Z = F.tornSpeaker;
  const input = ctx.createGain();
  input.gain.value = dbToGain(setting.driveDb);
  const shaper = ctx.createWaveShaper();
  shaper.curve = curve((x) => Math.tanh(x));
  shaper.oversample = '4x';
  const rattle = ctx.createGain();
  rattle.gain.value = 0;
  const hiss = noise(ctx);
  hiss.connect(rattle.gain);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = setting.rattleHz;
  band.Q.value = Z.rattleQ;
  const rattleLevel = ctx.createGain();
  rattleLevel.gain.value = dbToGain(setting.rattleDb);
  const cone = ctx.createBiquadFilter();
  cone.type = 'lowpass';
  cone.frequency.value = Z.coneLowpassHz;
  cone.Q.value = CONFIG.audio.voices.flatQDb;
  const output = ctx.createGain();
  output.gain.value = dbToGain(setting.outDb);
  input.connect(shaper);
  shaper.connect(cone);
  shaper.connect(rattle).connect(band).connect(rattleLevel).connect(cone);
  cone.connect(output);
  hiss.start();
  return {
    input,
    output,
    knobs: {},
    nodes: [input, shaper, rattle, hiss, band, rattleLevel, cone, output],
    stop: () => hiss.stop(),
  };
}

// Sample-rate and bit-depth reduction, in a worklet (crusher.proc.js):
// sample-and-hold is not something native nodes can do.
function crusher(ctx, setting) {
  const node = new AudioWorkletNode(ctx, 'crusher', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
  node.parameters.get('rateHz').value = setting.rateHz;
  node.parameters.get('bits').value = setting.bits;
  return { input: node, output: node, knobs: {}, nodes: [node], stop: () => {} };
}

const BUILDERS = { 'tape-echo': tapeEcho, fuzz, 'torn-speaker': tornSpeaker, crusher };

// Builds a demo's chain. Returns { input, output, set(target, value),
// engage(fxIds), dispose() }. Nothing is engaged until engage() is called.
export function buildChain(ctx, chain, bpm, rampS, route) {
  const stages = chain.map((entry) => ({ id: entry.fx, ...BUILDERS[entry.fx](ctx, entry, bpm) }));
  const gain = (v) => {
    const g = ctx.createGain();
    g.gain.value = v;
    return g;
  };
  const input = gain(1);
  const output = gain(1);
  const switches = []; // [gainNode, valueWhenEngaged, valueWhenNot, fxId or null]
  const extra = [input, output];

  if (route === 'send') {
    const send = gain(0);
    input.connect(output);
    input.connect(send).connect(stages[0].input);
    for (let i = 1; i < stages.length; i++) stages[i - 1].output.connect(stages[i].input);
    stages[stages.length - 1].output.connect(output);
    switches.push([send, 1, 0, null]);
    extra.push(send);
  } else {
    // Each stage between its own bypass and its own wet gain.
    let from = input;
    for (const s of stages) {
      const wet = gain(0);
      const dry = gain(1);
      const joint = gain(1);
      from.connect(s.input);
      s.output.connect(wet).connect(joint);
      from.connect(dry).connect(joint);
      switches.push([wet, 1, 0, s.id], [dry, 0, 1, s.id]);
      extra.push(wet, dry, joint);
      from = joint;
    }
    from.connect(output);
  }

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
    input,
    output,
    set,
    engage(fxIds) {
      for (const [g, on, off, id] of switches) {
        const engaged = id === null ? fxIds.length > 0 : fxIds.includes(id);
        g.gain.setTargetAtTime(engaged ? on : off, ctx.currentTime, rampS);
      }
    },
    dispose() {
      for (const s of stages) {
        s.stop();
        s.nodes.forEach((n) => n.disconnect());
      }
      extra.forEach((n) => n.disconnect());
    },
  };
}
