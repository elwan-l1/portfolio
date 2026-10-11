import { RAMP, decode, dust, tint } from "@/lib/art";
import { hash } from "@/lib/noise";

import font from "@/assets/glyphs";
import { CARD } from "@/constants/blog";
import { crc32, deflateSync } from "node:zlib";

const { width: WIDTH, height: HEIGHT } = CARD;
const COLS = Math.floor(WIDTH / font.width);
const ROWS = Math.floor(HEIGHT / font.height);
const X0 = Math.floor((WIDTH - COLS * font.width) / 2);
const Y0 = Math.floor((HEIGHT - ROWS * font.height) / 2);

const BACKGROUND = "#11111b";

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const alpha = Buffer.from(font.alpha, "base64");

type Cell = { glyph: string; color: string } | undefined;

const chunk = (type: string, data: Uint8Array) => {
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length);
  out.write(type, 4, "latin1");
  out.set(data, 8);
  out.writeUInt32BE(crc32(out.subarray(4, data.length + 8)), data.length + 8);
  return out;
};

// a WIDTH x HEIGHT PNG of COLS x ROWS glyphs, set in the art font
const render = (cell: (col: number, row: number) => Cell) => {
  const stride = WIDTH * 3 + 1;
  const background = rgb(BACKGROUND);
  const pixels = Buffer.alloc(stride * HEIGHT);
  for (let y = 0; y < HEIGHT; y++)
    for (let x = 0; x < WIDTH; x++) pixels.set(background, y * stride + 1 + x * 3);

  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++) {
      const drawn = cell(col, row);
      const index = drawn ? font.glyphs.indexOf(drawn.glyph) : -1;
      if (!drawn || index < 0) continue;
      const color = rgb(drawn.color);
      const mask = index * font.width * font.height;
      for (let y = 0; y < font.height; y++)
        for (let x = 0; x < font.width; x++) {
          const a = alpha[mask + y * font.width + x] / 255;
          const at = (Y0 + row * font.height + y) * stride + 1 + (X0 + col * font.width + x) * 3;
          for (let c = 0; c < 3; c++)
            pixels[at + c] = Math.round(background[c] + (color[c] - background[c]) * a);
        }
    }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(WIDTH);
  header.writeUInt32BE(HEIGHT, 4);
  header.set([8, 2], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", new Uint8Array()),
  ]);
};

// renders are pure, so each one is drawn once per process
const images = new Map<string, Uint8Array<ArrayBuffer>>();

const remember = (key: string, draw: () => Uint8Array<ArrayBuffer>) => {
  const hit = images.get(key);
  if (hit) return hit;
  const image = draw();
  images.set(key, image);
  return image;
};

type Grid = { cols: number; rows: number; cell: (x: number, y: number) => Cell };

// centred so a square crop keeps the whole art
const centred = ({ cols, rows, cell }: Grid) => {
  const left = Math.floor((COLS - cols) / 2);
  const top = Math.floor((ROWS - rows) / 2);
  return render((col, row) => {
    const x = col - left;
    const y = row - top;
    if (x >= 0 && x < cols && y >= 0 && y < rows) return cell(x, y);
    return dust(col, row);
  });
};

export const postImage = (art: string) =>
  remember(art, () => {
    const { cols, rows, colors, lines } = decode(art);
    const cells = lines.map((runs) =>
      runs.flatMap(([color, text]) => [...text].map((glyph) => ({ glyph, color: colors[color] }))),
    );
    return centred({ cols, rows, cell: (x, y) => cells[y][x] });
  });

/**
 * The blog's figure is a signed distance (negative inside) and a surface brightness at each point of
 * the unit square, centred on 0 with y growing down; `glow` lights the air around it.
 */
type Sample = { d: number; albedo: number; glow?: number };

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const unit = (x: number, y: number, z: number) => {
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
};
const circle = (u: number, v: number, cx: number, cy: number, r: number) =>
  Math.hypot(u - cx, v - cy) - r;
const box = (u: number, v: number, cx: number, cy: number, w: number, h: number, r = 0) => {
  const qx = Math.abs(u - cx) - w + r;
  const qy = Math.abs(v - cy) - h + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const segment = (u: number, v: number, ax: number, ay: number, bx: number, by: number) => {
  const t = clamp(
    ((u - ax) * (bx - ax) + (v - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2),
  );
  return Math.hypot(u - ax - (bx - ax) * t, v - ay - (by - ay) * t);
};
const turn = (u: number, v: number, angle: number): [number, number] => [
  u * Math.cos(angle) - v * Math.sin(angle),
  u * Math.sin(angle) + v * Math.cos(angle),
];

// arcs around (cx, cy) within 0.45 rad of `heading`, dimmer with each ring
const signal = (u: number, v: number, cx: number, cy: number, heading: number) => {
  const angle = Math.atan2(v - cy, u - cx);
  if (Math.abs(Math.atan2(Math.sin(angle - heading), Math.cos(angle - heading))) > 0.45) return 0;
  const reach = Math.hypot(u - cx, v - cy);
  for (let k = 1; k <= 4; k++)
    if (Math.abs(reach - k * 0.15) < 0.022) return 0.85 - (k - 1) * 0.125;
  return 0;
};

// the dish centre in card space, where the signal starts
const DISH = turn(0, 0.36, 0.35).map((n, i) => n + [0.05, -0.2][i]) as [number, number];

const satellite = (u: number, v: number): Sample => {
  const [x, y] = turn(u - 0.05, v + 0.2, -0.35);
  const body = box(x, y, 0, 0, 0.13, 0.17, 0.03);
  const panels = Math.min(box(x, y, -0.5, 0, 0.3, 0.13), box(x, y, 0.5, 0, 0.3, 0.13));
  const strut = segment(x, y, -0.2, 0, 0.2, 0) - 0.012;
  const dish = Math.max(circle(x, y, 0, 0.32, 0.16), -circle(x, y, 0, 0.42, 0.17));
  const grid = panels < 0 && (Math.abs(((x + 1) % 0.1) - 0.05) < 0.008 || Math.abs(y) < 0.008);
  return {
    d: Math.min(body, panels, strut, dish),
    albedo: grid ? 0.25 : panels < 0 ? 0.7 : dish < 0 ? 0.9 : 0.55,
    glow: signal(u, v, ...DISH, 1.9),
  };
};

// 64 x 38 like a post's art: a glyph is about twice as tall as wide, so it reads as a square
const FIGURE_COLS = 64;
const FIGURE_ROWS = 38;
const STEP = 2 / FIGURE_COLS;
const LIGHT = unit(-0.5, -0.6, 0.62);
// a surface swells like a cushion near its edge, so the light can model it
const swell = (d: number) => Math.sqrt(clamp(-d / 0.2));

// lit from the top left with a specular highlight; just outside the edge, sparse glyphs fray it
const brightness = (u: number, v: number, x: number, y: number) => {
  const { d, albedo, glow = 0 } = satellite(u, v);
  if (d >= 0) return Math.max(glow, d < 0.05 && hash(x, y, 8) < 0.35 * (1 - d / 0.05) ? 0.35 : 0);
  const dx = swell(satellite(u + STEP, v).d) - swell(satellite(u - STEP, v).d);
  const dy = swell(satellite(u, v + STEP).d) - swell(satellite(u, v - STEP).d);
  const [nx, ny, nz] = unit(-dx * 2.2, -dy * 2.2, 1);
  const lit = clamp(nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
  return Math.max(glow, clamp(albedo * (0.3 + 0.8 * lit) + lit ** 14 * 0.35));
};

export const blogImage = () =>
  remember("blog", () =>
    centred({
      cols: FIGURE_COLS,
      rows: FIGURE_ROWS,
      cell: (x, y) => {
        const u = ((x + 0.5) / FIGURE_COLS) * 2 - 1;
        const v = ((y + 0.5) / FIGURE_ROWS) * 2 - 1;
        // a little grain so the glyphs do not fall into clean bands
        const density = brightness(u, v, x, y) + (hash(x, y, 7) - 0.5) * 0.12;
        if (density < 0.12) return dust(x + 900, y);
        const glyph = RAMP[Math.min(RAMP.length - 1, Math.floor(density * RAMP.length))];
        return { glyph, color: tint(x, y, density) };
      },
    }),
  );
