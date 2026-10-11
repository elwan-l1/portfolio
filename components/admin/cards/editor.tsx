import { type FormEvent, useState } from "react";

import type { CardLayout, CardSize } from "@/generated/prisma/enums";
import type { CardContent } from "@/lib/card-svg";
import { deleteCard, saveCard } from "@/lib/cards";
import type { Cards } from "@/lib/cards.server";

import { Alert, Dialog, Field, button, control, danger, quiet, useAction } from "../todo/ui";
import { ArtInput } from "./art-input";
import { Preview } from "./preview";
import { INKS, LAYOUTS, MAX_TITLE, SIZES, TEXT as t } from "@/constants/cards";
import { ICONS } from "@/constants/todo";

type Card = Cards[number];
type Props = { card?: Card; onClose: () => void; onSaved: (cards: Cards) => void };

const select = `${control} cursor-pointer`;

const BLANK: CardContent = {
  title: "",
  glyph: ICONS[0],
  color: "mauve",
  layout: "grid",
  size: "l",
  items: "",
};

export const CardDialog = ({ card, onClose, onSaved }: Props) => {
  const { error, busy, run } = useAction();
  const [content, setContent] = useState<CardContent>(card ?? BLANK);

  const set = (patch: Partial<CardContent>) => setContent((current) => ({ ...current, ...patch }));

  // art and items are different kinds of text, so switching between them starts empty
  const pickLayout = (layout: CardLayout) =>
    set({ layout, items: layout === "art" || content.layout === "art" ? "" : content.items });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    run(async () => onSaved(await saveCard({ data: { ...content, id: card?.id } })));
  };

  const remove = () => {
    if (!card || !window.confirm(t.confirmDelete(card.title))) return;
    run(async () => onSaved(await deleteCard({ data: card.id })));
  };

  return (
    <Dialog title={card ? t.editCard : t.newCard} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <Field label={t.title}>
          <input
            required
            maxLength={MAX_TITLE}
            value={content.title}
            onChange={(event) => set({ title: event.target.value })}
            className={control}
          />
        </Field>
        <div className="flex flex-wrap gap-6">
          <Field label={t.glyph}>
            <select
              value={content.glyph}
              onChange={(event) => set({ glyph: event.target.value })}
              className={select}
            >
              {ICONS.map((glyph) => (
                <option key={glyph}>{glyph}</option>
              ))}
            </select>
          </Field>
          <Field label={t.color}>
            <select
              value={content.color}
              onChange={(event) => set({ color: event.target.value })}
              className={select}
            >
              {Object.keys(INKS).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </Field>
          <Field label={t.layout}>
            <select
              value={content.layout}
              onChange={(event) => pickLayout(event.target.value as CardLayout)}
              className={select}
            >
              {Object.entries(LAYOUTS).map(([value, name]) => (
                <option key={value} value={value}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.size}>
            <select
              value={content.size}
              onChange={(event) => set({ size: event.target.value as CardSize })}
              className={select}
            >
              {Object.entries(SIZES).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {content.layout === "art" ? (
          <ArtInput onChange={(items) => set({ items })} />
        ) : (
          <Field label={`${t.items} · ${t.itemsHelp}`}>
            <textarea
              rows={6}
              value={content.items}
              onChange={(event) => set({ items: event.target.value })}
              className={`${control} resize-y`}
            />
          </Field>
        )}
        <div className="flex flex-col gap-2">
          <span className="text-meta text-overlay1">{t.preview}</span>
          <Preview card={content} />
        </div>
        <Alert message={error} />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          {card && (
            <button type="button" disabled={busy} onClick={remove} className={danger}>
              {t.delete}
            </button>
          )}
          <button type="button" onClick={onClose} className={`${quiet} ml-auto`}>
            {t.cancel}
          </button>
          <button type="submit" disabled={busy} className={button}>
            {card ? t.save : t.create}
          </button>
        </div>
      </form>
    </Dialog>
  );
};
