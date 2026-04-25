import { AsciiVideoPlayer } from "@/components/ascii-video-player";

import { hasLocale } from "./dictionaries";
import { notFound } from "next/navigation";

export default async function Page({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;

  if (!hasLocale(lang)) notFound();

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="flex min-h-screen items-center justify-center p-4">
        <AsciiVideoPlayer />
      </div>
    </main>
  );
}
