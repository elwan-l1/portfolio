"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

type CoolProps = {
  className?: string;
};

export default function Cool({ className }: CoolProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);

      const left = q("#left")[0];
      const right = q("#right")[0];
      const svg = q("svg")[0];
      const flash = q("#impact-flash")[0];
      const terminal = q("#terminal-shell")[0];
      const stage = q("#logo-stage")[0];

      if (!left || !right || !svg || !flash || !terminal || !stage) return;

      const p = (n: number) => `${n}%`;

      const getResponsiveConfig = () => {
        const vw = window.innerWidth;
        console.log("vw", vw);

        if (vw < 768) {
          return {
            terminalWidth: 300,
            logoBarSize: 72,
            offset: { x: 118, y: 18 },
          };
        }

        if (vw < 1024) {
          return {
            terminalWidth: 720,
            logoBarSize: 180,
            offset: { x: 270, y: 42 },
          };
        }

        if (vw < 1440) {
          return {
            terminalWidth: 1000,
            logoBarSize: 240,
            offset: { x: 1800, y: 300 },
          };
        }

        return {
          terminalWidth: 1200,
          logoBarSize: 300,
          offset: { x: 1734, y: 582 },
        };
      };

      const getTerminalWidth = () => getResponsiveConfig().terminalWidth;
      const getLogoBarSize = () => getResponsiveConfig().logoBarSize;

      const getLogoBarPositions = () => {
        const { offset } = getResponsiveConfig();

        return {
          left: {
            x: -offset.x,
            y: offset.y,
          },
          right: {
            x: offset.x,
            y: -offset.y,
          },
        };
      };

      const TERMINAL_RATIO = 1280 / 544;

      const HIT = {
        left: { x: 19.1, y: -10.9 },
        right: { x: -19.1, y: 10.9 },
      };

      const PREP = {
        left: { x: -8, y: 6 },
        right: { x: 8, y: -6 },
      };

      const PULL = {
        left: { x: -30, y: 25 },
        right: { x: 30, y: -25 },
      };

      const settleFrames = (xFinal: number, yFinal: number) => {
        const sx = Math.sign(xFinal);
        const sy = Math.sign(yFinal);

        return [
          {
            x: p(xFinal + sx * 1.6),
            y: p(yFinal + sy * 0.9),
            duration: 0.09,
            ease: "none",
          },
          {
            x: p(xFinal - sx * 0.85),
            y: p(yFinal - sy * 0.48),
            duration: 0.12,
            ease: "none",
          },
          {
            x: p(xFinal + sx * 0.42),
            y: p(yFinal + sy * 0.24),
            duration: 0.1,
            ease: "none",
          },
          {
            x: p(xFinal - sx * 0.18),
            y: p(yFinal - sy * 0.1),
            duration: 0.09,
            ease: "none",
          },
          {
            x: p(xFinal),
            y: p(yFinal),
            duration: 0.12,
            ease: "none",
          },
        ];
      };

      const impactBurst = () => {
        gsap.fromTo(
          flash,
          { autoAlpha: 0.95, scale: 0.2 },
          {
            autoAlpha: 0,
            scale: 1.9,
            duration: 0.22,
            ease: "power2.out",
            transformOrigin: "50% 50%",
          },
        );

        gsap
          .timeline()
          .to(svg, {
            x: () => gsap.utils.random(-10, 10),
            y: () => gsap.utils.random(-10, 10),
            duration: 0.025,
            repeat: 7,
            yoyo: true,
            ease: "none",
          })
          .to(svg, {
            x: 0,
            y: 0,
            duration: 0.08,
            ease: "power2.out",
            clearProps: "x,y",
          });
      };

      gsap.set(stage, {
        transformOrigin: "50% 50%",
        force3D: true,
      });

      gsap.set([left, right], {
        x: "0%",
        y: "0%",
        scaleX: 1,
        scaleY: 1,
        transformOrigin: "50% 50%",
        force3D: true,
      });

      gsap.set(svg, {
        transformOrigin: "50% 50%",
        force3D: true,
      });

      gsap.set(flash, {
        autoAlpha: 0,
        scale: 0.2,
        transformOrigin: "50% 50%",
      });

      gsap.set(terminal, {
        autoAlpha: 0,
        scale: 0.08,
        transformOrigin: "50% 50%",
        force3D: true,
      });

      const tl = gsap.timeline({
        defaults: { force3D: true },
      });

      tl.to(
        left,
        {
          x: p(PREP.left.x),
          y: p(PREP.left.y),
          duration: 0.14,
          ease: "power2.out",
        },
        0,
      )
        .to(
          right,
          {
            x: p(PREP.right.x),
            y: p(PREP.right.y),
            duration: 0.14,
            ease: "power2.out",
          },
          0,
        )

        .to(
          left,
          {
            x: p(PULL.left.x),
            y: p(PULL.left.y),
            duration: 0.4,
            ease: "power3.out",
          },
          ">",
        )
        .to(
          right,
          {
            x: p(PULL.right.x),
            y: p(PULL.right.y),
            duration: 0.4,
            ease: "power3.out",
          },
          "<",
        )

        .to(
          left,
          {
            x: p(HIT.left.x),
            y: p(HIT.left.y),
            duration: 0.52,
            ease: "power3.in",
          },
          ">0.05",
        )
        .to(
          right,
          {
            x: p(HIT.right.x),
            y: p(HIT.right.y),
            duration: 0.52,
            ease: "power3.in",
          },
          "<",
        )

        .addLabel("impact")

        .add(impactBurst, "impact")
        .to(
          [left, right],
          {
            scaleX: 1.08,
            scaleY: 0.92,
            duration: 0.06,
            ease: "power2.out",
          },
          "impact",
        )

        .to(
          terminal,
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.16,
            ease: "back.out(2.2)",
          },
          "impact+=0.04",
        )

        .to(
          [left, right],
          {
            scaleX: 0.985,
            scaleY: 1.015,
            duration: 0.12,
            ease: "power2.out",
          },
          "impact+=0.06",
        )

        .to(
          left,
          {
            keyframes: settleFrames(HIT.left.x, HIT.left.y),
            duration: 0.52,
            ease: "none",
          },
          "impact+=0.06",
        )
        .to(
          right,
          {
            keyframes: settleFrames(HIT.right.x, HIT.right.y),
            duration: 0.52,
            ease: "none",
          },
          "impact+=0.06",
        )
        .to(
          [left, right],
          {
            scaleX: 1,
            scaleY: 1,
            duration: 0.18,
            ease: "sine.out",
          },
          "impact+=0.18",
        )
        .to(
          [left],
          {
            x: "-132%",
            y: "16%",
            duration: 0.6,
            ease: "power2.inOut",
          },
          "impact+=1.04",
        )
        .to(
          [right],
          {
            x: "132%",
            y: "-16%",
            duration: 0.6,
            ease: "power2.inOut",
          },
          "impact+=1.04",
        )
        .to(
          [left, right],
          {
            x: (_, target) => {
              const positions = getLogoBarPositions();
              return target === left ? positions.left.x : positions.right.x;
            },
            y: (_, target) => {
              const positions = getLogoBarPositions();
              return target === left ? positions.left.y : positions.right.y;
            },
            duration: 0.6,
            ease: "power2.inOut",
          },
          "impact+=1.04",
        )
        .to(
          stage,
          {
            scale: () => {
              const target = getLogoBarSize();
              const current = left.getBoundingClientRect().height || 1;
              return target / current;
            },
            duration: 0.6,
            ease: "power2.inOut",
            transformOrigin: "50% 50%",
          },
          "impact+=1.04",
        )
        .to(
          terminal,
          {
            width: () => `${getTerminalWidth()}px`,
            height: () => `${getTerminalWidth() / TERMINAL_RATIO}px`,
            duration: 0.7,
            ease: "power2.inOut",
          },
          "impact+=1.04",
        );
    },
    { scope: root },
  );

  return (
    <div ref={root} className={className}>
      <div className="relative size-80">
        <div
          id="impact-flash"
          className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 blur-xl mix-blend-screen"
        />

        <svg
          viewBox="-2500 -2500 6000 6000"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          id="logo-stage"
        >
          <g id="logo">
            <g id="right">
              <rect
                id="rect-horizontal"
                x="827.501"
                y="177.488"
                width="327.501"
                height="177.501"
                transform="rotate(180 827.501 177.488)"
                fill="white"
              />
              <path
                id="line-diag"
                d="M447.283 62.3792L443.747 58.8437L500 0.0956667L503.75 3.62891L447.283 62.3792Z"
                fill="white"
              />
              <path
                id="line-vertical-down"
                d="M448.748 237.594L443.748 237.594L443.748 58.8437L448.748 58.9316L448.748 237.594Z"
                fill="white"
              />
              <path
                id="rect-vertical"
                d="M1000 1000.1L822.499 1000.1L822.499 0.0932849L911.25 0.0932771L955 46.3435L1000 88.2187L1000 1000.1Z"
                fill="white"
              />
              <rect
                id="ling-horizontal"
                x="446.248"
                y="237.594"
                width="5.00004"
                height="322.501"
                transform="rotate(-90 446.248 237.594)"
                fill="white"
              />
              <rect
                id="line-vertical"
                x="768.749"
                y="555.096"
                width="5.00002"
                height="322.501"
                transform="rotate(180 768.749 555.096)"
                fill="white"
              />
            </g>
            <g id="left">
              <rect
                id="rect-horizontal_2"
                x="172.499"
                y="822.491"
                width="327.501"
                height="177.501"
                fill="white"
              />
              <path
                id="line-diag_2"
                d="M552.715 937.706L556.251 941.241L499.998 999.989L496.248 996.456L552.715 937.706Z"
                fill="white"
              />
              <path
                id="line-vertical-down_2"
                d="M551.25 762.49H556.251V941.241L551.25 941.153V762.49Z"
                fill="white"
              />
              <path
                id="rect-vertical_2"
                d="M-0.00195312 -0.0129395H177.499V999.991H88.7484L44.9982 953.741L-0.00195312 911.866V-0.0129395Z"
                fill="white"
              />
              <rect
                id="ling-horizontal_2"
                x="553.75"
                y="762.49"
                width="5.00004"
                height="322.501"
                transform="rotate(90 553.75 762.49)"
                fill="white"
              />
              <rect
                id="line-vertical_2"
                x="231.249"
                y="444.989"
                width="5.00002"
                height="322.501"
                fill="white"
              />
            </g>
          </g>
        </svg>

        <div
          id="terminal-shell"
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 aspect-square w-4 -translate-x-1/2 -translate-y-1/2 overflow-hidden opacity-0"
        >
          <div
            className={cn(
              "relative h-full w-full border-2 border-white bg-black text-white",
            )}
          >
            <div className="absolute left-0 right-0 top-0 flex h-10 items-center justify-center">
              <div className="absolute left-4 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
              </div>

              <div className="text-sm tracking-wide text-white/90">
                👻 Ghostty
              </div>
            </div>

            <div className="h-full w-full pt-10">
              <div className="terminal-line px-6 text-sm">
                Welcome to my portfolio!
              </div>
              <div className="terminal-line px-6 text-sm">
                I'm a software engineer that do things.
              </div>
              <div className="terminal-line px-6 text-sm">
                Check out my work and experience below.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
