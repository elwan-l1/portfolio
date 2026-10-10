import { TEXT as t } from "@/constants/admin";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/_auth/todo")({
  component: () => (
    <h1 className="text-text m-0 text-5xl leading-none font-bold tracking-[-0.05em]">{t.todo}</h1>
  ),
});
