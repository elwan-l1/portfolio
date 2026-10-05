import martianUrl from "./martian-mono.woff2?url";
import artUrl from "./noto-sans-mono.woff2?url";

export const martian = { family: "'martian'", url: martianUrl, weight: "100 800" };
export const art = { family: "'art'", url: artUrl, weight: "400" };

const face = ({ family, url, weight }: typeof martian) =>
  `@font-face{font-family:${family};src:url(${url}) format("woff2");font-weight:${weight};font-display:swap}`;

export const fontCss = `${face(martian)}${face(art)}:root{--font-martian:${martian.family};--font-art:${art.family}}`;

export const fontLinks = [martian, art].map(({ url }) => ({
  rel: "preload",
  href: url,
  as: "font",
  type: "font/woff2",
  crossOrigin: "anonymous" as const,
}));
