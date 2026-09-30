// The string worklet (audio/worklets/string.proc.js) and the crusher
// (audio/worklets/crusher.proc.js), run headless in Node.
import assert from 'node:assert';
import { test } from 'node:test';
import { CONFIG } from '../config.js';
import { loadWorklet, SAMPLE_RATE, BLOCK } from './worklet-harness.js';

function render(node, seconds, input = null) {
  const out = [];
  const blocks = Math.ceil((seconds * SAMPLE_RATE) / BLOCK);
  for (let b = 0; b < blocks; b++) {
    const buf = new Float32Array(BLOCK);
    const inputs = input ? [[input.subarray(b * BLOCK, (b + 1) * BLOCK)]] : [];
    node.process(inputs, [[buf]], node.params ?? {});
    out.push(...buf);
    globalThis.currentTime += BLOCK / SAMPLE_RATE;
  }
  return Float32Array.from(out);
}

// Pitch by autocorrelation over lags near the expected period, refined
// between samples.
function pitch(x, want) {
  const ac = (lag) => {
    let s = 0;
    for (let i = 0; i < 8192; i++) s += x[i] * x[i + lag];
    return s;
  };
  let best = -Infinity;
  let bestLag = 0;
  for (let lag = Math.floor(SAMPLE_RATE / (want * 1.1)); lag <= Math.ceil(SAMPLE_RATE / (want * 0.9)); lag++) {
    const v = ac(lag);
    if (v > best) [best, bestLag] = [v, lag];
  }
  const [y0, y1, y2] = [ac(bestLag - 1), best, ac(bestLag + 1)];
  return SAMPLE_RATE / (bestLag + (0.5 * (y0 - y2)) / (y0 - 2 * y1 + y2));
}

const guitar = CONFIG.audio.voices.electricGuitar.string;

function pluck(note, options = guitar, chord) {
  const String = loadWorklet('string');
  const s = new String({ processorOptions: options });
  s.port.onmessage({ data: { type: 'note', time: 0, note, gate: true, accent: false, slide: false, chord } });
  return s;
}

test('a plucked string is in tune across a guitar and a bass range (A280)', () => {
  for (const note of [28, 40, 52, 64, 76, 84]) {
    const want = 440 * Math.pow(2, (note - 69) / 12);
    const x = render(pluck(note), 0.5).subarray(SAMPLE_RATE * 0.1);
    const cents = 1200 * Math.log2(pitch(x, want) / want);
    assert.ok(Math.abs(cents) < 5, `note ${note}: ${cents.toFixed(1)} cents out`);
  }
});

test('a string rings, dies after release, and stays bounded', () => {
  const s = pluck(45, guitar, [0, 7, 12]);
  const held = render(s, 0.3);
  const peak = Math.max(...held.map(Math.abs));
  assert.ok(peak > 0.05 && peak < 1.5, `peak ${peak}`);
  s.port.onmessage({ data: { type: 'note', time: globalThis.currentTime, gate: false } });
  const after = render(s, 0.5).subarray(SAMPLE_RATE * 0.4);
  assert.ok(Math.max(...after.map(Math.abs)) < 1e-3, 'silent after release');
});

test('the crusher holds each sample and rounds it to its bits', () => {
  const Crusher = loadWorklet('crusher');
  const c = new Crusher();
  c.params = { rateHz: new Float32Array([SAMPLE_RATE / 4]), bits: new Float32Array([3]) };
  const input = Float32Array.from({ length: BLOCK * 2 }, (_, i) => Math.sin(i / 7) * 0.9);
  const y = render(c, (BLOCK * 2) / SAMPLE_RATE, input);
  // Held for four samples at a time.
  for (let i = 1; i < 4; i++) assert.strictEqual(y[i], y[0]);
  // Three bits: every value a multiple of 1/4.
  for (const v of y) assert.ok(Math.abs(v * 4 - Math.round(v * 4)) < 1e-9, `${v} is not on the 3-bit grid`);
});
