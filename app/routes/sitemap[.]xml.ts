import { getAllPosts } from "@/lib/blog.server";

import { LANGUAGES, ORIGIN } from "@/constants/global";
import { createFileRoute } from "@tanstack/react-router";

const page = (loc: string, extra = "") => `  <url>\n    <loc>${loc}</loc>\n${extra}  </url>`;

const sitemap = async () => {
  const posts = await getAllPosts();
  const alternates = [
    ...LANGUAGES.map(
      (lang) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${ORIGIN}/${lang}"/>\n`,
    ),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}/"/>\n`,
  ].join("");
  const latest = posts.reduce<Date | undefined>(
    (last, { updatedAt }) => (!last || updatedAt > last ? updatedAt : last),
    undefined,
  );
  const changed = (date?: Date) => (date ? `    <lastmod>${date.toISOString()}</lastmod>\n` : "");
  const urls = [
    ...LANGUAGES.map((lang) => page(`${ORIGIN}/${lang}`, alternates)),
    page(`${ORIGIN}/blog`, changed(latest)),
    ...posts.map((post) => page(`${ORIGIN}/blog/${post.slug}`, changed(post.updatedAt))),
  ];

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`,
    {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
};

export const Route = createFileRoute("/sitemap.xml")({ server: { handlers: { GET: sitemap } } });
