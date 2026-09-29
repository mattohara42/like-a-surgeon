// The demo schema (tools/demoSchema.js), the pattern parser
// (audio/pattern.js) and the knob conversions (audio/instruments.js).
import assert from 'node:assert';
import { test } from 'node:test';
import { CONFIG } from '../config.js';
import { checkDemo } from '../tools/demoSchema.js';
import { parsePattern } from '../audio/pattern.js';
import { controlTargets, drumKnobValue, voiceParamValue } from '../audio/instruments.js';

const STEPS = CONFIG.audio.stepsPerPattern;
const rest = '.'.repeat(STEPS);
const four = 'x...'.repeat(STEPS / 4);

const drums = (extra = {}) => ({
  id: 'demo-t',
  kind: 'machine-voice',
  safety: { maxGain: 0.7 },
  params: { machine: 'tr-808', pads: ['bd', 'cp'], pattern: { bpm: 120, steps: STEPS, parts: { 'tr-808': { bd: four } } }, ...extra },
});
const voice = (part) => ({
  id: 'demo-v',
  kind: 'machine-voice',
  safety: { maxGain: 0.6 },
  params: { machine: 'tb-303', pattern: { bpm: 120, steps: STEPS, parts: { 'tb-303': part } } },
});
const notes = (n = 45) => Array.from({ length: STEPS }, () => n);

test('a sound drum demo passes', () => {
  assert.deepStrictEqual(checkDemo(drums()), []);
});

test('a sound 303 demo passes, with a slide into a note', () => {
  const slide = '.s' + '.'.repeat(STEPS - 2);
  assert.deepStrictEqual(checkDemo(voice({ notes: notes(), slide })), []);
});

test('drum lane strings must be the right length and alphabet', () => {
  const errs = checkDemo(drums({ pattern: { bpm: 120, steps: STEPS, parts: { 'tr-808': { bd: 'x..o' } } } }));
  assert.ok(errs.some((e) => e.includes('parts.tr-808.bd')), errs.join('\n'));
});

test('unknown lanes, machines and control targets are caught', () => {
  assert.ok(checkDemo(drums({ pads: ['zz'] })).some((e) => e.includes('no lane "zz"')));
  assert.ok(checkDemo(drums({ machine: 'tr-606' })).some((e) => e.includes('params.machine')));
  const bad = checkDemo(drums({ controls: [{ target: 'bd.tune', min: 0, max: 1, default: 0.5 }] }));
  assert.ok(bad.some((e) => e.includes('"bd.tune" is not a control on tr-808')), bad.join('\n'));
});

test('control ranges must be ordered and hold their default', () => {
  const errs = checkDemo(drums({ controls: [{ target: 'bd.decay', min: 0.8, max: 0.2, default: 0.5 }] }));
  assert.ok(errs.some((e) => e.includes('0 <= min < max <= 1')));
  const errs2 = checkDemo(drums({ controls: [{ target: 'bd.decay', min: 0, max: 0.5, default: 0.9 }] }));
  assert.ok(errs2.some((e) => e.includes('default must lie between')));
});

test('a 303 demo needs a pattern, and rests cannot carry slides or accents', () => {
  const noPattern = voice({ notes: notes() });
  delete noPattern.params.pattern;
  assert.ok(checkDemo(noPattern).some((e) => e.includes('params.pattern is required')));
  const n = notes();
  n[0] = null;
  const errs = checkDemo(voice({ notes: n, slide: 's' + '.'.repeat(STEPS - 1) }));
  assert.ok(errs.some((e) => e.includes('step 1 is a rest but has a slide')), errs.join('\n'));
});

test('notes outside the 303 range are caught', () => {
  const errs = checkDemo(voice({ notes: notes(CONFIG.audio.voice303.noteMax + 1) }));
  assert.ok(errs.some((e) => e.includes('MIDI note')));
});

test('tempo and length must fit the scheduler', () => {
  const { errors } = parsePattern({ bpm: 10, steps: 32, parts: { 'tr-808': { bd: four } } });
  assert.ok(errors.some((e) => e.startsWith('bpm')));
  assert.ok(errors.some((e) => e.startsWith('steps')));
});

test('a draft is accepted only with a reason', () => {
  assert.deepStrictEqual(checkDemo({ status: 'draft', pending: 'Needs a sourced melody.' }), []);
  assert.ok(checkDemo({ status: 'draft' }).length === 1);
  assert.ok(checkDemo({ status: 'done', pending: 'x' }).length === 1);
});

test('the parser gives SQUELCH step shapes', () => {
  const { pattern } = parsePattern({ bpm: 120, steps: STEPS, parts: { 'tb-303': { notes: notes(), accent: 'X' + '.'.repeat(STEPS - 1) }, 'tr-808': { bd: 'X' + rest.slice(1) } } });
  assert.deepStrictEqual(pattern.parts['tb-303'][0], { g: true, n: 45, a: true, s: false });
  assert.deepStrictEqual(pattern.parts['tr-808'].bd[0], { accent: true });
  assert.strictEqual(pattern.parts['tr-808'].bd[1], null);
});

test('every lane has a level control, and knobs follow the lane map', () => {
  const targets = controlTargets('tr-808');
  assert.ok(targets.includes('ma.level') && targets.includes('bd.decay') && !targets.includes('bd.tune'));
  assert.ok(controlTargets('tr-909').includes('bd.tune'));
  assert.deepStrictEqual(controlTargets('tb-303'), ['cutoff', 'resonance', 'envMod', 'decay', 'accent']);
});

test('drum knobs reach the worklets as 0..1 (A276)', () => {
  assert.strictEqual(drumKnobValue('tr-808', 'bd', 'decay', 0.3), 0.3);
  assert.strictEqual(drumKnobValue('tr-808', 'oh', 'decay', 0.3), 0.3);
  assert.strictEqual(drumKnobValue('tr-909', 'bd', 'decay', 0.3), 0.3);
});

test('303 controls map onto the worklet parameter ranges', () => {
  const V = CONFIG.audio.dsp.VOICE303;
  assert.ok(Math.abs(voiceParamValue('cutoff', 0) - V.CUTOFF_MIN_HZ) < 1e-9);
  assert.ok(Math.abs(voiceParamValue('cutoff', 1) - V.CUTOFF_MAX_HZ) < 1e-6);
  assert.strictEqual(voiceParamValue('decay', 1), V.DECAY_MAX_MS);
  assert.strictEqual(voiceParamValue('resonance', 0.4), 0.4);
});
