"use client";

import { useEffect, useMemo, useRef } from "react";

import { Ascii } from "@/components/ascii";

import { decode } from "@/lib/art";
import { lambda } from "@/lib/lambda";
import { artAdvance, useBox, useFitted, useFonts } from "@/lib/type";

const GLYPHS = "▒▓█@#MW$&%";
const INKS = ["#CBA6F7", "#FFFFFF", "#FFBFE9"];
const STAR = 0.975;

const hash = (x: number, y: number, seed: number) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

/** Smooth value noise, so weights fade in patches rather than as pure static. */
const smooth = (x: number, y: number, seed: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const u = (x - xi) ** 2 * (3 - 2 * (x - xi));
  const v = (y - yi) ** 2 * (3 - 2 * (y - yi));
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

// a fixed seed per artwork, so its field keeps the same pattern through resizes
const seedOf = (id: string) =>
  [...id].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 12;

type Grid = { cols: number; rows: number; x0: number; y0: number };

type WeightsProps = {
  grid: Grid;
  taken: (x: number, y: number) => boolean;
  seed: number;
  cw: number;
  size: number;
};

/**
 * One text layer per ink, stacked. A weight is a glyph in the layer of its ink,
 * or a space once λ passes its magnitude. Cells under the art stay blank.
 */
const Weights = ({ grid, taken, seed, cw, size }: WeightsProps) => {
  const layers = useRef<(HTMLPreElement | null)[]>([]);

  const cells = useMemo(() => {
    const { cols, rows, x0, y0 } = grid;
    const n = cols * rows;
    const raw = new Float32Array(n);
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++)
        raw[j * cols + i] = 0.55 * smooth(i / 9, j / 5, seed) + 0.45 * hash(i, j, seed + 1);
    // ranks, so magnitudes spread evenly over [0, 1] and λ is exactly the share at zero
    const order = Array.from(raw.keys()).sort((a, b) => raw[a] - raw[b]);
    const magnitude = new Float32Array(n);
    order.forEach((cell, rank) => (magnitude[cell] = (rank + 0.5) / n));
    const glyph = new Array<string>(n);
    const ink = new Uint8Array(n);
    for (let c = 0; c < n; c++) {
      const i = c % cols;
      const j = (c - i) / cols;
      if (taken(x0 + i, y0 + j)) {
        magnitude[c] = -1; // the art: never drawn here, never zero
        continue;
      }
      const r = hash(i, j, seed + 2);
      glyph[c] = magnitude[c] > STAR ? "@" : GLYPHS[Math.floor(r * GLYPHS.length)];
      ink[c] = r < 0.3 ? 1 : r < 0.7 ? 0 : 2;
    }
    return { magnitude, glyph, ink };
  }, [grid, taken, seed]);

  useEffect(() => {
    const { cols, rows } = grid;
    const { magnitude, glyph, ink } = cells;
    let drawn = -1;
    const draw = (l: number) => {
      const q = Math.round(l * 2000); // redraw only when λ moves enough to change something
      if (q === drawn) return;
      drawn = q;
      const out = INKS.map(() => new Array<string>(rows * (cols + 1)));
      let k = 0;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++, k++) {
          const c = j * cols + i;
          const on = magnitude[c] >= l;
          for (let p = 0; p < INKS.length; p++) out[p][k + j] = on && ink[c] === p ? glyph[c] : " ";
        }
        for (let p = 0; p < INKS.length; p++) out[p][k + j] = "\n";
      }
      layers.current.forEach((el, p) => {
        if (el) el.textContent = out[p].join("");
      });
    };
    draw(lambda.get());
    return lambda.subscribe(draw);
  }, [grid, cells]);

  return INKS.map((color, p) => (
    <pre
      key={color}
      ref={(el) => {
        layers.current[p] = el;
      }}
      aria-hidden
      className="font-text pointer-events-none absolute m-0 leading-none whitespace-pre select-none"
      style={{ left: grid.x0 * cw, top: grid.y0 * size, color, fontSize: size }}
    />
  ));
};

type FieldProps = {
  /** Artwork in the format of lib/art.ts. */
  art: string;
  label: string;
  align?: "center" | "bottom";
  /** Space in px kept around the art inside the box. */
  inset?: number;
  /** Space in px kept clear above the art on a wide screen, for a caption over the box. */
  reserve?: number;
  /** Rows of weights above the art on a narrow screen. */
  air?: number;
};

/**
 * An artwork inside a field of weights covering its whole box. At λ = 0 the
 * art hides in a wall of text and appears as the rest goes to zero.
 */
export const Field = ({
  art: encoded,
  label,
  align = "center",
  inset = 0,
  reserve = 0,
  air = 6,
}: FieldProps) => {
  const ready = useFonts();
  const fitted = useFitted();
  const [ref, { w, h }] = useBox<HTMLDivElement>();
  const art = useMemo(() => decode(encoded), [encoded]);

  const advance = artAdvance(ready);
  const byWidth = (w - 2 * inset) / (art.cols * advance);
  const size =
    fitted && h
      ? Math.max(0, Math.min(byWidth, (h - 2 * inset - reserve) / art.rows))
      : Math.max(0, byWidth);
  const cw = advance * size;
  const boxH = fitted ? h : (art.rows + air) * size + inset;
  const left = (w - art.cols * cw) / 2;
  const top = align === "bottom" ? boxH - art.rows * size - inset : (boxH - art.rows * size) / 2;

  const taken = useMemo(() => (x: number, y: number) => (art.plain[y]?.[x] ?? " ") !== " ", [art]);

  // whole cells, so the field is only rebuilt when a row or column comes or goes
  const x0 = size ? -Math.ceil(left / cw) : 0;
  const y0 = size ? -Math.ceil(top / size) : 0;
  const cols = size ? Math.ceil((w - left) / cw) - x0 : 0;
  const rows = size ? Math.ceil((boxH - top) / size) - y0 : 0;
  const grid = useMemo<Grid | null>(
    () => (cols && rows ? { cols, rows, x0, y0 } : null),
    [cols, rows, x0, y0],
  );

  return (
    <div
      ref={ref}
      className={fitted ? "relative min-h-0 flex-1 overflow-hidden" : "relative overflow-hidden"}
      style={fitted ? undefined : { height: boxH }}
    >
      {size > 0 && grid && (
        <div className="absolute" style={{ left, top }}>
          <Weights grid={grid} taken={taken} seed={seedOf(art.id)} cw={cw} size={size} />
          <Ascii art={art} size={size} label={label} />
        </div>
      )}
    </div>
  );
};
