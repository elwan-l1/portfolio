"use client";

import { useEffect, useRef } from "react";

export const CHARS = "L1█";
const COLORS = ["#CBA6F7", "#FFFFFF", "#FFBFE9"];

const GLYPH = 6; // px
const CW = GLYPH * 0.6; // one text cell
const CH = GLYPH;
const RADIUS = 28; // px of glitching text around the cursor
const DENSITY = 0.5; // share of cells lit right under the cursor
const HOLD = 500; // ms a glyph keeps glitching after the cursor passes

const WAVE_TIME = 900; // ms for a glitch to run through the text the cursor touches
const WAVE_REACH = 0.55; // share of that text's diagonal it covers before dying out
const WAVE_FLICKER = 0.2; // chance per frame that a glitching letter changes
const REARM = 250; // ms before the same text can glitch again

const pick = <T,>(s: ArrayLike<T>) => s[Math.floor(Math.random() * s.length)];

const centre = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

// changes a letter in place: a new text node would drop a selection ending in it
const write = (el: HTMLElement, c: string) => {
  (el.firstChild as Text).data = c;
};

/** Glitching glyphs following the mouse. Touching `data-glitch` text sends a glitch through its letters. */
export const Trail = () => {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = layer.current!;
    if (!matchMedia("(pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const until = new Map<number, number>(); // grid cell to when it goes dark
    const lit = new Map<number, HTMLSpanElement>();
    const pool: HTMLSpanElement[] = [];
    const letters = new Map<
      HTMLElement,
      { from: number; to: number; text: string; hit?: boolean }
    >();
    const lastWave = new WeakMap<Element, number>();
    let armed = true; // cursor left every letter since the last glitch
    let raf = 0;

    const light = (key: number, gx: number, gy: number, t: number) => {
      until.set(key, Math.max(until.get(key) ?? 0, t));
      if (lit.has(key)) return;
      let el = pool.pop();
      if (!el) {
        el = document.createElement("span");
        box.appendChild(el);
      }
      el.style.transform = `translate(${gx * CW}px,${gy * CH}px)`;
      el.textContent = pick(CHARS);
      el.style.color = pick(COLORS);
      el.style.visibility = "";
      lit.set(key, el);
    };

    const spread = (text: Element, origin: Element, now: number) => {
      const start = centre(origin);
      const bounds = text.getBoundingClientRect();
      const reach = WAVE_REACH * Math.hypot(bounds.width, bounds.height);
      for (const el of text.querySelectorAll<HTMLElement>("[data-letter]")) {
        const { x, y } = centre(el);
        const d = Math.hypot(x - start.x, y - start.y) / reach;
        if (d > 1) continue;
        const from = now + d * WAVE_TIME;
        const to = from + 200 + 400 * (1 - d) + Math.random() * 100;
        // a letter still glitching from the last wave resets, so the new one shows at once
        const original = letters.get(el)?.text ?? el.textContent!;
        write(el, original);
        el.style.color = "";
        letters.set(el, { from, to, text: original });
      }
    };

    const frame = (now: number) => {
      for (const [key, el] of lit) {
        if (now >= until.get(key)!) {
          el.style.visibility = "hidden";
          lit.delete(key);
          until.delete(key);
          pool.push(el);
        } else if (Math.random() < 0.4) {
          el.textContent = pick(CHARS);
          el.style.color = pick(COLORS);
        }
      }
      for (const [el, l] of letters) {
        if (now >= l.to) {
          write(el, l.text);
          el.style.color = "";
          letters.delete(el);
        } else if (now >= l.from && (!l.hit || Math.random() < WAVE_FLICKER)) {
          l.hit = true;
          write(el, pick(CHARS));
          el.style.color = pick(COLORS);
        }
      }
      raf = lit.size || letters.size ? requestAnimationFrame(frame) : 0;
    };

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const { clientX: mx, clientY: my } = e;
      const now = performance.now();
      for (let gy = Math.floor((my - RADIUS) / CH); gy <= (my + RADIUS) / CH; gy++) {
        for (let gx = Math.floor((mx - RADIUS) / CW); gx <= (mx + RADIUS) / CW; gx++) {
          const d = Math.hypot((gx + 0.5) * CW - mx, (gy + 0.5) * CH - my) / RADIUS;
          // dense near the cursor, sparse at the edge
          if (d >= 1 || Math.random() > DENSITY * (1 - d)) continue;
          light(gy * 100000 + gx, gx, gy, now + HOLD * (1 - d) + Math.random() * 150);
        }
      }
      // a glitch starts on a letter, not on the blank space around it
      const letter = e.target instanceof Element ? e.target.closest("[data-letter]") : null;
      const text = letter?.closest("[data-glitch]");
      const selection = getSelection();
      const selecting =
        e.buttons !== 0 ||
        (text && selection && !selection.isCollapsed && selection.containsNode(text, true));
      if (!letter) armed = true;
      else if (text && armed && !selecting && now - (lastWave.get(text) ?? -Infinity) > REARM) {
        spread(text, letter, now);
        lastWave.set(text, now);
        armed = false;
      }
      raf ||= requestAnimationFrame(frame);
    };

    const settle = () => {
      for (const [el, l] of letters) {
        write(el, l.text);
        el.style.color = "";
      }
      letters.clear();
    };

    window.addEventListener("pointermove", move, { passive: true });
    // selecting starts on the real text, not on a glitch
    window.addEventListener("pointerdown", settle);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", settle);
      box.replaceChildren();
      settle();
    };
  }, []);

  return (
    <div
      ref={layer}
      aria-hidden
      className="ascii-layer pointer-events-none fixed inset-0 z-50 overflow-hidden select-none"
      style={{ fontSize: GLYPH }}
    />
  );
};

/** Text split into letters a glitch can run through. Goes inside an element marked `data-glitch`. */
export const Letters = ({ text }: { text: string }) =>
  (text.match(/\s+|\S/gu) ?? []).map((c, i) =>
    /\s/.test(c) ? (
      c
    ) : (
      <span key={i} data-letter>
        {c}
      </span>
    ),
  );
