// Registers the AudioWorklet processors with an AudioContext.
//
// Every mode loads the same text, assembled by workletSource.js, from a
// data: URL: from file:// that is the only form addModule() accepts (A267),
// and using it everywhere keeps dev and release identical. The only
// difference is where the file text comes from. The release bundle puts it
// in window.LINEAGE_WORKLETS (tools/bundle.js). In dev it is fetched from
// the dev server, next to index.html.

import { CONFIG } from '../config.js';
import { WORKLETS, workletSource } from './workletSource.js';

const DEV_DIR = 'audio/worklets/';

async function fileTexts() {
  if (window.LINEAGE_WORKLETS) return window.LINEAGE_WORKLETS;
  const names = [...new Set(Object.values(WORKLETS).flat())];
  const texts = await Promise.all(
    names.map(async (name) => {
      const res = await fetch(DEV_DIR + name);
      if (!res.ok) throw new Error(`Could not load worklet file ${name} (${res.status})`);
      return [name, await res.text()];
    }),
  );
  return Object.fromEntries(texts);
}

export async function registerWorklets(ctx) {
  const texts = await fileTexts();
  for (const name of Object.keys(WORKLETS)) {
    const source = workletSource(name, texts, CONFIG.audio.dsp);
    await ctx.audioWorklet.addModule(`data:text/javascript,${encodeURIComponent(source)}`);
  }
}
