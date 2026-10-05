import type { Locale } from "@/constants/global";
import { de } from "@/dictionaries/de";
import { en } from "@/dictionaries/en";
import { fr } from "@/dictionaries/fr";
import { it } from "@/dictionaries/it";

const dictionaries = { fr, en, it, de };

export const getDictionary = (locale: Locale) => dictionaries[locale];
