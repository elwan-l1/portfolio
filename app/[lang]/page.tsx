import { getDictionary, hasLocale } from "./dictionaries";
import { notFound } from "next/navigation";

export default async function Page({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;

  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  return <button>{dict.hello}</button>;
}
