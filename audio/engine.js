// The one AudioContext, and the master chain every sound passes through
// (docs/m4-architecture.md section 4):
//
//   input -> limiter -> volume -> safety -> mute -> speakers
//
// Nothing here makes a sound or even creates the AudioContext until
// start() is called, and start() is only ever called from a press, so a
// reader who never presses play never starts an audio thread and never
// meets an autoplay rule.
//
// The limiter comes before the volume so it sees the same signal whatever
// the slider says. It keeps loudness even but is not a hard ceiling: a
// DynamicsCompressorNode lets more input through as input grows (A269).
// The safety stage is: a waveshaper whose curve ends at peakCeiling, so no
// input, however loud, leaves above it. volumeMaxGain is set so that a
// loud demo at full volume sits below the safety knee, where the curve is
// a straight line and changes nothing (tools/audio-check.js measures it).

import { CONFIG } from '../config.js';
import { registerWorklets } from './worklets.js';

const M = CONFIG.audio.master;

// Guarded like every other storage access (reading/registers.js): private
// mode or blocked site data must not stop the map from opening.
function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(M.storageKey) ?? '{}');
    return {
      muted: saved.muted === true,
      volume: Number.isFinite(saved.volume) ? Math.min(1, Math.max(0, saved.volume)) : M.volumeDefault,
    };
  } catch {
    return { muted: false, volume: M.volumeDefault };
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(M.storageKey, JSON.stringify(prefs));
  } catch {
    // Nothing to do: the settings reset next visit.
  }
}

// Straight line up to the knee, then a tanh bend that approaches the
// ceiling and never passes it. Input beyond [-1, 1] takes the end values,
// which are the ceiling.
export function safetyCurve() {
  const n = M.safetyCurveSamples;
  const ceiling = M.peakCeiling;
  const knee = ceiling * M.safetyKnee;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const mag = Math.abs(x);
    const y = mag <= knee ? mag : knee + (ceiling - knee) * Math.tanh((mag - knee) / (ceiling - knee));
    curve[i] = Math.sign(x) * y;
  }
  return curve;
}

export function volumeGain(volume) {
  return M.volumeMaxGain * Math.pow(volume, M.volumeCurve);
}

export function createEngine() {
  const prefs = loadPrefs();
  let ctx = null;
  let nodes = null;
  let starting = null;
  const listeners = new Set();

  const notify = () => listeners.forEach((fn) => fn({ muted: prefs.muted, volume: prefs.volume }));

  function ramp(param, value) {
    const now = ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + M.rampS);
  }

  async function build() {
    ctx = new AudioContext();
    const input = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor();
    for (const [key, value] of Object.entries(M.limiter)) limiter[key].value = value;
    const volume = ctx.createGain();
    volume.gain.value = volumeGain(prefs.volume);
    const safety = ctx.createWaveShaper();
    safety.curve = safetyCurve();
    const mute = ctx.createGain();
    mute.gain.value = prefs.muted ? 0 : 1;
    input.connect(limiter).connect(volume).connect(safety).connect(mute).connect(ctx.destination);
    nodes = { input, limiter, volume, safety, mute };
    await registerWorklets(ctx);
    return ctx;
  }

  return {
    // Must be called from inside a user gesture (a click or key press) the
    // first time, or the browser keeps the context suspended.
    async start() {
      if (!starting) starting = build();
      await starting;
      if (ctx.state === 'suspended') await ctx.resume();
      return ctx;
    },
    get context() {
      return ctx;
    },
    // Where every demo connects. Null until start() has resolved.
    get input() {
      return nodes?.input ?? null;
    },
    // The last node before the speakers, for measuring what actually
    // leaves (tools/audio-check.js).
    get output() {
      return nodes?.mute ?? null;
    },
    get muted() {
      return prefs.muted;
    },
    get volume() {
      return prefs.volume;
    },
    setMuted(muted) {
      prefs.muted = Boolean(muted);
      if (nodes) ramp(nodes.mute.gain, prefs.muted ? 0 : 1);
      savePrefs(prefs);
      notify();
    },
    setVolume(volume) {
      prefs.volume = Math.min(1, Math.max(0, Number(volume) || 0));
      if (nodes) ramp(nodes.volume.gain, volumeGain(prefs.volume));
      savePrefs(prefs);
      notify();
    },
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
