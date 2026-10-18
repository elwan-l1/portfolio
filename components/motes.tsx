import { useEffect, useRef } from "react";

import { dust } from "@/lib/art";
import { hash, noise } from "@/lib/noise";
import { signal } from "@/lib/sound";

import { art } from "@/app/fonts";

const COUNT = 160; // motes laid out; as many as the screen has room for are drawn
const AREA = 11000; // px² of screen per mote
const SIZES = [10, 12, 14]; // px, far to near
const TONES = ["overlay0", "overlay1", "overlay2", "subtext0", "lavender", "mauve"]; // dim to bright
const DRIFT = 14; // px a near mote wanders from its place
const PACE = 0.08; // steps of noise per second
const EXPAND = 36; // px a near mote moves out from the middle at a full swell
const RISE = 0.8; // s for the dust to answer a swell
const FALL = 3; // s for it to settle again

/**
 * Dust drifting over the page. Each swell in the music lights it up and breathes it outwards.
 */
export const Motes = () => {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current!;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = el.getContext("2d")!;
    const style = getComputedStyle(document.documentElement);
    const colors = TONES.map((name) => style.getPropertyValue(`--color-${name}`).trim());

    const motes = Array.from({ length: COUNT }, (_, i) => {
      const layer = Math.floor(hash(i, 5, 21) * SIZES.length);
      return {
        x: hash(i, 1, 21),
        y: hash(i, 2, 21),
        layer,
        reach: 0.4 + layer * 0.3, // how far drift and a swell move it, so near grains move more
        font: `400 ${SIZES[layer]}px ${art.family}`,
        glyph: dust(i, 0, 1)!.glyph,
      };
    });
    let target = 0;
    let bloom = 0;
    let w = 0;
    let h = 0;
    let count = 0;
    let raf = 0;
    let last = performance.now();

    const resize = () => {
      w = el.clientWidth;
      h = el.clientHeight;
      el.width = w * devicePixelRatio;
      el.height = h * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      count = Math.min(COUNT, Math.round((w * h) / AREA));
    };

    const drawDust = (now: number, dt: number) => {
      bloom += (target - bloom) * (1 - Math.exp(-dt / (target > bloom ? RISE : FALL)));
      const t = (now / 1000) * PACE;
      const lift = Math.round(bloom * 3);
      for (let i = 0; i < count; i++) {
        const m = motes[i];
        const x = m.x * w + (noise(t + i * 7.3, 0.5, 31) - 0.5) * 2 * DRIFT * m.reach;
        const y = m.y * h + (noise(t + i * 5.1, 9.5, 32) - 0.5) * 2 * DRIFT * m.reach;
        const dx = x - w / 2;
        const dy = y - h / 2;
        const out = (bloom * EXPAND * m.reach) / (Math.hypot(dx, dy) || 1);
        ctx.font = m.font;
        ctx.fillStyle = colors[Math.min(colors.length - 1, m.layer + lift)];
        ctx.fillText(m.glyph, x + dx * out, y + dy * out);
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      drawDust(now, dt);
    };

    const unsignal = signal.subscribe((s) => (target = s.swell));
    const watch = new ResizeObserver(resize);
    watch.observe(el);
    raf = requestAnimationFrame(frame);
    return () => {
      unsignal();
      watch.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 h-full w-full"
    />
  );
};
