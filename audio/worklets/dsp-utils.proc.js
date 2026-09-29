// Ported from SQUELCH (github.com/mattohara42/squelch, commit 935ceb8),
// MIT licensed: see audio/SQUELCH-LICENSE. The DSP is unchanged. The only
// edit is that its imports are gone: a worklet loaded from a data: URL
// cannot import anything (A267), so audio/workletSource.js prepends `CFG`
// (from CONFIG.audio.dsp) and, for the drums, dsp-utils, before loading.
//
// Shared building blocks for percussion synthesis worklets (drum808, drum909).
// Relies on `sampleRate` being present in the AudioWorkletGlobalScope of
// whichever module imports these.

function noise() {
  return Math.random() * 2 - 1;
}

function hpStep(x, state, key, coef) {
  state[key] = state[key] + coef * (x - state[key]);
  return x - state[key];
}

function hpCoefFor(hz) {
  return 1 - Math.exp((-2 * Math.PI * hz) / sampleRate);
}

function expMult(ms) {
  return Math.exp(-1 / (sampleRate * (ms / 1000)));
}
