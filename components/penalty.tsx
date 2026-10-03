"use client";

import { useEffect, useState } from "react";

import { byHand, lambda, playIntro, RESTING, stopIntro, useLambda, usePrint } from "@/lib/lambda";
import { artAdvance, useFonts, useWidth } from "@/lib/type";

const GLYPH = 15; // px

/**
 * The λ control: a bar drawn in the art's glyphs with a real range input over
 * it. While the 3D printer is open it follows the print instead, and scrubs it.
 * Plays the opening on mount.
 */
export const Penalty = () => {
  const weights = useLambda();
  const printing = usePrint();
  const l = printing ?? weights;
  const [touched, setTouched] = useState(false);
  const ready = useFonts();
  const [bar, width] = useWidth<HTMLLabelElement>();
  const cells = Math.max(8, Math.floor(width / (GLYPH * artAdvance(ready))));
  const filled = Math.round(l * cells);
  const zero = Math.round(l * 100);

  useEffect(() => {
    playIntro();
    return stopIntro;
  }, []);

  return (
    <div className="text-meta text-subtext0 flex flex-wrap items-center gap-x-3 whitespace-nowrap">
      <span className="text-pink text-[15px] leading-none">λ</span>
      <label
        ref={bar}
        className="outline-pink relative block min-w-[8em] flex-1 cursor-ew-resize overflow-hidden py-2 outline-offset-4 has-focus-visible:outline-2"
      >
        <span
          aria-hidden
          className="font-text block leading-none whitespace-pre"
          style={{ fontSize: GLYPH }}
        >
          <span className="text-pink">{"█".repeat(filled)}</span>
          <span className="text-overlay0">{"░".repeat(cells - filled)}</span>
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={l}
          aria-label={printing === null ? "L1 penalty λ" : "Print progress λ"}
          aria-valuetext={printing === null ? `${zero}% of weights at zero` : `${zero}% printed`}
          onPointerDown={stopIntro}
          onKeyDown={stopIntro}
          onChange={(e) => {
            stopIntro();
            setTouched(true);
            if (printing === null) lambda.set(Number(e.target.value));
            byHand.emit(Number(e.target.value));
          }}
          className="absolute inset-0 m-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </label>
      {printing === null ? (
        <span className="tabular-nums">
          <span className="text-text">{l.toFixed(2)}</span>&ensp;{zero}% zero
        </span>
      ) : (
        <span className="text-text tabular-nums">λ={zero}%</span>
      )}
      {!touched ? (
        <span className="text-pink">← drag</span>
      ) : (
        printing === null &&
        l !== RESTING && (
          <button
            type="button"
            onClick={() => lambda.set(RESTING)}
            className="text-meta text-pink decoration-pink/40 hover:decoration-pink -my-1 cursor-pointer border-0 bg-transparent px-0 py-1 underline underline-offset-4"
          >
            reset
          </button>
        )
      )}
    </div>
  );
};
