import { ConsoleLogo } from "@/components/console-logo";
import { Trail } from "@/components/trail";

import { LANGUAGES, hasLocale } from "@/constants/global";
import { Outlet, createFileRoute, notFound } from "@tanstack/react-router";

const DESCRIPTION =
  "Hey, I'm Elwan, a data engineer who really likes exploring. I get where I'm going, just rarely by the main road.";
const ORIGIN = "https://elwan.ch";

export const Route = createFileRoute("/$lang")({
  beforeLoad: ({ params }) => {
    if (!hasLocale(params.lang)) throw notFound();
  },
  head: ({ params }) => ({
    meta: [
      { title: "Elwan" },
      { name: "description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${ORIGIN}/${params.lang}` },
      { property: "og:title", content: "Elwan" },
      { property: "og:description", content: DESCRIPTION },
    ],
    links: [
      { rel: "canonical", href: `${ORIGIN}/${params.lang}` },
      ...LANGUAGES.map((l) => ({ rel: "alternate", hrefLang: l, href: `${ORIGIN}/${l}` })),
      { rel: "alternate", hrefLang: "x-default", href: `${ORIGIN}/` },
    ],
  }),
  component: () => (
    <>
      <Trail />
      <ConsoleLogo />
      <Outlet />
    </>
  ),
});
