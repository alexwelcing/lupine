/**
 * Procedural "mechanical click" — synthesized with the Web Audio API, no audio
 * asset files. From *The Kinetic Instrument* Ch. 8.1 ("The Mechanical Rotary
 * Click"): a high-frequency triangle transient pushed through a band-pass
 * filter with a sharp exponential decay (< 40 ms). Sound-as-code sidesteps the
 * download, repetition-fatigue, and latency problems of sample playback.
 *
 * Opt-in and OFF by default — a scientific tool shouldn't make noise unless the
 * user asked. State is module-local (the hot path reads a plain boolean, no
 * React), persisted to localStorage, and observable via {@link subscribeClickSound}.
 */

const STORAGE_KEY = 'lupi.clickSound';

function readEnabled(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false; // private-mode / blocked storage → treat as off
  }
}

let enabled = readEnabled();
const listeners = new Set<(value: boolean) => void>();

export function isClickSoundEnabled(): boolean {
  return enabled;
}

export function setClickSoundEnabled(value: boolean): void {
  if (value === enabled) return;
  enabled = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    /* storage blocked — keep the in-memory value, just don't persist */
  }
  for (const listener of listeners) listener(value);
}

/** Subscribe to enabled-state changes. Returns an unsubscribe fn. */
export function subscribeClickSound(listener: (value: boolean) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// One shared AudioContext, created lazily on first play (which happens inside a
// pointer handler, satisfying the browser autoplay-unlock policy — Ch. 7.3).
let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    if (!ctx) ctx = new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null; // too many contexts, or audio unavailable
  }
}

export interface ClickOptions {
  /** peak gain, 0–1 (default 0.05 — a quiet tick) */
  gain?: number;
  /** transient start frequency in Hz (default 2600) */
  freq?: number;
}

/**
 * Play one procedural click. No-op when disabled or audio is unavailable.
 * Audio is non-essential feedback, so any failure is swallowed — it must never
 * break the button press it accompanies.
 */
export function playClick(options: ClickOptions = {}): void {
  if (!enabled) return;
  const ac = audioContext();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    const freq = options.freq ?? 2600;
    const peak = options.gain ?? 0.05;

    const osc = ac.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.55, now + 0.03);

    const band = ac.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2200;
    band.Q.value = 6;

    const amp = ac.createGain();
    amp.gain.setValueAtTime(0.0001, now); // exponential ramps can't touch 0
    amp.gain.exponentialRampToValueAtTime(peak, now + 0.0015);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

    osc.connect(band).connect(amp).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.05);
    osc.onended = () => {
      osc.disconnect();
      band.disconnect();
      amp.disconnect();
    };
  } catch {
    /* audio glitch — ignore, the click still happened visually */
  }
}
