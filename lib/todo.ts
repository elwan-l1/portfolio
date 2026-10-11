import type { TodoStatus } from "@/generated/prisma/enums";

import { adminOnly } from "./admin";
import {
  hide,
  loadBoard as load,
  removeProject,
  removeTag,
  removeTodo,
  setStatus,
  writeProject,
  writeTag,
  writeTodo,
  type ProjectInput,
  type TagInput,
  type TodoInput,
} from "./todo.server";
import { createServerFn } from "@tanstack/react-start";

const id = (input: number) => input;

export const loadBoard = createServerFn({ method: "GET" })
  .middleware([adminOnly])
  .handler(() => load());

export const saveProject = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .validator((input: ProjectInput) => input)
  .handler(({ data }) => writeProject(data));

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .validator(id)
  .handler(({ data }) => removeProject(data));

export const saveTodo = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .validator((input: TodoInput) => input)
  .handler(({ data }) => writeTodo(data));

export const moveTodo = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .validator((input: { id: number; status: TodoStatus }) => input)
  .handler(({ data }) => setStatus(data.id, data.status));

export const deleteTodo = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .validator(id)
  .handler(({ data }) => removeTodo(data));

export const saveTag = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .validator((input: TagInput) => input)
  .handler(({ data }) => writeTag(data));

export const deleteTag = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .validator(id)
  .handler(({ data }) => removeTag(data));

export const hideStatuses = createServerFn({ method: "POST" })
  .middleware([adminOnly])
  .validator((input: TodoStatus[]) => input)
  .handler(({ data }) => hide(data));
