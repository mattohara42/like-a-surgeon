// "Arrange by": which lanes the map is sorted into (docs/m3-architecture.md
// section 7a, Q19). Lineage is the default. Scene and label re-lane the same
// time axis around those records, so a reader can see a scene's members
// together, or a label's roster under its name.
//
// A lane plan is { lanes: [{ key, title, color, groupId }], laneOf(node) }.
// computeLayout packs rows inside whatever lanes a plan gives it, so this
// file is the only place that knows what a lane means. Every lane comes
// from the loaded records, never from a fixed list, so adding a scene or a
// label adds a lane with no code change.

import { CONFIG } from '../config.js';

const LINEAGE_ORDER = Object.keys(CONFIG.colors.lineage);
const UNGROUPED = 'ungrouped';

function lineageColor(lineage) {
  return CONFIG.colors.lineage[lineage] ?? CONFIG.colors.lineage.other;
}

function lineagePlan() {
  return {
    lanes: LINEAGE_ORDER.map((lineage) => ({
      key: lineage,
      title: lineage.toUpperCase(),
      color: lineageColor(lineage),
      groupId: null,
      titleAtContent: false,
    })),
    laneOf: (node) => node.lineage,
  };
}

// The group ids an artist names, earliest first. Labels carry their own
// from-year on the artist; scenes fall back to the scene's start year.
function artistGroupIds(artist, kind, groupsById) {
  const refs = kind === 'scene'
    ? (artist.raw.scenes ?? []).map((id) => ({ id, from: null }))
    : (artist.raw.labels ?? []).map((l) => ({ id: l.labelId, from: l.from ?? null }));
  return refs
    .filter((ref) => groupsById.has(ref.id))
    .map((ref) => ({ id: ref.id, from: ref.from ?? groupsById.get(ref.id).startYear ?? Infinity }))
    .sort((a, b) => a.from - b.from)
    .map((ref) => ref.id);
}

// Scene or label plan. `allNodes` is every loaded record, so a group lane
// exists whether or not its layer is drawn: the lane title is how a reader
// reaches a scene or label in this view.
function groupPlan(kind, allNodes) {
  const groups = allNodes
    .filter((n) => n.kind === kind)
    .sort((a, b) => (a.startYear ?? Infinity) - (b.startYear ?? Infinity) || a.name.localeCompare(b.name));
  const groupsById = new Map(groups.map((g) => [g.id, g]));

  const laneOf = (node) => {
    if (node.kind === kind) return node.id;
    if (node.kind === 'artist') return artistGroupIds(node, kind, groupsById)[0] ?? UNGROUPED;
    // Another marker kind (label markers in scene view) belongs to no scene,
    // so it gets its own lane rather than being filed as "not in a scene".
    return `kind:${node.kind}`;
  };

  const otherKinds = Object.keys(CONFIG.arrange.kindLaneTitles).filter((k) => k !== kind);
  return {
    lanes: [
      ...groups.map((g) => ({ key: g.id, title: g.name, color: lineageColor(g.lineage), groupId: g.id })),
      ...otherKinds.map((k) => ({
        key: `kind:${k}`,
        title: CONFIG.arrange.kindLaneTitles[k],
        color: CONFIG.colors.laneLabel,
        groupId: null,
      })),
      { key: UNGROUPED, title: CONFIG.arrange.ungroupedTitles[kind], color: CONFIG.colors.laneLabel, groupId: null },
    ].map((lane) => ({ ...lane, titleAtContent: true })),
    laneOf,
  };
}

export function buildLanePlan(mode, allNodes) {
  if (mode === 'scene' || mode === 'label') return groupPlan(mode, allNodes);
  return lineagePlan();
}

// ---- reader's choice, persisted ----------------------------------------

export function loadArrange() {
  const keys = CONFIG.arrange.options.map((o) => o.key);
  try {
    const saved = localStorage.getItem(CONFIG.arrange.storageKey);
    if (keys.includes(saved)) return saved;
  } catch {
    // ignored: fall through to the default
  }
  return CONFIG.arrange.default;
}

export function saveArrange(mode) {
  try {
    localStorage.setItem(CONFIG.arrange.storageKey, mode);
  } catch {
    // ignored: the map works, it just will not remember
  }
}

export function createArrangeControl(root, current, onChange) {
  root.innerHTML = '';
  const caption = document.createElement('span');
  caption.className = 'register-caption';
  caption.id = 'arrange-caption';
  caption.textContent = 'Arrange by';
  root.appendChild(caption);
  root.setAttribute('aria-labelledby', 'arrange-caption');
  for (const { key, label } of CONFIG.arrange.options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'layer-toggle';
    button.textContent = label;
    button.setAttribute('aria-pressed', String(key === current));
    button.addEventListener('click', () => onChange(key));
    root.appendChild(button);
  }
}
