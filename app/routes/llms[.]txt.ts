import { getAllPosts } from "@/lib/blog.server";

import { TEXT as t } from "@/constants/blog";
import { NAME, ORIGIN } from "@/constants/global";
import { createFileRoute } from "@tanstack/react-router";

const llms = async () => {
  const posts = await getAllPosts();
  const text = [
    `# ${NAME}`,
    `> Portfolio and blog of ${NAME}, a data engineer who likes exploring. The portfolio is one page in English and French. The blog is in English.`,
    [
      `- [Portfolio](${ORIGIN}/en): who I am, the tools I use, my projects and interests, and how to reach me`,
      `- [Blog](${ORIGIN}/blog): ${t.intro}`,
    ].join("\n"),
    "## Blog posts",
    posts
      .map((post) => `- [${post.title}](${ORIGIN}/blog/${post.slug}.md): ${post.excerpt}`)
      .join("\n"),
    "## Optional",
    [
      `- [RSS feed](${ORIGIN}/blog/rss.xml): every post in full`,
      `- [Sitemap](${ORIGIN}/sitemap.xml): every page of the site`,
    ].join("\n"),
    "",
  ].join("\n\n");

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};

export const Route = createFileRoute("/llms.txt")({ server: { handlers: { GET: llms } } });
