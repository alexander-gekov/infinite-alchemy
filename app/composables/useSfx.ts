import { useStorage } from "@vueuse/core";
import type { Ref } from "vue";

// ponytail: sounds are synthesised with the Web Audio API instead of shipping
// audio files — no assets, no dependency, no network. Ceiling: only simple
// blips/arpeggios are possible; swap `play()` for <audio> samples if we ever
// want real sound design.
interface Voice {
  freq: number;
  /** Glide to this frequency over the note's duration. */
  to?: number;
  /** Start offset from now, in seconds. */
  at?: number;
  /** Length in seconds. */
  dur?: number;
  type?: OscillatorType;
  /** Peak amplitude, 0-1. */
  gain?: number;
}

let context: AudioContext | null = null;
let muted: Ref<boolean> | null = null;

const getContext = () => {
  if (import.meta.server) return null;
  const Ctor =
    window.AudioContext ?? (window as unknown as any).webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  // Browsers start the context suspended until a user gesture.
  if (context!.state === "suspended") void context!.resume();
  return context;
};

const play = (voices: Voice[]) => {
  if (muted?.value) return;
  const audio = getContext();
  if (!audio) return;

  const now = audio.currentTime;
  for (const voice of voices) {
    const start = now + (voice.at ?? 0);
    const duration = voice.dur ?? 0.12;
    const peak = voice.gain ?? 0.12;

    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = voice.type ?? "sine";
    osc.frequency.setValueAtTime(voice.freq, start);
    if (voice.to) {
      osc.frequency.exponentialRampToValueAtTime(voice.to, start + duration);
    }
    // Exponential ramps can never reach 0, hence the tiny floor value.
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(amp).connect(audio.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
};

const arpeggio = (freqs: number[], type: OscillatorType, gain: number) =>
  freqs.map((freq, i) => ({
    freq,
    at: i * 0.075,
    dur: 0.22,
    type,
    gain,
  }));

export const useSfx = () => {
  // Only memoised on the client: a module-level ref would leak between SSR requests.
  const isMuted = import.meta.client
    ? (muted ??= useStorage("sfxMuted", false))
    : ref(false);

  return {
    muted: isMuted,
    toggleMuted: () => {
      isMuted.value = !isMuted.value;
      if (!isMuted.value) play([{ freq: 660, dur: 0.09, type: "triangle" }]);
    },
    pickup: () =>
      play([{ freq: 440, to: 680, dur: 0.07, type: "triangle", gain: 0.07 }]),
    drop: () =>
      play([{ freq: 380, to: 240, dur: 0.09, type: "triangle", gain: 0.07 }]),
    combine: () => play(arpeggio([523.25, 659.25, 783.99, 1046.5], "sine", 0.1)),
    discover: () =>
      play(arpeggio([659.25, 830.61, 987.77, 1318.51], "triangle", 0.11)),
    discard: () =>
      play([{ freq: 320, to: 90, dur: 0.16, type: "square", gain: 0.05 }]),
    error: () =>
      play([{ freq: 220, to: 110, dur: 0.28, type: "sawtooth", gain: 0.06 }]),
  };
};
