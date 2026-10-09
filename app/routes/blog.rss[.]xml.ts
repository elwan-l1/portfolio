import { getAllPosts, renderMarkdown } from "@/lib/blog.server";

import { TEXT as t } from "@/constants/blog";
import { NAME, ORIGIN } from "@/constants/global";
import { createFileRoute } from "@tanstack/react-router";

const escape = (text: string) => text.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

// readers resolve relative URLs against the feed, not the post
const absolute = (html: string, url: string) =>
  html.replace(/(src|href)="\/(?!\/)/g, `$1="${ORIGIN}/`).replace(/href="#/g, `href="${url}#`);

const rss = async () => {
  const posts = await getAllPosts();
  const items = posts.map((post) => {
    const url = `${ORIGIN}/blog/${post.slug}`;
    const html = absolute(renderMarkdown(post.body), url).replaceAll("]]>", "]]]]><![CDATA[>");
    return [
      "    <item>",
      `      <title>${escape(post.title)}</title>`,
      `      <link>${url}</link>`,
      `      <guid isPermaLink="true">${url}</guid>`,
      `      <pubDate>${post.publishedAt.toUTCString()}</pubDate>`,
      `      <dc:creator>${NAME}</dc:creator>`,
      `      <description>${escape(post.excerpt)}</description>`,
      ...post.tags.map((tag) => `      <category>${escape(tag)}</category>`),
      `      <content:encoded><![CDATA[${html}]]></content:encoded>`,
      "    </item>",
    ].join("\n");
  });

  return new Response(
    [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">`,
      "  <channel>",
      `    <title>${escape(t.feed)}</title>`,
      `    <link>${ORIGIN}/blog</link>`,
      `    <description>${escape(t.description)}</description>`,
      "    <language>en</language>",
      `    <atom:link href="${ORIGIN}/blog/rss.xml" rel="self" type="application/rss+xml"/>`,
      ...(posts[0]
        ? [`    <lastBuildDate>${posts[0].publishedAt.toUTCString()}</lastBuildDate>`]
        : []),
      ...items,
      "  </channel>",
      "</rss>",
      "",
    ].join("\n"),
    {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
};

export const Route = createFileRoute("/blog/rss.xml")({ server: { handlers: { GET: rss } } });
