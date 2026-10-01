"use client";

import { useMemo, useRef } from "react";

import { TypingAnimation } from "@/components/ui/typing-animation";

import Cool from "@/components/cool";
import DepthCard from "@/components/depth-card";
import TerminalCard from "@/components/terminal-card";

import { LANGUAGES } from "@/constants/global";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Image from "next/image";
import Link from "next/link";

gsap.registerPlugin(useGSAP);

type PortfolioHomeProps = {
  currentLang: string;
};

type TerminalLine = {
  text: string;
  delay: number;
  typeSpeed: number;
  type: "command" | "output";
};

const TYPING_SPEED = 10;

const PortfolioHome = ({ currentLang }: PortfolioHomeProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLDivElement | null>(null);

  const terminalLines = useMemo<TerminalLine[]>(
    () => [
      {
        text: "curl -sSfL https://elwan.ch/l1/install.sh | sh",
        delay: 0,
        typeSpeed: TYPING_SPEED,
        type: "command",
      },
      { text: "Installing l1 1% …", delay: 900, typeSpeed: 2, type: "output" },
      {
        text: "Installing l1 28% …",
        delay: 1400,
        typeSpeed: 2,
        type: "output",
      },
      { text: "Installing l1 100%", delay: 2000, typeSpeed: 2, type: "output" },
      {
        text: "l1 v0.2.0 installed to /usr/local/bin/l1",
        delay: 2600,
        typeSpeed: 2,
        type: "output",
      },
      { text: "", delay: 2600, typeSpeed: 1, type: "output" },
      { text: "", delay: 2600, typeSpeed: 1, type: "output" },
      {
        text: "l1 show-portfolio",
        delay: 3000,
        typeSpeed: TYPING_SPEED,
        type: "command",
      },
    ],
    [],
  );

  useGSAP(
    () => {
      if (!logoRef.current) return;

      gsap.set(logoRef.current, {
        transformOrigin: "50% 50%",
        willChange: "transform",
      });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
      });

      // Blink slowly only during install: starts at 900ms and ends at 2600ms.
      tl.to(logoRef.current, {
        keyframes: [
          { opacity: 0.45, duration: 0.425 },
          { opacity: 1, duration: 0.425 },
          { opacity: 0.45, duration: 0.425 },
          { opacity: 1, duration: 0.425 },
        ],
        duration: 1.7,
        delay: 0.9,
      });

      gsap.fromTo(
        ".terminal-line",
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.08,
          duration: 0.35,
          ease: "power2.out",
          delay: 0.2,
        },
      );
    },
    { scope: containerRef },
  );

  return (
    <main
      ref={containerRef}
      className="relative h-[100svh] max-h-screen overflow-hidden bg-black text-white"
    >
      <div className="absolute top-6 right-6 flex items-center gap-3 text-sm tracking-[0.25em] text-white/80 uppercase">
        {LANGUAGES.map((lang, i) => {
          const active = lang === currentLang;

          return (
            <div key={lang} className="flex items-center gap-3">
              <Link
                href={`/${lang}`}
                className={active ? "opacity-100" : "opacity-50 hover:opacity-100"}
              >
                {lang}
              </Link>
              {i < LANGUAGES.length - 1 && <span className="opacity-30">|</span>}
            </div>
          );
        })}
      </div>
      <div className="flex h-full items-center justify-center">
        <Cool></Cool>
      </div>
      {/* <DepthCard>
        <Image
          src="/logo.svg"
          alt="Logo"
          width={200}
          height={200}
          className="skew-12"
        />
      </DepthCard>
      <TerminalCard className="absolute top-6 left-6 border-white/50 h-96 hidden">
        <p>asd</p>
      </TerminalCard>

      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="mb-16">
          <div ref={logoRef}>
            <Image src="/logo.svg" alt="Logo" width={200} height={200} />
          </div>
        </div>

        <div className="w-xl font-mono text-[clamp(16px,2vw,22px)]">
          {terminalLines.map((line, i) => {
            if (line.text === "") {
              return <div key={i} className="h-4" />;
            }

            const commandPromptDelay = Math.max(0, line.delay - 200);

            return (
              <div key={i} className="terminal-line h-7">
                {line.type === "command" && (
                  <TypingAnimation
                    className="text-purple-400 whitespace-pre"
                    typeSpeed={0}
                    deleteSpeed={0}
                    delay={commandPromptDelay}
                    loop={false}
                    startOnView={false}
                    showCursor={false}
                  >
                    {"$ "}
                  </TypingAnimation>
                )}
                <TypingAnimation
                  typeSpeed={line.typeSpeed}
                  deleteSpeed={0}
                  delay={line.delay}
                  loop={false}
                  startOnView={false}
                  showCursor={false}
                >
                  {line.text}
                </TypingAnimation>
              </div>
            );
          })}
        </div>
      </div> */}
    </main>
  );
};

export default PortfolioHome;
