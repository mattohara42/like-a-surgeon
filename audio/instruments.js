// The machines a demo can play, what each one exposes, and how a demo's
// control values (always 0..1 in the data) become the numbers the worklet
// expects. Pure data and arithmetic, no Web Audio, so tools/demoSchema.js
// can check demo files against it in Node.
//
// Keyed by machine record id (data/machines/), so a demo names the same
// thing the map does.

import { CONFIG } from '../config.js';

const DSP = CONFIG.audio.dsp;

// Drum lanes and the knobs each exposes beyond `level`, which every lane
// has. The 808 map is SQUELCH's LANE_KNOBS_808. The 909 map lists what
// drum909.proc.js reads.
const LANES_808 = { bd: ['tone', 'decay'], sd: ['tone', 'snappy'], lt: [], mt: [], ht: [], rs: [], cp: [], cb: [], ch: [], oh: ['decay'], cy: ['decay'], ma: [] };
const LANES_909 = { bd: ['tune', 'attack', 'decay'], sd: ['tune', 'tone', 'snappy'], lt: ['tune', 'decay'], mt: ['tune', 'decay'], ht: ['tune', 'decay'], rs: [], cp: [], ch: [], oh: ['decay'], cc: [], rc: [] };

export const INSTRUMENTS = {
  'tr-808': { worklet: 'drum808', kind: 'drums', lanes: LANES_808 },
  'tr-909': { worklet: 'drum909', kind: 'drums', lanes: LANES_909 },
  'tb-303': { worklet: 'voice303', kind: 'voice', params: ['cutoff', 'resonance', 'envMod', 'decay', 'accent'] },
};

// Every control target a machine accepts: "lane.knob" for drums, the
// parameter name for a voice.
export function controlTargets(machineId) {
  const inst = INSTRUMENTS[machineId];
  if (!inst) return [];
  if (inst.kind === 'voice') return inst.params;
  return Object.entries(inst.lanes).flatMap(([lane, knobs]) => ['level', ...knobs].map((k) => `${lane}.${k}`));
}

// A drum knob in 0..1 -> the value drum808/drum909 read for it. Every
// drum knob is read as 0..1 by the worklets themselves (SQUELCH #8 fixed
// the one that was not, the 808 kick's decay: A276), so this passes the
// value through. It stays as the one place to convert, should a machine
// ever need it.
export function drumKnobValue(machineId, lane, knob, value) {
  return value;
}

// A 303 control in 0..1 -> the AudioParam value voice303 expects. Cutoff
// moves exponentially, so equal slider steps sound like equal steps.
export function voiceParamValue(param, value) {
  const V = DSP.VOICE303;
  if (param === 'cutoff') return V.CUTOFF_MIN_HZ * Math.pow(V.CUTOFF_MAX_HZ / V.CUTOFF_MIN_HZ, value);
  if (param === 'decay') return V.DECAY_MIN_MS + value * (V.DECAY_MAX_MS - V.DECAY_MIN_MS);
  return value;
}
