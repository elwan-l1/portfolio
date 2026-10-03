import "server-only";
import { de } from "@/dictionaries/de";
import { en } from "@/dictionaries/en";
import { fr } from "@/dictionaries/fr";
import { it } from "@/dictionaries/it";

export type Dictionary = {
  role: string;
  affiliation: string;
  bio: string[];
  fig: string;
  skeleton: string;
  eye: string;
  uses: string;
  blog: string;
  latestPost: string;
  contact: string;
  interests: string;
  projects: string;
};

const dictionaries = {
  fr,
  en,
  it,
  de,
};

export type Locale = keyof typeof dictionaries;

export const hasLocale = (locale: string): locale is Locale => locale in dictionaries;

export const getDictionary = async (locale: Locale) => dictionaries[locale];
