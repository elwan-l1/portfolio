import { Board } from "@/components/admin/todo/board";

import { loadBoard } from "@/lib/todo";

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/_auth/todo")({
  loader: () => loadBoard(),
  component: () => <Board {...Route.useLoaderData()} />,
});
