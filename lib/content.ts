import "server-only";
import type { Locale } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

const FALLBACK: Locale = "en";

const pick = <T extends { locale: Locale }>(translations: T[], locale: Locale) =>
  translations.find((t) => t.locale === locale) ?? translations.find((t) => t.locale === FALLBACK);

export const getHomeContent = async (locale: Locale) => {
  const prisma = getPrisma();
  const translations = { where: { locale: { in: [locale, FALLBACK] } } };

  const [projects, interests, links, tools, latestPost] = await Promise.all([
    prisma.project.findMany({ orderBy: { position: "asc" }, include: { translations } }),
    prisma.interest.findMany({ orderBy: { position: "asc" }, include: { translations } }),
    prisma.link.findMany({ orderBy: { position: "asc" } }),
    prisma.tool.findMany({ orderBy: { position: "asc" } }),
    prisma.blogPost.findFirst({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
    }),
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
  };
};

export type HomeContent = Awaited<ReturnType<typeof getHomeContent>>;
