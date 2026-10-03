import { decode, GLYPHS } from "../lib/art";
// usage: pnpm art <generator-output.json>...
// writes assets/art/<id>.ts in the compact format of lib/art.ts, and checks it decodes back exactly
import { readFileSync, writeFileSync } from "node:fs";

type Source = {
  id: string;
  cols: number;
  rows: number;
  variants: { colors: string[]; lines: [number, string][][] }[];
};

const SHORT = Object.fromEntries(Object.entries(GLYPHS).map(([short, glyph]) => [glyph, short]));
const ALLOWED = new Set([" ", "@", "#", "M", "W", "$", "%", ...Object.values(GLYPHS)]);

const encode = (source: Source) => {
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

const check = (source: Source, encoded: string) => {
  const art = decode(encoded);
  source.variants[0].lines.forEach((runs, y) => {
    const want = runs.flatMap(([color, text]) => [...text].map((ch) => ({ ch, color })));
    const got = art.lines[y].flatMap(([color, text]) => [...text].map((ch) => ({ ch, color })));
    want.forEach(({ ch, color }, x) => {
      const cell = got[x];
      if (cell?.ch !== ch || (ch !== " " && cell.color !== color))
        throw new Error(`${source.id}: cell ${x},${y} does not decode back`);
    });
  });
};

for (const path of process.argv.slice(2)) {
  const source: Source = JSON.parse(readFileSync(path, "utf8"));
  const encoded = encode(source);
  check(source, encoded);
  const out = `assets/art/${source.id}.ts`;
  writeFileSync(out, `export default ${JSON.stringify(encoded)};\n`);
  console.log(`${out}: ${readFileSync(path).length} B -> ${Buffer.byteLength(encoded)} B`);
}
