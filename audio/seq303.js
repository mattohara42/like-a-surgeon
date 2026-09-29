// Ported from SQUELCH (github.com/mattohara42/squelch, commit 935ceb8),
// MIT licensed: see audio/SQUELCH-LICENSE. Unchanged apart from reading
// CONFIG.audio.voice303 instead of SQUELCH's CFG.
//
// Pure 303 step-sequencing logic: which messages to post to the voice
// worklet for one step. Extracted from panel303 so the locked slide/gate
// semantics are unit-testable without a DOM (test/seq303.test.js).
//
// Locked semantics (CLAUDE.md): the slide flag on step N means "glide INTO
// the next step" — so it holds N's gate through the transition, and step
// N+1 triggers with slide=true (glide, no envelope retrigger). Non-slide
// notes gate off at GATE_FRACTION of the step for classic 303 articulation.
import { CONFIG } from '../config.js';

export function eventsForStep(steps, i, time, stepDur) {
  const step = steps[i];
  if (!step.g) return [{ type: 'note', time, gate: false }];

  const prev = steps[(i + steps.length - 1) % steps.length];
  const events = [{
    type: 'note',
    time,
    note: step.n,
    gate: true,
    accent: !!step.a,
    slide: !!(prev.g && prev.s), // glide INTO this step iff the previous gated step flagged it
  }];
  if (!step.s) {
    events.push({ type: 'note', time: time + stepDur * CONFIG.audio.voice303.gateFraction, gate: false });
  }
  return events;
}
