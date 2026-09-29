// The master chain's safety curve (audio/engine.js): no output above the
// ceiling for any input, and no change at all below the knee.
import assert from 'node:assert';
import { test } from 'node:test';
import { CONFIG } from '../config.js';
import { safetyCurve, volumeGain } from '../audio/engine.js';

const M = CONFIG.audio.master;

test('safety curve never exceeds the ceiling', () => {
  const curve = safetyCurve();
  const peak = Math.max(...curve.map(Math.abs));
  assert.ok(peak <= M.peakCeiling, `curve peak ${peak} is over ${M.peakCeiling}`);
});

test('safety curve is the identity below the knee', () => {
  const curve = safetyCurve();
  const n = curve.length;
  const knee = M.peakCeiling * M.safetyKnee;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    if (Math.abs(x) <= knee) assert.ok(Math.abs(curve[i] - x) < 1e-6, `curve changes x=${x}`);
  }
});

test('safety curve is odd and rises monotonically', () => {
  const curve = safetyCurve();
  for (let i = 1; i < curve.length; i++) assert.ok(curve[i] >= curve[i - 1], `falls at ${i}`);
  for (let i = 0; i < curve.length; i++) assert.ok(Math.abs(curve[i] + curve[curve.length - 1 - i]) < 1e-6);
});

test('volume maps 0..1 onto 0..volumeMaxGain', () => {
  assert.strictEqual(volumeGain(0), 0);
  assert.strictEqual(volumeGain(1), M.volumeMaxGain);
  assert.ok(volumeGain(0.5) < M.volumeMaxGain / 2, 'the curve is below linear in the middle');
});
