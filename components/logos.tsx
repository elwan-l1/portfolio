"use client";

import { useEffect, useRef, useState } from "react";

import { decode, type Art } from "@/lib/art";
import { artAdvance, useBox, useFonts } from "@/lib/type";

import aiMatters from "@/assets/art/ai-matters";
import honics from "@/assets/art/honics";
import octavia from "@/assets/art/octavia";
import pathsta from "@/assets/art/pathsta";
import { LOGOS as LIST } from "@/constants/logos";

/*
 * Logos I drew, drawn in text by ascii/generate.py in the card's dark ink,
 * straight on the card, with the real logo lying under the text. Where the pointer passes, the glyphs lift off in an L1
 * ball, a diamond, and the logo shows through; a moment later the text grows
 * back over it, glyph by glyph. The real logo is cut to the text's own box
 * (public/logos), so the two line up cell for cell.
 */

const ARTS: Record<string, Art> = {
  "ai-matters": decode(aiMatters),
  honics: decode(honics),
  octavia: decode(octavia),
  pathsta: decode(pathsta),
};
const REACH = 10; // the diamond's radius, in cell heights
const FRAY = 4; // how far in from its edge the glyphs are all gone
const HOLD = 7500; // ms a passed cell stays fully open
const HEAL = 2500; // ms for the glyphs to grow back after that, so the text is whole again 10 s on
const OPEN = 1 + HOLD / HEAL; // a passed cell's opening, which drops by 1 every HEAL ms
const FOCUS = 500; // ms for the whole logo to open under keyboard focus
const ADVANCE = 0.6; // a cell's width in cell heights, which the diamond is measured in

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const hash = (x: number, y: number, seed: number) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

const escape = (ch: string) => (ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch);

/** A logo's glyph and ink per cell, and how open each cell must be before its glyph lifts. */
const cells = (art: Art, seed: number) => {
  const { cols, rows } = art;
  const glyph = art.plain.join("");
  const ink = new Uint8Array(cols * rows);
  art.lines.forEach((runs, j) => {
    let i = j * cols;
    for (const [c, text] of runs) for (const _ of text) ink[i++] = c;
  });
  const lift = Float32Array.from(
    { length: cols * rows },
    (_, c) => 0.05 + 0.9 * hash(c % cols, Math.floor(c / cols), seed),
  );
  return { glyph, ink, lift };
};

const LOGOS = LIST.map((l, k) => ({ ...l, art: ARTS[l.id], ...cells(ARTS[l.id], k * 31 + 7) }));
const { cols, rows } = LOGOS[0].art;

type State = {
  /** How open each cell is: 0 is text, anything over its `lift` shows the logo. */
  open: Float32Array;
  /** The pointer, in cells, and where it was last frame. */
  at: [number, number] | null;
  was: [number, number] | null;
  focused: boolean;
  /** Something changed that the next frame must draw. */
  dirty: boolean;
};
const fresh = (): State => ({
  open: new Float32Array(cols * rows),
  at: null,
  was: null,
  focused: false,
  dirty: true,
});

/** Open the cells in the diamond around (x, y). True if a glyph lifted. */
const stamp = (open: Float32Array, lift: Float32Array, x: number, y: number) => {
  let lifted = false;
  const i0 = Math.max(0, Math.floor(x - REACH / ADVANCE));
  const i1 = Math.min(cols - 1, Math.ceil(x + REACH / ADVANCE));
  const j0 = Math.max(0, Math.floor(y - REACH));
  const j1 = Math.min(rows - 1, Math.ceil(y + REACH));
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) {
      const d = Math.abs(i + 0.5 - x) * ADVANCE + Math.abs(j + 0.5 - y);
      const c = j * cols + i;
      // the edge frays: the further out, the fewer glyphs lift, but every one that does stays the full time
      if ((REACH - d) / FRAY <= lift[c] || open[c] >= OPEN) continue;
      lifted ||= open[c] <= lift[c];
      open[c] = OPEN;
    }
  return lifted;
};

/** The text with the lifted glyphs gone, and the lifted cells as a clip path for the logo under it. */
const draw = (logo: (typeof LOGOS)[number], open: Float32Array, cw: number, ch: number) => {
  const { glyph, ink, lift, art } = logo;
  const colours = art.colors;
  let text = "";
  let path = "";
  for (let j = 0; j < rows; j++) {
    let run = -1;
    let hole = -1; // where the current run of lifted cells began
    for (let i = 0; i <= cols; i++) {
      const c = j * cols + i;
      const lifted = i < cols && open[c] > lift[c];
      if (lifted && hole < 0) hole = i;
      if (!lifted && hole >= 0) {
        path += `M${hole * cw} ${j * ch}H${i * cw}V${(j + 1) * ch}H${hole * cw}Z`;
        hole = -1;
      }
      if (i === cols) break;
      const shown = !lifted && glyph[c] !== " ";
      const k = shown ? ink[c] : run; // a space joins whatever run it is in
      if (k !== run) {
        if (run >= 0) text += "</span>";
        text += `<span style="color:${colours[k]}">`;
        run = k;
      }
      text += shown ? escape(glyph[c]) : " ";
    }
    if (run >= 0) text += "</span>";
    text += "\n";
  }
  return { text, path };
};

export const Logos = () => {
  const ready = useFonts();
  const [box, { w, h }] = useBox<HTMLDivElement>();
  const pres = useRef<(HTMLPreElement | null)[]>([]);
  const imgs = useRef<(HTMLImageElement | null)[]>([]);
  const states = useRef<State[]>([]);
  const raf = useRef(0);
  const [named, setNamed] = useState<string | null>(null);

  // two by two, or all in a row where the box is wide enough for that to draw them bigger
  const across = w > 2.2 * h ? 4 : 2;
  const advance = artAdvance(ready);
  const size = w && h ? 0.92 * Math.min(w / across / (cols * advance), h / (4 / across) / rows) : 0;

  const paint = (all = false) => {
    LOGOS.forEach((logo, k) => {
      const s = states.current[k];
      const pre = pres.current[k];
      const img = imgs.current[k];
      if (!s || !(s.dirty || all) || !pre || !img) return;
      s.dirty = false;
      // the cells' size in px as laid out, for the clip path
      const r = pre.getBoundingClientRect();
      const { text, path } = draw(logo, s.open, r.width / cols, r.height / rows);
      pre.innerHTML = text;
      img.style.clipPath = path ? `path("${path}")` : "";
      img.style.visibility = path ? "visible" : "hidden";
    });
  };

  const run = () => {
    if (raf.current) return;
    let last = 0;
    const step = (now: number) => {
      const dt = last ? now - last : 16;
      last = now;
      let live = false;
      states.current.forEach((s, k) => {
        const { open } = s;
        const { lift } = LOGOS[k];
        if (reduced()) {
          // no motion: the whole logo while it is pointed at or focused, the text otherwise
          open.fill(s.at || s.focused ? OPEN : 0);
          s.dirty = true;
          return;
        }
        // redraw only when a glyph lifts or comes back, not every frame a hole stays open
        let any = false;
        for (let c = 0; c < open.length; c++) {
          if (open[c] <= 0 && !s.focused) continue;
          any = true;
          const was = open[c] > lift[c];
          open[c] = Math.max(0, open[c] - dt / HEAL);
          if (s.focused) open[c] = Math.min(OPEN, open[c] + dt / FOCUS + dt / HEAL);
          if (was !== open[c] > lift[c]) s.dirty = true;
        }
        if (s.at) {
          // stamp along the way from last frame, so a fast pass leaves no gaps
          const [x, y] = s.at;
          const [x0, y0] = s.was ?? s.at;
          const steps = Math.max(1, Math.ceil(Math.abs(x - x0) * ADVANCE + Math.abs(y - y0)));
          for (let t = 1; t <= steps; t++)
            if (stamp(open, lift, x0 + ((x - x0) * t) / steps, y0 + ((y - y0) * t) / steps))
              s.dirty = true;
          s.was = s.at;
        }
        live ||= any || !!s.at || s.focused;
      });
      paint();
      raf.current = live ? requestAnimationFrame(step) : 0;
    };
    raf.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    states.current = LOGOS.map(fresh);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  // everything redraws at the new size
  useEffect(() => paint(true));

  const point = (k: number, e: { clientX: number; clientY: number } | null) => {
    const s = states.current[k];
    const pre = pres.current[k];
    if (!s || !pre) return;
    if (e) {
      const r = pre.getBoundingClientRect();
      s.at = [((e.clientX - r.left) / r.width) * cols, ((e.clientY - r.top) / r.height) * rows];
    } else s.at = s.was = null;
    run();
  };

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <div
        ref={box}
        className="tall:h-[240px] grid h-[200px] overflow-hidden"
        style={{ gridTemplateColumns: `repeat(${across}, 1fr)` }}
      >
        {LOGOS.map((logo, k) => (
          <div
            key={logo.id}
            // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
            className="flex touch-pan-y items-center justify-center outline-offset-[-2px]"
            onPointerEnter={() => setNamed(logo.name)}
            onPointerMove={(e) => point(k, e)}
            onPointerDown={(e) => point(k, e)}
            onPointerLeave={() => point(k, null)}
            onFocus={(e) => {
              if (!e.currentTarget.matches(":focus-visible") || !states.current[k]) return;
              states.current[k].focused = true;
              setNamed(logo.name);
              run();
            }}
            onBlur={() => {
              if (states.current[k]) states.current[k].focused = false;
            }}
          >
            <div className="relative">
              {/* oxlint-disable-next-line nextjs/no-img-element */}
              <img
                ref={(el) => {
                  imgs.current[k] = el;
                }}
                src={`/logos/${logo.id}.avif`}
                alt=""
                draggable={false}
                className="invisible absolute inset-0 h-full w-full select-none"
              />
              <pre
                ref={(el) => {
                  pres.current[k] = el;
                }}
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
                role="img"
                aria-label={`The ${logo.name} logo, drawn in text`}
                className="font-text relative m-0 leading-none whitespace-pre"
                style={{ fontSize: size }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="font-text text-meta text-crust m-0 flex flex-wrap justify-between gap-x-3 whitespace-nowrap">
        <span>{named ?? "Logos I drew"}</span>
        <span className="opacity-60">pass over one to see it</span>
      </p>
    </div>
  );
};
