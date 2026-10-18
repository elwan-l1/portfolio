import { useEffect, useRef } from "react";

import { signal } from "@/lib/sound";

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

const RING_SPEED = 60; // cells a bass hit's ring travels per second
const RING_WIDTH = 6; // cells thick
const RING_STRAYS = 0.3; // share of letters that flash once as a stray glyph near the ring
const RING_STRAY_SPREAD = 4.5; // cells, the average distance of a stray from the ring
const RING_STRAY_REACH = 12; // cells, the furthest a stray gets

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
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const mouse = matchMedia("(pointer: fine)").matches;

    const until = new Map<number, number>(); // grid cell to when it goes dark
    const lit = new Map<number, HTMLSpanElement>();
    const pool: HTMLSpanElement[] = [];
    // a letter glitches during each of its windows; a wave of the cursor joins the window it
    // overlaps, the rings of the music each get their own
    const letters = new Map<
      HTMLElement,
      { text: string; windows: { from: number; to: number; hit?: boolean }[]; shown: boolean }
    >();
    const lastWave = new WeakMap<Element, number>();
    let armed = true; // cursor left every letter since the last glitch
    let raf = 0;

    const entry = (el: HTMLElement) => {
      let l = letters.get(el);
      if (!l) letters.set(el, (l = { text: el.textContent!, windows: [], shown: false }));
      return l;
    };

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

    // every read comes before any write: a read after a write lays the page out again, which for
    // a few thousand letters, once a wave is already running, froze the page for seconds
    const spread = (text: Element, start: { x: number; y: number }, now: number) => {
      const bounds = text.getBoundingClientRect();
      const reach = WAVE_REACH * Math.hypot(bounds.width, bounds.height);
      const reached: { el: HTMLElement; d: number }[] = [];
      for (const el of text.querySelectorAll<HTMLElement>("[data-letter]")) {
        const { x, y } = centre(el);
        const d = Math.hypot(x - start.x, y - start.y) / reach;
        if (d <= 1) reached.push({ el, d });
      }
      for (const { el, d } of reached) {
        const from = now + d * WAVE_TIME;
        const to = from + 200 + 400 * (1 - d) + Math.random() * 100;
        const { windows } = entry(el);
        // a letter still glitching from the last wave keeps going: the new wave joins it, so the
        // old one is never cut off
        const running = windows.find((w) => w.from <= to && from <= w.to);
        if (running) {
          running.from = Math.min(running.from, from);
          running.to = Math.max(running.to, to);
        } else windows.push({ from, to });
      }
    };

    // a round ring runs out from `start`: each letter glitches for the moment it passes over it, so
    // only the ring is lit and the art behind it is left alone. Some letters near it, ahead and
    // behind, flash on their own: the noise round its edges.
    const shock = (art: Element, start: { x: number; y: number }, now: number) => {
      const all = Array.from(art.querySelectorAll<HTMLElement>("[data-letter]"), (el) => ({
        el,
        ...centre(el),
      }));
      const cell = all[0]?.el.getBoundingClientRect().width ?? 1;
      const at = (radius: number) => now + (radius / RING_SPEED) * 1000;
      for (const { el, x, y } of all) {
        const r = Math.hypot(x - start.x, y - start.y) / cell;
        const { windows } = entry(el);
        windows.push({ from: at(r), to: at(r + RING_WIDTH) });
        if (Math.random() >= RING_STRAYS) continue;
        const gap = Math.min(RING_STRAY_REACH, -Math.log(1 - Math.random()) * RING_STRAY_SPREAD);
        // when the ring is `gap` cells short of the letter, or `gap` cells past it
        const from = at(Math.random() < 0.5 ? r - gap : r + gap + RING_WIDTH);
        windows.push({ from, to: from + 40 + Math.random() * 80 });
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
        let live: (typeof l.windows)[number] | undefined;
        let kept = 0;
        for (const w of l.windows) {
          if (now >= w.to) continue;
          l.windows[kept++] = w;
          if (now >= w.from) live = w;
        }
        l.windows.length = kept;
        if (live) {
          if (!live.hit || Math.random() < WAVE_FLICKER) {
            live.hit = true;
            write(el, pick(CHARS));
            el.style.color = pick(COLORS);
            l.shown = true;
          }
        } else if (l.shown) {
          write(el, l.text);
          el.style.color = "";
          l.shown = false;
        }
        if (!kept && !l.shown) letters.delete(el);
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
        spread(text, centre(letter), now);
        lastWave.set(text, now);
        armed = false;
      }
      raf ||= requestAnimationFrame(frame);
    };

    const settle = () => {
      for (const [el, l] of letters) {
        if (!l.shown) continue;
        write(el, l.text);
        el.style.color = "";
      }
      letters.clear();
    };

    // a big bass hit sends a ring out from the middle of the art made for it
    const beat = () => {
      const now = performance.now();
      for (const art of document.querySelectorAll<HTMLElement>("[data-beat]")) {
        const { top, bottom, left, right } = art.getBoundingClientRect();
        if (bottom < 0 || top > innerHeight) continue;
        shock(art, { x: (left + right) / 2, y: (top + bottom) / 2 }, now);
      }
      raf ||= requestAnimationFrame(frame);
    };
    const unsignal = signal.subscribe((s) => s.hit && beat());

    if (mouse) {
      window.addEventListener("pointermove", move, { passive: true });
      // selecting starts on the real text, not on a glitch
      window.addEventListener("pointerdown", settle);
    }
    return () => {
      unsignal();
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
