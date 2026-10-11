import { logoutAdmin } from "@/lib/admin";

import { TEXT as t } from "@/constants/admin";
import { Link, Outlet, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

const Shell = () => {
  const navigate = useNavigate();

  const logout = async () => {
    await logoutAdmin();
    await navigate({ to: "/admin" });
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 py-6 sm:px-8">
      <nav className="text-meta flex items-baseline justify-between gap-5">
        <a href="/" className="text-subtext0 hover:text-pink w-fit no-underline">
          ← {t.home}
        </a>
        <span className="flex gap-5">
          {t.pages.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="text-subtext0 hover:text-text no-underline"
              activeProps={{
                className: "text-text! decoration-pink underline! decoration-2 underline-offset-8",
              }}
            >
              {label}
            </Link>
          ))}
        </span>
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
