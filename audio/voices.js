// Voices built from native Web Audio nodes (docs/m4-architecture.md
// section 2), for the instruments no SQUELCH worklet covers.
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

// ---- Plucked string -----------------------------------------------------
// Karplus-Strong on native nodes. Each plucked note is its own strand: a
// burst of noise into a delay one period long, fed back through a
// low-pass. A new note fades the old strand out, as a bassist's next note
// stops the last one. A slide retunes the ringing strand instead.
let noiseBuffer = null;

function pluck(ctx) {
  const P = V.pluck;
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = P.toneHz;
  const out = ctx.createGain();
  out.gain.value = P.level;
  tone.connect(out);
  // One render quantum. A DelayNode in a cycle can be no shorter, and
  // Chromium adds one more to every trip round the loop (measured, A279).
  const quantumS = 128 / ctx.sampleRate;
  let strand = null;

  // The delay that, with the loop filter's own delay at this pitch, makes
  // one pass exactly one period. Also the filter's gain at this pitch, and
  // its highest gain anywhere, so the loop can be kept below 1 everywhere.
  function loopDelay(loopLp, freq) {
    const n = 64;
    const f = new Float32Array(n);
    f[0] = freq;
    for (let i = 1; i < n; i++) f[i] = 20 * Math.pow(ctx.sampleRate / 2 / 20, i / (n - 1));
    const mag = new Float32Array(n);
    const phase = new Float32Array(n);
    loopLp.getFrequencyResponse(f, mag, phase);
    return {
      delayS: Math.max(1 / freq + phase[0] / (2 * Math.PI * freq) - quantumS, quantumS),
      mag: mag[0],
      maxMag: Math.max(...mag),
    };
  }

  function release(s, time, tau) {
    gateTo(s.gain.gain, 0, time, tau);
    const ms = (time - ctx.currentTime + tau * 10) * 1000;
    setTimeout(() => s.nodes.forEach((n) => n.disconnect()), Math.max(0, ms));
  }

  function newStrand(freq, time, accent) {
    const burst = ctx.createBufferSource();
    burst.buffer = noiseBuffer;
    const excite = ctx.createBiquadFilter();
    excite.type = 'lowpass';
    excite.frequency.value = accent ? P.accentExciteLowpassHz : P.exciteLowpassHz;
    const delay = ctx.createDelay(1);
    const loopLp = ctx.createBiquadFilter();
    loopLp.type = 'lowpass';
    loopLp.frequency.value = P.loopLowpassHz;
    loopLp.Q.value = P.loopQDb;
    const { delayS, mag, maxMag } = loopDelay(loopLp, freq);
    delay.delayTime.value = delayS;
    const feedback = ctx.createGain();
    feedback.gain.value = Math.min(Math.pow(10, (-3 / freq) / P.t60S) / mag, 0.999 / maxMag);
    const gain = ctx.createGain();
    burst.connect(excite).connect(delay).connect(loopLp).connect(feedback).connect(delay);
    loopLp.connect(gain).connect(tone);
    burst.start(time, Math.random() * 0.5, 1 / freq);
    return { delay, loopLp, gain, nodes: [burst, excite, delay, loopLp, feedback, gain] };
  }

  return asNode(out, {
    note(msg) {
      const t = msg.time;
      if (!msg.gate) {
        if (strand) release(strand, t, P.releaseS / 3);
        strand = null;
        return;
      }
      const freq = midiToFreq(msg.note);
      if (msg.slide && strand) {
        strand.delay.delayTime.setTargetAtTime(loopDelay(strand.loopLp, freq).delayS, t, P.glideS / 3);
        return;
      }
      if (strand) release(strand, t, V.gateRampS);
      strand = newStrand(freq, t, msg.accent);
    },
    stop() {
      if (strand) release(strand, ctx.currentTime, P.releaseS / 3);
      strand = null;
    },
    dispose() {
      if (strand) strand.nodes.forEach((n) => n.disconnect());
      strand = null;
      tone.disconnect();
    },
  });
}

export const VOICES = { stylophone, monosynth, pluck };

export function createVoice(ctx, voice) {
  return VOICES[voice](ctx);
}
