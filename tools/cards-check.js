#!/usr/bin/env node
// End-to-end check of Cards, the phone version (docs/cards-architecture.md
// section 5, step 4). Opens the app in headless Chromium at phone size and
// walks it as a reader would:
//
//   opening    a narrow screen opens a card, on a well-connected record,
//              with an address, and nothing scrolls sideways
//   hop        a connection row opens its connection card, whose Go button
//              leads on to the far end
//   back       the Back button steps back card by card and is off on the
//              first card
//   random     Random opens a different card
//   register   the reading-level switch redraws the card and remembers
//   addresses  a card's address opens that card; a bad one falls back
//   switch     a laptop-width screen gets the map; ?view= overrides both
//   every      every record and every connection opens as a card with no
//              page error and no sideways scroll
//
// It runs against the dev server and against dist/ from file://. Run
// `npm run build` first. Like audio-check, it needs Playwright, which is not
// a project dependency, so it is not run in CI. Run: npm run cards:check

import { spawn, execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CONFIG } from '../config.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8792;
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 };
const LAPTOP = { viewport: { width: 1280, height: 800 } };

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    try {
      const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
      return await import(pathToFileURL(join(globalRoot, 'playwright', 'index.mjs')).href);
    } catch {
      console.error('cards-check needs Playwright: npm install --no-save playwright');
      process.exit(2);
    }
  }
}

// Every card address, read from the data tree. An edge touching a record
// with no start year is left out, because render/loader.js drops it for
// the map and so it has no card either (BACKLOG).
const START_FIELD = { artists: 'activeFrom', machines: 'releasedYear', scenes: 'yearFrom', labels: 'foundedYear' };
function allRoutes() {
  const read = (shard) =>
    readdirSync(join(ROOT, 'data', shard))
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync(join(ROOT, 'data', shard, f), 'utf8')));
  const routes = [];
  const undated = new Set();
  for (const [shard, word] of [['artists', 'artist'], ['machines', 'machine'], ['scenes', 'scene'], ['labels', 'label']]) {
    for (const record of read(shard)) {
      routes.push(`#/${word}/${encodeURIComponent(record.id)}`);
      if (record[START_FIELD[shard]] == null) undated.add(record.id);
    }
  }
  for (const edge of read('edges')) {
    if (!undated.has(edge.from) && !undated.has(edge.to)) routes.push(`#/edge/${encodeURIComponent(edge.id)}`);
  }
  return routes;
}

async function run(browser, label, base) {
  console.log(`${label}: ${base}`);
  const failures = [];
  const fail = (text) => failures.push(`${label}: ${text}`);
  const errors = [];

  const context = await browser.newContext(PHONE);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  const shown = () => page.evaluate(() => document.getElementById('cards')?.dataset.route ?? null);
  const waitShown = (route) =>
    page.waitForFunction((r) => {
      const now = document.getElementById('cards')?.dataset.route;
      return r ? now === r : Boolean(now);
    }, route, { timeout: 8000 });
  const sideways = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  const count = () => page.evaluate(() => Number(document.querySelector('.cards-count-n')?.textContent));
  const backDisabled = () => page.evaluate(() => document.querySelector('.cards-bar .cards-button').disabled);
  const clickAndWait = async (selector) => {
    const before = await shown();
    await page.tap(selector);
    await page.waitForFunction((b) => {
      const now = document.getElementById('cards')?.dataset.route;
      return now && now !== b;
    }, before, { timeout: 8000 });
    return shown();
  };

  // opening
  await page.goto(base);
  await waitShown(null);
  const first = await shown();
  if (!/^#\/(artist|machine|scene|label)\//.test(first)) fail(`opening card has no node address (${first})`);
  if ((await page.evaluate(() => location.hash)) !== first) fail('the address does not match the opening card');
  if (!((await count()) >= CONFIG.cards.openingMinConnections)) fail(`opening card has ${await count()} connections`);
  if (await sideways()) fail('opening card scrolls sideways');
  if (!(await backDisabled())) fail('Back is on at the first card');
  const hidden = await page.evaluate(() => getComputedStyle(document.getElementById('app')).display);
  if (hidden !== 'none') fail('the map is still drawn under the cards');
  // A phone is not offered the full map (A313).
  if (await page.evaluate(() => document.querySelector('.cards-foot'))) fail('a phone is offered the full map');

  // hop: a connection row, then Go on to the far end
  const edgeRoute = await clickAndWait('.cards .panel-body .link-row');
  if (!edgeRoute.startsWith('#/edge/')) fail(`a connection row opened ${edgeRoute}`);
  const goCount = await page.evaluate(() => document.querySelectorAll('.cards-go').length);
  if (goCount < 1) fail('the connection card has no Go button');
  const far = await clickAndWait('.cards-go');
  if (!/^#\/(artist|machine|scene|label)\//.test(far) || far === first) fail(`Go led to ${far}, from ${first}`);

  // back
  await page.tap('.cards-bar .cards-button');
  await waitShown(edgeRoute);
  await page.tap('.cards-bar .cards-button');
  await waitShown(first);
  if (!(await backDisabled())) fail('Back is still on after stepping back to the first card');

  // random
  const random = await clickAndWait('.cards-random');
  if (random === first || !random.startsWith('#/')) fail(`Random gave ${random}`);

  // register
  const registerLabels = await page.evaluate(() => [...document.querySelectorAll('.cards-register')].map((b) => b.getAttribute('aria-pressed')));
  if (registerLabels.length >= 2) {
    const other = registerLabels.indexOf('false');
    await page.tap(`.cards-register >> nth=${other}`);
    await waitShown(random);
    const pressed = await page.evaluate((i) => document.querySelectorAll('.cards-register')[i].getAttribute('aria-pressed'), other);
    if (pressed !== 'true') fail('the reading-level switch did not take');
    await page.tap(`.cards-register >> nth=${other === 0 ? 1 : 0}`);
    await waitShown(random);
  }

  // addresses
  const known = '#/edge/e-kraftwerk-planetrock';
  await page.goto(`${base}${known}`);
  await waitShown(known);
  await page.goto(`${base}#/artist/nobody-at-all`);
  await waitShown(null);
  if ((await shown()) === '#/artist/nobody-at-all') fail('a bad address opened a card');

  // every card
  for (const route of allRoutes()) {
    await page.evaluate((r) => { location.hash = r; }, route);
    try {
      await waitShown(route);
    } catch {
      fail(`${route} did not open (${await shown()})`);
      continue;
    }
    if (await sideways()) fail(`${route} scrolls sideways`);
  }
  await context.close();

  // switch
  const laptop = await browser.newContext(LAPTOP);
  const lp = await laptop.newPage();
  lp.on('pageerror', (e) => errors.push(e.message));
  await lp.goto(base);
  await lp.waitForFunction(() => window.__graph, null, { timeout: 20000 });
  if (await lp.evaluate(() => document.documentElement.classList.contains('cards-view'))) fail('a laptop got cards');
  const sep = base.includes('?') ? '&' : '?';
  await lp.goto(`${base}${sep}view=cards`);
  await lp.waitForFunction(() => document.getElementById('cards')?.dataset.route, null, { timeout: 8000 });
  if (!(await lp.evaluate(() => document.querySelector('.cards-foot')))) fail('laptop cards lost the way to the map');
  await laptop.close();
  // A phone held sideways reads as wide, but its screen is a phone's.
  const sidewaysPhone = await browser.newContext({ ...PHONE, viewport: { width: 844, height: 390 }, screen: { width: 390, height: 844 } });
  const sp = await sidewaysPhone.newPage();
  await sp.goto(base);
  await sp.waitForFunction(() => document.getElementById('cards')?.dataset.route, null, { timeout: 8000 })
    .catch(() => fail('a phone held sideways got the map'));
  await sidewaysPhone.close();
  const phoneMap = await browser.newContext(PHONE);
  const pm = await phoneMap.newPage();
  await pm.goto(`${base}${sep}view=map`);
  await pm.waitForFunction(() => window.__graph, null, { timeout: 20000 });
  await phoneMap.close();

  for (const e of errors) fail(`page error: ${e}`);
  return failures;
}

const { chromium } = await loadPlaywright();
if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
  console.error('dist/ is missing: run npm run build first');
  process.exit(2);
}
const server = spawn(process.execPath, [join(ROOT, 'tools', 'serve.js'), String(PORT)], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch();
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
console.log('\nAll cards checks passed.');
