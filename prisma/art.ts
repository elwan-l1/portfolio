import { encode, RAMP } from "../lib/art";
import { hash, noise } from "../lib/noise";

const COLS = 64;
// a glyph is about twice as tall as wide, so 64 x 38 reads as a square
const ROWS = 38;
const COLORS = ["#CBA6F7", "#FFFFFF", "#FFBFE9"];

const fbm = (x: number, y: number, seed: number) =>
  noise(x, y, seed) * 0.5 +
  noise(x * 2, y * 2, seed + 1) * 0.3 +
  noise(x * 4, y * 4, seed + 2) * 0.2;

const seedOf = (slug: string) =>
  [...slug].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 12;

const edge = (r: number, limit: number) => Math.min(1, Math.max(0, (limit - r) / 0.08));

// density in 0..1 at a point of the unit square, centred on 0
type Field = (u: number, v: number) => number;

const motifs = [
  // a lit sphere
  (seed: number): Field => {
    const angle = hash(1, 1, seed) * Math.PI * 2;
    const light = [Math.cos(angle) * 0.7, Math.sin(angle) * 0.7, 0.6];
    const norm = Math.hypot(...light);
    const R = 0.8;
    return (u, v) => {
      const r2 = u * u + v * v;
      if (r2 >= R * R) return 0;
      const z = Math.sqrt(R * R - r2);
      const lit = (u * light[0] + v * light[1] + z * light[2]) / (R * norm);
      return 0.28 + 0.72 * Math.max(0, lit) + (fbm(u * 6, v * 6, seed) - 0.5) * 0.25;
    };
  },
  // ripples from a point off the centre
  (seed: number): Field => {
    const ox = (hash(2, 1, seed) - 0.5) * 0.8;
    const oy = (hash(2, 2, seed) - 0.5) * 0.8;
    const freq = 16 + hash(2, 3, seed) * 14;
    return (u, v) => {
      const f = 0.5 + 0.5 * Math.sin(Math.hypot(u - ox, v - oy) * freq);
      return f * f * edge(Math.hypot(u, v), 0.92);
    };
  },
  // a spiral galaxy
  (seed: number): Field => {
    const arms = 2 + Math.floor(hash(3, 1, seed) * 3);
    const wind = 2.5 + hash(3, 2, seed) * 2;
    return (u, v) => {
      const r = Math.hypot(u, v);
      const f = 0.5 + 0.5 * Math.sin(arms * Math.atan2(v, u) - r * wind * Math.PI * 2);
      return (f ** 1.5 * (1 - r * 0.5) + (1 - r) * 0.25) * edge(r, 0.92);
    };
  },
  // a tilted lattice of dots
  (seed: number): Field => {
    const tilt = hash(4, 1, seed) * Math.PI;
    const cells = 3 + Math.floor(hash(4, 2, seed) * 3);
    return (u, v) => {
      const x = (u * Math.cos(tilt) - v * Math.sin(tilt)) * cells;
      const y = (u * Math.sin(tilt) + v * Math.cos(tilt)) * cells;
      const d = Math.hypot(x - Math.round(x), y - Math.round(y));
      const wave = 0.5 + 0.5 * Math.sin(Math.hypot(u, v) * 7);
      return Math.max(0, 1 - d * 2.2) * (0.5 + 0.5 * wave) * edge(Math.hypot(u, v), 0.9);
    };
  },
  // contour lines of a hill
  (seed: number): Field => {
    const scale = 2 + hash(5, 1, seed) * 1.5;
    const bands = 6 + Math.floor(hash(5, 2, seed) * 5);
    return (u, v) => {
      const h = fbm(u * scale + 5, v * scale + 5, seed) * bands;
      const line = 1 - Math.min(1, Math.abs(h - Math.round(h)) * 5);
      return (0.15 + line * 0.85) * edge(Math.hypot(u, v), 0.9);
    };
  },
  // an island
  (seed: number): Field => {
    const scale = 2.5 + hash(6, 1, seed) * 2;
    return (u, v) => {
      const h = fbm(u * scale + 9, v * scale + 9, seed) - Math.hypot(u, v) * 0.55;
      return Math.min(1, Math.max(0, (h - 0.12) * 3.2));
    };
  },
];

/** A 64 x 38 piece of text art for a post, always the same for the same slug. */
export const generateArt = (slug: string) => {
  const seed = seedOf(slug);
  const field = motifs[seed % motifs.length](seed);

  const lines = Array.from({ length: ROWS }, (_, y) => {
    const runs: [number, string][] = [];
    for (let x = 0; x < COLS; x++) {
      const u = ((x + 0.5) / COLS) * 2 - 1;
      const v = ((y + 0.5) / ROWS) * 2 - 1;
      // a little grain so the glyphs do not fall into clean bands
      const density = field(u, v) + (hash(x, y, seed) - 0.5) * 0.14;
      const glyph =
        density < 0.12 ? " " : RAMP[Math.min(RAMP.length - 1, Math.floor(density * RAMP.length))];
      const color = density > 0.85 ? 1 : hash(x, y, seed + 7) < 0.3 ? 2 : 0;
      const last = runs.at(-1);
      if (last && (glyph === " " || last[0] === color)) last[1] += glyph;
      else runs.push([color, glyph]);
    }
    return runs;
  });

  return encode({ id: slug, cols: COLS, rows: ROWS, variants: [{ colors: COLORS, lines }] });
};
