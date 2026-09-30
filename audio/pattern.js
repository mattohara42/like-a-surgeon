// Demo patterns: the data format and its parser (docs/m4-architecture.md
// section 5). Pure, so the validator and the players read patterns the
// same way.
//
// A pattern in a demo file:
//
//   "pattern": {
//     "bpm": 118,
//     "steps": 16,
//     "parts": {
//       "tr-808": { "bd": "x.....x.x.......", "cp": "....x.......x..." },
//       "tb-303": { "notes": [45, null, 57, ...], "accent": "X...", "slide": "..s." }
//     }
//   }
//
// Drum lanes are one character per step: "." rest, "x" hit, "X" accented
// hit. A voice part has one MIDI note (or null for a rest) per step, in
// the voice's own range (INSTRUMENTS[id].notes), and
// optional accent ("X") and slide ("s") strings, and on a voice that can,
// a `chord` of semitones above each note ([0, 7, 12] is a power chord). A slide on step N means
// "glide into step N+1", SQUELCH's locked 303 semantics (js/seq303.js).

import { CONFIG } from '../config.js';
import { INSTRUMENTS } from './instruments.js';

const DRUM_CHARS = { '.': null, x: { accent: false }, X: { accent: true } };

// Returns { pattern, errors }. `pattern` is null when there are errors.
// Parsed form: { bpm, steps, parts: { machineId: part } }, where a drum
// part is { lane: [null | { accent }] } and a voice part is SQUELCH's
// step shape, [{ g, n, a, s }].
export function parsePattern(raw) {
  const errors = [];
  const A = CONFIG.audio;
  if (!raw || typeof raw !== 'object') return { pattern: null, errors: ['pattern must be an object'] };
  const { bpm, steps, parts } = raw;
  if (!Number.isFinite(bpm) || bpm < A.tempo.minBpm || bpm > A.tempo.maxBpm) {
    errors.push(`bpm must be a number from ${A.tempo.minBpm} to ${A.tempo.maxBpm}, got ${JSON.stringify(bpm)}`);
  }
  // The scheduler loops at a fixed length, so every pattern matches it.
  if (steps !== A.stepsPerPattern) errors.push(`steps must be ${A.stepsPerPattern}, got ${JSON.stringify(steps)}`);
  if (!parts || typeof parts !== 'object' || !Object.keys(parts).length) {
    errors.push('parts must name at least one machine');
    return { pattern: null, errors };
  }

  const parsed = {};
  for (const [machineId, part] of Object.entries(parts)) {
    const inst = INSTRUMENTS[machineId];
    const where = `parts.${machineId}`;
    if (!inst) {
      errors.push(`${where}: no playable machine "${machineId}" (known: ${Object.keys(INSTRUMENTS).join(', ')})`);
      continue;
    }
    if (inst.kind === 'drums') parsed[machineId] = parseDrums(part, inst, steps, where, errors);
    else parsed[machineId] = parseVoice(part, inst, steps, where, errors);
  }
  return errors.length ? { pattern: null, errors } : { pattern: { bpm, steps, parts: parsed }, errors };
}

function parseDrums(part, inst, steps, where, errors) {
  const out = {};
  if (!part || typeof part !== 'object' || !Object.keys(part).length) {
    errors.push(`${where}: must map at least one lane to a step string`);
    return out;
  }
  for (const [lane, line] of Object.entries(part)) {
    if (!(lane in inst.lanes)) {
      errors.push(`${where}.${lane}: no such lane (known: ${Object.keys(inst.lanes).join(', ')})`);
      continue;
    }
    if (typeof line !== 'string' || line.length !== steps || [...line].some((c) => !(c in DRUM_CHARS))) {
      errors.push(`${where}.${lane}: must be ${steps} characters of ".", "x" or "X"`);
      continue;
    }
    out[lane] = [...line].map((c) => DRUM_CHARS[c]);
  }
  return out;
}

function parseVoice(part, inst, steps, where, errors) {
  const range = inst.notes;
  const notes = part?.notes;
  if (!Array.isArray(notes) || notes.length !== steps) {
    errors.push(`${where}.notes: must be an array of ${steps} MIDI notes or nulls`);
    return [];
  }
  const flags = (key, char) => {
    const line = part[key] ?? '.'.repeat(steps);
    if (typeof line !== 'string' || line.length !== steps || [...line].some((c) => c !== '.' && c !== char)) {
      errors.push(`${where}.${key}: must be ${steps} characters of "." or "${char}"`);
      return [];
    }
    return [...line].map((c) => c === char);
  };
  const accent = flags('accent', 'X');
  const slide = flags('slide', 's');
  // A chord: semitones above each note, sounded together, on a voice that
  // can (INSTRUMENTS[id].chords).
  let chord = null;
  if (part.chord !== undefined) {
    const C = CONFIG.audio.chord;
    if (!inst.chords) errors.push(`${where}.chord: this voice plays one note at a time`);
    else if (
      !Array.isArray(part.chord) ||
      part.chord.length < 2 ||
      part.chord.length > inst.chords ||
      part.chord.some((iv) => !Number.isInteger(iv) || iv < 0 || iv > C.maxInterval)
    ) {
      errors.push(`${where}.chord must list 2 to ${inst.chords} whole semitone steps from 0 to ${C.maxInterval}`);
    } else chord = part.chord;
  }
  return notes.map((n, i) => {
    if (n === null) {
      if (accent[i]) errors.push(`${where}: step ${i + 1} is a rest but has an accent`);
      if (slide[i]) errors.push(`${where}: step ${i + 1} is a rest but has a slide`);
      return { g: false };
    }
    if (!Number.isInteger(n) || n < range.min || n > range.max) {
      errors.push(`${where}.notes: step ${i + 1} must be a whole MIDI note from ${range.min} to ${range.max} or null, got ${JSON.stringify(n)}`);
    }
    if (chord && Number.isInteger(n) && n + Math.max(...chord) > range.max) {
      errors.push(`${where}: step ${i + 1}'s chord reaches above ${range.max}`);
    }
    return chord ? { g: true, n, a: Boolean(accent[i]), s: Boolean(slide[i]), c: chord } : { g: true, n, a: Boolean(accent[i]), s: Boolean(slide[i]) };
  });
}
