import {
  KNOBS,
  PORTS,
  toPos,
  type Cable,
  type Knob,
  type Lights,
  type Port,
  type Values,
} from "./engine";

/*
 * The rack drawn as text: five eurorack modules side by side, and below them
 * room for the cables to hang. Panels are cell backgrounds, knobs filled discs
 * with an indicator line, jacks ◍, and cables runs of cells that sag between
 * two jacks. Only glyphs the art font has: ASCII and ─│█▌▐░▒▓■▪◍°·.
 */

export const COLS = 64;
export const ROWS = 30;
const RACK = 22; // rows of panel; the rest is where the cables hang
const JACK_ROWS = [16, 19]; // labels sit one row above

type Ink =
  | "text"
  | "crust"
  | "pink"
  | "red"
  | "peach"
  | "yellow"
  | "green"
  | "sky"
  | "surface2"
  | "overlay0";
type Cell = { ch: string; fg: Ink | null; bg: Ink | null };

/** Knob rows and jack rows of each module; everything is centred in its module from this. */
const SPEC = [
  {
    name: "LFO",
    icon: "~",
    w: 9,
    dark: true,
    knobs: [["lfo.rate"], ["lfo.depth"]],
    jacks: [
      [
        ["lfo.1", "1"],
        ["lfo.2", "2"],
      ],
      [
        ["lfo.3", "3"],
        ["lfo.rnd", "RND"],
      ],
    ],
  },
  {
    name: "LOOPS",
    icon: "@",
    w: 9,
    dark: false,
    knobs: [["loops.spread"], ["loops.hold"]],
    jacks: [
      [
        ["loops.pit", "PIT"],
        ["loops.gate", "GATE"],
      ],
    ],
  },
  {
    name: "VCO",
    icon: "^",
    w: 16,
    dark: true,
    knobs: [
      ["vco.cut", "vco.res"],
      ["vco.wid", "vco.wave"],
      ["vco.sub", "vco.nse"],
    ],
    jacks: [
      [
        ["vco.pit", "PIT"],
        ["vco.cut", "CUT"],
        ["vco.wid", "WID"],
      ],
      [
        ["vco.drn", "DRN"],
        ["vco.vox", "VOX"],
        ["vco.nse", "NSE"],
      ],
    ],
  },
  {
    name: "LPG",
    icon: "\\",
    w: 14,
    dark: false,
    knobs: [
      ["lpg.rise", "lpg.fall"],
      ["lpg.open", "lpg.level"],
    ],
    jacks: [
      [
        ["lpg.in", "IN"],
        ["lpg.gate", "GATE"],
      ],
      [["lpg.out", "OUT"]],
    ],
  },
  {
    name: "SPACE",
    icon: "*",
    w: 16,
    dark: true,
    knobs: [
      ["space.time", "space.fdbk"],
      ["space.size", "space.mix"],
    ],
    jacks: [
      [
        ["space.in1", "IN1"],
        ["space.in2", "IN2"],
        ["space.in3", "IN3"],
      ],
      [["space.time", "TIME"]],
    ],
  },
] satisfies {
  name: string;
  icon: string;
  w: number;
  dark: boolean;
  knobs: Knob[][];
  jacks: [Port, string][][];
}[];

let left = 0;
const MODULES = SPEC.map((spec) => {
  const x = left;
  left += spec.w;
  // knobs are 5 by 3 with a label under, so 4 rows; a blank row between rows when there is room
  const step = spec.knobs.length > 2 ? 4 : 5;
  const knobs = spec.knobs.flatMap((row, r) => {
    const gap = spec.w - row.length * 5 >= 6 ? 2 : 1;
    const start = Math.floor((spec.w - row.length * 5 - (row.length - 1) * gap) / 2);
    return row.map((id, i) => ({ id, x: x + start + i * (5 + gap), y: 3 + r * step }));
  });
  const jacks = spec.jacks.flatMap((row, r) =>
    row.map(([id, label], i) => ({
      id,
      label,
      x: x + Math.round(((i + 0.5) * spec.w) / row.length - 0.5),
      y: JACK_ROWS[r],
    })),
  );
  return { ...spec, x, knobs, jacks };
});

const [, LOOPS, , , SPACE] = MODULES;
const NOTES = { x: LOOPS.x + 1, y: 13 }; // one light per loop
const METER = { x: SPACE.x + 2, y: 12 };
const POWER = { x: SPACE.x + 10, y: 12 }; // three cells wide

const JACKS = {} as Record<Port, { x: number; y: number }>;
for (const m of MODULES) for (const jack of m.jacks) JACKS[jack.id] = jack;

const CABLE: Record<(typeof PORTS)[Port]["signal"], Ink> = {
  cv: "yellow",
  pitch: "peach",
  gate: "sky",
  audio: "green",
};

// where a knob's line ends on its rim, from fully left (7 o'clock) to fully right (5 o'clock), and how it is drawn
const RIM = [
  [1, 2],
  [0, 1],
  [1, 0],
  [2, 0],
  [3, 0],
  [4, 1],
  [3, 2],
];
const LINE = ["/", "-", "\\", "|", "/", "-", "\\"];
const DISC = [
  [1, 0],
  [2, 0],
  [3, 0],
  [0, 1],
  [1, 1],
  [2, 1],
  [3, 1],
  [4, 1],
  [1, 2],
  [2, 2],
  [3, 2],
];
const CORNERS = [
  [0, 0, "▐"],
  [4, 0, "▌"],
  [0, 2, "▐"],
  [4, 2, "▌"],
] as const; // half blocks round the disc off

const SHADE = " ░▒▓█";
const shade = (x: number) => SHADE[Math.max(0, Math.min(4, Math.round(x * 4)))];

/** A knob's value, short enough for its label. */
const readout = (id: Knob, x: number) => {
  if (id === "vco.cut" || id === "lpg.open")
    return x >= 1000 ? `${(x / 1000).toFixed(1)}k` : `${Math.round(x)}`;
  if (["lpg.rise", "lpg.fall", "loops.hold", "space.time", "space.size"].includes(id))
    return x >= 10 ? `${Math.round(x)}s` : `${x.toFixed(1)}s`;
  if (id === "vco.wid") return `${Math.round(x)}c`;
  return x.toFixed(2).replace(/^0/, "");
};

export type Held = { fixed: Port; at: [number, number] };

export type RackState = {
  values: Values;
  cables: Cable[];
  /** A cable in hand: one end still in `fixed`, the other at `at` (cells). */
  held: Held | null;
  /** The knob being turned, which shows its value instead of its label. */
  turning: Knob | null;
  power: boolean;
  lights: Lights;
};

/** The cells a cable covers from a to b (cells, fractional), sagging below both ends. */
const hang = ([ax, ay]: [number, number], [bx, by]: [number, number]) => {
  const low = Math.min(ROWS - 0.6, Math.max(ay, by) + 1.5 + Math.abs(bx - ax) * 0.09);
  const c = (8 * low - ay - by) / 6; // the control height that puts the curve's middle at `low`
  const points = Array.from({ length: 601 }, (_, i) => {
    const t = i / 600;
    const u = 1 - t;
    return [
      u ** 3 * ax + 3 * u * t * (u * ax + t * bx) + t ** 3 * bx,
      u ** 3 * ay + 3 * u * t * c + t ** 3 * by,
    ];
  });
  const cells: { x: number; y: number; ch: string }[] = [];
  points.forEach(([x, y], i) => {
    const [cx, cy] = [Math.floor(x), Math.floor(y)];
    const last = cells[cells.length - 1];
    if (last && last.x === cx && last.y === cy) return;
    const [px, py] = points[Math.max(0, i - 8)];
    const [nx, ny] = points[Math.min(points.length - 1, i + 8)];
    // a cell is 0.6 as wide as it is tall
    const a = Math.abs((Math.atan2(ny - py, (nx - px) * 0.6) * 180) / Math.PI);
    const ch =
      a < 25 || a > 155 ? "─" : a > 65 && a < 115 ? "│" : (ny - py) * (nx - px) > 0 ? "\\" : "/";
    cells.push({ x: cx, y: cy, ch });
  });
  return cells;
};

const middle = (port: Port): [number, number] => [JACKS[port].x + 0.5, JACKS[port].y + 0.5];

/** The rack as a grid of cells. */
export const compose = ({ values, cables, held, turning, power, lights }: RackState) => {
  const grid: Cell[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ ch: " ", fg: null, bg: null })),
  );
  const put = (x: number, y: number, ch: string, fg: Ink | null, bg?: Ink | null) => {
    const cell = grid[y]?.[x];
    if (!cell) return;
    cell.ch = ch;
    cell.fg = fg;
    if (bg !== undefined) cell.bg = bg;
  };
  const write = (x: number, y: number, text: string, fg: Ink | null, bg?: Ink | null) =>
    [...text].forEach((ch, i) => put(x + i, y, ch, fg, bg));

  // panels, headers, labels
  for (const m of MODULES) {
    const face = m.dark ? "crust" : "text";
    const ink = m.dark ? "text" : "crust";
    const accent = m.dark ? "pink" : "crust";
    const faint = m.dark ? "surface2" : "overlay0";
    for (let y = 0; y < RACK; y++) write(m.x, y, " ".repeat(m.w), ink, face);
    for (const y of [0, RACK - 1]) {
      put(m.x + 1, y, "°", faint);
      put(m.x + m.w - 2, y, "°", faint);
    }
    const head = m.x + Math.floor((m.w - 2 - m.name.length) / 2);
    put(head, 1, m.icon, accent);
    write(head + 2, 1, m.name, ink);
    write(m.x + 1, 2, "─".repeat(m.w - 2), faint);
    for (const { id, label, x, y } of m.jacks) {
      // outputs are labelled in reverse, as on real panels
      const out = PORTS[id].dir === "out";
      write(
        x - Math.floor((label.length - 1) / 2),
        y - 1,
        label,
        out ? face : ink,
        out ? ink : undefined,
      );
    }
    for (const { id, x, y } of m.knobs) {
      const text = turning === id ? readout(id, values[id]) : KNOBS[id].label;
      write(x + Math.floor((5 - text.length) / 2), y + 3, text, turning === id ? accent : ink);
    }
  }
  write(LOOPS.x + 1, 19, "ENO 2/1", "overlay0");

  // lights
  (["lfo.1", "lfo.2", "lfo.3", "lfo.rnd"] as const).forEach((port, i) => {
    const x = lights.lfo[i];
    put(JACKS[port].x + 1, JACKS[port].y, shade(Math.abs(x)), x >= 0 ? "pink" : "sky");
  });
  lights.loops.forEach((x, i) =>
    put(NOTES.x + i, NOTES.y, x > 0.05 ? "■" : "▪", x > 0.05 ? "red" : "overlay0"),
  );
  const level = Math.min(1, lights.level * 6);
  for (let i = 0; i < 6; i++) {
    const fill = Math.max(0, Math.min(1, level * 6 - i));
    put(METER.x + i, METER.y, fill > 0 ? shade(fill) : "·", i > 4 ? "peach" : "green");
  }
  write(METER.x, METER.y + 1, "LEVEL", "surface2");
  write(POWER.x, POWER.y, "▐■▌", power ? "pink" : "surface2");
  write(POWER.x - 1, POWER.y + 1, "POWER", power ? "pink" : "text");

  // cables, the one in hand last; panel text under a cable is printed on it
  const hanging = cables.map(({ from, to }) => ({
    a: middle(from),
    b: middle(to),
    signal: PORTS[from].signal,
  }));
  if (held) hanging.push({ a: middle(held.fixed), b: held.at, signal: PORTS[held.fixed].signal });
  for (const { a, b, signal } of hanging)
    for (const { x, y, ch } of hang(a, b)) {
      const under = grid[y]?.[x];
      if (!under) continue;
      const text = y < RACK && under.ch !== " " && under.ch !== "─";
      put(x, y, text ? under.ch : ch, "crust", CABLE[signal]);
    }
  if (held)
    put(Math.floor(held.at[0]), Math.floor(held.at[1]), "█", CABLE[PORTS[held.fixed].signal]);

  // jacks and knobs over the cables, so they can always be reached
  for (const m of MODULES) {
    const face = m.dark ? "crust" : "text";
    const ink = m.dark ? "text" : "crust";
    for (const { id, x, y } of m.jacks) {
      const plugged = held?.fixed === id || cables.some((c) => c.from === id || c.to === id);
      put(x, y, "◍", plugged ? "crust" : ink, plugged ? CABLE[PORTS[id].signal] : face);
    }
    // light knobs on dark panels, dark knobs on light ones
    const disc = m.dark ? "text" : "crust";
    const line = m.dark ? "crust" : "pink";
    for (const { id, x, y } of m.knobs) {
      for (const [dx, dy] of DISC) put(x + dx, y + dy, " ", line, disc);
      for (const [dx, dy, ch] of CORNERS) put(x + dx, y + dy, ch, disc, face);
      const turn = Math.round(toPos(KNOBS[id], values[id]) * 6);
      const [rx, ry] = RIM[turn];
      put(x + 2, y + 1, LINE[turn], line);
      put(x + rx, y + ry, LINE[turn], line);
    }
  }
  return grid;
};

const escape = (ch: string) =>
  ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch === "&" ? "&amp;" : ch;

/** Neighbouring items that share `key`, grouped. */
const runs = <T>(items: T[], key: (item: T) => unknown) => {
  const out: T[][] = [];
  for (const item of items) {
    const last = out[out.length - 1];
    if (last && key(last[0]) === key(item)) last.push(item);
    else out.push([item]);
  }
  return out;
};

const color = (ink: Ink) => `var(--color-${ink})`;

/**
 * The grid as HTML. Each row is clipped to exactly 1em: the art font's line
 * box is 1.36em, so unclipped rows paint their backgrounds over the letters of
 * the rows around them. One span per background run, coloured text inside,
 * so no seam shows where only the text colour changes.
 */
export const html = (grid: Cell[][]) =>
  grid
    .map((row) => {
      const cells = runs(row, (c) => c.bg)
        .map((block) => {
          const text = runs(block, (c) => c.fg)
            .map((run) => {
              const chars = run.map((c) => escape(c.ch)).join("");
              return run[0].fg ? `<span style="color:${color(run[0].fg)}">${chars}</span>` : chars;
            })
            .join("");
          return block[0].bg
            ? `<span style="background:${color(block[0].bg)}">${text}</span>`
            : text;
        })
        .join("");
      return `<span style="display:block;height:1em;overflow:hidden">${cells}</span>`;
    })
    .join("");

export type Hit = { port: Port } | { knob: Knob } | { power: true } | null;

/** What is under cell (x, y). */
export const hit = (x: number, y: number): Hit => {
  for (const m of MODULES) {
    for (const j of m.jacks) if (j.x === x && j.y === y) return { port: j.id };
    for (const k of m.knobs)
      if (x >= k.x && x < k.x + 5 && y >= k.y && y < k.y + 3) return { knob: k.id };
  }
  if (y === POWER.y && x >= POWER.x && x < POWER.x + 3) return { power: true };
  return null;
};

/** Whether the free end of a cable from `fixed` can go into `target`: out to in, same signal, another module. */
export const fits = (fixed: Port, target: Port) =>
  PORTS[target].signal === PORTS[fixed].signal &&
  PORTS[target].dir !== PORTS[fixed].dir &&
  target.split(".")[0] !== fixed.split(".")[0];
