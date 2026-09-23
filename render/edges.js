// Draws one edge. Two shapes, picked by what the edge connects:
//
//   trail - the default. A gently curved line coloured from the source
//           lineage to the target lineage, with a comet travelling along
//           it from cause to effect. A cross-lineage edge gets a second,
//           wider comet in the source colour trailing the first, so a
//           crossing reads as chromatic split without consulting a legend.
//
//   beam  - a machine -> artist edge. A tapered shaft of light rising off
//           the floor and through the horizon (see substrate.js). The
//           machine-as-protagonist argument drawn rather than asserted.
//
// Anchor coordinates are content-space and left for the viewport transform
// to scale (an edge should visibly stretch as you zoom into its span).
// Stroke width and dash length are UI adornments, so they're counter-scaled
// to stay a constant size on screen, same reasoning as nodes.js.

import { CONFIG } from '../config.js';
import { svgEl, setAttrs } from './svg.js';

function scaleDasharray(pattern, scale) {
  if (pattern === 'none') return 'none';
  return pattern
    .split(',')
    .map((n) => Number(n) / scale)
    .join(',');
}

// Small stable hash so the same edge always bows the same direction across
// renders, without needing to store extra state per edge.
function bowSign(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h % 2 === 0 ? 1 : -1;
}

function controlPoint(anchors, edgeId) {
  const dx = anchors.x2 - anchors.x1;
  const dy = anchors.y2 - anchors.y1;
  const dist = Math.hypot(dx, dy);
  const bow = dist * CONFIG.edge.curveBow * bowSign(edgeId);
  const midX = (anchors.x1 + anchors.x2) / 2;
  const midY = (anchors.y1 + anchors.y2) / 2;
  if (dist === 0) return { x: midX, y: midY };
  return { x: midX - (dy / dist) * bow, y: midY + (dx / dist) * bow };
}

function curvePath(anchors, edgeId) {
  const c = controlPoint(anchors, edgeId);
  return `M ${anchors.x1},${anchors.y1} Q ${c.x},${c.y} ${anchors.x2},${anchors.y2}`;
}

// Arc length of the quadratic, by sampling. Deliberately not
// getTotalLength(): that forces a synchronous layout reflow, and edges are
// created and destroyed constantly by viewport culling while panning.
function approxCurveLength(anchors, edgeId, samples = 16) {
  const c = controlPoint(anchors, edgeId);
  let length = 0;
  let px = anchors.x1;
  let py = anchors.y1;
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const mt = 1 - t;
    const x = mt * mt * anchors.x1 + 2 * mt * t * c.x + t * t * anchors.x2;
    const y = mt * mt * anchors.y1 + 2 * mt * t * c.y + t * t * anchors.y2;
    length += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return length;
}

// The shaft rises straight up out of the machine, not diagonally towards
// the artist. A beam that leans reads as a ramp lying across the map; a
// vertical one reads as light, and says the true thing anyway -- the
// machine radiates upward into the music. Which artist in particular is
// what the trail curve drawn on top of it is for.
function beamPath(anchors, scale) {
  const wTop = CONFIG.beam.widthTop / scale;
  const wBottom = CONFIG.beam.widthBottom / scale;
  const x = anchors.x1;              // the machine, on the floor
  const yBottom = anchors.y1;
  const yTop = anchors.y2;           // the artist's lane
  return (
    `M ${x - wTop},${yTop} L ${x + wTop},${yTop} ` +
    `L ${x + wBottom},${yBottom} L ${x - wBottom},${yBottom} Z`
  );
}

function tierAdjustedOpacity(edge) {
  const base = edge.crossLineage ? CONFIG.edge.crossLineageOpacity : CONFIG.edge.opacity;
  return base * (CONFIG.edge.tierOpacity[edge.confidence] ?? 1);
}

export function isBeam(edge) {
  return edge.from.kind === 'machine' && edge.to.kind !== 'machine';
}

export function createEdgeElement(edge, onSelect, onHover) {
  const g = svgEl('g', { class: `edge ${isBeam(edge) ? 'edge-beam' : 'edge-trail'}`, 'data-edge-id': edge.id });

  const hitPath = svgEl('path', { class: 'edge-hit', stroke: 'transparent', fill: 'none' });
  g.appendChild(hitPath);

  // A machine edge gets both: the beam is the light coming off the floor,
  // the trail on top of it is the claim. Beam alone reads as decoration
  // and loses the confidence tier; trail alone loses the whole point of
  // putting machines under the music.
  if (isBeam(edge)) g.appendChild(svgEl('path', { class: 'edge-beam-shape', stroke: 'none' }));

  g.append(
    svgEl('path', { class: 'edge-line', fill: 'none' }),
    svgEl('path', { class: 'edge-comet-ghost', fill: 'none' }),
    svgEl('path', { class: 'edge-comet', fill: 'none' }),
  );

  g.addEventListener('click', () => onSelect(edge));
  g.addEventListener('mouseenter', () => onHover(edge, true));
  g.addEventListener('mouseleave', () => onHover(edge, false));

  return g;
}

// Starts (or restarts) the travelling-light animation on a comet path.
// Culling destroys and recreates elements as they leave and re-enter the
// viewport, so this runs on creation only, and a restart is never visible
// because it happens off screen.
function runComet(path, contentLength, scale, delayMs = 0) {
  const dash = contentLength * CONFIG.edge.comet.lengthFraction;
  const durationMs = (contentLength / CONFIG.edge.comet.contentPxPerSecond) * 1000;
  path.setAttribute('stroke-dasharray', `${dash / scale},${contentLength * 2}`);
  return path.animate(
    [{ strokeDashoffset: dash / scale }, { strokeDashoffset: -contentLength }],
    { duration: Math.max(600, durationMs), iterations: Infinity, easing: 'linear', delay: -delayMs },
  );
}

export function updateEdgeElement(g, edge, anchors, scale, gradientIds) {
  const hitPath = g.querySelector('.edge-hit');
  setAttrs(hitPath, {
    d: curvePath(anchors, edge.id),
    'stroke-width': CONFIG.edge.hitAreaWidth / scale,
  });

  const beamShape = g.querySelector('.edge-beam-shape');
  if (beamShape) {
    setAttrs(beamShape, { d: beamPath(anchors, scale), fill: `url(#${gradientIds.beam})` });
  }

  const d = curvePath(anchors, edge.id);
  const widthFactor = edge.crossLineage ? CONFIG.edge.crossLineageWidthFactor : 1;
  const baseWidth =
    ((CONFIG.edge.strokeWidth[edge.confidence] ?? CONFIG.edge.strokeWidth.consensus) * widthFactor) / scale;
  const baseOpacity = tierAdjustedOpacity(edge);

  const line = g.querySelector('.edge-line');
  setAttrs(line, {
    d,
    stroke: `url(#${gradientIds.trail})`,
    'stroke-width': baseWidth,
    'stroke-dasharray': scaleDasharray(CONFIG.edge.dashArray[edge.confidence] ?? 'none', scale),
    // Round caps turn the asserted tier's short dashes into dots.
    'stroke-linecap': 'round',
    'stroke-opacity': baseOpacity,
  });

  const comet = g.querySelector('.edge-comet');
  const ghost = g.querySelector('.edge-comet-ghost');
  const length = approxCurveLength(anchors, edge.id);

  setAttrs(comet, {
    d,
    stroke: gradientIds.toColor,
    'stroke-width': baseWidth * 1.6,
    'stroke-linecap': 'round',
    'stroke-opacity': edge.crossLineage ? CONFIG.edge.comet.crossLineageOpacity : CONFIG.edge.comet.opacity,
  });

  ghost.style.display = edge.crossLineage ? '' : 'none';
  if (edge.crossLineage) {
    setAttrs(ghost, {
      d,
      stroke: gradientIds.fromColor,
      'stroke-width': baseWidth * CONFIG.edge.comet.ghostWidthFactor,
      'stroke-linecap': 'round',
      'stroke-opacity': CONFIG.edge.comet.ghostOpacity,
    });
  }

  // Only start the animations once per element, not on every pan frame.
  if (!g.__cometRunning) {
    runComet(comet, length, scale);
    if (edge.crossLineage) runComet(ghost, length, scale, CONFIG.edge.comet.ghostDelayMs);
    g.__cometRunning = true;
  } else {
    // Zoom changed the on-screen dash size; keep it constant.
    const dash = (length * CONFIG.edge.comet.lengthFraction) / scale;
    comet.setAttribute('stroke-dasharray', `${dash},${length * 2}`);
    if (edge.crossLineage) ghost.setAttribute('stroke-dasharray', `${dash * 1.4},${length * 2}`);
  }
}

export function setEdgeHovered(g, edge, hovered) {
  g.classList.toggle('edge-hovered', hovered);
  const line = g.querySelector('.edge-line');
  if (!line) return;
  line.setAttribute('stroke-opacity', hovered ? CONFIG.edge.hoverOpacity : tierAdjustedOpacity(edge));
}
