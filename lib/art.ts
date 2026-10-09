// compact art format, written by scripts/encode-art.ts
// line 1: id, cols, rows, palette
// line 2: colour runs over ink cells only, comma separated: colour digit then count
// then one line per row: a number is that many spaces, a b c d stand for ▒ ▓ █ &
// (& would be escaped as \u0026 in the page payload)

type Run = [color: number, text: string];

export type Art = {
  id: string;
  cols: number;
  rows: number;
  colors: string[];
  lines: Run[][];
  plain: string[];
};

/** Glyphs of the generated post art, lightest to densest. */
export const RAMP = ["▒", "%", "$", "#", "M", "W", "@", "▓", "█"];

export const GLYPHS: Record<string, string> = { a: "▒", b: "▓", c: "█", d: "&" };

export const decode = (encoded: string): Art => {
  const [header, inks, ...rows] = encoded.split("\n");
  const [id, cols, count, ...colors] = header.split(" ");
  const queue = inks ? inks.split(",").map((run) => [Number(run[0]), Number(run.slice(1))]) : [];
  let q = 0;
  let left = queue[0]?.[1] ?? 0;
  const lines: Run[][] = [];
  const plain: string[] = [];

  for (const row of rows) {
    const text = row
      .replace(/\d+/g, (n) => " ".repeat(Number(n)))
      .replace(/[abcd]/g, (c) => GLYPHS[c])
      .padEnd(Number(cols));
    const runs: Run[] = [];
    for (const ch of text) {
      // spaces take the current run's colour, so they never split a run
      let color = runs.at(-1)?.[0] ?? 0;
      if (ch !== " ") {
        if (!left) left = queue[++q][1];
        color = queue[q][0];
        left--;
      }
      const last = runs.at(-1);
      if (last && last[0] === color) last[1] += ch;
      else runs.push([color, ch]);
    }
    lines.push(runs);
    plain.push(text);
  }

  return { id, cols: Number(cols), rows: Number(count), colors, lines, plain };
};

export type Source = {
  id: string;
  cols: number;
  rows: number;
  variants: { colors: string[]; lines: [number, string][][] }[];
};

const SHORT = Object.fromEntries(Object.entries(GLYPHS).map(([short, glyph]) => [glyph, short]));
const ALLOWED = new Set([" ", "@", "#", "M", "W", "$", "%", ...Object.values(GLYPHS)]);

export const encode = (source: Source) => {
  const { colors, lines } = source.variants[0];
  const cells = lines.map((runs) =>
    runs.flatMap(([color, text]) => [...text].map((ch) => ({ ch, color }))),
  );

  const inks: [number, number][] = [];
  for (const { ch, color } of cells.flat()) {
    if (!ALLOWED.has(ch)) throw new Error(`${source.id}: glyph "${ch}" has no place in the format`);
    if (ch === " ") continue;
    const last = inks.at(-1);
    if (last && last[0] === color) last[1]++;
    else inks.push([color, 1]);
  }

  const rows = cells.map((row) =>
    row
      .map(({ ch }) => SHORT[ch] ?? ch)
      .join("")
      .trimEnd()
      .replace(/ {2,}/g, (spaces) => String(spaces.length)),
  );

  return [
    [source.id, source.cols, source.rows, ...colors].join(" "),
    inks.map(([color, n]) => `${color}${n}`).join(","),
    ...rows,
  ].join("\n");
};
