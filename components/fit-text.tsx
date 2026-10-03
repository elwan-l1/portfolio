"use client";

import { useMemo } from "react";

import { font, useFonts, useWidth } from "@/lib/type";

import { measureNaturalWidth, prepareWithSegments } from "@chenglou/pretext";

const TRACKING = -0.045; // em

type FitTextProps = {
  lines: string[];
  weight?: number;
  /** Blank space in em the font leaves left of the first letter and right of the last. */
  bearings?: [left: number, right: number];
  className?: string;
};

/** Lines set at the one size where the longest spans the container exactly. */
export const FitText = ({ lines, weight = 700, bearings = [0, 0], className }: FitTextProps) => {
  const ready = useFonts();
  const [ref, width] = useWidth<HTMLDivElement>();
  const widest = useMemo(() => {
    const longest = Math.max(...lines.map((line) => line.length));
    if (!ready) return longest * (70 + TRACKING * 100); // monospace estimate until the font is in
    const measure = (line: string) =>
      measureNaturalWidth(
        prepareWithSegments(line, font(100, weight), { letterSpacing: TRACKING * 100 }),
      );
    return Math.max(...lines.map(measure));
  }, [lines, weight, ready]);
  const [left, right] = bearings;
  const size = width ? (width / (widest - (left + right) * 100)) * 100 : 0;

  return (
    <div ref={ref} className={className}>
      {lines.map((line) => (
        <div
          key={line}
          className="whitespace-pre"
          style={{
            fontSize: size,
            fontWeight: weight,
            letterSpacing: `${TRACKING}em`,
            lineHeight: 0.92,
            marginLeft: `${-left}em`,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
};
