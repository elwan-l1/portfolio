import { BlogArticle } from "@/components/blog/blog-article";
import { author, card, feed, jsonLd, site } from "@/components/blog/shared";

import { getBlogPost } from "@/lib/blog";

import { CARD, TEXT as t } from "@/constants/blog";
import { ORIGIN } from "@/constants/global";
import { createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await getBlogPost({ data: params.slug });
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData: post }) => {
    if (!post) return {};
    const url = `${ORIGIN}/blog/${post.slug}`;
    const image = `${url}.png`;
    return {
      meta: [
        { title: `${post.title} · Elwan` },
        { name: "description", content: post.excerpt },
        { name: "keywords", content: post.tags.join(", ") },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.excerpt },
        { property: "article:published_time", content: post.publishedAt.toISOString() },
        { property: "article:modified_time", content: post.updatedAt.toISOString() },
        { property: "article:author", content: ORIGIN },
        ...site,
        ...card(image, `${post.title}: ${t.postCard}`),
      ],
      links: [
        { rel: "canonical", href: url },
        { rel: "alternate", type: "text/markdown", href: `${url}.md` },
        feed,
      ],
      scripts: [
        jsonLd({
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          url,
          mainEntityOfPage: url,
          image: { "@type": "ImageObject", url: image, width: CARD.width, height: CARD.height },
          datePublished: post.publishedAt.toISOString(),
          dateModified: post.updatedAt.toISOString(),
          inLanguage: "en",
          keywords: post.tags.join(", "),
          timeRequired: `PT${post.minutes}M`,
          author,
          publisher: author,
          isPartOf: { "@type": "Blog", name: t.feed, url: `${ORIGIN}/blog` },
        }),
        jsonLd({
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Elwan", item: `${ORIGIN}/en` },
            { "@type": "ListItem", position: 2, name: t.blog, item: `${ORIGIN}/blog` },
            { "@type": "ListItem", position: 3, name: post.title, item: url },
          ],
        }),
      ],
    };
  },
  component: BlogPost,
});

function BlogPost() {
  return <BlogArticle post={Route.useLoaderData()} />;
}
