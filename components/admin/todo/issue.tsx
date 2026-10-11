import { type FormEvent, useState } from "react";

import type { TodoStatus } from "@/generated/prisma/enums";
import { deleteTodo, saveTodo } from "@/lib/todo";
import type { Board } from "@/lib/todo.server";

import { Alert, Dialog, Field, button, control, danger, quiet, tint, useAction } from "./ui";
import { STATUSES, TEXT as t } from "@/constants/todo";

type Props = {
  board: Board;
  todo?: Board["todos"][number];
  projectId: number;
  status?: TodoStatus;
  onClose: () => void;
  onSaved: (board: Board, projectId?: number) => void;
};

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export const IssueDialog = ({ board, todo, projectId, status, onClose, onSaved }: Props) => {
  const { error, busy, run } = useAction();
  const [names, setNames] = useState(() => todo?.tags.map((tag) => tag.name) ?? []);

  // a typed name reuses the spelling of an existing tag; the server creates the rest
  const withTyped = (list: string[], typed: string) => {
    const name = board.tags.find((tag) => same(tag.name, typed))?.name ?? typed;
    return !name || list.some((item) => same(item, name)) ? list : [...list, name];
  };

  const toggle = (name: string) =>
    setNames(names.includes(name) ? names.filter((item) => item !== name) : [...names, name]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = {
      id: todo?.id,
      projectId: Number(form.get("projectId")),
      title: String(form.get("title")),
      description: String(form.get("description")),
      status: String(form.get("status")) as TodoStatus,
      tags: withTyped(names, String(form.get("tag")).trim()),
      start: String(form.get("start")),
      end: String(form.get("end")),
    };
    run(async () => onSaved(await saveTodo({ data }), data.projectId));
  };

  const created = names.filter((name) => !board.tags.some((tag) => tag.name === name));
  const chip = (name: string, label: string, color: string) => {
    const on = names.includes(name);
    return (
      <button
        key={name}
        type="button"
        aria-pressed={on}
        onClick={() => toggle(name)}
        style={on ? { backgroundColor: tint(color).color } : tint(color)}
        className={`text-meta cursor-pointer border-0 bg-transparent px-1.5 py-0.5 font-[inherit] ${on ? "text-crust! font-bold" : "hover:underline"}`}
      >
        {label}
      </button>
    );
  };

  return (
    <Dialog title={todo ? t.editIssue : t.createIssue} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <Field label={t.title}>
          <input
            name="title"
            required
            maxLength={160}
            defaultValue={todo?.title}
            className={control}
          />
        </Field>
        <Field label={t.description}>
          <textarea
            name="description"
            rows={4}
            maxLength={4000}
            defaultValue={todo?.description}
            className={`${control} resize-y`}
          />
        </Field>
        <div className="flex flex-wrap gap-6">
          <Field label={t.status}>
            <select
              name="status"
              defaultValue={todo?.status ?? status ?? "todo"}
              className={control}
            >
              {Object.entries(STATUSES).map(([value, { label, glyph }]) => (
                <option key={value} value={value}>
                  {glyph} {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.project}>
            <select
              name="projectId"
              defaultValue={todo?.projectId ?? projectId}
              className={control}
            >
              {board.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex flex-col gap-3">
          <Field label={t.tags}>
            <input
              name="tag"
              maxLength={24}
              placeholder={t.tagHelp}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                setNames(withTyped(names, event.currentTarget.value.trim()));
                event.currentTarget.value = "";
              }}
              className={`${control} placeholder:text-overlay0`}
            />
          </Field>
          {(board.tags.length > 0 || created.length > 0) && (
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              {board.tags.map((tag) => chip(tag.name, `${tag.icon} ${tag.name}`, tag.color))}
              {created.map((name) => chip(name, `• ${name}`, "overlay2"))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-6">
          <Field label={t.start}>
            <input type="date" name="start" defaultValue={todo?.start} className={control} />
          </Field>
          <Field label={t.due}>
            <input type="date" name="end" defaultValue={todo?.end} className={control} />
          </Field>
        </div>
        <Alert message={error} />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          {todo && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(async () => onSaved(await deleteTodo({ data: todo.id })))}
              className={danger}
            >
              {t.delete}
            </button>
          )}
          <button type="button" onClick={onClose} className={`${quiet} ml-auto`}>
            {t.cancel}
          </button>
          <button type="submit" disabled={busy} className={button}>
            {todo ? t.save : t.create}
          </button>
        </div>
      </form>
    </Dialog>
  );
};
