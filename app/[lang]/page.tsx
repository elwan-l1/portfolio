import { AsciiVideoPlayer } from "@/components/ascii-video-player";
import TerminalCard from "@/components/terminal-card";

import { hasLocale } from "./dictionaries";
import { notFound } from "next/navigation";

export default async function Page({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;

  if (!hasLocale(lang)) notFound();

  return (
    <main className="bg-background text-foreground min-h-screen overflow-hidden">
      <div className="flex min-h-screen items-center justify-center p-4">
        <TerminalCard>
          <AsciiVideoPlayer />
        </TerminalCard>
      </div>
    </main>
  );
}
