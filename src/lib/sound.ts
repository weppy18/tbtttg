/**
 * Tiny Web Audio synth: every sound is generated, so there's nothing to
 * download and the app stays fully offline. All calls are safe when audio is
 * unavailable (SSR, tests, autoplay-blocked) — they simply do nothing.
 */
export type SoundName =
  'place-x' | 'place-o' | 'win' | 'lose' | 'draw' | 'invalid' | 'undo' | 'tick';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function context(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    return ctx;
  } catch {
    return null;
  }
}

interface Tone {
  freq: number;
  /** Seconds after the sound starts. */
  at?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  /** Frequency to glide to by the end. */
  glide?: number;
}

function play(tones: readonly Tone[]): void {
  const c = context();
  if (!c || !master) return;
  if (c.state === 'suspended') void c.resume().catch(() => {});
  const now = c.currentTime;
  for (const t of tones) {
    const osc = c.createOscillator();
    const env = c.createGain();
    const start = now + (t.at ?? 0);
    const dur = t.dur ?? 0.12;
    osc.type = t.type ?? 'sine';
    osc.frequency.setValueAtTime(t.freq, start);
    if (t.glide) osc.frequency.exponentialRampToValueAtTime(t.glide, start + dur);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(t.gain ?? 0.6, start + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(env).connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }
}

const SOUNDS: Record<SoundName, readonly Tone[]> = {
  'place-x': [{ freq: 520, dur: 0.09, type: 'triangle', glide: 380 }],
  'place-o': [{ freq: 380, dur: 0.11, type: 'sine', glide: 520 }],
  tick: [{ freq: 900, dur: 0.04, type: 'square', gain: 0.15 }],
  invalid: [
    { freq: 180, dur: 0.09, type: 'sawtooth', gain: 0.35 },
    { freq: 140, at: 0.08, dur: 0.12, type: 'sawtooth', gain: 0.3 },
  ],
  undo: [{ freq: 440, dur: 0.1, type: 'triangle', glide: 220 }],
  win: [
    { freq: 523, at: 0, dur: 0.14, type: 'triangle' },
    { freq: 659, at: 0.12, dur: 0.14, type: 'triangle' },
    { freq: 784, at: 0.24, dur: 0.16, type: 'triangle' },
    { freq: 1047, at: 0.38, dur: 0.35, type: 'triangle' },
  ],
  lose: [
    { freq: 392, at: 0, dur: 0.18, type: 'sine' },
    { freq: 330, at: 0.16, dur: 0.18, type: 'sine' },
    { freq: 262, at: 0.32, dur: 0.4, type: 'sine' },
  ],
  draw: [
    { freq: 440, at: 0, dur: 0.14, type: 'sine' },
    { freq: 440, at: 0.18, dur: 0.24, type: 'sine' },
  ],
};

let enabled = true;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

export function playSound(name: SoundName): void {
  if (!enabled) return;
  play(SOUNDS[name]);
}

/** Browsers require a user gesture before audio; call this from the first click/keypress. */
export function unlockAudio(): void {
  const c = context();
  if (c && c.state === 'suspended') void c.resume().catch(() => {});
}
