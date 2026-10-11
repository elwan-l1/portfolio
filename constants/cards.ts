import type { CardLayout, CardSize } from "@/generated/prisma/enums";

export const INKS = {
  pink: "#f5c2e7",
  mauve: "#cba6f7",
  red: "#f38ba8",
  peach: "#fab387",
  yellow: "#f9e2af",
  green: "#a6e3a1",
  teal: "#94e2d5",
  blue: "#89b4fa",
};

export const MOCHA = {
  text: "#cdd6f4",
  overlay0: "#6c7086",
  surface1: "#45475a",
  surface0: "#313244",
  mantle: "#181825",
  crust: "#11111b",
};

export const LAYOUTS: Record<CardLayout, string> = {
  grid: "Grid",
  list: "List",
  chips: "Chips",
  art: "ASCII art",
};

// GitHub's README column is 838px at most, and inline images sit one space (~4px) apart
export const SIZES: Record<CardSize, { label: string; width: number }> = {
  s: { label: "S · third", width: 276 },
  l: { label: "L · half", width: 415 },
  xl: { label: "XL · full", width: 838 },
};

export const MAX_TITLE = 40;
export const MAX_ITEMS = 30;
export const MAX_ITEM = 40;
export const MAX_ART = 120;

export const TEXT = {
  cards: "Cards",
  intro: "SVG cards for a GitHub README. Each one lives at its own URL.",
  newCard: "New card",
  editCard: "Edit card",
  noCards: "No cards yet.",
  title: "Title",
  glyph: "Glyph",
  color: "Color",
  layout: "Layout",
  size: "Size",
  items: "Items",
  itemsHelp: "One per line.",
  preview: "Preview",
  image: "Image",
  dropImage: "Drop an image here or click to pick one. It never leaves the browser.",
  width: "Width",
  cutoff: "Cutoff",
  dust: "Dust",
  invert: "Invert",
  create: "Create",
  save: "Save",
  delete: "Delete card",
  confirmDelete: (title: string) => `Delete ${title}? Its URL stops working.`,
  cancel: "Cancel",
  edit: "edit",
  copyUrl: "copy url",
  copyMarkdown: "copy markdown",
  copied: "copied",
};
