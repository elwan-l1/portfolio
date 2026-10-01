import { hasLocale } from "./dictionaries";
import PortfolioHome from "./portfolio-home";
import { notFound } from "next/navigation";

export default async function Page({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;

  if (!hasLocale(lang)) notFound();

  return (
    <main className="bg-base text-text min-h-screen overflow-hidden">
      <div className="flex min-h-screen items-center justify-center p-4">
        <PortfolioHome currentLang={lang} />
      </div>
    </main>
  );
}
