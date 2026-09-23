// Publishes CONFIG.type to the stylesheet as CSS custom properties, so
// every size in the reading surface lives in config.js (CLAUDE.md: no magic
// numbers) while the styles themselves stay in index.html.

import { CONFIG } from '../config.js';

export function applyTypeScale(root = document.documentElement) {
  for (const [key, px] of Object.entries(CONFIG.type.size)) {
    root.style.setProperty(`--t-${key}`, `${px}px`);
  }
  for (const [key, value] of Object.entries(CONFIG.type.lineHeight)) {
    root.style.setProperty(`--lh-${key}`, String(value));
  }
}
