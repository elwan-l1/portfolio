import { getHomeContent } from "@/lib/content";

import { getDictionary, hasLocale } from "./dictionaries";
import PortfolioHome from "./portfolio-home";
import { notFound } from "next/navigation";
import { connection } from "next/server";

export default async function Page({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;

  if (!hasLocale(lang)) notFound();

  // content comes from the DB at request time, so builds need no database
  await connection();

  const [dictionary, content] = await Promise.all([getDictionary(lang), getHomeContent(lang)]);

  return <PortfolioHome lang={lang} dictionary={dictionary} content={content} />;
}
