import { useEffect, useState } from "react";

import type { TodoStatus } from "@/generated/prisma/enums";
import { hideStatuses, moveTodo } from "@/lib/todo";
import type { Board as Data } from "@/lib/todo.server";

import { IssueDialog } from "./issue";
import { ProjectDialog } from "./project";
import { TagsDialog } from "./tags";
import { Alert, Tags, button, formatDay, quiet, tint, useAction } from "./ui";
import { PROJECT_COOKIE, STATUSES, TEXT as t } from "@/constants/todo";

type Todo = Data["todos"][number];
type Project = Data["projects"][number];

type Open =
  | { kind: "issue"; todo?: Todo; status?: TodoStatus }
  | { kind: "project"; project?: Project }
  | { kind: "tags" };

const ORDER = Object.keys(STATUSES) as TodoStatus[];

const row =
  "grid grid-cols-[minmax(0,1fr)_8rem] gap-4 sm:grid-cols-[minmax(0,1fr)_9rem_14rem_5rem]";

const toggleLink = (active: boolean) =>
  `cursor-pointer border-0 bg-transparent p-0 font-[inherit] ${active ? "text-text decoration-pink underline decoration-2 underline-offset-8" : "text-subtext0 hover:text-text"}`;

const Status = ({ status }: { status: TodoStatus }) => (
  <span className="whitespace-nowrap">
    <span style={tint(STATUSES[status].color)}>{STATUSES[status].glyph}</span>{" "}
    {STATUSES[status].label}
  </span>
);

const Card = ({ todo, onOpen }: { todo: Todo; onOpen: () => void }) => (
  <button
    type="button"
    draggable
    onClick={onOpen}
    onDragStart={(event) => event.dataTransfer.setData("text/plain", String(todo.id))}
    className="bg-base border-surface0 hover:border-pink focus-visible:border-pink text-text flex cursor-grab flex-col gap-2 border p-3 text-left font-[inherit] outline-none"
  >
    <strong className="text-body break-words">{todo.title}</strong>
    {todo.description && (
      <span className="text-meta text-subtext0 line-clamp-2 break-words">{todo.description}</span>
    )}
    <Tags tags={todo.tags} />
    {(todo.end || todo.start) && (
      <span className="text-meta text-overlay1">{formatDay(todo.end || todo.start)}</span>
    )}
  </button>
);

const remember = (id: number) => {
  document.cookie = `${PROJECT_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
};

export const Board = ({
  board: initial,
  project: remembered,
}: {
  board: Data;
  project?: number;
}) => {
  const [board, setBoard] = useState(initial);
  const [selected, setSelected] = useState(remembered);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Open>();
  const [over, setOver] = useState<TodoStatus>();
  const { error, run } = useAction();

  const project = board.projects.find((item) => item.id === selected) ?? board.projects[0];
  const visible = ORDER.filter((status) => !board.hidden.includes(status));
  const needle = query.trim().toLowerCase();
  const todos = board.todos.filter(
    (todo) =>
      todo.projectId === project?.id &&
      visible.includes(todo.status) &&
      [todo.title, todo.description, ...todo.tags.map((tag) => tag.name)]
        .join("\n")
        .toLowerCase()
        .includes(needle),
  );

  const hasProject = !!project;
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      const key = event.key.toLowerCase();
      if (key === "b" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setView((current) => (current === "kanban" ? "list" : "kanban"));
      }
      const typing =
        event.target instanceof HTMLElement &&
        event.target.closest("input, textarea, select, [contenteditable]");
      if (key === "c" && hasProject && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setOpen({ kind: "issue" });
      }
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, [hasProject]);

  const select = (id: number) => {
    setSelected(id);
    remember(id);
  };

  const saved = (next: Data, projectId?: number) => {
    setBoard(next);
    if (projectId) select(projectId);
    setOpen(undefined);
  };

  const optimistic = (next: Data, request: () => Promise<unknown>) => {
    const before = board;
    setBoard(next);
    run(() =>
      request().catch((failure) => {
        setBoard(before);
        throw failure;
      }),
    );
  };

  const move = (id: number, status: TodoStatus) => {
    if (!board.todos.some((todo) => todo.id === id && todo.status !== status)) return;
    const next = board.todos.map((todo) => (todo.id === id ? { ...todo, status } : todo));
    optimistic({ ...board, todos: next }, () => moveTodo({ data: { id, status } }));
  };

  const toggle = (status: TodoStatus) => {
    const hidden = board.hidden.includes(status)
      ? board.hidden.filter((item) => item !== status)
      : [...board.hidden, status];
    optimistic({ ...board, hidden }, () => hideStatuses({ data: hidden }));
  };

  const close = () => setOpen(undefined);

  return (
    <>
      <header className="flex flex-col gap-6">
        <nav
          aria-label={t.projects}
          className="text-meta flex flex-wrap items-baseline gap-x-5 gap-y-2"
        >
          {board.projects.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => select(item.id)}
              aria-current={item.id === project?.id ? "true" : undefined}
              className={toggleLink(item.id === project?.id)}
            >
              <span style={tint(item.color)}>■</span> {item.name}
            </button>
          ))}
          <button type="button" onClick={() => setOpen({ kind: "project" })} className={quiet}>
            + {t.newProject}
          </button>
          <button
            type="button"
            onClick={() => setOpen({ kind: "tags" })}
            className={`${quiet} ml-auto`}
          >
            # {t.tags.toLowerCase()}
          </button>
        </nav>

        <div className="flex flex-col gap-3">
          <h1 className="text-text m-0 flex flex-wrap items-baseline gap-x-5 gap-y-3 text-5xl leading-none font-bold tracking-[-0.05em] break-words">
            {project?.name ?? t.todo}
            {project && (
              <button
                type="button"
                onClick={() => setOpen({ kind: "project", project })}
                className={`${quiet} text-meta font-normal tracking-normal`}
              >
                {t.editProject.toLowerCase()}
              </button>
            )}
          </h1>
          <p className="text-body text-subtext0 m-0 max-w-[60ch]">
            {project ? project.description : t.noProject}
          </p>
        </div>

        {!project && (
          <button type="button" onClick={() => setOpen({ kind: "project" })} className={button}>
            {t.addProject}
          </button>
        )}

        {project && (
          <div className="border-surface0 flex flex-wrap items-center gap-x-8 gap-y-4 border-t pt-5">
            <label className="text-body text-overlay1 focus-within:text-pink flex min-w-48 flex-1 items-center gap-3">
              <span aria-hidden>/</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t.search}
                aria-label={t.search}
                className="text-text placeholder:text-overlay0 w-full border-0 bg-transparent p-0 font-[inherit] outline-none"
              />
            </label>
            <div className="text-meta flex flex-wrap gap-x-4 gap-y-2">
              {ORDER.map((status) => {
                const shown = visible.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={shown}
                    onClick={() => toggle(status)}
                    className={`cursor-pointer border-0 bg-transparent p-0 font-[inherit] ${shown ? "text-subtext0 hover:text-text" : "text-overlay0 hover:text-subtext0 line-through"}`}
                  >
                    {shown ? (
                      <Status status={status} />
                    ) : (
                      `${STATUSES[status].glyph} ${STATUSES[status].label}`
                    )}
                  </button>
                );
              })}
            </div>
            <div className="text-meta flex gap-4">
              {(["kanban", "list"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={view === value}
                  onClick={() => setView(value)}
                  className={toggleLink(view === value)}
                >
                  {t[value]}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setOpen({ kind: "issue" })} className={button}>
              + {t.newIssue} <kbd className="text-meta ml-2 font-normal">C</kbd>
            </button>
          </div>
        )}
        <Alert message={error} />
      </header>

      {project && view === "kanban" && visible.length === 0 && (
        <p className="text-subtext0 m-0">{t.allHidden}</p>
      )}

      {project && view === "kanban" && visible.length > 0 && (
        <div className="grid snap-x auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
          {visible.map((status) => {
            const items = todos.filter((todo) => todo.status === status);
            return (
              <div
                key={status}
                onDragOver={(event) => {
                  event.preventDefault();
                  setOver(status);
                }}
                onDragLeave={() => setOver(undefined)}
                onDrop={(event) => {
                  event.preventDefault();
                  setOver(undefined);
                  move(Number(event.dataTransfer.getData("text/plain")), status);
                }}
                className={`flex min-h-64 snap-start flex-col gap-2 p-2 ${over === status ? "bg-surface0" : "bg-mantle"}`}
              >
                <header className="text-meta flex items-baseline justify-between gap-2 px-1 py-1">
                  <h2 className="m-0 flex gap-2 text-[length:inherit] font-bold">
                    <Status status={status} />
                    <span className="text-overlay1 font-normal">{items.length}</span>
                  </h2>
                  <button
                    type="button"
                    aria-label={t.addTo(STATUSES[status].label)}
                    title={t.addTo(STATUSES[status].label)}
                    onClick={() => setOpen({ kind: "issue", status })}
                    className={`${quiet} text-body leading-none`}
                  >
                    +
                  </button>
                </header>
                {items.map((todo) => (
                  <Card key={todo.id} todo={todo} onOpen={() => setOpen({ kind: "issue", todo })} />
                ))}
                {items.length === 0 && (
                  <p className="text-meta text-overlay0 m-0 px-1 py-6 text-center">{t.drop}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {project && view === "list" && (
        <div className="flex flex-col">
          <div className={`${row} text-meta text-overlay1 border-surface0 border-b pb-2`}>
            <span>{t.issue}</span>
            <span>{t.status}</span>
            <span className="max-sm:hidden">{t.tags}</span>
            <span className="max-sm:hidden">{t.dates}</span>
          </div>
          {todos.length === 0 && <p className="text-subtext0 m-0 py-6">{t.noMatch}</p>}
          {todos.map((todo) => (
            <button
              key={todo.id}
              type="button"
              onClick={() => setOpen({ kind: "issue", todo })}
              className={`${row} border-surface0 hover:bg-mantle cursor-pointer items-baseline border-0 border-b bg-transparent px-0 py-3 text-left font-[inherit] text-inherit`}
            >
              <span className="flex min-w-0 flex-col gap-1">
                <strong className="text-body text-text break-words">{todo.title}</strong>
                {todo.description && (
                  <small className="text-meta text-subtext0 truncate">{todo.description}</small>
                )}
              </span>
              <span className="text-meta">
                <Status status={todo.status} />
              </span>
              <span className="text-meta text-overlay0 max-sm:hidden">
                {todo.tags.length ? <Tags tags={todo.tags} /> : "—"}
              </span>
              <span className="text-meta text-overlay1 max-sm:hidden">
                {todo.end || todo.start ? formatDay(todo.end || todo.start) : "—"}
              </span>
            </button>
          ))}
        </div>
      )}

      {open?.kind === "issue" && project && (
        <IssueDialog
          board={board}
          todo={open.todo}
          projectId={project.id}
          status={open.status}
          onClose={close}
          onSaved={saved}
        />
      )}
      {open?.kind === "project" && (
        <ProjectDialog project={open.project} onClose={close} onSaved={saved} />
      )}
      {open?.kind === "tags" && <TagsDialog tags={board.tags} onClose={close} onSaved={setBoard} />}
    </>
  );
};
