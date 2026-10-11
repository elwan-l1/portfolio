import { type FormEvent, useState } from "react";

import { deleteTag, saveTag } from "@/lib/todo";
import type { Board } from "@/lib/todo.server";

import { Alert, Dialog, type Tag, control, danger, quiet, tint, useAction } from "./ui";
import { COLORS, ICONS, TEXT as t } from "@/constants/todo";

type RowProps = { tag?: Tag; onSaved: (board: Board) => void };

const select = `${control} cursor-pointer`;

const TagRow = ({ tag, onSaved }: RowProps) => {
  const { error, busy, run } = useAction();
  const [icon, setIcon] = useState(tag?.icon ?? ICONS[0]);
  const [color, setColor] = useState(tag?.color ?? COLORS[0]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name"));
    run(async () => onSaved(await saveTag({ data: { id: tag?.id, name, icon, color } })));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="text-body flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <span style={tint(color)} className="w-[2ch] text-center">
          {icon}
        </span>
        <input
          name="name"
          required
          maxLength={24}
          defaultValue={tag?.name}
          placeholder={t.newTag}
          aria-label={t.name}
          className={`${control} placeholder:text-overlay0 min-w-32 flex-1`}
        />
        <select
          value={icon}
          onChange={(event) => setIcon(event.target.value)}
          aria-label={t.icon}
          className={`${select} w-14!`}
        >
          {ICONS.map((glyph) => (
            <option key={glyph}>{glyph}</option>
          ))}
        </select>
        <select
          value={color}
          onChange={(event) => setColor(event.target.value)}
          aria-label={t.color}
          className={`${select} w-24!`}
        >
          {COLORS.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        <span className="text-meta flex gap-4">
          <button type="submit" disabled={busy} className={quiet}>
            {tag ? t.save : t.add}
          </button>
          {tag && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(async () => onSaved(await deleteTag({ data: tag.id })))}
              className={danger}
            >
              {t.delete}
            </button>
          )}
        </span>
      </div>
      <Alert message={error} />
    </form>
  );
};

type Props = { tags: Tag[]; onClose: () => void; onSaved: (board: Board) => void };

export const TagsDialog = ({ tags, onClose, onSaved }: Props) => (
  <Dialog title={t.manageTags} onClose={onClose}>
    <p className="text-body text-subtext0 m-0">{t.tagsIntro}</p>
    {/* keyed by count so the new tag row starts empty again after an add */}
    <TagRow key={tags.length} onSaved={onSaved} />
    <div className="border-surface0 flex flex-col gap-4 border-t pt-6">
      {tags.length === 0 && <p className="text-meta text-overlay1 m-0">{t.noTags}</p>}
      {tags.map((tag) => (
        <TagRow key={tag.id} tag={tag} onSaved={onSaved} />
      ))}
    </div>
  </Dialog>
);
