"use client";

import { useRef } from "react";

import TerminalCard from "./terminal-card";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Image from "next/image";
gsap.registerPlugin(useGSAP);

export default function DepthCard() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      if (!wrapRef.current || !stageRef.current || !cardRef.current) {
        return;
      }

      gsap.set(wrapRef.current, {
        perspective: 10,
      });

      gsap.set(stageRef.current, {
        transformStyle: "preserve-3d",
        transformPerspective: 10,
        transformOrigin: "50% 50%",
        rotateX: 90,
        z: -1000,
      });

      gsap.set(cardRef.current, {
        transformOrigin: "50% 50%",
        scaleX: 2.15,
        scaleY: 0.22,
        opacity: 0.12,
      });

      const tl = gsap.timeline({
        defaults: {
          ease: "expo.out",
        },
      });

      tl.to(stageRef.current, {
        rotateX: 0,
        z: 0,
        duration: 1.9,
      })
        .to(
          cardRef.current,
          {
            scaleX: 1,
            scaleY: 1,
            opacity: 1,
            filter: "blur(0px)",
            duration: 1.9,
          },
          0,
        )

        .to(
          cardRef.current,
          {
            scaleX: 0.985,
            scaleY: 1.015,
            duration: 0.16,
            ease: "power2.out",
          },
          "-=0.18",
        )
        .to(cardRef.current, {
          scaleX: 1,
          scaleY: 1,
          duration: 0.18,
          ease: "power2.out",
        });
    },
    { scope: wrapRef },
  );

  return (
    <div
      ref={wrapRef}
      className="flex min-h-screen items-center justify-center overflow-hidden bg-black px-6"
    >
      <div className="relative flex items-center justify-center">
        <div
          ref={stageRef}
          className="will-change-transform"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div ref={cardRef} className="relative flex h-[320px] w-[520px] will-change-transform">
            <Image
              src="/left.svg"
              alt="Logo"
              width={200}
              height={200}
              className="absolute -bottom-26 -left-26 z-10"
            />
            <Image
              src="/right.svg"
              alt="Logo"
              width={200}
              height={200}
              className="absolute -top-26 -right-26 z-10"
            />
            <TerminalCard></TerminalCard>
          </div>
        </div>
      </div>
    </div>
  );
}
