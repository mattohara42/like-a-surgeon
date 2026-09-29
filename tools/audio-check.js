#!/usr/bin/env node
// End-to-end audio check (docs/m4-architecture.md section 8). Opens the
// real app in headless Chromium, starts the audio engine, and measures what
// actually leaves the master chain:
//
//   loud      a loud input (four full-scale square waves) at full volume
//             stays under the safety knee, so the safety stage leaves it
//             untouched
//   extreme   sixteen full-scale square waves at full volume still stay
//             under CONFIG.audio.master.peakCeiling
//   worklets  each AudioWorklet processor loads and makes audible sound
//   mute      muting silences the output
//
// It runs twice: against the dev server (http) and against dist/ from
// file://, the offline release, which is the case that needs the data: URL
// worklet loading (A267). Run `npm run build` first.
//
// Measurement uses a real, running AudioContext and an AnalyserNode on the
// engine's output, polled over time. An OfflineAudioContext can finish
// rendering before port messages reach a processor, which made the step 1
// smoke test silent; a real-time context has no such race.
//
// Needs Playwright, which is not a project dependency (the app has none).
// Not run in CI for that reason. Run: npm run audio:check

import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CONFIG } from '../config.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8791;
const M = CONFIG.audio.master;

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    try {
      const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
      return await import(pathToFileURL(join(globalRoot, 'playwright', 'index.mjs')).href);
    } catch {
      console.error('audio-check needs Playwright: npm install --no-save playwright');
      process.exit(2);
    }
  }
}

// Runs inside the page. Returns peaks measured at the engine's output.
async function measure(volumeDefault) {
  const audio = window.__audio;
  const ctx = await audio.start();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  audio.output.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  const peakOver = async (ms) => {
    let peak = 0;
    const end = performance.now() + ms;
    while (performance.now() < end) {
      analyser.getFloatTimeDomainData(buf);
      for (const x of buf) {
        if (!Number.isFinite(x)) return NaN;
        peak = Math.max(peak, Math.abs(x));
      }
      await new Promise((r) => setTimeout(r, 10));
    }
    return peak;
  };
  const settle = () => new Promise((r) => setTimeout(r, 150));

  const results = { state: ctx.state };
  audio.setMuted(false);
  audio.setVolume(1);

  // Four full-scale square waves summed is louder than any demo should
  // send; sixteen is far past anything plausible.
  const squares = (count) =>
    Array.from({ length: count }, (_, i) => {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = [55, 82.4, 110, 164.8][i % 4];
      o.connect(audio.input);
      o.start();
      return o;
    });
  let playing = squares(4);
  results.loud = await peakOver(1500);

  // Mute, with the same loud input still playing.
  audio.setMuted(true);
  await settle();
  results.muted = await peakOver(400);
  audio.setMuted(false);
  playing.forEach((o) => o.stop());
  await settle();

  playing = squares(16);
  results.extreme = await peakOver(1500);
  playing.forEach((o) => o.stop());
  await settle();

  // Each worklet: one sound, measured on its own.
  const play = {
    voice303: (port, t) => {
      port.postMessage({ type: 'note', time: t, note: 45, gate: true, accent: true, slide: false });
      port.postMessage({ type: 'note', time: t + 0.4, gate: false });
    },
    drum808: (port, t) => port.postMessage({ type: 'hit', time: t, lane: 'bd', params: {} }),
    drum909: (port, t) => port.postMessage({ type: 'hit', time: t, lane: 'bd', params: {} }),
  };
  results.worklets = {};
  for (const [name, send] of Object.entries(play)) {
    const node = new AudioWorkletNode(ctx, name, { numberOfInputs: 0, outputChannelCount: [1] });
    node.connect(audio.input);
    send(node.port, ctx.currentTime + 0.05);
    results.worklets[name] = await peakOver(700);
    node.disconnect();
  }
  audio.setVolume(volumeDefault);
  return results;
}

function check(label, results) {
  const failures = [];
  const ok = (cond, text) => {
    console.log(`  ${cond ? 'PASS' : 'FAIL'} ${text}`);
    if (!cond) failures.push(`${label}: ${text}`);
  };
  ok(results.state === 'running', `context running (${results.state})`);
  const knee = M.peakCeiling * M.safetyKnee;
  ok(results.loud > 0 && results.loud <= knee, `loud input at full volume peaks at ${results.loud.toFixed(3)}, under the safety knee ${knee}`);
  ok(results.extreme > 0 && results.extreme <= M.peakCeiling, `extreme input at full volume peaks at ${results.extreme.toFixed(3)}, ceiling ${M.peakCeiling}`);
  ok(results.muted < 1e-3, `mute silences the output (peak ${results.muted.toFixed(5)})`);
  for (const [name, peak] of Object.entries(results.worklets)) {
    ok(peak > 0.01 && peak <= M.peakCeiling, `${name} loads and sounds (peak ${peak.toFixed(3)})`);
  }
  return failures;
}

async function run(browser, label, url) {
  console.log(`${label}: ${url}`);
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__audio && window.__graph, null, { timeout: 20000 });
  const results = await page.evaluate(measure, M.volumeDefault);
  await page.close();
  const failures = check(label, results);
  for (const e of errors) failures.push(`${label}: page error: ${e}`);
  return failures;
}

const { chromium } = await loadPlaywright();
if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
  console.error('dist/ is missing: run npm run build first');
  process.exit(2);
}
const server = spawn(process.execPath, [join(ROOT, 'tools', 'serve.js'), String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
let failures = [];
try {
  failures = failures.concat(await run(browser, 'dev', `http://localhost:${PORT}/`));
  failures = failures.concat(await run(browser, 'release', pathToFileURL(join(ROOT, 'dist', 'index.html')).href));
} finally {
  await browser.close();
  server.kill();
}
if (failures.length) {
  console.error(`\n${failures.length} failure(s):\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('\nAll audio checks passed.');
