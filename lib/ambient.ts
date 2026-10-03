import { useEffect, type RefObject } from "react";

const SHADE = 0.35; // how much a passing shadow dims a glyph at most
const LEVELS = 8; // steps of dimming, so a glyph is only touched when its step changes
const SCALE = 2.4; // shadows across the image's height
const DRIFT = 0.035; // image heights per second, about the pace of clouds
const TICK = 66; // ms between updates

const hash = (x: number, y: number) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

/** Smooth value noise in [0, 1]. */
const noise = (x: number, y: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const u = (x - xi) ** 2 * (3 - 2 * (x - xi));
  const v = (y - yi) ** 2 * (3 - 2 * (y - yi));
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

// two octaves drifting at different speeds and headings, like clouds
const clouds = (x: number, y: number, t: number) =>
  noise(x + t * DRIFT, y + t * DRIFT * 0.4) * 0.7 +
  noise(x * 2.3 - t * DRIFT * 0.6, y * 2.3 + t * DRIFT * 0.9) * 0.3;

/**
 * Cloud shadows drifting over an image made of `[data-letter]` glyphs. A
 * shadow sets a glyph's `--shade`, which `.ambient` in globals.css mixes into
 * its colour. Runs while the image is on screen, not under reduced motion.
 */
export const useAmbient = (ref: RefObject<HTMLElement | null>, image: unknown) => {
  useEffect(() => {
    const root = ref.current;
    if (!root || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-letter]"));
    const level = new Uint8Array(els.length);
    let xs: Float32Array | null = null; // glyph centres, in image heights
    let ys: Float32Array | null = null;
    let raf = 0;
    let last = 0;
    const seed = Math.random() * 100; // each image gets its own sky

    const measure = () => {
      const box = root.getBoundingClientRect();
      if (!box.height) return false;
      xs = new Float32Array(els.length);
      ys = new Float32Array(els.length);
      els.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        xs![i] = (r.left + r.width / 2 - box.left) / box.height;
        ys![i] = (r.top + r.height / 2 - box.top) / box.height;
      });
      return true;
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < TICK) return;
      last = now;
      if (!xs && !measure()) return;
      const t = now / 1000 + seed;
      for (let i = 0; i < els.length; i++) {
        const n = clouds(xs![i] * SCALE, ys![i] * SCALE, t);
        const shade = Math.min(1, Math.max(0, (n - 0.5) / 0.25)); // only denser parts cast a shadow
        const step = Math.round(shade * shade * (3 - 2 * shade) * LEVELS);
        if (step === level[i]) continue;
        level[i] = step;
        if (step) els[i].style.setProperty("--shade", `${(SHADE * 100 * step) / LEVELS}%`);
        else els[i].style.removeProperty("--shade");
      }
    };

    const seen = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf);
      raf = entry.isIntersecting ? requestAnimationFrame(tick) : 0;
    });
    seen.observe(root);
    return () => {
      seen.disconnect();
      cancelAnimationFrame(raf);
      for (const el of els) el.style.removeProperty("--shade");
    };
  }, [ref, image]);
};
