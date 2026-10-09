import type { Locale } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma.server";

import { getLatestPost } from "./blog.server";

const FALLBACK: Locale = "en";

const pick = <T extends { locale: Locale }>(translations: T[], locale: Locale) =>
  translations.find((t) => t.locale === locale) ?? translations.find((t) => t.locale === FALLBACK);

const loadHomeContent = async (locale: Locale) => {
  const prisma = getPrisma();
  const translations = { where: { locale: { in: [locale, FALLBACK] } } };

  const [projects, interests, links, tools, latestPost, homelab] = await Promise.all([
    prisma.project.findMany({ orderBy: { position: "asc" }, include: { translations } }),
    prisma.interest.findMany({ orderBy: { position: "asc" }, include: { translations } }),
    prisma.link.findMany({ orderBy: { position: "asc" } }),
    prisma.tool.findMany({ orderBy: { position: "asc" } }),
    getLatestPost(),
    prisma.switch.findFirst({ include: { machines: { orderBy: { port: "asc" } } } }),
  ]);

  return {
    projects: projects.flatMap(({ translations, ...project }) => {
      const translation = pick(translations, locale);
      if (!translation) return [];
      return [{ ...project, kind: translation.kind, description: translation.description }];
    }),
    interests: interests.flatMap(({ translations, ...interest }) => {
      const translation = pick(translations, locale);
      if (!translation) return [];
      return [{ ...interest, name: translation.name, text: translation.text }];
    }),
    links,
    apps: tools.filter((tool) => tool.category === "app").map((tool) => tool.name),
    stack: tools.filter((tool) => tool.category === "stack").map((tool) => tool.name),
    latestPost,
    homelab,
  };
};

export type HomeContent = Awaited<ReturnType<typeof loadHomeContent>>;

const TTL = 60_000;
const cache = new Map<Locale, { at: number; content: Promise<HomeContent> }>();

// the DB is read at most once a minute per locale, concurrent requests share the read
export const getHomeContent = (locale: Locale) => {
  const hit = cache.get(locale);
  if (hit && Date.now() - hit.at < TTL) return hit.content;

  const content = loadHomeContent(locale);
  cache.set(locale, { at: Date.now(), content });
  content.catch(() => cache.delete(locale));
  return content;
};
