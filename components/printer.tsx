"use client";

import { memo, useEffect, useRef, useState, type CSSProperties } from "react";

import { byHand, print } from "@/lib/lambda";
import { useBox } from "@/lib/type";

/*
 * A 3D printer made of text, printing the L1 logo, beside its screen. The
 * bed, every printed layer, the hot end and the screen are real text; the
 * print is placed with CSS 3D transforms. Each layer prints like a slicer
 * would: the outline in █, then the inside: solid skin at the bottom, sparse
 * infill in L or 1 through the middle, solid skin to close it, and a last
 * layer that writes each cell's own letter, so the finished print is the
 * logo spelled with its name.
 * The part is the page's background colour; infill and the letters on top
 * are the card's pink. The view sways gently, never turning the logo
 * away. Dragging λ scrubs through the print, which waits there, then carries on.
 */

// ---- the part --------------------------------------------------------------

const FONT = 8; // px
const CW = FONT * 0.6; // a cell is 0.6em wide and 1em tall
const CH = FONT;
const LAYERS = 20;
const LH = 3; // px per layer

/*
 * The footprint: which letter each cell belongs to. Stems are four cells
 * wide and bars three tall, about as thick either way since a cell is 0.6 as
 * wide as it is tall, and thick enough to show infill inside the walls. The
 * 1 has the logo's flag.
 */
const SHAPE = [
  "LLLL......1111111111",
  "LLLL......1111111111",
  "LLLL......1111111111",
  "LLLL............1111",
  "LLLL............1111",
  "LLLL............1111",
  "LLLL............1111",
  "LLLL............1111",
  "LLLL............1111",
  "LLLLLLLLLLL.....1111",
  "LLLLLLLLLLL.....1111",
  "LLLLLLLLLLL.....1111",
];
const COLS = SHAPE[0].length;
const ROWS = SHAPE.length;

const BED = 150; // px, the square bed's side
const DOTS = 40; // points across the bed, set in a smaller type than the part
const DOT_FONT = BED / (DOTS * 0.6);
const OX = (BED - COLS * CW) / 2; // px: the part sits in the middle of the bed
const OY = (BED - ROWS * CH) / 2;

const filled = (x: number, y: number) => SHAPE[y]?.[x] !== undefined && SHAPE[y][x] !== ".";
const edge = (x: number, y: number) =>
  !filled(x - 1, y) || !filled(x + 1, y) || !filled(x, y - 1) || !filled(x, y + 1);

type Cell = { x: number; y: number; ch: string };

/** The outline in an order the nozzle can follow: always to the nearest cell not yet laid. */
const outline = () => {
  const left: { x: number; y: number }[] = [];
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) if (filled(x, y) && edge(x, y)) left.push({ x, y });
  const path = [left.shift()!];
  while (left.length) {
    const { x, y } = path[path.length - 1];
    let best = 0;
    for (let i = 1; i < left.length; i++)
      if (Math.hypot(left[i].x - x, left[i].y - y) < Math.hypot(left[best].x - x, left[best].y - y))
        best = i;
    path.push(...left.splice(best, 1));
  }
  return path;
};
const OUTLINE = outline();

/*
 * What each layer's inside is, as a slicer sets it: solid skin on the first
 * layers, sparse infill in the middle that stays sparse, solid skin again to
 * close it over, and on the very top the letters.
 */
const BOTTOM = 2; // solid layers at the bottom
const SKIN = 2; // solid layers under the letters
const inside = (k: number) =>
  k === LAYERS - 1 ? "letters" : k < BOTTOM || k >= LAYERS - 1 - SKIN ? "solid" : "sparse";

/** Layer `k` in print order: the outline, then its inside back and forth. */
const layer = (k: number): Cell[] => {
  const kind = inside(k);
  const top = kind === "letters";
  const fill = (x: number, y: number) =>
    top ? SHAPE[y][x] : kind === "solid" ? "█" : k % 2 ? "1" : "L";
  const cells: Cell[] = OUTLINE.map(({ x, y }) => ({ x, y, ch: top ? SHAPE[y][x] : "█" }));
  const across = k % 2 === 0;
  const [outer, inner] = across ? [ROWS, COLS] : [COLS, ROWS];
  for (let a = 0; a < outer; a++)
    for (let b = 0; b < inner; b++) {
      const along = a % 2 ? inner - 1 - b : b; // serpentine, like a real toolpath
      const [x, y] = across ? [along, a] : [a, along];
      if (filled(x, y) && !edge(x, y)) cells.push({ x, y, ch: fill(x, y) });
    }
  return cells;
};

const PLAN = Array.from({ length: LAYERS }, (_, k) => layer(k));
const PER = PLAN[0].length;
const TOTAL = LAYERS * PER;

// ---- time ------------------------------------------------------------------

const STEP = 16; // ms per step
const SPEED = 3; // cells printed per step
const PRINT = Math.ceil(TOTAL / SPEED); // steps
const HOLD = 190; // steps to admire the finished part
const EJECT = 30; // steps for it to be taken off the bed
const CYCLE = PRINT + HOLD + EJECT;
const SWAY = [18, 26]; // deg either side of the front, s per sway
const TILT = 40; // deg the bed leans back: the camera looks down on it from fairly high
const SCRUB = 2000; // ms the print waits where λ left it before carrying on
const HOTEND = 215; // °C targets
const BEDTEMP = 60;

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---- drawing ---------------------------------------------------------------

/*
 * How laid cells look. Walls and skin are solid, in the page's background
 * colour. Sparse infill is only its glyph, pink, and stays that way: the
 * layers below show through it until the skin closes over. The top layer's
 * letters are pink on the dark.
 */
const SOLID = "text-base bg-base";
const INFILL = "text-pink";
const LETTER = "text-pink bg-base";

const look = (ch: string, top: boolean) => {
  if (top) return LETTER;
  return ch === "█" ? SOLID : INFILL;
};

/** A row as runs of cells that look alike, so each run is one span. */
const runs = (row: (string | null)[], top: boolean) => {
  const out: { text: string; className?: string }[] = [];
  for (const ch of row) {
    const className = ch ? look(ch, top) : undefined;
    const last = out[out.length - 1];
    if (last && last.className === className) last.text += ch ?? " ";
    else out.push({ text: ch ?? " ", className });
  }
  return out;
};

const Plane = ({ grid, z, top }: { grid: (string | null)[][]; z: number; top: boolean }) => {
  return (
    // only the glyphs catch the pointer: blank cells let it through to whatever shows beneath,
    // so a click or a drag selects the character you see. font-text, because a pre otherwise takes
    // the page's Martian Mono, which lacks █ and has wider cells, and the columns would drift

    <pre
      className="font-text pointer-events-none absolute m-0 leading-none"
      style={{ left: OX, top: OY, transform: `translateZ(${z}px)` }}
    >
      {grid.map((row, y) => (
        <span key={y} className="block">
          {runs(row, top).map((r, i) =>
            r.className ? (
              <span key={i} className={`pointer-events-auto ${r.className}`}>
                {r.text}
              </span>
            ) : (
              r.text
            ),
          )}
        </span>
      ))}
    </pre>
  );
};

const PLIES = 3; // thin planes per layer, so no gap shows between them

/** One printed layer: the cells laid so far, as a stack of thin planes. */
const Layer = memo(({ k, count }: { k: number; count: number }) => {
  const grid: (string | null)[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (const { x, y, ch } of PLAN[k].slice(0, count)) grid[y][x] = ch;
  const z = (k + 1) * LH;
  const top = k === LAYERS - 1;
  return Array.from({ length: PLIES }, (_, i) => (
    // below the top ply the letters are just solid, like the rest of the part
    <Plane
      key={i}
      grid={grid}
      z={z - ((PLIES - 1 - i) * LH) / PLIES}
      top={top && i === PLIES - 1}
    />
  ));
});

// ---- the screen ------------------------------------------------------------

/** Temperatures that drift a few tenths, slowly, and change at most once a second. */
const temperatures = (seconds: number) => {
  const s = Math.floor(seconds);
  const drift = (a: number, p: number, q: number) =>
    a * Math.sin(s / p) + (a / 2) * Math.sin(s / q + 1);
  return { hotend: HOTEND + drift(0.5, 7, 3.3), bed: BEDTEMP + drift(0.3, 11, 5.1) };
};

const clock = (s: number) =>
  `${String(Math.floor(s / 3600)).padStart(1, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * The printer's screen, after Marlin's status screen on the full-graphic
 * LCDs most hobby printers carry: hotend and bed with their targets above
 * and readings below, the X/Y/Z strip, a progress bar, time, and the status
 * line. White on the dark, like the real thing.
 */
const Screen = ({
  hotend,
  bed,
  x,
  y,
  z,
  progress,
  time,
  status,
}: Record<string, string | number>) => {
  const bar = 14;
  const filled = Math.round((Number(progress) / 100) * bar);
  return (
    <div
      aria-label="Printer screen"
      className="border-overlay0 bg-mantle shrink-0 rounded-[4px] border"
    >
      <pre className="font-text text-text m-0 px-2 py-1.5 text-[10px] leading-[1.3]">
        {/* targets over the icons, readings under */}
        <span className="text-overlay2">{` ${HOTEND}°    ${BEDTEMP}°`}</span>
        {"\n"}
        {`  ▼      ═══`}
        {"\n"}
        {`${String(hotend).padStart(4)}°  ${String(bed).padStart(4)}°`}
        {"\n\n"}
        <span className="bg-text text-mantle">{`X${String(x).padStart(6)} Y${String(y).padStart(6)}`}</span>
        {"\n"}
        <span className="bg-text text-mantle">{`Z${String(z).padStart(6)}        `}</span>
        {"\n\n"}
        {"█".repeat(filled)}
        <span className="text-surface2">{"█".repeat(bar - filled)}</span>
        {"\n"}
        {`λ=${String(progress).padStart(3)}%  ${time}`}
        {"\n\n"}
        {status}
      </pre>
    </div>
  );
};

// ---- the printer -----------------------------------------------------------

export const Printer = () => {
  const [step, setStep] = useState(() => (reduced() ? PRINT : 0));
  const [ticks, setTicks] = useState(0); // steps since the card opened, for the sway and the temperatures
  const [held, setHeld] = useState(false); // waiting where λ left the print
  const until = useRef(0);
  const [box, { w, h }] = useBox<HTMLDivElement>();
  useEffect(() => {
    // λ, moved by hand, sets how far along the print is
    const off = byHand.subscribe((v) => {
      until.current = performance.now() + SCRUB;
      setHeld(true);
      setStep(Math.round(v * PRINT));
    });
    if (reduced()) return off;
    const id = setInterval(() => {
      const waiting = performance.now() < until.current;
      setHeld(waiting);
      if (!waiting) setStep((s) => (s + 1) % CYCLE);
      setTicks((t) => t + 1);
    }, STEP);
    return () => {
      off();
      clearInterval(id);
    };
  }, []);

  const laid = Math.min(step * SPEED, TOTAL);
  // the page's λ slider follows the print while this is open
  useEffect(() => print.set(laid / TOTAL), [laid]);
  useEffect(() => () => print.set(null), []);
  const printing = laid < TOTAL;
  const k = printing ? Math.floor(laid / PER) : LAYERS - 1;
  const cell = printing ? PLAN[k][laid % PER] : { x: COLS / 2, y: ROWS / 2 };
  const nozzleZ = printing ? (k + 1) * LH : LAYERS * LH + 14; // parked above the part when done
  const leaving = Math.max(0, step - PRINT - HOLD) / EJECT;
  const seconds = (ticks * STEP) / 1000;
  const turn = SWAY[0] * Math.sin((2 * Math.PI * seconds) / SWAY[1]);

  // fit the bed and the part into whatever room the card gives
  const size = BED * 1.3;
  const scale = w && h ? Math.min(1.3, w / size, h / (size * 0.9)) : 1;

  const { hotend, bed } = temperatures(seconds);
  const mm = (px: number) => ((px / BED) * 220).toFixed(1); // a 220 mm bed
  const nozzle: CSSProperties = {
    fontSize: 13,
    transform: `translate3d(${OX + (cell.x + 0.5) * CW}px, ${OY + (cell.y + 0.5) * CH}px, ${nozzleZ}px) rotateZ(${-turn}deg) rotateX(${-TILT}deg) translate(-50%, -100%)`,
  };

  return (
    <div className="flex items-center gap-3">
      <div
        ref={box}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="img"
        aria-label="A 3D printer, drawn in text, printing the L1 logo layer by layer"
        className="font-text tall:h-[260px] relative flex h-[220px] min-w-0 flex-1 items-center justify-center overflow-hidden"
        style={{ perspective: 600, fontSize: FONT }}
      >
        <div
          className="relative"
          style={{
            width: BED,
            height: BED,
            transformStyle: "preserve-3d",
            transform: `scale(${scale}) translateY(12px) rotateX(${TILT}deg) rotateZ(${turn}deg)`,
          }}
        >
          {/* the bed */}
          <pre
            className="font-text text-overlay0 absolute inset-0 m-0 leading-none"
            style={{ fontSize: DOT_FONT }}
          >
            {Array.from({ length: Math.round(BED / DOT_FONT) }, () => "·".repeat(DOTS)).join("\n")}
          </pre>
          {/* the part, which slides off the bed when it is done */}
          <div
            className="absolute inset-0"
            style={{ transformStyle: "preserve-3d", transform: `translateX(${leaving * 320}px)` }}
          >
            {PLAN.map((_, n) => {
              const count = Math.max(0, Math.min(PER, laid - n * PER));
              return count ? <Layer key={n} k={n} count={count} /> : null;
            })}
          </div>
          {/* the hot end: filament, heater block, nozzle */}
          <pre
            className="font-text text-overlay2 absolute top-0 left-0 m-0 origin-top-left leading-none"
            style={nozzle}
          >
            {" ┃ \n▐█▌\n ▼ "}
          </pre>
        </div>
      </div>
      <Screen
        hotend={hotend.toFixed(1)}
        bed={bed.toFixed(1)}
        x={mm(OX + cell.x * CW)}
        y={mm(OY + cell.y * CH)}
        z={(printing ? (k + 1) * 0.2 : LAYERS * 0.2).toFixed(2)}
        progress={Math.round((laid / TOTAL) * 100)}
        time={clock((Math.min(step, PRINT) * STEP) / 1000)}
        status={
          held ? "Paused" : printing ? "Printing..." : leaving ? "Remove print" : "Print done"
        }
      />
    </div>
  );
};
