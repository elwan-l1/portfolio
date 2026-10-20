import type { Locale } from "@/constants/global";
import { en } from "@/dictionaries/en";
import { fr } from "@/dictionaries/fr";

const dictionaries = { fr, en };

export const getDictionary = (locale: Locale) => dictionaries[locale];
