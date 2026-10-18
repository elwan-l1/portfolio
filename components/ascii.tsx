import { Fragment, useRef, type CSSProperties } from "react";

import { Letters } from "@/components/trail";

import { useAmbient } from "@/lib/ambient";
import type { Art } from "@/lib/art";
import { useReveal } from "@/lib/reveal";

type AsciiProps = {
  art: Art;
  size: number;
  label: string;
  /** Glitches through its letters on each big bass hit, from the middle. */
  beat?: boolean;
};

const ink = (color: string) => ({
  "--ink": color.startsWith("#") ? color : `var(--color-${color})`,
});

export const Ascii = ({ art, size, label, beat }: AsciiProps) => {
  const ref = useRef<HTMLPreElement>(null);
  useAmbient(ref, art);
  useReveal(ref, art);

  return (
    <pre
      ref={ref}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="img"
      aria-label={label}
      data-glitch
      data-veiled
      data-beat={beat || undefined}
      className="ambient breathe font-text m-0 leading-none whitespace-pre"
      style={{ fontSize: size }}
    >
      {art.lines.map((runs, y) => (
        <Fragment key={y}>
          {runs.map(([color, text], i) => (
            <span key={i} style={ink(art.colors[color]) as CSSProperties}>
              <Letters text={text} />
            </span>
          ))}
          {"\n"}
        </Fragment>
      ))}
    </pre>
  );
};
