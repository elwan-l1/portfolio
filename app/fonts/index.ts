import localFont from "next/font/local";

export const martian = localFont({
  src: "./martian-mono.woff2",
  weight: "100 800",
  variable: "--font-martian",
  adjustFontFallback: false,
});

export const art = localFont({
  src: "./noto-sans-mono.woff2",
  weight: "400",
  variable: "--font-art",
  adjustFontFallback: false,
});
