import { useEffect, useRef } from "react";

import { hash } from "@/lib/noise";

const SIZE = 12;
const CELL = SIZE * 0.6;
const LINE = 14;
// half the reading column
const HALF = 384;
// the dust stops a little inside the column, in its padding
const INSET = 24;
// the gradient the dust is coloured with, from the screen edge to the reading column
const RAMP = [
  "text-pink",
  "text-mauve",
  "text-lavender",
  "text-text",
  "text-subtext1",
  "text-subtext0",
  "text-overlay2",
  "text-overlay1",
  "text-overlay0",
  "text-surface2",
  "text-surface1",
  "text-surface0",
];
const DUST = 0.028; // share of cells holding a grain
const SIDES = ["left", "right"];

// mostly dots, now and then a cross or an `@`; x counts cells in from the side's own screen edge,
// so a resize never moves what is already there
const grain = (x: number, y: number, side: number) => {
  if (hash(x, y, 41 + side * 50) > DUST) return null;
  const r = hash(x, y, 42 + side * 50);
  return r < 0.85 ? "·" : r < 0.95 ? "+" : "@";
};

const LAYER =
  "font-text pointer-events-none absolute top-0 m-0 leading-none whitespace-pre select-none";

/** While `reading`, both sides slide apart, the right one further at xl to clear the contents list. */
export const BlogBackdrop = ({ reading }: { reading: boolean }) => {
  const layers = useRef<(HTMLPreElement | null)[]>([]);

  useEffect(() => {
    const paint = () => {
      const half = innerWidth / 2;
      const cols = Math.ceil(half / CELL) + 1;
      const rows = Math.ceil(innerHeight / LINE) + 1;
      const reach = half - HALF + INSET;
      SIDES.forEach((_, side) => {
        const glyphs = new Array<string>(cols * rows).fill(" ");
        const inks = new Int8Array(cols * rows).fill(-1);
        for (let y = 0; y < rows; y++)
          for (let x = 0; x < cols; x++) {
            const u = ((x + 0.5) * CELL) / reach;
            const glyph = u < 1 && grain(x, y, side);
            if (!glyph) continue;
            // the right side is drawn from its own edge
            const i = y * cols + (side ? cols - 1 - x : x);
            const tone = u + (hash(x, y, 9 + side * 50) - 0.5) * 0.12;
            glyphs[i] = glyph;
            inks[i] = Math.max(0, Math.min(RAMP.length - 1, Math.floor(tone * RAMP.length)));
          }
        RAMP.forEach((_, ink) => {
          const layer = layers.current[side * RAMP.length + ink];
          if (!layer) return;
          let out = "";
          for (let i = 0; i < glyphs.length; i++) {
            if (i && i % cols === 0) out += "\n";
            out += inks[i] === ink ? glyphs[i] : " ";
          }
          layer.textContent = out;
        });
      });
    };

    paint();
    addEventListener("resize", paint);
    return () => removeEventListener("resize", paint);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {SIDES.map((name, side) => (
        <div
          key={name}
          className={`absolute inset-y-0 w-1/2 transition-[translate] duration-700 ease-out motion-reduce:transition-none ${side ? "right-0" : "left-0"} ${reading ? (side ? "translate-x-30 xl:translate-x-62" : "-translate-x-30") : "translate-x-0"}`}
        >
          {RAMP.map((ink, i) => (
            <pre
              key={ink}
              ref={(el) => {
                layers.current[side * RAMP.length + i] = el;
              }}
              className={`${LAYER} ${side ? "right-0" : "left-0"} ${ink}`}
              style={{ fontSize: SIZE, lineHeight: `${LINE}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
