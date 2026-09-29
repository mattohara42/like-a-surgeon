// Loads an AudioWorklet processor in Node for the DSP tests, from the same
// source text the browser gets (audio/workletSource.js).
//
// The AudioWorklet globals are stubbed on globalThis: `sampleRate`,
// `currentTime` (tests advance it themselves), `AudioWorkletProcessor` and
// `registerProcessor`. Each call evaluates the source afresh, so every
// test gets a new processor class with clean module-level state.

import { readFileSync } from 'node:fs';
import { CONFIG } from '../config.js';
import { WORKLETS, workletSource } from '../audio/workletSource.js';

export const SAMPLE_RATE = 48000;
export const BLOCK = 128;

const dir = new URL('../audio/worklets/', import.meta.url);

export function loadWorklet(name) {
  globalThis.sampleRate = SAMPLE_RATE;
  globalThis.currentTime = 0;
  globalThis.AudioWorkletProcessor = class {
    constructor() {
      this.port = { onmessage: null, postMessage() {} };
    }
  };
  let registered = null;
  globalThis.registerProcessor = (registeredName, cls) => {
    if (registeredName !== name) throw new Error(`Expected "${name}", registered "${registeredName}"`);
    registered = cls;
  };
  const texts = Object.fromEntries(WORKLETS[name].map((f) => [f, readFileSync(new URL(f, dir), 'utf8')]));
  new Function(workletSource(name, texts, CONFIG.audio.dsp))();
  if (!registered) throw new Error(`Worklet "${name}" did not register a processor`);
  return registered;
}
