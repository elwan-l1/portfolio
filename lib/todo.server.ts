import { Prisma } from "@/generated/prisma/client";
import type { TodoStatus } from "@/generated/prisma/enums";

import { getPrisma } from "./prisma.server";
import { COLORS, ICONS, PROJECT_COOKIE } from "@/constants/todo";
import { getCookie } from "@tanstack/react-start/server";

export type ProjectInput = { id?: number; name: string; description: string; color: string };
export type TagInput = { id?: number; name: string; color: string; icon: string };
export type TodoInput = {
  id?: number;
  projectId: number;
  title: string;
  description: string;
  status: TodoStatus;
  tags: string[];
  start: string;
  end: string;
};

const tag = { id: true, name: true, color: true, icon: true } as const;

// dates travel as YYYY-MM-DD, the value of a date input
const day = (date: Date | null) => date?.toISOString().slice(0, 10) ?? "";
const date = (day: string) => (day ? new Date(day) : null);

const required = (value: string, label: string) => {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  return trimmed;
};

const checkColor = (color: string) => {
  if (!COLORS.includes(color)) throw new Error("Unknown color.");
};

export const getBoard = async () => {
  const prisma = getPrisma();
  const [projects, todos, tags, hidden] = await Promise.all([
    prisma.todoProject.findMany({
      select: { id: true, name: true, description: true, color: true },
      orderBy: { name: "asc" },
    }),
    prisma.todo.findMany({
      select: {
        id: true,
        projectId: true,
        title: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        tags: { select: tag, orderBy: { name: "asc" } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.todoTag.findMany({ select: tag, orderBy: { name: "asc" } }),
    prisma.todoHiddenStatus.findMany(),
  ]);

  return {
    projects,
    tags,
    todos: todos.map(({ startDate, endDate, ...todo }) => ({
      ...todo,
      start: day(startDate),
      end: day(endDate),
    })),
    hidden: hidden.map(({ status }) => status),
  };
};

export type Board = Awaited<ReturnType<typeof getBoard>>;

export const loadBoard = async () => ({
  board: await getBoard(),
  project: Number(getCookie(PROJECT_COOKIE)) || undefined,
});

export const writeProject = async ({ id, color, ...input }: ProjectInput) => {
  checkColor(color);
  const data = { name: required(input.name, "Name"), description: input.description.trim(), color };
  const prisma = getPrisma();
  const project = id
    ? await prisma.todoProject.update({ where: { id }, data })
    : await prisma.todoProject.create({ data });
  return { id: project.id, board: await getBoard() };
};

export const removeProject = async (id: number) => {
  await getPrisma().todoProject.delete({ where: { id } });
  return getBoard();
};

export const writeTodo = async ({ id, tags, start, end, ...input }: TodoInput) => {
  if (start && end && start > end) throw new Error("Due date must be on or after the start date.");
  const prisma = getPrisma();

  // the name column is case-insensitive, so an existing tag is reused whatever the case
  const links = await Promise.all(
    tags.map((name) =>
      prisma.todoTag.upsert({
        where: { name },
        update: {},
        create: { name, color: COLORS[Math.floor(Math.random() * COLORS.length)], icon: "•" },
        select: { id: true },
      }),
    ),
  );
  const data = {
    ...input,
    title: required(input.title, "Title"),
    description: input.description.trim(),
    startDate: date(start),
    endDate: date(end),
  };

  if (id) await prisma.todo.update({ where: { id }, data: { ...data, tags: { set: links } } });
  else await prisma.todo.create({ data: { ...data, tags: { connect: links } } });
  return getBoard();
};

export const setStatus = async (id: number, status: TodoStatus) => {
  await getPrisma().todo.update({ where: { id }, data: { status } });
};

export const removeTodo = async (id: number) => {
  await getPrisma().todo.delete({ where: { id } });
  return getBoard();
};

export const writeTag = async ({ id, color, icon, ...input }: TagInput) => {
  checkColor(color);
  if (!ICONS.includes(icon)) throw new Error("Unknown icon.");
  const data = { name: required(input.name, "Name"), color, icon };
  const prisma = getPrisma();

  try {
    if (id) await prisma.todoTag.update({ where: { id }, data });
    else await prisma.todoTag.create({ data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      throw new Error("A tag with that name already exists.");
    throw error;
  }
  return getBoard();
};

export const removeTag = async (id: number) => {
  await getPrisma().todoTag.delete({ where: { id } });
  return getBoard();
};

export const hide = async (statuses: TodoStatus[]) => {
  const prisma = getPrisma();
  await prisma.$transaction([
    prisma.todoHiddenStatus.deleteMany(),
    prisma.todoHiddenStatus.createMany({ data: statuses.map((status) => ({ status })) }),
  ]);
};
