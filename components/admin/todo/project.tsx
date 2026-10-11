import type { FormEvent } from "react";

import { deleteProject, saveProject } from "@/lib/todo";
import type { Board } from "@/lib/todo.server";

import { Alert, Dialog, Field, button, control, danger, quiet, tint, useAction } from "./ui";
import { COLORS, TEXT as t } from "@/constants/todo";

type Props = {
  project?: Board["projects"][number];
  onClose: () => void;
  onSaved: (board: Board, projectId?: number) => void;
};

export const ProjectDialog = ({ project, onClose, onSaved }: Props) => {
  const { error, busy, run } = useAction();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = {
      id: project?.id,
      name: String(form.get("name")),
      description: String(form.get("description")),
      color: String(form.get("color")),
    };
    run(async () => {
      const saved = await saveProject({ data });
      onSaved(saved.board, saved.id);
    });
  };

  const remove = () => {
    if (!project || !window.confirm(t.confirmDelete(project.name))) return;
    run(async () => onSaved(await deleteProject({ data: project.id })));
  };

  return (
    <Dialog title={project ? t.editProject : t.addProject} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <Field label={t.name}>
          <input
            name="name"
            required
            maxLength={80}
            defaultValue={project?.name}
            className={control}
          />
        </Field>
        <Field label={t.description}>
          <textarea
            name="description"
            rows={2}
            maxLength={300}
            defaultValue={project?.description}
            className={`${control} resize-y`}
          />
        </Field>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="text-meta text-overlay1 mb-2 p-0">{t.color}</legend>
          <div className="flex gap-3">
            {COLORS.map((color) => (
              <label key={color} title={color} aria-label={color} className="cursor-pointer">
                <input
                  type="radio"
                  name="color"
                  value={color}
                  defaultChecked={color === (project?.color ?? COLORS[0])}
                  className="peer sr-only"
                />
                <span
                  style={{ backgroundColor: tint(color).color }}
                  className="peer-checked:outline-text peer-focus-visible:outline-pink block size-6 outline-offset-2 peer-checked:outline-2 peer-focus-visible:outline-2"
                />
              </label>
            ))}
          </div>
        </fieldset>
        <Alert message={error} />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          {project && (
            <button type="button" disabled={busy} onClick={remove} className={danger}>
              {t.deleteProject}
            </button>
          )}
          <button type="button" onClick={onClose} className={`${quiet} ml-auto`}>
            {t.cancel}
          </button>
          <button type="submit" disabled={busy} className={button}>
            {project ? t.save : t.addProject}
          </button>
        </div>
      </form>
    </Dialog>
  );
};
