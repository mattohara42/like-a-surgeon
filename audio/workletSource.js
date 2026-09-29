// Builds the source text each AudioWorklet module is loaded from.
//
// From file://, addModule() only accepts a data: URL (A267), and a module
// loaded that way cannot import anything. So each processor file under
// audio/worklets/ is written without imports, and this module assembles
// what it needs in front of it: `CFG`, the processor's slice of
// CONFIG.audio.dsp, and the shared DSP helpers for the drum machines.
//
// It only joins text. Reading the files is the caller's job (the dev
// loader fetches them, the release bundle inlines them, the tests read
// them from disk), so all three load exactly the same source.

// Processor name (as passed to registerProcessor) -> the files it is built
// from, in order.
export const WORKLETS = {
  voice303: ['voice303.proc.js'],
  drum808: ['dsp-utils.proc.js', 'drum808.proc.js'],
  drum909: ['dsp-utils.proc.js', 'drum909.proc.js'],
};

// `texts` maps a file name from WORKLETS to its contents. `dsp` is
// CONFIG.audio.dsp.
export function workletSource(name, texts, dsp) {
  const files = WORKLETS[name];
  if (!files) throw new Error(`Unknown worklet "${name}"`);
  const missing = files.filter((f) => typeof texts[f] !== 'string');
  if (missing.length) throw new Error(`Worklet "${name}" is missing ${missing.join(', ')}`);
  return [`const CFG = ${JSON.stringify(dsp)};`, ...files.map((f) => texts[f])].join('\n');
}
