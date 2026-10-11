import type { CardLayout, CardSize } from "@/generated/prisma/enums";

import { inkOf } from "./art";
import { art, martian } from "@/app/fonts";
import { INKS, MOCHA, SIZES } from "@/constants/cards";

export type CardContent = {
  title: string;
  glyph: string;
  color: string;
  layout: CardLayout;
  size: CardSize;
  items: string;
};

const PAD = 20;
const ADVANCE = 0.7;
export const ART_ADVANCE = 0.6;
const TITLE = 18;
const MARK = 26;
const ITEM = 13;
const GAP = 8;

export const lines = (items: string) =>
  items
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

// xml rejects control characters, the rest of the text is escaped as entities
const escape = (text: string) =>
  text.replace(/\p{Cc}/gu, "").replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const fit = (text: string, size: number, room: number) => {
  const chars = [...text];
  const max = Math.floor(room / (size * ADVANCE));
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : text;
};

const width = (text: string, size: number) => [...text].length * size * ADVANCE;

// strokes sit on half pixels so 1px borders stay sharp
const box = (x: number, y: number, w: number, h: number, fill: string, stroke = fill) =>
  `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" fill="${fill}" stroke="${stroke}"/>`;

const label = (x: number, y: number, text: string, size: number, fill: string, extra = "") =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" dominant-baseline="central"${extra}>${escape(text)}</text>`;

const grid = (items: string[], top: number, inner: number) => {
  const cols = Math.max(1, Math.round(inner / 190));
  const w = (inner - GAP * (cols - 1)) / cols;
  const h = 32;
  const cells = items.map((item, i) => {
    const x = PAD + (i % cols) * (w + GAP);
    const y = top + Math.floor(i / cols) * (h + GAP);
    const text = fit(item, ITEM, w - 16);
    return `${box(x, y, w, h, MOCHA.surface0, MOCHA.surface1)}${label(x + w / 2, y + h / 2, text, ITEM, MOCHA.text, ' text-anchor="middle"')}`;
  });
  const rows = Math.ceil(items.length / cols);
  return { svg: cells.join(""), height: rows * h + (rows - 1) * GAP };
};

const list = (items: string[], top: number, inner: number, ink: string) => {
  const h = 26;
  const rows = items.map((item, i) => {
    const y = top + i * h;
    const rule = i
      ? `<rect x="${PAD}" y="${y}" width="${inner}" height="1" fill="${MOCHA.surface0}"/>`
      : "";
    const text = fit(item, ITEM, inner - 2 * ITEM);
    return `${rule}${label(PAD, y + h / 2, "›", ITEM, ink)}${label(PAD + 2 * ITEM, y + h / 2, text, ITEM, MOCHA.text)}`;
  });
  return { svg: rows.join(""), height: items.length * h };
};

const chips = (items: string[], top: number, inner: number, ink: string) => {
  const h = 24;
  const gap = 6;
  let x = PAD;
  let y = top;
  const parts = items.map((item) => {
    const text = fit(item, ITEM, inner - 16);
    const w = width(text, ITEM) + 16;
    if (x + w > PAD + inner) {
      x = PAD;
      y += h + gap;
    }
    const chip = `${box(x, y, w, h, MOCHA.crust, MOCHA.surface1)}${label(x + 8, y + h / 2, text, ITEM, ink)}`;
    x += w + gap;
    return chip;
  });
  return { svg: parts.join(""), height: y + h - top };
};

const round = (n: number) => Math.round(n * 100) / 100;

// sized so the widest row fills the card; each run of one colour is placed by its column
const ascii = (text: string, top: number, inner: number) => {
  const rows = text.split("\n");
  const size = inner / (Math.max(...rows.map((row) => [...row].length)) * ART_ADVANCE);

  const lines = rows.map((row, y) => {
    const spans: string[] = [];
    let start = 0;
    let color = "";
    let run = "";
    [...row, " "].forEach((glyph, x) => {
      const ink = glyph === " " ? "" : inkOf(glyph, x, y);
      if (ink && ink === color) {
        run += glyph;
        return;
      }
      if (run)
        spans.push(
          `<tspan x="${round(PAD + start * size * ART_ADVANCE)}" fill="${color}">${escape(run)}</tspan>`,
        );
      start = x;
      color = ink;
      run = ink && glyph;
    });
    return `<text y="${round(top + (y + 0.5) * size)}">${spans.join("")}</text>`;
  });

  return {
    svg: `<g font-family="${art.family}, monospace" font-size="${round(size)}" dominant-baseline="central">${lines.join("")}</g>`,
    height: round(rows.length * size),
  };
};

/** Standalone SVG of a card. `font` is a css @font-face, left out where the page already has the font. */
export const renderCard = (card: CardContent, font = "") => {
  const ink = INKS[card.color as keyof typeof INKS];
  const { width: full } = SIZES[card.size];
  const inner = full - PAD * 2;
  const items = lines(card.items);
  const title = fit(card.title, TITLE, inner - 2.1 * TITLE);
  const glyphX = PAD + 0.8 * TITLE;
  const titleX = PAD + 1.8 * TITLE;
  const markWidth = 2.1 * TITLE + width(title, TITLE);

  const top = PAD + MARK + 16;
  const body =
    items.length === 0
      ? { svg: "", height: -16 }
      : card.layout === "art"
        ? ascii(card.items, top, inner)
        : card.layout === "grid"
          ? grid(items, top, inner)
          : card.layout === "list"
            ? list(items, top, inner, ink)
            : chips(items, top, inner, ink);
  const height = top + body.height + PAD;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${full}" height="${height}" viewBox="0 0 ${full} ${height}" role="img" aria-label="${escape(card.title)}" font-family="${martian.family}, monospace">`,
    font && `<style>${font}</style>`,
    box(0, 0, full, height, MOCHA.mantle, MOCHA.surface0),
    `<rect x="${PAD}" y="${PAD}" width="${markWidth}" height="${MARK}" fill="${ink}"/>`,
    label(glyphX, PAD + MARK / 2, card.glyph, TITLE, MOCHA.crust, ' text-anchor="middle"'),
    label(titleX, PAD + MARK / 2, title, TITLE, MOCHA.crust, ' font-weight="700"'),
    body.svg,
    "</svg>",
  ].join("");
};
