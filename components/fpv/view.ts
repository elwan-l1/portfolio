import { cross, dot, unit, type Quad } from "./flight";
import { cast, ground, MAT, type V3 } from "./world";

/*
 * The view, as text. Every character is worked out in plain code: a ray from
 * the camera steps through the text map block by block (world.ts), and what
 * it meets, how the sun falls on it and how far off it is pick the glyph.
 * Then the analog video link has its way with the frame, and the OSD goes on top.
 */

const HFOV = 1.05; // rad, half of a 120° lens, as fisheye as the real ones
export const HUD_ROWS = 12;
const SUN = unit([0.45, 0.62, 0.64]);

// densities for hard things and for soft ones (grass, leaves), then strokes along edges
const HARD = " .:;+=*#%@▓";
const SOFT = " .,:;io%&@8";
const STROKE = "|\\-/";
const SNOW = " .:-=+*#░▒";
const INKS = ["#CBA6F7", "#FFFFFF", "#FFBFE9"]; // mauve, white, pink
// per material: ink, soft, tone
const LOOKS: Record<number, [number, boolean, number]> = {
  [MAT.concrete]: [1, false, 1],
  [MAT.paint]: [2, false, 1.2],
  [MAT.pink]: [2, false, 0.95],
  [MAT.mauve]: [0, false, 0.95],
  [MAT.leaves]: [0, true, 0.9],
  [MAT.bark]: [0, true, 0.7],
};

const hash = (a: number, b: number) => {
  const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return h - Math.floor(h);
};
const noise = (x: number, z: number) => {
  const [i, j] = [Math.floor(x), Math.floor(z)];
  const [u, v] = [x - i, z - j].map((f) => f * f * (3 - 2 * f));
  const [a, b, c, d] = [hash(i, j), hash(i + 1, j), hash(i, j + 1), hash(i + 1, j + 1)];
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fog = (t: number) => 1 - 0.6 * Math.min(1, Math.max(0, (t - 30) / 120));

/*
 * The light on each block face and each patch of ground, worked out the
 * first time it is seen and kept: the world and the sun never move. Sun
 * where nothing stands in the way, and sky light, dimmer under a floor.
 */
const lights = new Map<number, number>();
const light = (key: number, p: V3, n: V3) => {
  let l = lights.get(key);
  if (l === undefined) {
    const o: V3 = [p[0] + n[0] * 0.01, p[1] + n[1] * 0.01, p[2] + n[2] * 0.01];
    const sun = Math.max(0, dot(n, SUN));
    const open = cast(o, [0, 1, 0], 30) ? 0.35 : 1;
    l = 0.8 * (sun && !cast(o, SUN, 60) ? sun : 0) + 0.38 * open * (0.62 + 0.38 * n[1]);
    lights.set(key, l);
  }
  return l;
};

export type Cam = { eye: V3; right: V3; up: V3; fwd: V3 };

const TILT = (25 * Math.PI) / 180; // the camera looks up from the quad's nose, as FPV cameras do

/** The FPV camera: fixed to the quad, tilted up from its nose, shaking with the motors and a lot in prop wash. */
export const camera = (quad: Quad): Cam => {
  const [right, up, back] = quad.axes();
  const shake = quad.motor * 0.006 + quad.wash * 0.03;
  const fwd = unit(
    [0, 1, 2].map(
      (k) => -back[k] * Math.cos(TILT) + up[k] * Math.sin(TILT) + (Math.random() - 0.5) * shake,
    ) as V3,
  );
  const camUp = unit(cross(right, fwd));
  return { eye: quad.p, right: cross(fwd, camUp), up: camUp, fwd };
};

/** One cell of the view: how bright, which ink, soft or hard, which surface (for outlines), how far. */
const shade = (eye: V3, d: V3) => {
  const hit = cast(eye, d, 160);
  const tg = d[1] < 0 ? -eye[1] / d[1] : Infinity;
  if (hit && hit.t < tg) {
    const n: V3 = [0, 0, 0];
    n[hit.axis] = hit.sign;
    const p = eye.map((x, k) => x + d[k] * hit.t) as V3;
    const [ink, soft, tone] = LOOKS[hit.mat];
    let tex = 0.85 + 0.3 * hash(hit.cell, hit.axis);
    if ((hit.mat === MAT.pink || hit.mat === MAT.mauve) && hit.axis !== 1)
      tex *= Math.floor((p[0] + p[2]) * 3) % 2 ? 0.75 : 1.05; // corrugated steel
    const face = hit.axis * 2 + (hit.sign > 0 ? 1 : 0);
    // for outlines, every face on one plane in one material is one surface: seams between blocks draw nothing
    const id = (face * 100 + Math.round(p[hit.axis])) * 8 + hit.mat;
    // lit at the face's middle, so a face is one tone and reads as a block
    const lit = light(
      hit.cell * 6 + face,
      p.map((x, k) => (k === hit.axis ? x : Math.floor(x) + 0.5)) as V3,
      n,
    );
    return { v: (lit * tone * tex) ** 0.7 * fog(hit.t), ink, soft, id, t: hit.t };
  }
  if (tg < Infinity) {
    const p = eye.map((x, k) => x + d[k] * tg) as V3;
    const c = ground(p[0], p[2]);
    // ground light in half-metre patches
    const [gx, gz] = [Math.floor(p[0] * 2), Math.floor(p[2] * 2)];
    const lit = light(
      -1 - ((gz + 1000) * 4000 + gx + 1000),
      [(gx + 0.5) / 2, 0, (gz + 0.5) / 2],
      [0, 1, 0],
    );
    if (c === "P") return { v: lit * 0.7, ink: 2, soft: false, id: -4, t: tg }; // the pad
    if (c === "=")
      return {
        v: lit * (0.45 + 0.1 * hash(Math.floor(p[0]), Math.floor(p[2]))) * fog(tg),
        ink: 1,
        soft: false,
        id: -3,
        t: tg,
      };
    const grain =
      Math.exp(-tg / 14) * (hash(Math.floor(p[0] * 3), Math.floor(p[2] * 3)) - 0.5) * 0.35;
    const grass = (0.45 + 0.35 * noise(p[0] / 4, p[2] / 4) + grain) * (c === "_" ? 0.55 : 1);
    return {
      v: lit * grass * 0.8 * fog(tg) * (1 - 0.5 * Math.min(1, tg / 160)),
      ink: 0,
      soft: true,
      id: -2,
      t: tg,
    };
  }
  // the sky: the Alps behind the bando, lower hills round the rest, and the sun
  const az = Math.atan2(d[0], -d[2]);
  const el = Math.asin(d[1]);
  const alps = (1 + Math.cos(az)) / 2;
  const ridge = 1 - Math.abs(2 * noise(az * 2.2 + 10, 0.5) - 1);
  const top = 0.012 + (0.015 + 0.15 * alps * alps) * ridge * ridge;
  if (el < top) {
    const snow = top > 0.06 && el > top - 0.02;
    const rock = 0.18 + 0.15 * hash(Math.floor(az * 60), Math.floor(el * 60));
    return { v: snow ? 0.45 : rock, ink: snow ? 1 : 0, soft: !snow, id: -5, t: 900 };
  }
  if (dot(d, SUN) > 0.9985) return { v: 1, ink: 1, soft: false, id: -6, t: 950 };
  return { v: 0, ink: 0, soft: false, id: -1, t: 1000 };
};

/** The view as glyphs and inks, row by row from the top. */
export const render = (cam: Cam, cols: number, rows: number) => {
  const cells: ReturnType<typeof shade>[] = [];
  const aspect = rows / (cols * 0.6);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const sx = ((i + 0.5) / cols) * 2 - 1;
      const sy = (1 - ((j + 0.5) / rows) * 2) * aspect;
      const r = Math.hypot(sx, sy) || 1e-6;
      const [c, s] = [Math.cos(r * HFOV), Math.sin(r * HFOV) / r];
      cells.push(
        shade(
          cam.eye,
          unit(
            [0, 1, 2].map((k) => cam.fwd[k] * c + (cam.right[k] * sx + cam.up[k] * sy) * s) as V3,
          ),
        ),
      );
    }
  // where one surface ends and another begins, the nearer draws a stroke along the edge
  return cells.map((cell, n) => {
    const [i, j] = [n % cols, Math.floor(n / cols)];
    let [gx, gy] = [0, 0];
    if (cell.id !== -1 && cell.t < 18)
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const o = cells[(j + dy) * cols + i + dx];
          if (!o || i + dx < 0 || i + dx >= cols || o.id === cell.id) continue;
          if (o.t > cell.t * 1.02 || (Math.abs(o.t - cell.t) <= cell.t * 0.02 && o.id < cell.id))
            [gx, gy] = [gx + dx * 0.6, gy - dy];
        }
    if (gx || gy) {
      const a = (Math.atan2(gy, gx) + Math.PI) % Math.PI;
      return { ch: STROKE[Math.round(a / (Math.PI / 4)) % 4], ink: cell.ink };
    }
    const level = Math.max(0, Math.min(10, Math.round(cell.v * 10 + (hash(i, j) - 0.5) * 0.4)));
    return { ch: (cell.soft ? SOFT : HARD)[level], ink: cell.ink };
  });
};

/**
 * The frame as analog video shows it: specks on a good link; snowy rows, torn
 * lines and lost colour as it fades; nothing but snow when it is gone.
 */
export const video = (frame: { ch: string; ink: number }[], cols: number, quality: number) => {
  const bad = 1 - quality;
  let out = "";
  for (let j = 0; j < frame.length / cols; j++) {
    const snow = Math.min(1, 0.01 + bad ** 2 * 0.85 + (Math.random() < bad * 0.2 ? 0.8 : 0));
    const tear =
      bad > 0.3 && Math.random() < bad * 0.25 ? Math.round((Math.random() - 0.5) * bad * 12) : 0;
    let ink = -1;
    for (let i = 0; i < cols; i++) {
      let { ch, ink: k } = frame[j * cols + Math.min(cols - 1, Math.max(0, i - tear))];
      if (Math.random() < snow)
        [ch, k] = [SNOW[Math.floor(Math.random() * Math.min(10, 3 + bad * 9))], 1];
      else if (Math.random() < (bad - 0.4) * 2) k = 1; // a weak signal loses its colour first
      if (ch === " ") k = Math.max(ink, 0);
      if (k !== ink) out += `${ink >= 0 ? "</span>" : ""}<span style="color:${INKS[k]}">`;
      ink = k;
      out += ch;
    }
    out += "</span>\n";
  }
  return out;
};

/** The OSD, laid out as Betaflight's: battery and time up top, link and speed below, warnings in the middle. */
export const osd = (cols: number, o: Record<string, string | undefined>) => {
  const grid = Array.from({ length: HUD_ROWS }, () => Array<string>(cols).fill(" "));
  const put = (row: number, col: number, text = "", align = 0) =>
    [...text].forEach((ch, i) => {
      const x = Math.round(col - text.length * align) + i;
      if (grid[row] && x >= 0 && x < cols) grid[row][x] = ch;
    });
  const [mid, center] = [cols / 2, HUD_ROWS / 2];
  put(1, 1, o.volts);
  put(1, mid, "L1", 0.5);
  put(1, cols - 1, o.time, 1);
  put(2, 1, o.mode);
  put(2, cols - 1, o.gaps, 1);
  put(center, mid, "-+-", 0.5);
  put(center - 3, mid, o.message, 0.5);
  put(center + 3, mid, o.warning, 0.5);
  put(HUD_ROWS - 3, 1, o.thr);
  put(HUD_ROWS - 2, 1, o.rssi);
  put(HUD_ROWS - 2, cols - 1, o.speed, 1);
  return grid.map((r) => r.join("")).join("\n");
};
