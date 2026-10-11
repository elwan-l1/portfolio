import { RAMP } from "./art";
import { type CardContent, lines, renderCard } from "./card-svg";
import { getPrisma } from "./prisma.server";
import { art, martian } from "@/app/fonts";
import martianFont from "@/app/fonts/martian-mono.woff2?inline";
import artFont from "@/app/fonts/noto-sans-mono.woff2?inline";
import { INKS, MAX_ART, MAX_ITEM, MAX_ITEMS, MAX_TITLE } from "@/constants/cards";
import { ICONS } from "@/constants/todo";
import { createHash } from "node:crypto";

export type CardInput = CardContent & { id?: string };

// fonts are embedded in the svg because GitHub loads it as an <img>, which cannot fetch external files
const face = ({ family, weight }: typeof martian, data: string) =>
  `@font-face{font-family:${family};src:url(${data}) format("woff2");font-weight:${weight}}`;

const MARTIAN = face(martian, martianFont);
const ART = face(art, artFont);
const ART_GLYPHS = new Set([...RAMP, "·", "+", " "]);

const rendered = new Map<string, { svg: string; etag: string }>();

export const getCards = () =>
  getPrisma().card.findMany({
    select: {
      id: true,
      title: true,
      glyph: true,
      color: true,
      layout: true,
      size: true,
      items: true,
    },
    orderBy: { createdAt: "asc" },
  });

export type Cards = Awaited<ReturnType<typeof getCards>>;

export const cardSvg = async (id: string) => {
  const hit = rendered.get(id);
  if (hit) return hit;

  const card = await getPrisma().card.findUnique({ where: { id } });
  if (!card) return;
  const font = card.layout === "art" ? MARTIAN + ART : MARTIAN;
  const svg = renderCard(card, font);
  // hashed from the svg, so a change to the renderer also reaches cached copies
  const entry = { svg, etag: `"${createHash("sha1").update(svg).digest("base64url")}"` };
  rendered.set(id, entry);
  return entry;
};

const checkItems = (text: string) => {
  const items = lines(text);
  if (items.length > MAX_ITEMS) throw new Error(`Up to ${MAX_ITEMS} items.`);
  if (items.some((item) => [...item].length > MAX_ITEM))
    throw new Error(`Items stay under ${MAX_ITEM} characters.`);
  return items.join("\n");
};

const checkArt = (text: string) => {
  const rows = text.split("\n");
  if (rows.length > MAX_ART || rows.some((row) => [...row].length > MAX_ART))
    throw new Error(`Art stays under ${MAX_ART} x ${MAX_ART} cells.`);
  if (![...text.replaceAll("\n", "")].every((glyph) => ART_GLYPHS.has(glyph)))
    throw new Error("Art holds only the art glyphs.");
  return text;
};

export const writeCard = async ({ id, ...input }: CardInput) => {
  const title = input.title.trim();
  if (!title) throw new Error("Title is required.");
  if ([...title].length > MAX_TITLE) throw new Error(`Title stays under ${MAX_TITLE} characters.`);
  if (!Object.hasOwn(INKS, input.color)) throw new Error("Unknown color.");
  if (!ICONS.includes(input.glyph)) throw new Error("Unknown glyph.");

  const data = {
    ...input,
    title,
    items: input.layout === "art" ? checkArt(input.items) : checkItems(input.items),
  };
  const prisma = getPrisma();
  if (id) {
    await prisma.card.update({ where: { id }, data });
    rendered.delete(id);
  } else await prisma.card.create({ data });
  return getCards();
};

export const removeCard = async (id: string) => {
  await getPrisma().card.delete({ where: { id } });
  rendered.delete(id);
  return getCards();
};
