# M4 architecture: the audio engine

> **Status: for sign-off.** No `audio/` code exists yet. Section 10 lists
> the questions this plan needs answered first.

This plan follows the M1 to M3 pattern. M4 is where the map starts making
sound. The gate in `BUILD_PLAN.md` asks for ten demos across three
lineages, each tied to a real edge.

Scope, from `BUILD_PLAN.md` and `SPEC.md` "The audio layer":

- an `audio/` module;
- machine voices, and the SQUELCH 303 worklet ported rather than rewritten
  (A8);
- the dub effects chain;
- pattern playback and A/B switching;
- demo definitions loaded from `data/demos/`;
- visual feedback tied to playback;
- a global mute, and a volume a kid cannot blow his ears out with.

Out of scope: lineage players (SPEC kind 5), which need threads and belong
to M5 with the thread player. Nothing plays on its own, anywhere, ever:
every sound starts from a press.

## 1. What SQUELCH already gives us

`mattohara42/squelch` has more in it than the 303 that A8 names. It is
a complete ReBirth-style rig, and four pieces of it are what M4 needs:

| SQUELCH file | Lines | What it is |
|---|---|---|
| `js/worklets/voice303.js` | 164 | The 303 voice: saw/square, 4-pole ladder-style filter, accent, slide, a sample-accurate note queue |
| `js/worklets/drum808.js` | 198 | 808 kit, all synthesized: kick, snare, three toms, rimshot, clap, cowbell, hats, cymbal, maracas |
| `js/worklets/drum909.js` | 234 | 909 kit. Drums synthesized live, and hats and cymbals generated into buffers once at load |
| `js/worklets/dsp-utils.js` | 20 | Noise and one-pole helpers shared by the drum worklets |
| `js/scheduler.js` | 68 | Main-thread lookahead scheduler with swing, clock injected so it tests without audio |

SQUELCH also has Node test harnesses for all three worklets. They stub
the AudioWorklet globals and run the processors on fixed input, then
assert on what comes out (for example, that an accented 808 kick is
louder than an unaccented one). Those tests carry over with the code.

So the 808 demo, a 909 demo and the 303 demo are ports, not new DSP. That
is most of the risky signal-processing work in the milestone, already done
and tested. Everything else here can be built from native Web Audio nodes:
the dub chain, the fuzz, the torn speaker, the Stylophone and the 12-bit
grit.

**Licence.** SQUELCH has no LICENSE file. A154 already flagged that the
port needs a licence that allows MIT. Matt owns both repositories, so one
line from him settles it (Q25).

## 2. File layout

```
audio/
  engine.js      the one AudioContext, master chain, unlock on first press, mute, volume
  worklets.js    registers worklet modules: by path in dev, by data: URL in the release
  scheduler.js   SQUELCH's lookahead scheduler, CONFIG instead of CFG
  kits.js        wraps the 808 and 909 worklets as step-playable instruments
  voice303.js    wraps the 303 worklet: notes, slides, accents, knob params
  fx.js          native-node effects: tape delay, spring reverb, high-pass, fuzz, cone rattle, bit-crush
  demos/
    index.js     demo kind -> player module
    machineVoice.js
    ab.js
    technique.js
    pattern.js
  worklets/
    voice303.proc.js   the processors themselves, self-contained (section 3)
    drum808.proc.js
    drum909.proc.js
reading/
  demoBlock.js   the demo UI inside a panel: play/stop, A/B, sliders, caption
```

The dependency direction matches M3: `reading/` asks `audio/` to play,
and `audio/` never imports from `reading/` or `render/`. `main.js` wires
the playback events to the graph (section 6), as it does for everything
else.

## 3. Worklets under file://

This is the one real technical risk, so I tested it before writing this
plan. It was a small experiment in headless Chromium, with a trivial
processor loaded three ways:

| Loaded from | over http (dev server) | from file:// (release) |
|---|---|---|
| relative path `proc.js` | works | **fails** (AbortError) |
| blob: URL | works | **fails** (AbortError) |
| data: URL | works | works |

So the release copy has to hand each worklet to `addModule` as a
`data:` URL. The design:

- Each processor file is **self-contained**: no `import`. SQUELCH's
  worklets import its `config.js`. The port moves those values into
  `CONFIG.audio` and passes them in through `processorOptions` when the
  node is created, so CONFIG stays the single home for tuning values and
  the DSP code does not change.
- In dev, `audio/worklets.js` passes the file path, and the dev server
  serves it like any other file.
- `tools/bundle.js` reads each `audio/worklets/*.proc.js` as text and
  writes `window.LINEAGE_WORKLETS = { name: 'data:text/javascript,…' }`
  into the release. `audio/worklets.js` uses that map when it exists.
  This is about thirty lines of bundler, the same kind of change the
  data and code flattening already needed.

**Not tested:** Firefox and Safari. Only Chromium is installed here. Both
support AudioWorklet and data: URLs, but I have not seen this path work
in either (Q27).

## 4. Loudness and safety

A 13-year-old with headphones on is the listener this section is for.
There are four layers, and every number lives in `CONFIG.audio`.

1. **Master chain:**
   ```
   every demo -> master gain -> DynamicsCompressor (limiter settings) -> destination
   ```
   SQUELCH's `MASTER_LIMITER` settings are the starting point: threshold
   -3 dB, ratio 20, attack 3 ms. A DynamicsCompressorNode is not a true
   brickwall, so a fast transient can overshoot its threshold slightly.
   The master gain sits low enough that measured peaks stay under
   `CONFIG.audio.peakCeiling`, and the end-to-end test (section 8)
   measures them rather than trusting the settings.
2. **Per-demo cap:** the existing `safety.maxGain` in every demo file
   clamps that demo's output before it reaches the master.
3. **Volume:** the slider starts at half. Its top position is the
   master gain that section 8 proves stays under the ceiling.
4. **No surprises:**
   - every start and stop ramps over a few milliseconds, so there are
     no clicks;
   - resonance and feedback controls have ceilings below
     self-oscillation, except where the self-oscillation is the point
     (the dub delay's runaway), and even there the limiter holds;
   - closing the panel stops the sound.

**Mute** is one button, always on screen next to "Start here", and it
remembers its state in localStorage with the same guarded access
`registers.js` uses. The AudioContext is created on the first press of a
play button and never before. That satisfies autoplay rules, and it means
a reader who never presses play never starts an audio thread.

We cannot control the device's own volume, and this plan does not claim
to. The limiter keeps our own output from spiking above a known level.
The volume a teenager sets on his laptop is still up to him.

## 5. Demo data

The three demo files in `data/demos/` were written in M1, before an
engine existed, and their `params` are partly prose (for example
`"engine": "port SQUELCH 303 AudioWorklet"`). M4 replaces the prose
with data the players can run. The captions, titles and ids stay as
they are. Four kinds:

| kind | What the reader does | params (sketch) |
|---|---|---|
| `machine-voice` | presses pads, moves sliders | `machine` (808, 909, 303, stylophone), `voices`, `controls` with ranges and defaults, optional `pattern` |
| `ab` | plays, switches A and B mid-loop | `a` and `b`, each a `{ machine, pattern, bpm, fx }`; `switchOnBar: true` so the switch lands on the beat |
| `technique` | toggles an effect in and out of a playing loop | `source` (a pattern), `chain` (an ordered list of fx with params), `wetControl` |
| `pattern` | hears a pattern straight, then chopped | `source` pattern, `chops` (a list of step reorderings) |

A pattern is plain data: `bpm`, `steps` (16 or 32), and one array per
voice of step velocities (0 means silent), plus notes, slides and accents
for the 303. The validator gets one checker per kind, so a demo that
names an unknown machine, voice or fx fails `npm run validate`, just as
an unresolved `demoId` does now.

Adding a demo is still one file, plus the `demoId` on its edge or machine.
No player code changes unless a demo needs a new effect or machine.

## 6. The demo block and visual feedback

`reading/demoBlock.js` takes the place of the "arrives with the audio
engine" line (`COPY.headings.demoLater`) in the edge and machine panels.
It holds:

- the title;
- a play/stop button;
- the controls;
- the caption in the reader's register, through `pick()`;
- a sixteen-step row that lights the current step.

Controls are native `<input type="range">` elements and buttons, so the
keyboard, touch (the later wall panel) and screen readers all work
without any custom widget code. Each slider has a text label.

Two kinds of feedback reach the map, both through `main.js`:

- **On the downbeat of each bar,** `sparks.pulse` runs along the demo's
  edge, from cause to effect. The effect already exists (A251), and it
  already stays still under reduced motion.
- **Edges that have a demo** get a small persistent marker (SPEC:
  "Edges with one get visual emphasis"). The marker is a short text
  glyph at the edge midpoint, drawn in the edge's colour. It is not a
  new colour, so the palette check (A258) still holds.

## 7. The ten demos

Each row is tied to an edge that is on the map today. There are four
lineages, one more than the gate needs. The three existing demos are
marked *existing*.

| # | Demo | Kind | Edge | Lineage of the "to" end | Engine |
|---|---|---|---|---|---|
| 1 | 808 voices, the long kick *existing* | machine-voice | `e-808-planetrock`, `e-808-manparrish`, `e-808-mantronix` | hip-hop, electronic | SQUELCH 808 |
| 2 | Turn the 303's knob while it plays *existing* | machine-voice | `e-303-phuture` | electronic | SQUELCH 303 |
| 3 | 808 kick against 909 kick | ab | `e-909-knuckles` | electronic | SQUELCH 808 and 909 |
| 4 | A dry stem, then the Space Echo | technique | `e-re201-tubby` | dub | native delay with feedback and filtering |
| 5 | A preset rhythm, then a riddim | ab | `e-mt40-princejammy` | dub | simple square and noise voices |
| 6 | A funk break straight, then chopped | pattern | `e-winstons-nwa` | hip-hop | SQUELCH 909 kit playing a break pattern |
| 7 | The same loop at full quality and at 12-bit, 26 kHz | ab | `e-sp1200-marleymarl` | hip-hop | native bit-crush and sample-rate reduction |
| 8 | Clean guitar-like tone, then the fuzz box | technique | `e-fuzztone-stones` | rock | native waveshaper |
| 9 | An amp, then the same amp with a slashed speaker | technique | `e-elpico-kinks` | rock | waveshaper plus noise-modulated rattle |
| 10 | The Stylophone: one voice, a metal pen | machine-voice | `e-stylophone-bowie` | rock | native square oscillator |

Demo 3 needs a new file. Demos 4 to 10 each need one new demo file and a
`demoId` on the edge. The two not chosen that were considered: the
Eventide H910 harmoniser (`e-h910-bowie`), because good pitch-shifting
is real DSP work, and the Minimoog, because nothing on the map yet asks a
reader to hear it specifically.

**What the demos play.** CLAUDE.md is explicit that a rhythmic pattern
or a chord movement is not the protected thing. A melody is different:
it is part of the composition, and a composition is protected on its
own. Demo 6 plays a drum pattern, which is fine. Demos 8 and 9 play an
original riff, not the Stones' or the Kinks'. Demo 5 plays a rhythm in
the style of a Casio preset, not the 'Sleng Teng' bassline. The existing
Planet Rock demo raises a question it cannot settle alone (Q26): its
file says it plays "the shared melodic contour" of 'Trans-Europe
Express' and 'Planet Rock'. The edge's own text records that 'Planet
Rock' used that melody without a licence in advance, and that the
dispute with Kraftwerk's publishers was settled.

## 8. Testing

- **DSP:** port the SQUELCH Node harnesses for the three worklets with
  the code. They run the processors headless in Node and assert on the
  output. They need a runner (Q28).
- **End to end:** a headless Chromium check. It renders each demo
  through an `OfflineAudioContext` for two seconds, then asserts that
  the output is not silent, that no sample exceeds `CONFIG.audio.peakCeiling`,
  and that the data: URL path loads. The same check runs against
  `dist/` from file://.
- **By ear:** Matt's. No automated check can say the 909 sounds like a
  909.

## 9. Order of work

Each step is one PR, merged before the next starts.

1. Port the worklets and the scheduler, with the self-contained change,
   the CONFIG move and the SQUELCH tests. No UI yet.
2. `engine.js` master chain, mute and volume, `worklets.js` loader, and
   the `bundle.js` data: URL step. Proven with one test tone, in dev and
   in `dist/` from file://.
3. The demo schema, the validator checks, and rewriting the three
   existing demo files into the new params.
4. `demoBlock.js` and the two players the existing demos need
   (machine-voice, ab). Demos 1 and 2 play. Planet Rock waits on Q26.
5. `fx.js`, and the technique and pattern players. Demos 3 to 10, in
   two or three data PRs.
6. Visual feedback on the map (section 6).
7. The gate: ten demos, heard by Matt.

## 10. Questions for Matt (also in QUESTIONS.md)

- **Q25. SQUELCH licence.** The port copies about 680 lines from a repo
  with no LICENSE file into an MIT repo. (a) **Recommended.** Matt
  confirms in chat that the SQUELCH code may be used here under MIT, and
  ASSUMPTIONS records it. (b) Add an MIT LICENSE to SQUELCH itself first.
  (c) The ported files keep a header naming their origin and a separate
  licence.
  **Resolved 2026-09-29: (b).** Matt is adding an MIT LICENSE to SQUELCH.
  Step 1 waits until that LICENSE is on SQUELCH's main branch.
- **Q26. The Planet Rock demo's melody.** (a) **Recommended.** Keep the
  A/B about tempo, timbre and drums, and play an original four-note
  figure on both sides, so the lesson (the notes stay, the treatment
  changes) survives without the tune. (b) Play the shared melody, as the
  M1 file intended, on the view that a short synthesized quote is
  teaching rather than copying. (c) Drop the demo from the ten and pick
  a replacement.
- **Q27. Browsers.** Only Chromium can be tested in this container.
  (a) **Recommended.** Ship on Chromium's evidence, and Matt checks
  Safari and Firefox by hand at the gate. (b) Hold the gate until an
  automated check covers all three.
- **Q28. A test runner.** Lineage has no `npm test`. (a)
  **Recommended.** Add `"test": "node --test"` and put the ported
  harnesses in `test/`. It needs no dependencies, and CI runs it next to
  `validate`. (b) Keep tests in the scratchpad as M1 to M3 did, and port
  the SQUELCH harnesses as runnable scripts only.
- **Q29. The ten.** Is the table in section 7 the right ten? Swaps are
  cheap before step 5 and expensive after.
  **Deferred 2026-09-29.** Matt reviews the list later. Steps 1 to 4 do
  not depend on it, and step 5 does not start until it is answered.
