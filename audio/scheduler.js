// Ported from SQUELCH (github.com/mattohara42/squelch, commit 935ceb8),
// MIT licensed: see audio/SQUELCH-LICENSE. Unchanged apart from reading
// CONFIG.audio instead of SQUELCH's CFG.
//
// Lookahead scheduler: main-thread clock posting timestamped events to
// whatever machines register. Any machine implementing
// onStep(stepIndex, time, stepDur) (and optionally onStop()) can hook in —
// this file has no knowledge of what a "machine" actually plays.
import { CONFIG } from '../config.js';

const A = CONFIG.audio;

export class Scheduler {
  constructor(now) {
    this.now = now; // () => seconds, injected so this is testable without real audio
    this.bpm = A.tempo.defaultBpm;
    this.shuffleAmt = 0; // 0..1
    this.playing = false;
    this.currentStep = 0;
    this.nextGridTime = 0;
    this.machines = [];
    this.timerId = null;
  }

  register(machine) {
    this.machines.push(machine);
  }

  unregisterAll() {
    this.machines.length = 0; // panels re-register after a rebuild (undo/import/pattern switch)
  }

  setTempo(bpm) {
    this.bpm = Math.min(A.tempo.maxBpm, Math.max(A.tempo.minBpm, bpm));
  }

  setShuffle(amt) {
    this.shuffleAmt = Math.min(1, Math.max(0, amt));
  }

  stepDuration() {
    return 60 / this.bpm / 4; // seconds per 16th note
  }

  start() {
    if (this.playing) return;
    this.playing = true;
    this.currentStep = 0;
    this.nextGridTime = this.now() + 0.05;
    this._tick();
    this.timerId = setInterval(() => this._tick(), A.scheduler.tickMs);
  }

  stop() {
    this.playing = false;
    if (this.timerId != null) clearInterval(this.timerId);
    this.timerId = null;
    for (const m of this.machines) m.onStop && m.onStop();
  }

  _tick() {
    const horizon = this.now() + A.scheduler.lookaheadS;
    while (this.playing && this.nextGridTime < horizon) { // playing can flip mid-tick (song end requests stop)
      const isEvenSixteenth = this.currentStep % 2 === 1;
      const swing = isEvenSixteenth ? this.shuffleAmt * A.shuffleMaxFraction * this.stepDuration() : 0;
      const scheduledTime = this.nextGridTime + swing;

      for (const m of this.machines) m.onStep(this.currentStep, scheduledTime, this.stepDuration());

      this.nextGridTime += this.stepDuration(); // live bpm each step: tempo changes don't jump
      this.currentStep = (this.currentStep + 1) % A.stepsPerPattern;
    }
  }
}
