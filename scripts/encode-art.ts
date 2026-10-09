import { decode, encode, type Source } from "../lib/art";
// usage: pnpm art <generator-output.json>...
// writes assets/art/<id>.ts in the compact format of lib/art.ts, and checks it decodes back exactly
import { readFileSync, writeFileSync } from "node:fs";

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
