// Computes screen positions for every node: a left-to-right time axis with
// lineage lanes (CLAUDE.md A5), plus a machine substrate -- a floor that
// recedes *below* the lanes rather than a band above them, so a machine's
// influence can be drawn rising out of it (see docs/m2-architecture.md and
// ASSUMPTIONS.md A43).
//
// Nothing here is sized off a fixed roster. Lane heights grow with however
// many rows the interval-packing step actually needs, the time axis spans
// whatever range the loaded nodes cover, and lanes nothing has been written
// into yet are dropped rather than drawn empty.

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
//
// The interval packed is the item's *label footprint* -- the marker plus
// room for its name -- not its career span. Packing career spans looks
// correct and is not: `endYear` for anyone still active is the current
// year, so every living artist overlaps every other one, every lane needs
// one row per artist, and the result is a vertical column of names with an
// unused time axis beside it. The career span is still drawn, as the faint
// orbital track in nodes.js; it just isn't what decides rows.
function labelFootprintYears(item) {
  const { pxPerYear } = CONFIG.layout;
  const { labelCharPx, labelMinPx } = CONFIG.layout;
  const widthPx = Math.max(labelMinPx, (item.name?.length ?? 8) * labelCharPx);
  return widthPx / pxPerYear;
}

function packIntoRows(items) {
  const sorted = [...items].sort((a, b) => a.startYear - b.startYear);
  const rowEnds = [];
  const rowOf = new Map();
  for (const item of sorted) {
    // Labels are centred over their marker (nodes.js), so the footprint
    // straddles the start year rather than trailing it.
    const half = labelFootprintYears(item) / 2;
    const start = item.startYear - half;
    const end = item.startYear + half;
    let row = rowEnds.findIndex((rowEnd) => rowEnd <= start);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(end);
    } else {
      rowEnds[row] = end;
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

  const { axisHeight, laneHeight, laneGap, laneTopPadding, nodeRowHeight, dropEmptyLanes } = CONFIG.layout;
  const substrate = CONFIG.substrate;

  const positions = new Map();
  let y = axisHeight;

  const lanes = [];
  for (const lineage of LINEAGE_ORDER) {
    const laneNodes = positioned.filter((n) => n.kind !== 'machine' && n.lineage === lineage);
    if (dropEmptyLanes && laneNodes.length === 0) continue;

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

  // The floor. Machines sit partway down it so the receding rules read
  // both behind and in front of them.
  const horizonY = y + substrate.gap;
  const machines = positioned.filter((n) => n.kind === 'machine');
  const machinePack = packIntoRows(machines);
  const floorY = horizonY + substrate.depth * 0.56;

  for (const node of machines) {
    const row = machinePack.rowOf.get(node.id);
    positions.set(node.id, {
      x1: timeScale.toX(node.startYear),
      x2: timeScale.toX(node.endYear),
      y: floorY + row * substrate.machineRowHeight,
      band: 'machine',
      row,
    });
  }

  return {
    timeScale,
    minYear,
    maxYear,
    positions,
    substrate: {
      horizonY,
      depth: substrate.depth,
      floorY,
      rowCount: machinePack.rowCount,
      // Vanishing point, in content coordinates.
      vanishX: timeScale.totalWidth / 2,
    },
    lanes,
    totalWidth: timeScale.totalWidth,
    totalHeight: horizonY + substrate.depth + machinePack.rowCount * substrate.machineRowHeight,
  };
}
