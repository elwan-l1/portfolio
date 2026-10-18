import { useEffect, useMemo, useRef } from "react";

import type { Art } from "@/lib/art";
import { signal, usePlaying } from "@/lib/sound";

/** Cells of the art, inclusive. */
export type Region = { x0: number; y0: number; x1: number; y1: number };

const SPEED = 40; // deg/s once up to speed, a turn in 9s
const SPIN_UP = 0.9; // s to get up to speed
const STOP = 30; // stiffness of the spring that brings it to rest upright, critically damped
const SMALL = 0.78; // size while the music plays, against 1 at rest
const GROW = 0.27; // how much a bass hit adds, so a hit takes it a little past its size at rest
const PUNCH = 0.2; // s for a hit to die away
const ATTACK = 0.03; // s for the size to follow a rise
const RELEASE = 0.12; // s for it to follow a fall

type ReelProps = {
  art: Art;
  /** The part of the art that turns. */
  region: Region;
  size: number;
  /** Width of one cell in px. */
  cw: number;
};

/**
 * A piece of the art drawn again on top of itself so it can turn, like the reel of a cassette: it
 * spins up with the music, shrinks a little and punches back up on each big bass hit, and slows to
 * rest upright when the music stops. The cells underneath are hidden while it moves.
 */
export const Reel = ({ art, region, size, cw }: ReelProps) => {
  const box = useRef<HTMLDivElement>(null);
  const motion = useRef({ angle: 0, speed: 0, scale: 1 });
  const playing = usePlaying();

  const mark = useMemo(() => {
    const colors = art.lines.map((runs) =>
      runs.flatMap(([color, text]) => Array.from(text, () => color)),
    );
    const cells: { x: number; y: number; glyph: string; color: string; index: number }[] = [];
    let index = 0; // which of the art's letters this is, in reading order
    art.plain.forEach((row, y) => {
      Array.from(row).forEach((glyph, x) => {
        if (/\s/.test(glyph)) return;
        const inside = x >= region.x0 && x <= region.x1 && y >= region.y0 && y <= region.y1;
        if (inside) cells.push({ x, y, glyph, color: art.colors[colors[y][x]], index });
        index++;
      });
    });
    const xs = cells.map((c) => c.x);
    const ys = cells.map((c) => c.y);
    return {
      cells,
      x0: Math.min(...xs),
      y0: Math.min(...ys),
      x1: Math.max(...xs),
      y1: Math.max(...ys),
    };
  }, [art, region]);

  useEffect(() => {
    const el = box.current!;
    const m = motion.current;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!playing && !m.angle && !m.speed) return;

    const letters = Array.from(el.parentElement!.querySelectorAll<HTMLElement>("[data-letter]"));
    const under = mark.cells.map((c) => letters[c.index]);
    const show = (turning: boolean) => {
      el.style.visibility = turning ? "visible" : "hidden";
      for (const letter of under) letter.style.visibility = turning ? "hidden" : "";
    };

    let punch = 0;
    const unsignal = signal.subscribe((s) => {
      if (s.hit) punch = 1;
    });
    // where it comes to rest: the next time it is upright, a little way on for the momentum
    const rest = Math.ceil((m.angle + m.speed * 0.5) / 360) * 360;
    let last = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (playing) m.speed += (SPEED - m.speed) * (1 - Math.exp(-dt / SPIN_UP));
      else m.speed += (STOP * (rest - m.angle) - 2 * Math.sqrt(STOP) * m.speed) * dt;
      m.angle += m.speed * dt;
      punch *= Math.exp(-dt / PUNCH);
      const target = playing ? SMALL + GROW * punch : 1;
      m.scale += (target - m.scale) * (1 - Math.exp(-dt / (target > m.scale ? ATTACK : RELEASE)));
      el.style.transform = `rotate(${-m.angle}deg) scale(${m.scale})`;

      if (playing || Math.abs(rest - m.angle) > 0.05 || Math.abs(m.speed) > 0.5) return;
      cancelAnimationFrame(raf);
      m.angle = m.speed = 0;
      m.scale = 1;
      el.style.transform = "";
      show(false);
    };

    show(true);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      unsignal();
    };
  }, [playing, mark]);

  return (
    <div
      ref={box}
      aria-hidden
      className="font-text pointer-events-none absolute leading-none"
      style={{
        left: mark.x0 * cw,
        top: mark.y0 * size,
        width: (mark.x1 - mark.x0 + 1) * cw,
        height: (mark.y1 - mark.y0 + 1) * size,
        fontSize: size,
        visibility: "hidden",
      }}
    >
      {mark.cells.map((c) => (
        <span
          key={`${c.x},${c.y}`}
          className="absolute text-center"
          style={{
            left: (c.x - mark.x0) * cw,
            top: (c.y - mark.y0) * size,
            width: cw,
            color: c.color,
          }}
        >
          {c.glyph}
        </span>
      ))}
    </div>
  );
};
