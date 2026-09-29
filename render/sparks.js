// Transient light: effects that play once and remove themselves.
//
//   flare - a node catching fire: a bloom in its lineage's halo and a ring
//           that expands and fades. Used when the year cursor reaches a
//           node (ignition) and when a ripple arrives at one.
//   pulse - a single packet of light running an edge from cause to effect,
//           in the target's colour, along the same curve the edge draws.
//
// Everything lives in content coordinates inside the viewport transform, so
// an effect stays pinned to its node while the camera moves. Sizes are set
// in screen px at the moment an effect starts and are not updated if the
// reader zooms mid-effect: they last under two seconds.
//
// Animations are Web Animations on transform, opacity and dash offset only,
// which every current browser runs off the main thread or close to it. No
// effect plays under prefers-reduced-motion, and a cap on live effects keeps
// a dense year or a well-connected node from flooding the layer.

import { CONFIG } from '../config.js';
import { svgEl } from './svg.js';
import { haloGradientId, colorFor } from './gradients.js';
import { reducedMotion } from './motion.js';


export function createSparks(fxG) {
  const canPlay = () => !reducedMotion() && fxG.childElementCount < CONFIG.sparks.maxLive;

  function removeWhenDone(el, animations) {
    Promise.all(animations.map((a) => a.finished)).then(
      () => el.remove(),
      () => el.remove(),
    );
  }

  function flare(x, y, lineage, scale, delayMs = 0) {
    if (!canPlay()) return;
    const { ringRadiusPx, bloomRadiusPx, coreRadiusPx, durationMs, ringWidthPx } = CONFIG.sparks.flare;
    const g = svgEl('g', { class: 'spark-flare', transform: `translate(${x},${y})` });
    // Drawn at their final size and scaled up into it, since CSS transforms
    // animate everywhere and the `r` attribute does not.
    const bloom = svgEl('circle', { r: bloomRadiusPx / scale, fill: `url(#${haloGradientId(lineage)})` });
    const ring = svgEl('circle', {
      r: ringRadiusPx / scale,
      fill: 'none',
      stroke: colorFor(lineage),
      'stroke-width': ringWidthPx,
      'vector-effect': 'non-scaling-stroke',
    });
    // A white-hot point at the centre, gone in the first third: the spark.
    const core = svgEl('circle', { r: coreRadiusPx / scale, fill: CONFIG.sparks.hotColor });
    g.append(bloom, ring, core);
    fxG.appendChild(g);
    const timing = { duration: durationMs, delay: delayMs, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'both' };
    removeWhenDone(g, [
      bloom.animate(
        // Starts invisible, so a delayed flare holds nothing on screen
        // while it waits (fill: both shows the first frame).
        [
          { transform: 'scale(0.2)', opacity: 0 },
          { transform: 'scale(0.3)', opacity: 0.95, offset: 0.08 },
          { transform: 'scale(1)', opacity: 0 },
        ],
        timing,
      ),
      ring.animate(
        [
          { transform: 'scale(0.15)', opacity: 0 },
          { transform: 'scale(0.2)', opacity: 0.9, offset: 0.08 },
          { transform: 'scale(1)', opacity: 0 },
        ],
        timing,
      ),
      core.animate(
        [
          { transform: 'scale(0.2)', opacity: 0 },
          { transform: 'scale(1)', opacity: 1, offset: 0.06 },
          { transform: 'scale(0.4)', opacity: 0, offset: 0.35 },
          { transform: 'scale(0.4)', opacity: 0 },
        ],
        timing,
      ),
    ]);
  }

  // `d` and `length` come from the edge's own geometry (edges.js), so the
  // pulse follows the drawn curve exactly.
  function pulse(d, length, color, scale, delayMs = 0, durationMs = CONFIG.sparks.pulse.durationMs) {
    if (!canPlay()) return;
    const { lengthPx, widthPx, glowWidthFactor, glowOpacity } = CONFIG.sparks.pulse;
    const dash = lengthPx / scale;
    // A wide, soft stroke in the edge's colour under a narrow white one:
    // a hot core with a coloured glow, without a blur filter.
    const stroke = (width, colour, opacity) =>
      svgEl('path', {
        d,
        fill: 'none',
        stroke: colour,
        'stroke-opacity': opacity,
        'stroke-width': width / scale,
        'stroke-linecap': 'round',
        'stroke-dasharray': `${dash},${length + dash * 2}`,
        'stroke-dashoffset': dash,
      });
    const g = svgEl('g', { class: 'spark-pulse' });
    const glow = stroke(widthPx * glowWidthFactor, color, glowOpacity);
    const hot = stroke(widthPx, CONFIG.sparks.hotColor, 1);
    g.append(glow, hot);
    fxG.appendChild(g);
    const timing = { duration: durationMs, delay: delayMs, easing: 'cubic-bezier(.45, 0, .55, 1)', fill: 'both' };
    const frames = [{ strokeDashoffset: dash }, { strokeDashoffset: -length }];
    removeWhenDone(g, [glow.animate(frames, timing), hot.animate(frames, timing)]);
  }

  return { flare, pulse };
}
