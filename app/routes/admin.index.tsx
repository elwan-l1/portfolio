import { Gate } from "@/components/admin/gate";

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  beforeLoad: ({ context }) => {
    if (context.auth === "in") throw redirect({ to: "/admin/todo" });
    return { status: context.auth };
  },
  component: () => <Gate status={Route.useRouteContext().status} />,
});
