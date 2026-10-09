import { BlogIndex } from "@/components/blog/blog-index";
import { author, card, feed, jsonLd, site } from "@/components/blog/shared";

import { getBlog } from "@/lib/blog";

import { TEXT as t } from "@/constants/blog";
import { ORIGIN } from "@/constants/global";
import { createFileRoute } from "@tanstack/react-router";

const text = (value: unknown) => (value === undefined ? undefined : String(value) || undefined);

export const Route = createFileRoute("/blog/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { tag?: string; q?: string; sort?: "views" } => ({
    tag: text(search.tag),
    q: text(search.q),
    sort: search.sort === "views" ? "views" : undefined,
  }),
  loader: () => getBlog(),
  head: ({ loaderData: posts = [] }) => ({
    meta: [
      { title: `${t.blog} · Elwan` },
      { name: "description", content: t.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${ORIGIN}/blog` },
      { property: "og:title", content: `${t.blog} · Elwan` },
      { property: "og:description", content: t.description },
      ...site,
      ...card(`${ORIGIN}/blog.png`, t.card),
    ],
    links: [{ rel: "canonical", href: `${ORIGIN}/blog` }, feed],
    scripts: [
      jsonLd({
        "@type": "Blog",
        name: t.feed,
        description: t.description,
        url: `${ORIGIN}/blog`,
        inLanguage: "en",
        author,
        blogPost: posts.map((post) => ({
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          url: `${ORIGIN}/blog/${post.slug}`,
          datePublished: post.publishedAt.toISOString(),
          keywords: post.tags.join(", "),
          author,
        })),
      }),
      jsonLd({
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Elwan", item: `${ORIGIN}/en` },
          { "@type": "ListItem", position: 2, name: t.blog, item: `${ORIGIN}/blog` },
        ],
      }),
    ],
  }),
  component: Blog,
});

function Blog() {
  const posts = Route.useLoaderData();
  const { tag, q, sort } = Route.useSearch();

  return <BlogIndex posts={posts} tag={tag} q={q} sort={sort} />;
}
