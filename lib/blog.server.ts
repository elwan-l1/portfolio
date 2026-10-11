import { allowed } from "@/lib/limit.server";
import { getPrisma } from "@/lib/prisma.server";

import { createHighlighter } from "@tanstack/highlight/core";
import { cpp } from "@tanstack/highlight/languages/cpp";
import { css } from "@tanstack/highlight/languages/css";
import { diff } from "@tanstack/highlight/languages/diff";
import { go } from "@tanstack/highlight/languages/go";
import { html } from "@tanstack/highlight/languages/html";
import { js } from "@tanstack/highlight/languages/js";
import { json } from "@tanstack/highlight/languages/json";
import { python } from "@tanstack/highlight/languages/python";
import { shell } from "@tanstack/highlight/languages/shell";
import { sql } from "@tanstack/highlight/languages/sql";
import { toml } from "@tanstack/highlight/languages/toml";
import { ts } from "@tanstack/highlight/languages/ts";
import { tsx } from "@tanstack/highlight/languages/tsx";
import { yaml } from "@tanstack/highlight/languages/yaml";
import { createTanStackMarkdownHighlighter } from "@tanstack/highlight/markdown";
import { collectMarkdownHeadings } from "@tanstack/markdown/extensions/headings";
import { renderDocument } from "@tanstack/markdown/html";
import { parseMarkdown } from "@tanstack/markdown/parser";

const WORDS_PER_MINUTE = 220;
const MORE = 3;

const highlighter = createTanStackMarkdownHighlighter(
  createHighlighter({
    languages: [cpp, css, diff, go, html, js, json, python, shell, sql, toml, ts, tsx, yaml],
  }),
);

const TTL = 60_000;
const cache = new Map<string, { at: number; value: Promise<unknown> }>();

// the DB is read at most once a minute per key, concurrent requests share the read; misses and
// failures are dropped, so requests for unknown slugs cannot pile up
const cached = <T>(key: string, load: () => Promise<T>): Promise<T> => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as Promise<T>;

  const value = load();
  cache.set(key, { at: Date.now(), value });
  value.then(
    (result) => result === null && cache.delete(key),
    () => cache.delete(key),
  );
  return value;
};

const published = { publishedAt: { not: null } } as const;

const summary = { slug: true, title: true, excerpt: true, publishedAt: true, views: true } as const;
const tags = { select: { tag: true }, orderBy: { tag: "asc" } } as const;

const dated = <T extends { publishedAt: Date | null }>(posts: T[]) =>
  posts.flatMap(({ publishedAt, ...post }) => (publishedAt ? [{ ...post, publishedAt }] : []));

const names = <T extends { tags: { tag: string }[] }>({ tags, ...post }: T) => ({
  ...post,
  tags: tags.map(({ tag }) => tag),
});

export const getLatestPost = () =>
  cached("latest", () =>
    getPrisma().blogPost.findFirst({
      where: published,
      orderBy: { publishedAt: "desc" },
      select: summary,
    }),
  );

const loadIndex = async () =>
  dated(
    await getPrisma().blogPost.findMany({
      where: published,
      orderBy: { publishedAt: "desc" },
      select: { ...summary, art: true, tags },
    }),
  ).map(names);

export type IndexPost = Awaited<ReturnType<typeof loadIndex>>[number];

export const getBlogIndex = () => cached("index", loadIndex);

const loadPost = async (slug: string) => {
  const [post, others] = await Promise.all([
    getPrisma().blogPost.findFirst({ where: { ...published, slug }, include: { tags } }),
    getPrisma().blogPost.findMany({
      where: { ...published, slug: { not: slug } },
      orderBy: { publishedAt: "desc" },
      select: { ...summary, tags },
    }),
  ]);
  if (!post?.publishedAt) return null;

  const document = parseMarkdown(post.body, { headingIds: true });
  const headings = collectMarkdownHeadings(document).filter(
    ({ id, level }) => level >= 2 && level <= 3 && id !== "footnote-label",
  );

  // most shared tags first; the sort is stable, so ties stay newest first
  const mine = new Set(post.tags.map(({ tag }) => tag));
  const more = dated(others)
    .map(names)
    .map((other) => ({ ...other, shared: other.tags.filter((tag) => mine.has(tag)).length }))
    .sort((a, b) => b.shared - a.shared)
    .slice(0, MORE)
    .map(({ slug, title, publishedAt }) => ({ slug, title, publishedAt }));

  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    art: post.art,
    tags: [...mine],
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    views: post.views,
    minutes: Math.max(1, Math.round(post.body.split(/\s+/).length / WORDS_PER_MINUTE)),
    html: renderDocument(document, { highlighter }),
    headings,
    more,
  };
};

export type Post = NonNullable<Awaited<ReturnType<typeof loadPost>>>;

export const getPost = (slug: string) => cached(`post:${slug}`, () => loadPost(slug));

const loadAll = async () =>
  dated(
    await getPrisma().blogPost.findMany({
      where: published,
      orderBy: { publishedAt: "desc" },
      select: { ...summary, body: true, art: true, updatedAt: true, tags },
    }),
  ).map(names);

export const getAllPosts = () => cached("all", loadAll);

export const renderMarkdown = (body: string) =>
  renderDocument(parseMarkdown(body, { headingIds: true }), { highlighter });

export const addView = async (slug: string, source: string) => {
  if (!allowed("view")) return;
  const prisma = getPrisma();
  await prisma.$transaction([
    prisma.blogPost.updateMany({
      where: { ...published, slug },
      data: { views: { increment: 1 } },
    }),
    prisma.$executeRaw`
      INSERT INTO blog_post_sources (post_id, source, views)
      SELECT id, ${source}, 1 FROM blog_posts WHERE slug = ${slug} AND published_at IS NOT NULL
      ON DUPLICATE KEY UPDATE blog_post_sources.views = blog_post_sources.views + 1`,
  ]);
};
