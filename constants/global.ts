export const VERSION = "4.0.0";
export const LANGUAGES = ["en", "fr"] as const;
export type Locale = (typeof LANGUAGES)[number];

export const hasLocale = (locale: string): locale is Locale =>
  (LANGUAGES as readonly string[]).includes(locale);

export const NAME = "Elwan";
export const EMAIL = "mayencourt@elwan.ch";
export const ORIGIN = "https://elwan.ch";

export const MUSICIAN = { name: "Xav", url: "https://soundcloud.com/xavwakeup" };
