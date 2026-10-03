import "../globals.css";
import { ConsoleLogo } from "@/components/console-logo";
import { Trail } from "@/components/trail";

import { art, martian } from "../fonts";
import { LANGUAGES } from "@/constants/global";
import type { Metadata, Viewport } from "next";

export const dynamicParams = false;

export const generateStaticParams = () => LANGUAGES.map((lang) => ({ lang }));

export const generateMetadata = async ({ params }: LayoutProps<"/[lang]">): Promise<Metadata> => {
  const { lang } = await params;
  const description =
    "Hey, I'm Elwan, a data engineer who really likes exploring. I get where I'm going, just rarely by the main road.";

  return {
    metadataBase: new URL("https://elwan.ch"),
    title: "Elwan",
    description,
    alternates: {
      canonical: `/${lang}`,
      languages: {
        ...Object.fromEntries(LANGUAGES.map((l) => [l, `/${l}`])),
        "x-default": "/",
      },
    },
    openGraph: {
      type: "website",
      url: `/${lang}`,
      title: "Elwan",
      description,
    },
  };
};

export const viewport: Viewport = {
  themeColor: "#1e1e2e",
  colorScheme: "dark",
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;

  return (
    <html lang={lang} className={`${martian.variable} ${art.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Trail />
        <ConsoleLogo />
        {children}
      </body>
    </html>
  );
}
