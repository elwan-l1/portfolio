import { cardSvg } from "@/lib/cards.server";

import { createFileRoute } from "@tanstack/react-router";

// GitHub's image proxy revalidates on every view, so edits show up at once and repeats get a 304
const CACHE = "public, no-cache";

// the svg holds only text and an embedded font, so opened directly it still cannot run anything
const SANDBOX = "default-src 'none'; style-src 'unsafe-inline'; font-src data:";

export const Route = createFileRoute("/cards/{$id}.svg")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const card = await cardSvg(params.id);
        if (!card) return new Response(null, { status: 404 });

        const headers = { "Cache-Control": CACHE, ETag: card.etag };
        if (request.headers.get("if-none-match") === card.etag)
          return new Response(null, { status: 304, headers });

        return new Response(card.svg, {
          headers: {
            ...headers,
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Content-Security-Policy": SANDBOX,
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
