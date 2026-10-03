"use client";

import { useEffect } from "react";

import { LOGO } from "@/constants/logo";

const L = "#ffffff";
const ONE = "#ffbfe9";

let shown = false;

export const ConsoleLogo = () => {
  useEffect(() => {
    if (shown) return;
    shown = true;
    const crust = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-crust")
      .trim();
    const block = `background:${crust};font:700 12px/1 monospace`;
    const lines = LOGO.split("\n");
    const width = Math.max(...lines.map((line) => line.length));
    const blank = " ".repeat(width);
    const rows = [blank, ...lines, blank].map((line) => {
      const padded = line.padEnd(width);
      const split = padded.indexOf("1") === -1 ? width : padded.indexOf("1");
      return [
        `%c  ${padded.slice(0, split)}%c${padded.slice(split)}  `,
        `${block};color:${L}`,
        `${block};color:${ONE}`,
      ];
    });

    console.log(rows.map(([text]) => text).join("\n"), ...rows.flatMap(([, ...styles]) => styles));
  }, []);

  return null;
};
