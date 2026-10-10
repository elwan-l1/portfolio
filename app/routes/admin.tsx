import { Trail } from "@/components/trail";

import { getAuth } from "@/lib/admin";

import { TEXT as t } from "@/constants/admin";
import { Outlet, createFileRoute } from "@tanstack/react-router";

// runs on every navigation, so each admin page checks the session again
export const Route = createFileRoute("/admin")({
  beforeLoad: async () => ({ auth: await getAuth() }),
  head: () => ({
    meta: [{ title: `${t.admin} · Elwan` }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => (
    <>
      <Trail />
      <Outlet />
    </>
  ),
});
