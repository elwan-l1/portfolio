import { ConsoleLogo } from "@/components/console-logo";
import { Motes } from "@/components/motes";
import { Trail } from "@/components/trail";

import { hasLocale } from "@/constants/global";
import { Outlet, createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/$lang")({
  beforeLoad: ({ params }) => {
    if (!hasLocale(params.lang)) throw notFound();
  },
  component: () => (
    <>
      <Trail />
      <Motes />
      <ConsoleLogo />
      <Outlet />
    </>
  ),
});
