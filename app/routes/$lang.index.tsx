import { card } from "@/components/blog/shared";

import { getHome } from "@/lib/home";

import PortfolioHome from "../portfolio-home";
import { LANGUAGES, ORIGIN, type Locale } from "@/constants/global";
import { createFileRoute } from "@tanstack/react-router";

const DESCRIPTION =
  "Hey, I'm Elwan, a data engineer who really likes exploring. I get where I'm going, just rarely by the main road.";

const IMAGE_ALT = "An eye drawn in text with the L1 logo as its pupil";

export const Route = createFileRoute("/$lang/")({
  loader: ({ params }) => getHome({ data: params.lang as Locale }),
  head: ({ params }) => ({
    meta: [
      { title: "Elwan" },
      { name: "description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${ORIGIN}/${params.lang}` },
      { property: "og:title", content: "Elwan" },
      { property: "og:description", content: DESCRIPTION },
      ...card(`${ORIGIN}/og.png`, IMAGE_ALT),
    ],
    links: [
      { rel: "canonical", href: `${ORIGIN}/${params.lang}` },
      ...LANGUAGES.map((l) => ({ rel: "alternate", hrefLang: l, href: `${ORIGIN}/${l}` })),
      { rel: "alternate", hrefLang: "x-default", href: `${ORIGIN}/` },
    ],
  }),
  component: Home,
});

function Home() {
  const { lang } = Route.useParams();
  const { dictionary, content } = Route.useLoaderData();

  return <PortfolioHome lang={lang as Locale} dictionary={dictionary} content={content} />;
}
