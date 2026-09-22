// The year cursor, and the transport that drives it.
//
// This is the timeline as an instrument, not a scrollbar with a graph
// attached. Dragging it is how the map performs its own history: material
// before the cursor is present, material after it is visibly not here yet.
// It is the first thing anyone touches, which is why it gets the bottom of
// the screen rather than a corner.
//
// Two halves: an SVG cursor living in content coordinates inside the
// viewport transform, and an HTML transport bar that stays put.

import { CONFIG } from '../config.js';
import { svgEl, setAttrs } from './svg.js';
import { colorFor } from './gradients.js';

export function createCursorLayer(layout) {
  const g = svgEl('g', { class: 'cursor-layer' });
  const wash = svgEl('rect', {
    class: 'cursor-wash',
    y: 0,
    height: layout.totalHeight,
    fill: 'url(#cursor-wash-gradient)',
  });
  const line = svgEl('line', {
    class: 'cursor-line',
    y1: 0,
    y2: layout.totalHeight,
    stroke: CONFIG.colors.cursor,
    'stroke-opacity': 0.55,
  });
  g.append(wash, line);
  return g;
}

export function createCursorDefs() {
  const grad = svgEl('linearGradient', { id: 'cursor-wash-gradient', x1: '0', y1: '0', x2: '1', y2: '0' });
  grad.append(
    svgEl('stop', { offset: '0%', 'stop-color': CONFIG.colors.cursor, 'stop-opacity': 0 }),
    svgEl('stop', { offset: '100%', 'stop-color': CONFIG.colors.cursor, 'stop-opacity': 0.07 }),
  );
  return [grad];
}

export function updateCursor(cursorG, layout, year, scale) {
  const x = layout.timeScale.toX(year);
  // Capped: counter-scaling this all the way down turns the wash into a
  // wide grey slab lying across the map at low zoom, which reads as a
  // rendering fault rather than as light behind the cursor.
  const washWidth = Math.min(
    CONFIG.transport.cursorWashMaxContentPx,
    CONFIG.transport.cursorWashWidth / scale,
  );
  setAttrs(cursorG.querySelector('.cursor-wash'), { x: x - washWidth, width: washWidth });
  setAttrs(cursorG.querySelector('.cursor-line'), {
    x1: x, x2: x, 'stroke-width': 1.4 / scale,
  });
}

// Years where something actually arrives, so the scrubber reads as a score
// rather than an empty slider.
function arrivalsByYear(nodes, edges) {
  const byYear = new Map();
  const add = (year, label, color) => {
    if (year === null || year === undefined) return;
    if (!byYear.has(year)) byYear.set(year, { labels: [], color });
    byYear.get(year).labels.push(label);
  };
  for (const node of nodes) add(node.startYear, node.name, colorFor(node.lineage));
  for (const edge of edges) {
    add(edge.year, `${edge.from.name} → ${edge.to.name}`, colorFor(edge.to.lineage));
  }
  return byYear;
}

export function createTransport(root, layout, nodes, edges, onYearChange) {
  const minYear = layout.timeScale.year0;
  const maxYear = layout.timeScale.yearEnd;
  const arrivals = arrivalsByYear(nodes, edges);

  root.innerHTML = `
    <button id="transport-play" aria-label="Play">&#9654;</button>
    <div id="transport-scrub" role="slider" tabindex="0"
         aria-label="Year" aria-valuemin="${minYear}" aria-valuemax="${maxYear}">
      <div class="track"></div><div class="elapsed"></div><div class="head"></div>
    </div>
    <div id="transport-year"></div>
    <div id="transport-arrivals"></div>`;

  const playBtn = root.querySelector('#transport-play');
  const scrub = root.querySelector('#transport-scrub');
  const elapsed = scrub.querySelector('.elapsed');
  const head = scrub.querySelector('.head');
  const yearOut = root.querySelector('#transport-year');
  const arrivalsOut = root.querySelector('#transport-arrivals');

  const fractionOf = (year) => (year - minYear) / Math.max(1, maxYear - minYear);

  for (const [year, { color }] of arrivals) {
    const pip = document.createElement('div');
    pip.className = 'pip';
    pip.style.left = `${fractionOf(year) * 100}%`;
    pip.style.background = color;
    pip.style.boxShadow = `0 0 7px 1px ${color}`;
    scrub.appendChild(pip);
  }

  let year = maxYear;
  let timer = null;

  function setYear(next) {
    const clamped = Math.max(minYear, Math.min(maxYear, Math.round(next)));
    if (clamped === year) return;
    year = clamped;
    paint();
    onYearChange(year);
  }

  function paint() {
    const pct = `${fractionOf(year) * 100}%`;
    head.style.left = pct;
    elapsed.style.width = pct;
    yearOut.textContent = String(year);
    scrub.setAttribute('aria-valuenow', String(year));
    arrivalsOut.textContent = (arrivals.get(year)?.labels ?? []).join(' · ');
  }

  function yearFromClientX(clientX) {
    const box = scrub.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (clientX - box.left) / box.width));
    return minYear + f * (maxYear - minYear);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    playBtn.innerHTML = '&#9654;';
    playBtn.setAttribute('aria-label', 'Play');
  }

  function play() {
    if (timer) return;
    if (year >= maxYear) setYear(minYear);
    playBtn.innerHTML = '&#10073;&#10073;';
    playBtn.setAttribute('aria-label', 'Pause');
    timer = setInterval(() => {
      if (year >= maxYear) return stop();
      setYear(year + 1);
    }, CONFIG.transport.msPerYear);
  }

  playBtn.addEventListener('click', () => (timer ? stop() : play()));

  let scrubbing = false;
  scrub.addEventListener('pointerdown', (e) => {
    scrubbing = true;
    stop();
    scrub.setPointerCapture(e.pointerId);
    setYear(yearFromClientX(e.clientX));
  });
  scrub.addEventListener('pointermove', (e) => {
    if (scrubbing) setYear(yearFromClientX(e.clientX));
  });
  const endScrub = (e) => {
    scrubbing = false;
    if (scrub.hasPointerCapture?.(e.pointerId)) scrub.releasePointerCapture(e.pointerId);
  };
  scrub.addEventListener('pointerup', endScrub);
  scrub.addEventListener('pointercancel', endScrub);

  scrub.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? CONFIG.transport.shiftStepYears : CONFIG.transport.stepYears;
    if (e.key === 'ArrowLeft') setYear(year - step);
    else if (e.key === 'ArrowRight') setYear(year + step);
    else if (e.key === ' ' || e.key === 'Enter') (timer ? stop() : play());
    else return;
    e.preventDefault();
    stop();
  });

  paint();

  return {
    year: () => year,
    setYear,
    stop,
    // Used when something off the current cursor is selected: the map
    // should never dim the thing you just clicked on.
    ensureVisible(y) {
      if (y !== null && y !== undefined && y > year) setYear(y);
    },
  };
}
