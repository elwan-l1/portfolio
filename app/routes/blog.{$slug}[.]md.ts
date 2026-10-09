import { getAllPosts } from "@/lib/blog.server";

import { NAME, ORIGIN } from "@/constants/global";
import { createFileRoute } from "@tanstack/react-router";

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);

export const Route = createFileRoute("/blog/{$slug}.md")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const post = (await getAllPosts()).find(({ slug }) => slug === params.slug);
        if (!post) return new Response(null, { status: 404 });
        const url = `${ORIGIN}/blog/${post.slug}`;
        const text = [
          `# ${post.title}`,
          `> ${post.excerpt}`,
          `By ${NAME}, published ${formatDate(post.publishedAt)}. Tags: ${post.tags.join(", ")}. Read it on the site: ${url}`,
          // site-relative links made absolute
          post.body.replace(/\]\(\//g, `](${ORIGIN}/`),
        ].join("\n\n");
        return new Response(text, {
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
            Link: `<${url}>; rel="canonical"`,
          },
        });
      },
    },
  },
});
