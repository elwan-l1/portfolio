import { decode } from "@/lib/art";

import encoded from "@/assets/art/not-found";

const art = decode(encoded);

// one cell is 0.6 as wide as it is tall; the art fills the screen less the line under it
const SIZE = `min(calc((100vw - 40px) / ${art.cols * 0.6}), calc((100dvh - 140px) / ${art.rows}))`;

export const NotFound = () => (
  <>
    <title>404 · Elwan</title>
    <meta name="robots" content="noindex" />
    <main className="bg-crust flex min-h-dvh flex-col items-center justify-center gap-5 p-5">
      <h1 className="sr-only">404, page not found</h1>
      <pre
        aria-hidden
        className="font-text m-0 leading-none whitespace-pre select-none"
        style={{ fontSize: SIZE }}
      >
        {art.lines.map((runs, y) => (
          <span key={y}>
            {runs.map(([color, text], i) => (
              <span key={i} style={{ color: art.colors[color] }}>
                {text}
              </span>
            ))}
            {"\n"}
          </span>
        ))}
      </pre>
      <div className="flex items-baseline gap-6">
        <p className="text-lead text-text m-0 font-bold tracking-[-0.02em]">404, no signal.</p>
        <a href="/" className="text-pink text-body underline underline-offset-4">
          Home →
        </a>
      </div>
    </main>
  </>
);
