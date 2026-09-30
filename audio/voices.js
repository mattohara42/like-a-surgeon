// Voices built from native Web Audio nodes (docs/m4-architecture.md
// section 2), for the instruments no worklet covers. The plucked string
// started here and moved to a worklet (audio/worklets/string.proc.js,
// A280), because a native feedback loop cannot hold a guitar's pitch.
//
// Each voice takes the same messages as the 303 worklet, so the player
// and seq303.js drive every voice the same way:
//
//   { type: 'note', time, note, gate: true, accent, slide }
//   { type: 'note', time, gate: false }
//   { type: 'stop' }
//
// and looks like an AudioWorkletNode from outside: connect(), disconnect(),
// port.postMessage() and parameters.get(). Parameters take the demo's 0..1
// control value directly; each voice converts it here.
//
// Every message carries a time on the AudioContext clock, usually a little
// ahead (the scheduler's lookahead), so everything is written as AudioParam
// automation at that time rather than done now.

import { CONFIG } from '../config.js';

const V = CONFIG.audio.voices;

const midiToFreq = (note) => 440 * Math.pow(2, (note - 69) / 12);

// A control the player can set, read by the voice when it needs it.
function param(value, onChange = () => {}) {
  return {
    value,
    setTargetAtTime(v) {
      this.value = v;
      onChange(v);
    },
  };
}

// Wraps a voice's handlers into the AudioWorkletNode-like shape.
function asNode(output, { note, stop, dispose, parameters = {} }) {
  return {
    connect: (dest) => output.connect(dest),
    disconnect() {
      dispose();
      output.disconnect();
    },
    parameters: new Map(Object.entries(parameters)),
    port: {
      postMessage(msg) {
        if (msg.type === 'note') note(msg);
        else if (msg.type === 'stop') stop();
      },
    },
  };
}

// Ramps a gain to `value` from `time`, as a gate or a release.
function gateTo(gain, value, time, tau) {
  gain.cancelScheduledValues(time);
  gain.setTargetAtTime(value, time, tau);
}

// ---- Stylophone ---------------------------------------------------------
// One square oscillator, on while the pen touches a key. No envelope and no
// glide: the pen jumps from key to key.
function stylophone(ctx) {
  const S = V.stylophone;
  const osc = ctx.createOscillator();
  osc.type = 'square';
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = S.lowpassHz;
  const amp = ctx.createGain();
  amp.gain.value = 0;
  osc.connect(lowpass).connect(amp);
  osc.start();
  return asNode(amp, {
    note(msg) {
      if (!msg.gate) return gateTo(amp.gain, 0, msg.time, V.gateRampS);
      osc.frequency.setValueAtTime(midiToFreq(msg.note), msg.time);
      gateTo(amp.gain, S.level, msg.time, V.gateRampS);
    },
    stop: () => gateTo(amp.gain, 0, ctx.currentTime, V.gateRampS),
    dispose: () => osc.stop(),
  });
}

// ---- Mono synth ---------------------------------------------------------
// Three detuned sawtooths into two low-passes in series, a filter envelope
// that starts open and falls back to the cutoff, and glide on a slide.
function monosynth(ctx) {
  const M = V.monosynth;
  const oscs = M.detuneCents.map((cents) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.detune.value = cents;
    return o;
  });
  const mix = ctx.createGain();
  mix.gain.value = M.oscLevel;
  const f1 = ctx.createBiquadFilter();
  const f2 = ctx.createBiquadFilter();
  f1.type = f2.type = 'lowpass';
  const amp = ctx.createGain();
  amp.gain.value = 0;
  oscs.forEach((o) => o.connect(mix));
  mix.connect(f1).connect(f2).connect(amp);
  oscs.forEach((o) => o.start());

  const p = {
    cutoff: param(0.3),
    resonance: param(0.3, (v) => f1.Q.setTargetAtTime(v * M.resonanceMaxDb, ctx.currentTime, V.gateRampS)),
    envMod: param(0.5),
    decay: param(0.3),
  };
  f1.Q.value = p.resonance.value * M.resonanceMaxDb;
  f2.Q.value = V.flatQDb;
  const cutoffHz = () => M.cutoffHz.min * Math.pow(M.cutoffHz.max / M.cutoffHz.min, p.cutoff.value);
  let gated = false;

  return asNode(amp, {
    parameters: p,
    note(msg) {
      const t = msg.time;
      if (!msg.gate) {
        gated = false;
        return gateTo(amp.gain, 0, t, M.releaseS / 3);
      }
      const freq = midiToFreq(msg.note);
      const glide = msg.slide && gated;
      for (const o of oscs) {
        o.frequency.cancelScheduledValues(t);
        if (glide) o.frequency.setTargetAtTime(freq, t, M.glideS / 3);
        else o.frequency.setValueAtTime(freq, t);
      }
      if (!glide) {
        const base = cutoffHz();
        const peak = Math.min(base * Math.pow(2, p.envMod.value * M.envOctaves), ctx.sampleRate / 2.5);
        const decay = M.decayS.min + p.decay.value * (M.decayS.max - M.decayS.min);
        for (const f of [f1, f2]) {
          f.frequency.cancelScheduledValues(t);
          f.frequency.setValueAtTime(peak, t);
          f.frequency.setTargetAtTime(base, t, decay / 3);
        }
        gateTo(amp.gain, msg.accent ? M.accentGain : 1, t, M.attackS / 3);
      }
      gated = true;
    },
    stop() {
      gated = false;
      gateTo(amp.gain, 0, ctx.currentTime, M.releaseS / 3);
    },
    dispose: () => oscs.forEach((o) => o.stop()),
  });
}

export const VOICES = { stylophone, monosynth };

export function createVoice(ctx, voice) {
  return VOICES[voice](ctx);
}
