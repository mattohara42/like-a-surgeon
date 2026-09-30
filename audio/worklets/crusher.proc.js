// Lineage's own processor, not from SQUELCH. Loaded like the others: no
// imports, with `CFG` (CONFIG.audio.dsp) prepended by workletSource.js.
//
// Sample-rate and bit-depth reduction, as a sampler of the 1980s did it:
// the input is sampled and held at `rateHz`, and each held sample is
// rounded to `bits` of resolution. There is no smoothing afterwards. The
// SP-1200 deliberately omitted a reconstruction filter, and the images
// above its Nyquist frequency are part of why it sounds bright.

const C = CFG.CRUSHER;

class CrusherProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'rateHz', defaultValue: C.RATE_MAX_HZ, minValue: C.RATE_MIN_HZ, maxValue: C.RATE_MAX_HZ, automationRate: 'k-rate' },
      { name: 'bits', defaultValue: C.BITS_MAX, minValue: C.BITS_MIN, maxValue: C.BITS_MAX, automationRate: 'k-rate' },
    ];
  }

  constructor() {
    super();
    this.phase = 1; // take a sample on the very first frame
    this.held = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0][0];
    const out = outputs[0][0];
    // Nothing connected any more: let the node be collected.
    if (!input) return false;
    const step = parameters.rateHz[0] / sampleRate;
    const levels = Math.pow(2, parameters.bits[0] - 1);
    for (let i = 0; i < out.length; i++) {
      if (this.phase >= 1) {
        this.phase -= 1;
        this.held = Math.round(input[i] * levels) / levels;
      }
      this.phase += step;
      out[i] = this.held;
    }
    return true;
  }
}

registerProcessor('crusher', CrusherProcessor);
