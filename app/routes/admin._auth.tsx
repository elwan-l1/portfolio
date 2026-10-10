import { logoutAdmin } from "@/lib/admin";

import { TEXT as t } from "@/constants/admin";
import { Outlet, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

const Shell = () => {
  const navigate = useNavigate();

  const logout = async () => {
    await logoutAdmin();
    await navigate({ to: "/admin" });
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-5 py-6 sm:px-8">
      <nav className="text-meta flex items-baseline justify-between gap-5">
        <a href="/" className="text-subtext0 hover:text-pink w-fit no-underline">
          ← {t.home}
        </a>
        <button
          type="button"
          onClick={logout}
          className="text-subtext0 hover:text-pink cursor-pointer border-0 bg-transparent p-0 font-[inherit]"
        >
          {t.logout}
        </button>
      </nav>
      <Outlet />
    </main>
  );
};

export const Route = createFileRoute("/admin/_auth")({
  beforeLoad: ({ context }) => {
    if (context.auth !== "in") throw redirect({ to: "/admin" });
  },
  component: Shell,
});
