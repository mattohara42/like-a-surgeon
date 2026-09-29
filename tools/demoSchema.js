// Checks a demo record's playable parts against the M4 schema
// (docs/m4-architecture.md section 5). Used by tools/validate.js, and unit
// tested on its own (test/demoSchema.test.js).
//
// Returns a list of error strings, empty when the demo is sound. Register
// text (caption, A/B labels) is checked by the validator's own register
// check, which is passed in as `checkRegister(field, value)`.

import { INSTRUMENTS, controlTargets } from '../audio/instruments.js';
import { parsePattern } from '../audio/pattern.js';

// Kinds with a player. technique and pattern arrive with step 5.
export const DEMO_KINDS = ['machine-voice', 'ab'];

export function checkDemo(demo, checkRegister = () => {}) {
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
    const targets = controlTargets(params.machine);
    const seen = new Set();
    for (const [i, c] of (params.controls ?? []).entries()) {
      const where = `params.controls[${i}]`;
      if (!targets.includes(c?.target)) {
        errors.push(`${where}.target: ${JSON.stringify(c?.target)} is not a control on ${params.machine}`);
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
      checkRegister(`params.${side}.label`, s.label);
      pattern(s.pattern, `params.${side}.pattern`);
    }
  }
  return errors;
}
