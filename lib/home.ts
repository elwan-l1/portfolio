import { getHomeContent } from "./content.server";
import { getDictionary } from "./dictionary.server";
import type { Locale } from "@/constants/global";
import { createServerFn } from "@tanstack/react-start";

export const getHome = createServerFn({ method: "GET" })
  .validator((lang: Locale) => lang)
  .handler(async ({ data: lang }) => ({
    dictionary: getDictionary(lang),
    content: await getHomeContent(lang),
  }));
