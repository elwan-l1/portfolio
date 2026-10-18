import { useLayoutEffect, type RefObject } from "react";

import type { Art } from "@/lib/art";
import { RESTING, lambda } from "@/lib/lambda";
import { hash } from "@/lib/noise";

// a fixed seed per artwork, so its field keeps the same pattern through resizes
export const seedOf = (id: string) =>
  [...id].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 12;

/** The λ above which the art's letter at (x, y) is let through. Below it, the wall has a glyph of its own there. */
export const revealOf = (x: number, y: number, seed: number) => hash(x, y, seed + 3) * RESTING;

/**
 * Lets an art's letters through the wall as λ rises: a letter is marked `data-resolved` once λ is
 * past its `revealOf`, and globals.css keeps the others hidden. At λ = 0 the art is only wall.
 */
export const useReveal = (ref: RefObject<HTMLElement | null>, art: Art) => {
  useLayoutEffect(() => {
    const letters = Array.from(ref.current!.querySelectorAll<HTMLElement>("[data-letter]"));
    const seed = seedOf(art.id);
    // the thresholds in the order the letters come, which is reading order
    const thresholds: number[] = [];
    art.plain.forEach((row, y) =>
      Array.from(row).forEach((glyph, x) => {
        if (!/\s/.test(glyph)) thresholds.push(revealOf(x, y, seed));
      }),
    );
    const order = letters.map((_, i) => i).sort((a, b) => thresholds[a] - thresholds[b]);
    const sorted = order.map((i) => thresholds[i]);

    let open = 0; // letters let through so far, the ones with the lowest thresholds
    const apply = (l: number) => {
      let lo = 0;
      let hi = sorted.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (sorted[mid] < l) lo = mid + 1;
        else hi = mid;
      }
      for (; open < lo; open++) letters[order[open]].setAttribute("data-resolved", "");
      for (; open > lo; open--) letters[order[open - 1]].removeAttribute("data-resolved");
    };
    apply(lambda.get());
    return lambda.subscribe(apply);
  }, [ref, art]);
};
