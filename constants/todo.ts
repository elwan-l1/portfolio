import type { TodoStatus } from "@/generated/prisma/enums";

export const STATUSES: Record<TodoStatus, { label: string; glyph: string; color: string }> = {
  todo: { label: "Todo", glyph: "○", color: "blue" },
  in_progress: { label: "In progress", glyph: "◐", color: "peach" },
  in_review: { label: "In review", glyph: "◑", color: "yellow" },
  done: { label: "Done", glyph: "●", color: "green" },
  cancelled: { label: "Cancelled", glyph: "✕", color: "red" },
};

export const PROJECT_COOKIE = "todo_project";

export const COLORS = ["mauve", "blue", "green", "peach", "red", "teal", "yellow"];

// text presentation only: symbols that default to colour emoji are left out
export const ICONS = [
  ..."•⌂⚠✓✕★☆●○◆◇■□▲△▼▽▶▷◀◁☀☁☂☃☄☎✉✎✂⚙⚑⚐♡♥♢♦♧♣♤♠♫♪☯☮☢☣⚕⚖⚔⚒⚗⌁⌘⏱⌨✈✦✧❄❖➜➤↻∞∑∅≈≠⊕⊗⊙☑☐",
];

export const TEXT = {
  todo: "Todo",
  projects: "Projects",
  newProject: "project",
  editProject: "Edit project",
  addProject: "Add project",
  deleteProject: "Delete project",
  confirmDelete: (name: string) => `Delete ${name} and all its issues?`,
  noProject: "Create a project to start planning.",
  name: "Name",
  description: "Description",
  color: "Color",
  search: "Search issues",
  kanban: "kanban",
  list: "list",
  newIssue: "New issue",
  createIssue: "Create issue",
  editIssue: "Edit issue",
  title: "Title",
  status: "Status",
  project: "Project",
  tags: "Tags",
  tagHelp: "Pick tags or type a new name and press Enter.",
  start: "Start date",
  due: "Due date",
  dates: "Dates",
  issue: "Issue",
  create: "Create",
  save: "Save",
  delete: "Delete",
  cancel: "Cancel",
  close: "Close",
  add: "Add",
  newTag: "New tag",
  icon: "Icon",
  manageTags: "Manage tags",
  tagsIntro: "Tags are shared across projects.",
  noTags: "No tags yet.",
  allHidden: "Every status is hidden. Show one above.",
  noMatch: "No issues match this view.",
  drop: "Drop an issue here",
  addTo: (status: string) => `Add issue to ${status}`,
};
