#!/usr/bin/env node
// End-to-end audio check (docs/m4-architecture.md section 8). Opens the
// real app in headless Chromium, starts the audio engine, and measures what
// actually leaves the master chain:
//
//   extreme   sixteen full-scale square waves at full volume still stay
//             under CONFIG.audio.master.peakCeiling
//   mute      muting silences the output
//   worklets  each AudioWorklet processor loads and makes audible sound
//   demos     every playable demo, opened through its panel as a reader
//             would, with every slider at the top and every pad hit, at
//             full volume, and in every version it offers (A/B, chopped,
//             through an effect): it sounds, and stays under the safety knee so
//             the safety stage never colours it. At the default volume it
//             is still clearly audible. Closing the panel silences it.
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
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CONFIG } from '../config.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8791;
const M = CONFIG.audio.master;
// A demo at the default volume, default sliders, has to peak at least this
// high, about -26 dBFS. Quieter than that, a reader turns the laptop up and
// the next YouTube link is too loud (A271).
const AUDIBLE_AT_DEFAULT = 0.05;

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

  // Sixteen full-scale square waves summed is far past anything a demo
  // could send.
  const squares = (count) =>
    Array.from({ length: count }, (_, i) => {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = [55, 82.4, 110, 164.8][i % 4];
      o.connect(audio.input);
      o.start();
      return o;
    });
  const playing = squares(16);
  results.extreme = await peakOver(1500);

  // Mute, with the same input still playing.
  audio.setMuted(true);
  await settle();
  results.muted = await peakOver(400);
  audio.setMuted(false);
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
  analyser.disconnect();
  return results;
}

// Where each playable demo can be opened: the first edge, else machine,
// that names it. Read from disk, the same files the app is built from.
function demoHosts() {
  const read = (shard) =>
    readdirSync(join(ROOT, 'data', shard))
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync(join(ROOT, 'data', shard, f), 'utf8')));
  const hosts = [];
  for (const demo of read('demos')) {
    if (demo.status === 'draft') continue;
    const edge = read('edges').find((e) => e.demoId === demo.id);
    const machine = read('machines').find((m) => m.demoId === demo.id);
    if (edge) hosts.push({ demo: demo.id, kind: 'edge', id: edge.id });
    else if (machine) hosts.push({ demo: demo.id, kind: 'node', id: machine.id });
    else hosts.push({ demo: demo.id, kind: null });
  }
  return hosts;
}

// Runs inside the page: the peak at the engine's output over `ms`.
async function pagePeak(ms) {
  const audio = window.__audio;
  const analyser = audio.context.createAnalyser();
  analyser.fftSize = 2048;
  audio.output.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  let peak = 0;
  const end = performance.now() + ms;
  while (performance.now() < end) {
    analyser.getFloatTimeDomainData(buf);
    for (const x of buf) peak = Math.max(peak, Math.abs(x));
    await new Promise((r) => setTimeout(r, 10));
  }
  analyser.disconnect();
  return peak;
}

// Opens a demo's panel the way a reader would: fly to its edge or machine
// and click it, then press play and every pad.
async function measureDemo(page, host, volume, loudest) {
  const attr = host.kind === 'edge' ? 'data-edge-id' : 'data-node-id';
  await page.evaluate(({ kind, id }) => (kind === 'edge' ? window.__graph.focusEdge(id) : window.__graph.focusNode(id)), host);
  await page.waitForTimeout(1200);
  await page.evaluate(({ attr, id }) => document.querySelector(`[${attr}="${id}"]`)?.dispatchEvent(new MouseEvent('click', { bubbles: true })), { attr, id: host.id });
  await page.waitForSelector('.demo', { timeout: 5000 });
  await page.evaluate((v) => window.__audio.setVolume(v), volume);
  if (loudest) {
    await page.evaluate(() =>
      document.querySelectorAll('.demo-control input:not(.demo-volume)').forEach((input) => {
        input.value = input.max;
        input.dispatchEvent(new Event('input'));
      }),
    );
  }
  if (await page.locator('.demo-play').count()) await page.click('.demo-play');
  const pads = page.locator('.demo-pad');
  for (let i = 0; i < (await pads.count()); i++) await pads.nth(i).click();
  let peak = await page.evaluate(pagePeak, 2500);
  // Every other version, at its loudest. A switch can wait for the next
  // bar, which is over 3 s at the slowest demo tempo, so each is measured
  // for longer than that.
  if (loudest) {
    const sides = page.locator('.demo-side');
    for (let i = 1; i < (await sides.count()); i++) {
      await sides.nth(i).click();
      peak = Math.max(peak, await page.evaluate(pagePeak, 4500));
    }
  }
  // Closing the panel must stop it.
  await page.click('.panel-close');
  await page.waitForTimeout(400);
  const afterClose = await page.evaluate(pagePeak, 500);
  return { peak, afterClose };
}

function check(label, results) {
  const failures = [];
  const ok = (cond, text) => {
    console.log(`  ${cond ? 'PASS' : 'FAIL'} ${text}`);
    if (!cond) failures.push(`${label}: ${text}`);
  };
  ok(results.state === 'running', `context running (${results.state})`);
  ok(results.extreme > 0 && results.extreme <= M.peakCeiling, `extreme input at full volume peaks at ${results.extreme.toFixed(3)}, ceiling ${M.peakCeiling}`);
  ok(results.muted < 1e-3, `mute silences the output (peak ${results.muted.toFixed(5)})`);
  for (const [name, peak] of Object.entries(results.worklets)) {
    ok(peak > 0.01 && peak <= M.peakCeiling, `${name} loads and sounds (peak ${peak.toFixed(3)})`);
  }
  const knee = M.peakCeiling * M.safetyKnee;
  for (const d of results.demos) {
    if (!d.host) {
      ok(false, `${d.demo}: no edge or machine opens it`);
      continue;
    }
    ok(d.loud.peak > 0.01 && d.loud.peak <= knee, `${d.demo} at its loudest, full volume, peaks at ${d.loud.peak.toFixed(3)}, under the knee ${knee}`);
    ok(d.normal.peak >= AUDIBLE_AT_DEFAULT, `${d.demo} at default volume peaks at ${d.normal.peak.toFixed(3)} (audible: at least ${AUDIBLE_AT_DEFAULT})`);
    ok(d.loud.afterClose < 1e-3, `${d.demo} stops when its panel closes (peak ${d.loud.afterClose.toFixed(5)})`);
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
  await page.evaluate(() => document.querySelector('.welcome-skip')?.click());
  const results = await page.evaluate(measure, M.volumeDefault);
  results.demos = [];
  for (const host of demoHosts()) {
    if (!host.kind) {
      results.demos.push({ demo: host.demo, host: null });
      continue;
    }
    const loud = await measureDemo(page, host, 1, true);
    const normal = await measureDemo(page, host, M.volumeDefault, false);
    results.demos.push({ demo: host.demo, host, loud, normal });
  }
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
