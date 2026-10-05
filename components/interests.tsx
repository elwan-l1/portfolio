import { Suspense, lazy, useEffect, useRef, useState } from "react";

import { Title } from "@/components/title";
import { CHARS } from "@/components/trail";

import type { HomeContent } from "@/lib/content.server";
import { useBox } from "@/lib/type";

type Interest = HomeContent["interests"][number];

// each panel loads on first open, so none of them weigh on the first paint
const Fpv = lazy(() => import("@/components/fpv/fpv").then(({ Fpv }) => ({ default: Fpv })));
const Homelab = lazy(() =>
  import("@/components/homelab").then(({ Homelab }) => ({ default: Homelab })),
);
const Logos = lazy(() => import("@/components/logos").then(({ Logos }) => ({ default: Logos })));
const Printer = lazy(() =>
  import("@/components/printer").then(({ Printer }) => ({ default: Printer })),
);
const Shader = lazy(() =>
  import("@/components/shader").then(({ Shader }) => ({ default: Shader })),
);

const SIZE = 11; // px
const COVER = 260; // ms for the glyphs to cover the card
const CLEAR = 420; // ms for them to clear off the new content

const hash = (x: number, y: number) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * A layer of the cursor trail's glyphs over the card. `run(swap)` covers the
 * card in patches, calls `swap` while nothing underneath shows, then clears.
 */
const useTakeover = () => {
  const layer = useRef<HTMLPreElement>(null);
  const [box, { w, h }] = useBox<HTMLDivElement>();
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const run = (swap: () => void) => {
    const pre = layer.current;
    if (!pre || reduced() || !w) return swap();
    cancelAnimationFrame(raf.current);
    const cols = Math.ceil(w / (SIZE * 0.6));
    const rows = Math.ceil(h / SIZE);
    const seed = Math.floor(Math.random() * 1e4);
    const order = new Float32Array(cols * rows);
    const glyph: string[] = [];
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        // patches: coarse cells share an order, fine noise ragged the edges
        order[j * cols + i] =
          0.65 * hash(Math.floor(i / 6) + seed, Math.floor(j / 3)) + 0.35 * hash(i, j + seed);
        glyph.push(CHARS[Math.floor(hash(i + seed, j) * CHARS.length)]);
      }
    const draw = (on: (o: number) => boolean) => {
      let s = "";
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) s += on(order[j * cols + i]) ? glyph[j * cols + i] : " ";
        s += "\n";
      }
      pre.textContent = s;
    };
    const start = performance.now();
    let swapped = false;
    const step = (now: number) => {
      const t = now - start;
      if (t < COVER) draw((o) => o < t / COVER);
      else {
        if (!swapped) {
          swapped = true;
          swap();
        }
        const p = (t - COVER) / CLEAR;
        draw((o) => o >= p);
        if (p >= 1) return void (pre.textContent = "");
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const overlay = (
    <div
      ref={box}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none"
    >
      <pre
        ref={layer}
        className="font-text text-crust m-0 leading-none whitespace-pre"
        style={{ fontSize: SIZE }}
      />
    </div>
  );
  return { overlay, run };
};

type InterestsProps = {
  interests: Interest[];
  lab: HomeContent["homelab"];
  title: string;
  back: string;
};

const Panel = ({ interest, lab }: { interest: Interest; lab: HomeContent["homelab"] }) => {
  if (interest.slug === "design") return <Logos />;
  if (interest.slug === "homelab" && lab) return <Homelab lab={lab} />;
  if (interest.slug === "3d-printing") return <Printer />;
  if (interest.slug === "shaders") return <Shader fallback={interest.text} />;
  if (interest.slug === "fpv") return <Fpv />;
  return <p className="text-lead m-0 leading-snug font-bold tracking-[-0.02em]">{interest.text}</p>;
};

/**
 * The interests card. Picking one sweeps glyphs over the card and leaves that
 * interest in its place, with a way back to the list.
 */
export const Interests = ({ interests, lab, title, back }: InterestsProps) => {
  const [open, setOpen] = useState<Interest | null>(null);
  const { overlay, run } = useTakeover();
  const backButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<string | null>(null);

  const show = (next: Interest | null) => run(() => setOpen(next));

  // focus follows the swap: onto "back" when one opens, onto its item when it closes
  useEffect(() => {
    if (open) backButton.current?.focus({ preventScroll: true });
    else if (opener.current)
      document
        .querySelector<HTMLButtonElement>(`[data-interest="${opener.current}"]`)
        ?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && show(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  });

  return (
    <>
      {overlay}
      {open ? (
        <div className="flex flex-1 flex-col justify-between gap-4" aria-live="polite">
          <Title on="pink" glyph={open.glyph}>
            {open.name}
          </Title>
          <Suspense>
            <Panel interest={open} lab={lab} />
          </Suspense>
          <button
            ref={backButton}
            type="button"
            onClick={() => show(null)}
            className="text-body text-crust decoration-crust/40 hover:decoration-crust -my-1 cursor-pointer self-start border-0 bg-transparent px-0 py-1 underline underline-offset-4"
          >
            ← {back}
          </button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-between gap-4">
          <Title on="pink" glyph="※">
            {title}
          </Title>
          <ul className="text-body m-0 flex list-none flex-col gap-1 p-0 leading-snug">
            {interests.map((interest) => (
              <li key={interest.slug}>
                <button
                  type="button"
                  data-interest={interest.slug}
                  onClick={() => {
                    opener.current = interest.slug;
                    show(interest);
                  }}
                  className="group text-crust flex w-full cursor-pointer items-baseline gap-2.5 border-0 bg-transparent px-0 py-0.5 text-left"
                >
                  <span
                    aria-hidden
                    className="bg-crust text-pink inline-block w-[2.2ch] shrink-0 text-center font-bold"
                  >
                    {interest.glyph}
                  </span>
                  <span className="decoration-crust/0 group-hover:decoration-crust underline underline-offset-4">
                    {interest.name}
                  </span>
                  <span
                    aria-hidden
                    className="ml-auto opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                  >
                    →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};
