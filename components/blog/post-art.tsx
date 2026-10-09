import { Fragment, useMemo } from "react";

import { decode } from "@/lib/art";

// the art font is 0.6 em wide per glyph
const ADVANCE = 0.6;

// static spans: the animated home art would put thousands of nodes per post in the list
export const PostArt = ({ art, size }: { art: string; size: number }) => {
  const { cols, colors, lines } = useMemo(() => decode(art), [art]);

  return (
    <pre
      aria-hidden
      className="font-text m-0 shrink-0 overflow-hidden leading-none whitespace-pre select-none"
      style={{ fontSize: size / (cols * ADVANCE), width: size, height: size }}
    >
      {lines.map((runs, y) => (
        <Fragment key={y}>
          {runs.map(([color, text], i) => (
            <span key={i} style={{ color: colors[color] }}>
              {text}
            </span>
          ))}
          {"\n"}
        </Fragment>
      ))}
    </pre>
  );
};
