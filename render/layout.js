// Computes screen positions for every node: a left-to-right time axis with
// lineage lanes (CLAUDE.md A5), plus a dedicated machine band (see
// docs/m2-architecture.md for why machines don't share a lineage lane).
//
// Nothing here is sized off a fixed roster. Lane/band heights grow with
// however many rows the interval-packing step actually needs, and the time
// axis spans whatever range the loaded nodes cover.

import { CONFIG } from '../config.js';

const LINEAGE_ORDER = Object.keys(CONFIG.colors.lineage);

function makeTimeScale(minYear, maxYear) {
  const { marginYears, pxPerYear } = CONFIG.layout;
  const year0 = minYear - marginYears;
  const yearEnd = maxYear + marginYears;
  return {
    year0,
    yearEnd,
    toX: (year) => (year - year0) * pxPerYear,
    toYear: (x) => x / pxPerYear + year0,
    totalWidth: (yearEnd - year0) * pxPerYear,
  };
}

// Greedy interval-graph row packing: sorts by start year, places each item
// in the first row whose last-placed end year doesn't overlap it, opening a
// new row only when none exists. O(n * rows), fine at every size this
// project will reach.
function packIntoRows(items) {
  const sorted = [...items].sort((a, b) => a.startYear - b.startYear);
  const rowEnds = [];
  const rowOf = new Map();
  for (const item of sorted) {
    let row = rowEnds.findIndex((end) => end <= item.startYear);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(item.endYear);
    } else {
      rowEnds[row] = item.endYear;
    }
    rowOf.set(item.id, row);
  }
  return { rowOf, rowCount: Math.max(1, rowEnds.length) };
}

export function computeLayout(nodes) {
  const positioned = nodes.filter((n) => n.startYear !== null);
  const years = positioned.flatMap((n) => [n.startYear, n.endYear]);
  const minYear = years.length ? Math.min(...years) : new Date().getFullYear() - 1;
  const maxYear = years.length ? Math.max(...years) : new Date().getFullYear();
  const timeScale = makeTimeScale(minYear, maxYear);

  const { axisHeight, machineBandHeight, machineBandGap, laneHeight, laneGap, laneTopPadding, nodeRowHeight } =
    CONFIG.layout;

  const machines = positioned.filter((n) => n.kind === 'machine');
  const machinePack = packIntoRows(machines);

  const positions = new Map();
  let y = axisHeight;

  const machineBandTop = y;
  const machineBandContentHeight = Math.max(
    machineBandHeight,
    machinePack.rowCount * nodeRowHeight + laneTopPadding,
  );
  for (const node of machines) {
    const row = machinePack.rowOf.get(node.id);
    positions.set(node.id, {
      x1: timeScale.toX(node.startYear),
      x2: timeScale.toX(node.endYear),
      y: machineBandTop + laneTopPadding / 2 + row * nodeRowHeight + nodeRowHeight / 2,
      band: 'machine',
      row,
    });
  }
  y += machineBandContentHeight + machineBandGap;

  const lanes = [];
  for (const lineage of LINEAGE_ORDER) {
    const laneNodes = positioned.filter((n) => n.kind !== 'machine' && n.lineage === lineage);
    const pack = packIntoRows(laneNodes);
    const contentHeight = Math.max(laneHeight, pack.rowCount * nodeRowHeight + laneTopPadding);
    const laneTop = y;

    for (const node of laneNodes) {
      const row = pack.rowOf.get(node.id);
      positions.set(node.id, {
        x1: timeScale.toX(node.startYear),
        x2: timeScale.toX(node.endYear),
        y: laneTop + laneTopPadding / 2 + row * nodeRowHeight + nodeRowHeight / 2,
        band: lineage,
        row,
      });
    }

    lanes.push({ lineage, y: laneTop, height: contentHeight, rowCount: pack.rowCount });
    y += contentHeight + laneGap;
  }

  return {
    timeScale,
    minYear,
    maxYear,
    positions,
    machineBand: { y: machineBandTop, height: machineBandContentHeight, rowCount: machinePack.rowCount },
    lanes,
    totalWidth: timeScale.totalWidth,
    totalHeight: y,
  };
}
