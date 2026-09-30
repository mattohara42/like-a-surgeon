// Lineage's own processor, not from SQUELCH. Loaded like the others: no
// imports, with `CFG` (CONFIG.audio.dsp) prepended by workletSource.js.
//
// A plucked string, Karplus-Strong: a burst of filtered noise circulating
// in a delay line one period long, averaged with its neighbour on every
// pass so the treble dies first, as it does on a real string. Up to
// CFG.STRING.MAX_STRINGS strings sound together, so one note message can
// carry a chord (`chord`, semitones above the note).
//
// It takes the 303 worklet's messages, so the player and seq303.js drive
// it the same way: { type: 'note', time, note, gate, accent, slide,
// chord } and { type: 'stop' }. Per-instrument character (decay, pluck
// brightness, tone, level) comes in processorOptions.
//
// Why a worklet: the same loop built from native nodes cannot have a
// period shorter than 256 samples, because Chromium adds a render quantum
// to every feedback cycle (A279). That is about 172 Hz, too low for a
// guitar. Here the delay is read at a fractional position, so any pitch
// up to CFG.STRING.MAX_HZ is in tune.

const S = CFG.STRING;

function midiToFreq(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

class StringProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const o = (options && options.processorOptions) || {};
    this.opt = {
      t60S: o.t60S != null ? o.t60S : S.T60_S,
      exciteHz: o.exciteHz != null ? o.exciteHz : S.EXCITE_HZ,
      accentExciteHz: o.accentExciteHz != null ? o.accentExciteHz : S.ACCENT_EXCITE_HZ,
      toneHz: o.toneHz != null ? o.toneHz : S.TONE_HZ,
      level: o.level != null ? o.level : S.LEVEL,
    };
    this.len = Math.ceil(sampleRate / S.MIN_HZ) + 4;
    this.strings = [];
    for (let i = 0; i < S.MAX_STRINGS; i++) {
      this.strings.push({ buf: new Float32Array(this.len), period: 100, target: 100, loss: 0, active: false });
    }
    this.w = 0;
    this.gate = false;
    this.env = 0;
    this.tone = 0;
    this.queue = [];
    this.port.onmessage = (e) => {
      const d = e.data;
      if (d.type === 'stop') {
        this.queue.length = 0;
        this.gate = false;
      } else if (d.type === 'note') {
        if (d.time == null) d.time = 0;
        this.queue.push(d);
      }
    };
  }

  // Fractional read `d` samples behind the write position.
  read(buf, d) {
    let pos = this.w - d;
    while (pos < 0) pos += this.len;
    const i0 = Math.floor(pos);
    const frac = pos - i0;
    const a = buf[i0 % this.len];
    const b = buf[(i0 + 1) % this.len];
    return a + (b - a) * frac;
  }

  pluck(str, freq, accent) {
    const period = sampleRate / freq;
    str.period = str.target = period;
    str.loss = Math.pow(10, -3 / freq / this.opt.t60S);
    str.active = true;
    // One period of noise through a one-pole low-pass, less its mean so it
    // does not thump, written where the string reads next.
    const hz = accent ? this.opt.accentExciteHz : this.opt.exciteHz;
    const a = 1 - Math.exp((-2 * Math.PI * hz) / sampleRate);
    const n = Math.ceil(period) + 2;
    const burst = new Float32Array(n);
    let lp = 0;
    let mean = 0;
    for (let i = 0; i < n; i++) {
      lp += a * (Math.random() * 2 - 1 - lp);
      burst[i] = lp;
      mean += lp / n;
    }
    // Scale so a pluck's brightness does not change its loudness much.
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(burst[i] - mean));
    const scale = peak > 0 ? 1 / peak : 0;
    for (let i = 0; i < n; i++) {
      str.buf[(this.w - n + i + this.len) % this.len] = (burst[i] - mean) * scale;
    }
  }

  applyNote(msg) {
    if (msg.gate === false) {
      this.gate = false;
      return;
    }
    const chord = msg.chord && msg.chord.length ? msg.chord : [0];
    if (msg.slide && this.gate) {
      chord.forEach((iv, k) => {
        if (k < this.strings.length) this.strings[k].target = sampleRate / midiToFreq(msg.note + iv);
      });
    } else {
      this.strings.forEach((str, k) => {
        if (k < chord.length) this.pluck(str, midiToFreq(msg.note + chord[k]), msg.accent);
        else str.active = false;
      });
      this.env = 1;
    }
    this.gate = true;
  }

  process(inputs, outputs) {
    const out = outputs[0][0];
    const glide = 1 - Math.exp(-1 / (sampleRate * S.GLIDE_S));
    const release = Math.exp(-1 / (sampleRate * S.RELEASE_S));
    const toneA = 1 - Math.exp((-2 * Math.PI * this.opt.toneHz) / sampleRate);
    const count = this.strings.filter((s) => s.active).length || 1;
    const norm = this.opt.level / Math.sqrt(count);

    for (let i = 0; i < out.length; i++) {
      const t = currentTime + i / sampleRate;
      while (this.queue.length && this.queue[0].time <= t) this.applyNote(this.queue.shift());

      let sum = 0;
      for (const s of this.strings) {
        if (!s.active) {
          s.buf[this.w] = 0;
          continue;
        }
        s.period += (s.target - s.period) * glide;
        // Averaging two neighbours delays by half a sample, so read half a
        // sample sooner to keep one pass exactly one period.
        const d = s.period - 0.5;
        const y = s.loss * 0.5 * (this.read(s.buf, d) + this.read(s.buf, d + 1));
        s.buf[this.w] = y;
        sum += y;
      }
      this.w = (this.w + 1) % this.len;

      if (!this.gate) this.env *= release;
      this.tone += toneA * (sum - this.tone);
      out[i] = this.tone * norm * this.env;
    }
    if (!this.gate && this.env < 1e-4) {
      for (const s of this.strings) s.active = false;
    }
    return true;
  }
}

registerProcessor('string', StringProcessor);
