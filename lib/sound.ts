import { useSyncExternalStore } from "react";

const TRACK = "/audio/ghosts-in-the-zen-garden.mp3";
const VOLUME = 0.4;
const GLIDE = 0.4;
const FADE_OUT = 2000;
const BASS_BINS = [1, 6]; // bins of a 2048 point fft, 23 Hz each: about 23 to 140 Hz
const BODY_BINS = [1, 200]; // about 23 Hz to 4.7 kHz
const MIN_DB = -100; // what the analyser calls silence
const MAX_DB = -30;
const FAST = 1.5; // s of memory for what is playing now
const SLOW = 12; // s of memory for what it has been
const SWELL_RANGE = 0.08; // loudness above the long view that counts as a full swell
const LOOK = 400; // ms back that the quietest bass is found
const RISE = 9; // dB the bass must climb over that quietest to be a hit
const NEAR_PEAK = 12; // dB of the loudest bass lately that a hit must reach
const PEAK_FALL = 0.5; // dB per s the remembered loudest bass comes down
const HIT_FLOOR = -50; // dB, bass below this is too quiet to be a hit
const HIT_GAP = 200; // ms between hits

export type Signal = {
  /** Loudness of now above the loudness of lately, 0 to 1. Only a crescendo shows. */
  swell: number;
  /** True on the one frame a big bass hit lands. */
  hit: boolean;
};

const listeners = new Set<(signal: Signal) => void>();

/** The music as numbers, once per frame while it plays, and once at rest when it stops. */
export const signal = {
  subscribe: (fn: (signal: Signal) => void) => {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  },
};

let playing = false;
const watchers = new Set<() => void>();

const play = (on: boolean) => {
  playing = on;
  for (const fn of watchers) fn();
};

/** Whether the music is on, from the moment the sound is asked for to the moment it is asked to stop. */
export const usePlaying = () =>
  useSyncExternalStore(
    (fn) => {
      watchers.add(fn);
      return () => void watchers.delete(fn);
    },
    () => playing,
    () => false,
  );

/** Mean of a range of bins, each as 0 to 1 between silence and the loudest the analyser shows. */
const body = (dbs: Float32Array, [from, to]: number[]) => {
  let sum = 0;
  for (let i = from; i <= to; i++)
    sum += Math.min(1, Math.max(0, (dbs[i] - MIN_DB) / (MAX_DB - MIN_DB)));
  return sum / (to - from + 1);
};

/** Power of a range of bins together, in dB. */
const power = (dbs: Float32Array, [from, to]: number[]) => {
  let sum = 0;
  for (let i = from; i <= to; i++) sum += 10 ** (dbs[i] / 10);
  return 10 * Math.log10(sum + 1e-20);
};

/** Loops the track. Resolves to a stop function. */
export const startSound = async () => {
  // created before any await, so it still counts as part of the click that started it
  const ctx = new AudioContext();
  const buffer = await ctx.decodeAudioData(await (await fetch(TRACK)).arrayBuffer());

  const source = new AudioBufferSourceNode(ctx, { buffer, loop: true });
  const master = new GainNode(ctx, { gain: 0 });
  const analyser = new AnalyserNode(ctx, { smoothingTimeConstant: 0 });
  source.connect(master).connect(ctx.destination);
  master.connect(analyser);

  const dbs = new Float32Array(analyser.frequencyBinCount);
  const now: Signal = { swell: 0, hit: false };
  const recent: { time: number; db: number }[] = [];
  let bass = -200;
  let peak = -200;
  let armed = true;
  let lastHit = -Infinity;
  let fast = 0;
  let slow = 0;
  let last = performance.now();
  let raf = 0;

  const listen = (time: number) => {
    raf = requestAnimationFrame(listen);
    analyser.getFloatFrequencyData(dbs);
    const dt = Math.min(0.1, (time - last) / 1000);
    last = time;

    // a hit is the bass climbing well above the quietest it was a moment ago: each burst of the
    // bass line, not the small movements between them. It re-arms once the bass has dropped back.
    const db = (bass + power(dbs, BASS_BINS)) / 2;
    bass = db;
    peak = Math.max(db, peak - PEAK_FALL * dt);
    while (recent.length && time - recent[0].time > LOOK) recent.shift();
    recent.push({ time, db });
    const up = db - Math.min(...recent.map((r) => r.db));
    if (up < RISE / 2) armed = true;
    now.hit =
      armed && up >= RISE && db >= peak - NEAR_PEAK && db > HIT_FLOOR && time - lastHit >= HIT_GAP;
    if (now.hit) {
      armed = false;
      lastHit = time;
    }

    const loud = body(dbs, BODY_BINS);
    fast += (loud - fast) * (1 - Math.exp(-dt / FAST));
    slow += (loud - slow) * (1 - Math.exp(-dt / SLOW));
    now.swell = Math.min(1, Math.max(0, (fast - slow) / SWELL_RANGE));
    for (const fn of listeners) fn(now);
  };

  const onVisibility = () => (document.hidden ? ctx.suspend() : ctx.resume());
  document.addEventListener("visibilitychange", onVisibility);

  master.gain.setTargetAtTime(VOLUME, ctx.currentTime, GLIDE);
  source.start();
  raf = requestAnimationFrame(listen);
  play(true);

  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    master.gain.setTargetAtTime(0, ctx.currentTime, GLIDE);
    play(false);
    setTimeout(() => {
      cancelAnimationFrame(raf);
      ctx.close();
      for (const fn of listeners) fn({ swell: 0, hit: false });
    }, FADE_OUT);
  };
};
