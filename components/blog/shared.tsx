import type { ReactNode } from "react";

import { CARD, TEXT as t } from "@/constants/blog";
import { NAME, ORIGIN } from "@/constants/global";
import { Link } from "@tanstack/react-router";

export const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);

export const card = (image: string, alt: string) => [
  { property: "og:image", content: image },
  { property: "og:image:type", content: "image/png" },
  { property: "og:image:width", content: String(CARD.width) },
  { property: "og:image:height", content: String(CARD.height) },
  { property: "og:image:alt", content: alt },
  { name: "twitter:card", content: "summary_large_image" },
];

export const site = [
  { property: "og:site_name", content: NAME },
  { property: "og:locale", content: "en_US" },
  { name: "author", content: NAME },
  { name: "robots", content: "max-image-preview:large" },
];

export const feed = {
  rel: "alternate",
  type: "application/rss+xml",
  title: t.feed,
  href: `${ORIGIN}/blog/rss.xml`,
};

export const author = { "@type": "Person", name: NAME, url: ORIGIN };

/** A JSON-LD script for the head; `<` is escaped so the data can never close the tag. */
export const jsonLd = (data: object) => ({
  type: "application/ld+json",
  children: JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c"),
});

export const formatViews = (views: number) => new Intl.NumberFormat("en").format(views);

export const mostViewed = <T extends { views: number }>(posts: T[], count = 3) =>
  [...posts].sort((a, b) => b.views - a.views).slice(0, count);

type PostLinkProps = { slug: string; className?: string; children: ReactNode };

export const PostLink = ({ slug, className, children }: PostLinkProps) => (
  <Link to="/blog/$slug" params={{ slug }} className={className}>
    {children}
  </Link>
);

export const BlogNav = ({ back = false }: { back?: boolean }) => {
  const className = "text-meta text-subtext0 hover:text-pink w-fit no-underline";

  return back ? (
    <Link to="/blog" className={className}>
      ← {t.blog.toLowerCase()}
    </Link>
  ) : (
    <a href="/" className={className}>
      ← {t.home}
    </a>
  );
};
