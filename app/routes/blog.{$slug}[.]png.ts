import { getAllPosts } from "@/lib/blog.server";
import { blogImage, postImage } from "@/lib/og.server";

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/blog/{$slug}.png")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const post = (await getAllPosts()).find(({ slug }) => slug === params.slug);
        if (!post) return new Response(null, { status: 404 });
        return new Response(post.art ? postImage(post.art) : blogImage(), {
          headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
        });
      },
    },
  },
});
