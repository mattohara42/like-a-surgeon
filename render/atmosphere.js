// Everything that is not the graph: the dust volume behind it, and the
// coloured cloud each scene casts over its own members.
//
// Dust is a canvas, not SVG. Several hundred one-pixel sprites is the one
// thing SVG genuinely handles badly, and none of it is interactive. It
// parallaxes against the graph's pan, which is what makes the field read
// as a volume you are looking *into* rather than a plane you are looking
// across.

import { CONFIG } from '../config.js';
import { svgEl } from './svg.js';

export function createDustLayer(container) {
  const canvas = document.createElement('canvas');
  canvas.className = 'dust-layer';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let motes = [];
  let width = 0;
  let height = 0;

  function resize() {
    const rect = container.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, width * dpr);
    canvas.height = Math.max(1, height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    motes = Array.from({ length: CONFIG.atmosphere.dust.count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: 0.25 + Math.random() * 0.75,
      phase: Math.random() * Math.PI * 2,
    }));
  }
  resize();

  let rafId = null;
  let vpRef = null;

  function frame(t) {
    ctx.clearRect(0, 0, width, height);
    const { parallax, driftAmplitudePx } = CONFIG.atmosphere.dust;
    const ox = (vpRef?.tx ?? 0) * parallax;
    const oy = (vpRef?.ty ?? 0) * parallax;
    for (const m of motes) {
      const x = (((m.x + ox * m.z) % width) + width) % width;
      const drift = Math.sin(t / 4000 + m.phase) * driftAmplitudePx;
      const y = (((m.y + oy * m.z + drift) % height) + height) % height;
      const alpha = (0.09 + 0.3 * m.z) * (0.6 + 0.4 * Math.sin(t / 1500 + m.phase * 3));
      ctx.fillStyle = `rgba(175,205,255,${alpha.toFixed(3)})`;
      const size = m.z < 0.6 ? 1 : 1.6;
      ctx.fillRect(x, y, size, size);
    }
    rafId = requestAnimationFrame(frame);
  }

  return {
    start(vp) {
      vpRef = vp;
      if (rafId === null) rafId = requestAnimationFrame(frame);
    },
    stop() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    },
    resize,
  };
}

export function createNebulaDefs() {
  const filter = svgEl('filter', {
    id: 'nebula-blur', x: '-60%', y: '-60%', width: '220%', height: '220%',
  });
  filter.appendChild(svgEl('feGaussianBlur', { stdDeviation: CONFIG.atmosphere.nebula.blurStdDev }));
  return [filter];
}

// One soft ellipse per scene, coloured from the `palette.accent` the scene
// record already carries, centred on its members. Scenes are drawn as
// atmosphere rather than as graph nodes: they are context for the artists
// in them, and giving them their own markers doubles what competes for
// attention without adding a claim. See ASSUMPTIONS.md A44.
export function drawNebulae(nebulaG, scenes, layout) {
  const { opacity, minRadiusPx, paddingPx } = CONFIG.atmosphere.nebula;

  for (const scene of scenes) {
    const members = (scene.memberIds ?? [])
      .map((id) => layout.positions.get(id))
      .filter(Boolean);
    if (members.length === 0) continue;

    const cx = members.reduce((sum, p) => sum + p.x1, 0) / members.length;
    const cy = members.reduce((sum, p) => sum + p.y, 0) / members.length;
    const rx = Math.max(minRadiusPx, Math.max(...members.map((p) => Math.abs(p.x1 - cx))) + paddingPx);
    const ry = Math.max(
      CONFIG.layout.laneHeight * 0.7,
      Math.max(...members.map((p) => Math.abs(p.y - cy))) + CONFIG.layout.laneHeight * 0.5,
    );

    nebulaG.appendChild(
      svgEl('ellipse', {
        class: 'scene-nebula',
        cx, cy, rx, ry,
        fill: scene.palette?.accent ?? CONFIG.colors.lineage.other,
        filter: 'url(#nebula-blur)',
        opacity,
      }),
    );
  }
}
