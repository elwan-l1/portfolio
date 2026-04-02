import { hasLocale } from "./dictionaries";
import PortfolioHome from "./portfolio-home";
import { notFound } from "next/navigation";

export default async function Page({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;

  if (!hasLocale(lang)) notFound();

  return <PortfolioHome currentLang={lang} />;
}
