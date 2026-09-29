// Mute and volume, always on screen in the top-left control stack, below
// "Arrange by" (docs/m4-architecture.md section 4; A271 on why there).
// Styled as the rows above it: a caption, a toggle, and a slider. Both are the engine's settings,
// which it remembers between visits. Neither starts the audio engine:
// changing them before any sound has played only records the choice.

import { COPY } from './copy.js';
import { h } from './dom.js';
import { pick } from './registers.js';

export function createSoundControls(el, audio) {
  let register = null;
  const caption = h('span', { class: 'register-caption', id: 'sound-caption' });
  // Pressed means sound is on, like the layer toggles above it.
  const mute = h('button', { type: 'button', class: 'layer-toggle' });
  const volume = h('input', { type: 'range', class: 'sound-volume', min: 0, max: 1, step: 'any' });
  mute.addEventListener('click', () => audio.setMuted(!audio.muted));
  volume.addEventListener('input', () => audio.setVolume(Number(volume.value)));
  el.replaceChildren(caption, mute, volume);
  el.setAttribute('aria-labelledby', 'sound-caption');

  function draw() {
    const muted = audio.muted;
    caption.textContent = pick(COPY.sound.heading, register);
    mute.textContent = pick(muted ? COPY.sound.muted : COPY.sound.on, register);
    mute.setAttribute('aria-pressed', String(!muted));
    volume.value = String(audio.volume);
    volume.setAttribute('aria-label', pick(COPY.sound.volume, register));
    volume.disabled = muted;
  }
  audio.onChange(draw);

  return {
    setRegister(next) {
      register = next;
      draw();
    },
  };
}
