import { useSyncExternalStore } from "react";

/**
 * λ, the strength of the L1 penalty on the page. Every art tile is a field of
 * weights with magnitudes spread evenly over [0, 1]; a weight is zero when its
 * magnitude is below λ, so λ is also the share of weights at zero.
 */
export const RESTING = 0.98;

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// 0 until the intro runs, on the server too, so both render the same first frame
let value = 0;
const listeners = new Set<(v: number) => void>();

export const lambda = {
  get: () => value,
  set: (v: number) => {
    value = Math.min(1, Math.max(0, v));
    for (const fn of listeners) fn(value);
  },
  subscribe: (fn: (v: number) => void) => {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  },
};

const hands = new Set<(v: number) => void>();

/** λ as moved by hand on the slider. The 3D printer scrubs its print with it. */
export const byHand = {
  subscribe: (fn: (v: number) => void) => {
    hands.add(fn);
    return () => void hands.delete(fn);
  },
  emit: (v: number) => {
    for (const fn of hands) fn(v);
  },
};

let printed: number | null = null;
const printers = new Set<() => void>();

/** How far the 3D printer's print is (0 to 1) while it is open, null when closed. */
export const print = {
  get: () => printed,
  set: (v: number | null) => {
    printed = v;
    for (const fn of printers) fn();
  },
  subscribe: (fn: () => void) => {
    printers.add(fn);
    return () => void printers.delete(fn);
  },
};

export const usePrint = () => useSyncExternalStore(print.subscribe, print.get, () => null);

export const useLambda = () => useSyncExternalStore(lambda.subscribe, lambda.get, () => 0);

let raf = 0;

/** Stops the opening so a hand on the slider wins. */
export const stopIntro = () => {
  cancelAnimationFrame(raf);
  raf = 0;
};

const ease = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

// every weight on, then the penalty rises and most slide to zero
const OPENING: [to: number, ms: number][] = [
  [0, 150],
  [RESTING, 1300],
];

export const playIntro = () => {
  if (reduced()) return lambda.set(RESTING);
  stopIntro();
  let from = lambda.get();
  let leg = 0;
  let start = performance.now();
  const step = (now: number) => {
    const [to, ms] = OPENING[leg];
    const t = Math.min(1, (now - start) / ms);
    lambda.set(from + (to - from) * ease(t));
    if (t === 1) {
      from = to;
      start = now;
      leg++;
    }
    raf = leg < OPENING.length ? requestAnimationFrame(step) : 0;
  };
  raf = requestAnimationFrame(step);
};
