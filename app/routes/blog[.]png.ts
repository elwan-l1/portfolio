import { blogImage } from "@/lib/og.server";

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/blog.png")({
  server: {
    handlers: {
      GET: () =>
        new Response(blogImage(), {
          headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
        }),
    },
  },
});
