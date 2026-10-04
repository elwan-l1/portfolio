/*
 * The bando, drawn as text. MAP is the site seen from above, one character
 * per square metre, the pilot at the bottom looking up it. Each character
 * stands for a column of one-metre blocks, spelled bottom to top in COLUMN:
 * a wall with a window on every floor, a floor with a hole in it, a tree.
 * The renderer and the flight model both read the same grid, so what you
 * see is what you hit. x runs right, z down the map, y up.
 */

export type V3 = [number, number, number];

// prettier-ignore
const MAP = [
  `                                                                `,
  `                                   FFF                          `,
  `     FFF                           FTF                          `,
  `     FTF                           FFF            CCCCC         `,
  `     FFF                                          CcccC         `,
  `                                                  EcccC         `,
  `                                                  EcccC         `,
  `                                                  CCCCC         `,
  `             =====================================              `,
  `             =====================================              `,
  `             ===XWWXWWXVVVVVXWWWWWXXDDXXXWWXWWX===              `,
  `             ===W,,,,,,,,,,...................V===              `,
  `             ===W,,,,,,,,,,.........oooo......V===              `,
  `             ===X,,,,,,,,,,.........oooo......X===              `,
  `             ===W,,,,,,,,,,.........oooo......W===              `,
  `             ===W,,,,,,,,,,...................W===         FFF  `,
  `             ===X.....X.....X.....X.....X.....X===         FTF  `,
  `  FFF        ===V.............................W===         FFF  `,
  `  FTF        ===V..OOOOO......................W===              `,
  `  FFF        ===X..OOOOO......................X===              `,
  `             ===D..OOOOO......................W===              `,
  `             ===D.............................W===              `,
  `             ===XWWXWWXLLLLLXRQQRVXWWXWWX.....X===              `,
  `             =====================================              `,
  `             =====================================              `,
  `                              ___                               `,
  `                              ___   KKK                         `,
  ` GGGGGGGGGGG                  ___   KKK                         `,
  ` GrrhhhhrrrG                  ___   KKK   SSSSSS                `,
  ` GrrhhhhrrrG                  ___   KKK   SSSSSS                `,
  ` GrrhhhhrrrG            NNNNNN___         SSSSSS                `,
  ` Grrhhhhrrrg            nnnnnn___                               `,
  ` grrhhhhrrrg            nnnnnn___                               `,
  ` grrhhhhrrrg            NNNNNN___                               `,
  ` Grrrrrrrrrg                  ___                               `,
  ` GrrrrrrrrrG                  ___                        FFF    `,
  ` GrrrrrrrrrG                  ___                        FTF    `,
  ` GrrrrrrrrrG                  ___                        FFF    `,
  ` GrrrrrrrrrG                  ___                               `,
  ` GGGGGGGGGGG                  ___                               `,
  `                    FFF    FFF___                               `,
  `                    FTF    FTF___                               `,
  `                    FFF    FFF___                               `,
  `                              ___            FFF                `,
  `       FFF                    ___            FTF                `,
  `       FTF                    PPP            FFF                `,
  `       FFF                    PPP                               `,
  `                              PPP                               `,
  `           FFF                                                  `,
  `           FTF                                       FFF        `,
  `           FFF                         FFF           FTF        `,
  `                                       FTF           FFF        `,
  `                                       FFF                      `,
  `                                                                `,
];

/*
 * Each column bottom to top: # concrete, p pink paint, m pink steel,
 * k mauve steel, f leaves, t bark, . air. A storey is four blocks: the
 * slab, two of room, the lintel. Characters not listed are open ground.
 */
const COLUMN: Record<string, string> = {
  X: "#############", // a pillar, or a wall with no way through
  W: "#..##..##..##", // a window on every floor
  V: "#####..##..##", // windows above a solid ground floor
  D: "#..##########", // a door
  L: "#ppp#..##..##", // the L1, sprayed on the ground floor
  Q: "#..#p..p#..##", // the window everyone goes for, sprayed round in pink
  R: "####pppp#####",
  ".": "#...#...#...#", // inside: floor, room, floor, room, roof
  ",": "#...#...#...", // where the roof came down
  o: "#...#.......", // a shaft down through the upper floors
  O: "#.......#...#", // where the first floor gave way
  C: "####################pp####", // the chimney, with a pink band near the top
  E: "..##################pp####", // and its door, the way out after dropping in
  G: "kkkkkk", // the shed
  g: "....kk",
  r: ".....k",
  N: "mmm", // a container open at both ends
  n: "..m",
  K: "kkk",
  S: "kkkmmm",
  T: "tttfff",
  F: "...fff",
};

export const MAT = { air: 0, concrete: 1, paint: 2, pink: 3, mauve: 4, leaves: 5, bark: 6 };
const CODE: Record<string, number> = { "#": 1, p: 2, m: 3, k: 4, f: 5, t: 6 };

export const SIZE: V3 = [
  MAP[0].length,
  Math.max(...Object.values(COLUMN).map((c) => c.length)),
  MAP.length,
];
const [W, H, D] = SIZE;
const grid = new Uint8Array(W * H * D);
MAP.forEach((line, z) =>
  [...line].forEach((ch, x) =>
    [...(COLUMN[ch] ?? "")].forEach((b, y) => (grid[(z * H + y) * W + x] = CODE[b] ?? 0)),
  ),
);

/** What the block at these whole coordinates is made of; 0 for air or outside the map. */
export const block = (x: number, y: number, z: number) => {
  return x < 0 || y < 0 || z < 0 || x >= W || y >= H || z >= D ? 0 : grid[(z * H + y) * W + x];
};

/** The map's character under a point on the ground, for the paths and the pad. */
export const ground = (x: number, z: number) => MAP[Math.floor(z)]?.[Math.floor(x)] ?? " ";

export type Hit = { t: number; mat: number; axis: number; sign: number; cell: number };

/**
 * The first block a ray from `o` along unit `d` meets within `max` metres,
 * stepping block to block (Amanatides and Woo's DDA), or null.
 */
export const cast = (o: V3, d: V3, max: number): Hit | null => {
  let t = 0;
  let end = max;
  let axis = 1;
  for (let a = 0; a < 3; a++) {
    const inv = 1 / (d[a] || 1e-9);
    let lo = -o[a] * inv;
    let hi = (SIZE[a] - o[a]) * inv;
    if (lo > hi) [lo, hi] = [hi, lo];
    if (lo > t) [t, axis] = [lo, a];
    end = Math.min(end, hi);
  }
  if (t > end) return null;
  const cell = [0, 1, 2].map((a) =>
    Math.min(SIZE[a] - 1, Math.max(0, Math.floor(o[a] + d[a] * (t + 1e-6)))),
  );
  const step = d.map((x) => (x > 0 ? 1 : -1));
  const delta = d.map((x) => Math.abs(1 / (x || 1e-9)));
  const next = [0, 1, 2].map(
    (a) => t + ((step[a] > 0 ? cell[a] + 1 : cell[a]) - (o[a] + d[a] * t)) / (d[a] || 1e-9),
  );
  while (t <= end) {
    const mat = block(cell[0], cell[1], cell[2]);
    if (mat)
      return { t, mat, axis, sign: -step[axis], cell: (cell[2] * H + cell[1]) * W + cell[0] };
    axis = next[0] < next[1] ? (next[0] < next[2] ? 0 : 2) : next[1] < next[2] ? 1 : 2;
    t = next[axis];
    next[axis] += delta[axis];
    cell[axis] += step[axis];
    if (cell[axis] < 0 || cell[axis] >= SIZE[axis]) return null;
  }
  return null;
};

/** About how many metres of solid the video signal passes through between two points; leaves count for little. */
export const walls = (a: V3, b: V3) => {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  let n = 0;
  for (let s = 0.5; s < len; s += 1) {
    const m = block(...(a.map((x, k) => Math.floor(x + ((b[k] - x) * s) / len)) as V3));
    n += m === MAT.leaves ? 0.1 : m ? 1 : 0;
  }
  return n;
};

/** The deepest a ball of radius `r` at `p` sits in a block or the ground: which way out, and how far. */
export const contact = (p: V3, r: number) => {
  let best = p[1] < r ? { n: [0, 1, 0] as V3, depth: r - p[1] } : null;
  const [x0, y0, z0] = p.map(Math.floor);
  for (let x = x0 - 1; x <= x0 + 1; x++)
    for (let y = y0 - 1; y <= y0 + 1; y++)
      for (let z = z0 - 1; z <= z0 + 1; z++) {
        if (!block(x, y, z)) continue;
        const c = [x, y, z].map((lo, k) => Math.min(Math.max(p[k], lo), lo + 1));
        const d: V3 = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
        const len = Math.hypot(...d);
        // a centre inside the block goes out the way it came, straight up
        const n: V3 = len > 1e-6 ? [d[0] / len, d[1] / len, d[2] / len] : [0, 1, 0];
        const depth = len > 1e-6 ? r - len : r + y + 1 - p[1];
        if (depth > 0 && (!best || depth > best.depth)) best = { n, depth };
      }
  return best;
};

export const PAD: V3 = [31.5, 0, 46.5];
/** The video receiver, on the pilot's head a few steps behind the pad. */
export const PILOT: V3 = [33.5, 1.7, 49.5];

/** A gap worth flying through: a rectangle across `axis` at `at`; `dir` is the way that counts, 0 for either. */
type Gap = {
  name: string;
  axis: 0 | 1 | 2;
  at: number;
  lo: [number, number];
  hi: [number, number];
  dir: number;
};

export const GAPS: Gap[] = [
  { name: "L1 WINDOW", axis: 2, at: 22.5, lo: [30, 5], hi: [32, 7], dir: 0 },
  { name: "BACKDOOR", axis: 2, at: 10.5, lo: [36, 1], hi: [38, 3], dir: 0 },
  { name: "SHAFT DIVE", axis: 1, at: 8.5, lo: [36, 12], hi: [40, 15], dir: -1 },
  { name: "ROOF DROP", axis: 1, at: 12.5, lo: [17, 11], hi: [27, 16], dir: -1 },
  { name: "CHIMNEY DIVE", axis: 1, at: 15, lo: [51, 4], hi: [54, 7], dir: -1 },
  { name: "CHIMNEY DOOR", axis: 0, at: 50.5, lo: [0, 5], hi: [2, 7], dir: -1 },
  { name: "CONTAINER", axis: 0, at: 27, lo: [0, 31], hi: [2, 33], dir: 0 },
  { name: "BARN DOOR", axis: 0, at: 11.5, lo: [0, 31], hi: [4, 35], dir: 0 },
  { name: "ROOF GAP", axis: 1, at: 5.5, lo: [4, 28], hi: [8, 34], dir: -1 },
  { name: "TREE GAP", axis: 2, at: 41.5, lo: [23, 0], hi: [27, 6], dir: 0 },
];

/** The gaps the segment from `a` to `b` goes through, the right way. */
export const crossed = (a: V3, b: V3) => {
  return GAPS.flatMap((g, i) => {
    const da = a[g.axis] - g.at;
    const db = b[g.axis] - g.at;
    if (da * db > 0 || da === db || (g.dir && Math.sign(db - da) !== g.dir)) return [];
    const [u, v] = ([0, 1, 2] as const).filter((k) => k !== g.axis);
    const s = da / (da - db);
    const pu = a[u] + (b[u] - a[u]) * s;
    const pv = a[v] + (b[v] - a[v]) * s;
    return pu >= g.lo[0] && pu <= g.hi[0] && pv >= g.lo[1] && pv <= g.hi[1] ? [i] : [];
  });
};

/**
 * The line the quad flies by itself while nobody has the sticks: through the
 * sprayed window, across the first floor and out the back, over the chimney
 * and down its side, through the container, and round the trees.
 */
export const LINE: V3[] = [
  [31, 6.5, 34],
  [31, 6, 22.5],
  [31, 6, 13],
  [31, 6.5, 6],
  [44, 20, 0],
  [58, 29, 5],
  [58, 5, 12],
  [50, 1.5, 36],
  [31, 1.1, 32],
  [21, 1.3, 32],
  [17, 3, 40],
  [25, 7.5, 50],
];
