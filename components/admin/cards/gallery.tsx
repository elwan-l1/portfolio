import { useState } from "react";

import type { Cards } from "@/lib/cards.server";

import { button, quiet } from "../todo/ui";
import { CardDialog } from "./editor";
import { Preview } from "./preview";
import { TEXT as t } from "@/constants/cards";

type Card = Cards[number];

const Item = ({ card, onEdit }: { card: Card; onEdit: () => void }) => {
  const [copied, setCopied] = useState<string>();

  const copy = async (kind: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(undefined), 1500);
  };

  const url = () => `${location.origin}/cards/${card.id}.svg`;

  return (
    <li className="flex w-fit max-w-full flex-col gap-3">
      <Preview card={card} />
      <span className="text-meta flex flex-wrap gap-x-5 gap-y-2">
        <button type="button" onClick={() => copy("url", url())} className={quiet}>
          {copied === "url" ? t.copied : t.copyUrl}
        </button>
        <button
          type="button"
          onClick={() => copy("markdown", `![${card.title}](${url()})`)}
          className={quiet}
        >
          {copied === "markdown" ? t.copied : t.copyMarkdown}
        </button>
        <button type="button" onClick={onEdit} className={`${quiet} ml-auto`}>
          {t.edit}
        </button>
      </span>
    </li>
  );
};

export const Gallery = ({ cards: initial }: { cards: Cards }) => {
  const [cards, setCards] = useState(initial);
  const [open, setOpen] = useState<{ card?: Card }>();

  const saved = (next: Cards) => {
    setCards(next);
    setOpen(undefined);
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <h1 className="text-text m-0 text-5xl leading-none font-bold tracking-[-0.05em]">
          {t.cards}
        </h1>
        <p className="text-body text-subtext0 m-0 max-w-[60ch]">{t.intro}</p>
      </div>
      <button type="button" onClick={() => setOpen({})} className={button}>
        {t.newCard}
      </button>

      {cards.length === 0 && <p className="text-subtext0 m-0">{t.noCards}</p>}
      <ul className="m-0 flex list-none flex-wrap items-start gap-x-8 gap-y-10 p-0">
        {cards.map((card) => (
          <Item key={card.id} card={card} onEdit={() => setOpen({ card })} />
        ))}
      </ul>

      {open && <CardDialog card={open.card} onClose={() => setOpen(undefined)} onSaved={saved} />}
    </>
  );
};
