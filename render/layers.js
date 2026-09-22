// Reader-facing layer toggles: which kinds of record the map draws.
//
// This exists because the alternative is picking for everyone. Scenes,
// labels and machines each earn their place for some questions and get in
// the way of others -- a reader following one artist's influence wants the
// map quiet, and a reader asking who owned the masters wants the labels on.
// Baking either choice in makes the map worse for the other reader.
//
// Artists are deliberately not toggleable. A map with no artists on it is
// not a view anyone is looking for.

import { CONFIG } from '../config.js';

const LAYER_LABELS = {
  scenes: 'Scenes',
  labels: 'Labels',
  machines: 'Machines',
};

// localStorage can throw outright (Safari private mode, blocked site data),
// so every access is guarded. A reader whose browser refuses to remember
// their choice should still get a working map with the defaults.
export function loadLayers() {
  const defaults = { ...CONFIG.layers.defaults };
  try {
    const raw = localStorage.getItem(CONFIG.layers.storageKey);
    if (!raw) return defaults;
    const saved = JSON.parse(raw);
    // Only keys we know about, only booleans: a stale or hand-edited entry
    // should not be able to invent a layer or blank one out.
    for (const key of Object.keys(defaults)) {
      if (typeof saved?.[key] === 'boolean') defaults[key] = saved[key];
    }
  } catch {
    // ignored: fall through to defaults
  }
  return defaults;
}

export function saveLayers(layers) {
  try {
    localStorage.setItem(CONFIG.layers.storageKey, JSON.stringify(layers));
  } catch {
    // ignored: the map works fine, it just will not remember
  }
}

export function createLayerToggles(root, layers, onChange) {
  root.innerHTML = '';

  for (const [key, label] of Object.entries(LAYER_LABELS)) {
    const button = document.createElement('button');
    button.className = 'layer-toggle';
    button.type = 'button';
    button.textContent = label;
    button.setAttribute('aria-pressed', String(Boolean(layers[key])));
    button.addEventListener('click', () => {
      const next = { ...layers, [key]: !layers[key] };
      onChange(next);
    });
    root.appendChild(button);
  }
}
