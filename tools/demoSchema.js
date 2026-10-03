// Checks a demo record's playable parts against the M4 schema
// (docs/m4-architecture.md section 5). Used by tools/validate.js, and unit
// tested on its own (test/demoSchema.test.js).
//
// Returns a list of error strings, empty when the demo is sound. Reader
// text (caption, A/B labels) is checked by the validator's own text check,
// which is passed in as `checkText(field, value)`.

import { INSTRUMENTS, controlTargets } from '../audio/instruments.js';
import { parsePattern } from '../audio/pattern.js';
import { FX, ROUTES, fxTargets } from '../audio/fx.js';
import { CONFIG } from '../config.js';

// Kinds with a player (audio/player.js).
export const DEMO_KINDS = ['machine-voice', 'ab', 'pattern', 'fx-chain'];

export function checkDemo(demo, checkText = () => {}) {
  const errors = [];

  // A draft names a demo that is planned but cannot play yet. It must say
  // what it is waiting for, and nothing else about it is checked.
  if (demo.status !== undefined) {
    if (demo.status !== 'draft') errors.push(`status must be "draft" or absent, got ${JSON.stringify(demo.status)}`);
    else if (typeof demo.pending !== 'string' || !demo.pending.trim()) {
      errors.push('a draft demo must say what it is waiting for in "pending"');
    }
    return errors;
  }

  if (!DEMO_KINDS.includes(demo.kind)) {
    errors.push(`kind must be one of ${DEMO_KINDS.join(', ')}, got ${JSON.stringify(demo.kind)}`);
    return errors;
  }
  const maxGain = demo.safety?.maxGain;
  if (!Number.isFinite(maxGain) || maxGain <= 0 || maxGain > 1) {
    errors.push(`safety.maxGain must be above 0 and at most 1, got ${JSON.stringify(maxGain)}`);
  }
  const params = demo.params;
  if (!params || typeof params !== 'object') return [...errors, 'params must be an object'];

  const pattern = (raw, where) => {
    const { pattern: parsed, errors: patternErrors } = parsePattern(raw);
    errors.push(...patternErrors.map((e) => `${where}: ${e}`));
    return parsed;
  };

  // Sliders: each targets something `targets` lists, once, with an ordered
  // 0..1 range that holds its default.
  const controls = (targets, on) => {
    const seen = new Set();
    for (const [i, c] of (params.controls ?? []).entries()) {
      const where = `params.controls[${i}]`;
      if (!targets.includes(c?.target)) {
        errors.push(`${where}.target: ${JSON.stringify(c?.target)} is not a control on ${on}`);
        continue;
      }
      if (seen.has(c.target)) errors.push(`${where}: ${c.target} appears twice`);
      seen.add(c.target);
      const { min, max } = c;
      if (!(Number.isFinite(min) && Number.isFinite(max) && min >= 0 && max <= 1 && min < max)) {
        errors.push(`${where}: needs 0 <= min < max <= 1`);
      } else if (!(Number.isFinite(c.default) && c.default >= min && c.default <= max)) {
        errors.push(`${where}.default must lie between min and max`);
      }
    }
  };
  const machineTargets = (parsed) => (parsed ? Object.keys(parsed.parts).flatMap(controlTargets) : []);

  if (demo.kind === 'machine-voice') {
    const inst = INSTRUMENTS[params.machine];
    if (!inst) {
      errors.push(`params.machine must be one of ${Object.keys(INSTRUMENTS).join(', ')}, got ${JSON.stringify(params.machine)}`);
      return errors;
    }
    if (params.pads !== undefined) {
      if (inst.kind !== 'drums') errors.push('params.pads: only a drum machine has pads');
      else if (!Array.isArray(params.pads) || !params.pads.length) errors.push('params.pads must be a non-empty list of lanes');
      else {
        for (const lane of params.pads) if (!(lane in inst.lanes)) errors.push(`params.pads: no lane "${lane}" on ${params.machine}`);
        if (new Set(params.pads).size !== params.pads.length) errors.push('params.pads lists a lane twice');
      }
    }
    // A keyboard for a voice: the notes to offer as keys, low to high.
    if (params.keys !== undefined) {
      const K = CONFIG.audio.keys;
      if (inst.kind !== 'voice') errors.push('params.keys: only a voice has keys');
      else if (!Array.isArray(params.keys) || params.keys.length < 1 || params.keys.length > K.max) {
        errors.push(`params.keys must list 1 to ${K.max} MIDI notes`);
      } else {
        params.keys.forEach((n, i) => {
          if (!Number.isInteger(n) || n < inst.notes.min || n > inst.notes.max) {
            errors.push(`params.keys[${i}] must be a whole MIDI note from ${inst.notes.min} to ${inst.notes.max}, got ${JSON.stringify(n)}`);
          } else if (i > 0 && n <= params.keys[i - 1]) errors.push(`params.keys[${i}]: keys must rise from low to high`);
        });
      }
    }
    // Per-lane starting levels, for balancing a kit (A277). A lane's
    // `level` control, if the demo has one, starts from its own default.
    if (params.levels !== undefined) {
      if (inst.kind !== 'drums') errors.push('params.levels: only a drum machine has lane levels');
      else if (!params.levels || typeof params.levels !== 'object') errors.push('params.levels must map lanes to 0..1');
      else {
        for (const [lane, v] of Object.entries(params.levels)) {
          if (!(lane in inst.lanes)) errors.push(`params.levels: no lane "${lane}" on ${params.machine}`);
          else if (!Number.isFinite(v) || v < 0 || v > 1) errors.push(`params.levels.${lane} must be 0..1`);
        }
      }
    }
    controls(controlTargets(params.machine), params.machine);
    if (params.pattern !== undefined) {
      const parsed = pattern(params.pattern, 'params.pattern');
      if (parsed && !parsed.parts[params.machine]) errors.push(`params.pattern has no part for ${params.machine}`);
    } else if (inst.kind === 'voice') {
      errors.push(`params.pattern is required: ${params.machine} has no pads, so it only sounds by playing notes`);
    } else if (!params.pads) {
      errors.push('params needs pads, a pattern, or both');
    }
  }

  if (demo.kind === 'ab') {
    for (const side of ['a', 'b']) {
      const s = params[side];
      if (!s || typeof s !== 'object') {
        errors.push(`params.${side} must be an object`);
        continue;
      }
      checkText(`params.${side}.label`, s.label);
      pattern(s.pattern, `params.${side}.pattern`);
    }
  }

  // One pattern, heard in two or more step orders. A version without an
  // `order` plays the pattern straight. An order lists, for each step, the
  // step number (1-based, as a musician counts) to play there, or null
  // for silence.
  if (demo.kind === 'pattern') {
    const parsed = pattern(params.pattern, 'params.pattern');
    if (!Array.isArray(params.versions) || params.versions.length < 2) {
      errors.push('params.versions must list at least two versions');
    } else {
      for (const [i, v] of params.versions.entries()) {
        const where = `params.versions[${i}]`;
        checkText(`${where}.label`, v?.label);
        if (v?.order === undefined) continue;
        const steps = parsed?.steps ?? CONFIG.audio.stepsPerPattern;
        if (!Array.isArray(v.order) || v.order.length !== steps) {
          errors.push(`${where}.order must list ${steps} step numbers or nulls`);
          continue;
        }
        v.order.forEach((n, j) => {
          if (n !== null && !(Number.isInteger(n) && n >= 1 && n <= steps)) {
            errors.push(`${where}.order: step ${j + 1} must be a step number from 1 to ${steps} or null, got ${JSON.stringify(n)}`);
          }
        });
      }
    }
    controls(machineTargets(parsed), 'this demo');
  }

  // One pattern, and versions that switch the chain's effects in and out.
  if (demo.kind === 'fx-chain') {
    const parsed = pattern(params.pattern, 'params.pattern');
    if (params.through !== undefined) {
      const inPattern = parsed ? Object.keys(parsed.parts) : [];
      if (!Array.isArray(params.through) || !params.through.length) errors.push('params.through must list at least one instrument');
      else for (const id of params.through) if (!inPattern.includes(id)) errors.push(`params.through: ${JSON.stringify(id)} does not play in params.pattern`);
    }
    if (!ROUTES.includes(params.route)) errors.push(`params.route must be one of ${ROUTES.join(', ')}, got ${JSON.stringify(params.route)}`);
    const ids = [];
    if (!Array.isArray(params.chain) || !params.chain.length) {
      errors.push('params.chain must list at least one effect');
    } else {
      for (const [i, entry] of params.chain.entries()) {
        const where = `params.chain[${i}]`;
        const fx = FX[entry?.fx];
        if (!fx) {
          errors.push(`${where}.fx must be one of ${Object.keys(FX).join(', ')}, got ${JSON.stringify(entry?.fx)}`);
          continue;
        }
        if (ids.includes(entry.fx)) errors.push(`${where}: ${entry.fx} appears twice, so its controls would be ambiguous`);
        ids.push(entry.fx);
        for (const key of Object.keys(entry)) {
          if (key !== 'fx' && !(key in fx.settings)) errors.push(`${where}.${key}: not a setting of ${entry.fx}`);
        }
        for (const [key, range] of Object.entries(fx.settings)) {
          const v = entry[key];
          if (!Number.isFinite(v) || v < range.min || v > range.max || (range.integer && !Number.isInteger(v))) {
            errors.push(`${where}.${key} must be ${range.integer ? 'a whole number' : 'a number'} from ${range.min} to ${range.max}, got ${JSON.stringify(v)}`);
          }
        }
      }
    }
    if (!Array.isArray(params.versions) || params.versions.length < 2) {
      errors.push('params.versions must list at least two versions');
    } else {
      for (const [i, v] of params.versions.entries()) {
        const where = `params.versions[${i}]`;
        checkText(`${where}.label`, v?.label);
        if (!Array.isArray(v?.fx)) {
          errors.push(`${where}.fx must list the effects this version switches in ([] for none)`);
          continue;
        }
        for (const id of v.fx) if (!ids.includes(id)) errors.push(`${where}.fx: ${JSON.stringify(id)} is not in params.chain`);
        if (new Set(v.fx).size !== v.fx.length) errors.push(`${where}.fx lists an effect twice`);
        // A send goes to the whole chain or none of it (audio/fx.js).
        if (params.route === 'send' && v.fx.length && v.fx.length !== ids.length) {
          errors.push(`${where}.fx: a send engages the whole chain or none of it`);
        }
      }
    }
    controls([...machineTargets(parsed), ...ids.flatMap(fxTargets)], 'this demo');
  }
  return errors;
}
