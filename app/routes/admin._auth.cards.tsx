import { Gallery } from "@/components/admin/cards/gallery";

import { loadCards } from "@/lib/cards";

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/_auth/cards")({
  loader: () => loadCards(),
  component: () => <Gallery cards={Route.useLoaderData()} />,
});
