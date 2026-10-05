import { getHome } from "@/lib/home";

import PortfolioHome from "../portfolio-home";
import type { Locale } from "@/constants/global";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$lang/")({
  loader: ({ params }) => getHome({ data: params.lang as Locale }),
  component: Home,
});

function Home() {
  const { lang } = Route.useParams();
  const { dictionary, content } = Route.useLoaderData();

  return <PortfolioHome lang={lang as Locale} dictionary={dictionary} content={content} />;
}
