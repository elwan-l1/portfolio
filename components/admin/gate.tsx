import { type FormEvent, useState } from "react";

import { Dust } from "@/components/dust";

import { loginAdmin, recoverAdmin, setupAdmin } from "@/lib/admin";
import type { AuthStatus } from "@/lib/auth.server";

import { TEXT as t } from "@/constants/admin";
import { useNavigate } from "@tanstack/react-router";

type Mode = Exclude<AuthStatus, "in"> | "recover";

type FieldProps = {
  label: string;
  name: string;
  type?: "text" | "password";
  autoComplete: string;
  minLength?: number;
};

const Field = ({ label, name, type = "text", autoComplete, minLength }: FieldProps) => (
  <label className="text-overlay1 focus-within:text-pink flex flex-col gap-2">
    <span className="text-meta">{label}</span>
    <span className="text-body border-surface0 flex items-center gap-3 border-b pb-2 focus-within:border-current">
      <span aria-hidden>&gt;</span>
      <input
        name={name}
        type={type}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        spellCheck={false}
        autoCapitalize="off"
        className="text-text w-full border-0 bg-transparent p-0 font-[inherit] outline-none!"
      />
    </span>
  </label>
);

const button =
  "bg-pink text-crust hover:bg-mauve disabled:bg-surface1 disabled:text-overlay1 w-fit cursor-pointer border-0 px-3 py-1.5 font-[inherit] font-bold";

const swap =
  "text-meta text-subtext0 hover:text-pink w-fit cursor-pointer border-0 bg-transparent p-0 font-[inherit]";

export const Gate = ({ status }: { status: Exclude<AuthStatus, "in"> }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(status);
  const [code, setCode] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username"));
    const password = String(form.get("password"));

    setBusy(true);
    setError(undefined);
    try {
      if (mode === "login") {
        await loginAdmin({ data: { username, password } });
        await navigate({ to: "/admin/todo" });
        return;
      }
      setCode(
        mode === "setup"
          ? await setupAdmin({ data: { username, password } })
          : await recoverAdmin({ data: { username, password, code: String(form.get("code")) } }),
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
    setBusy(false);
  };

  const switchTo = (next: Mode) => {
    setError(undefined);
    setMode(next);
  };

  const intro = { setup: t.setupIntro, login: t.loginIntro, recover: t.recoverIntro }[mode];

  return (
    <>
      <Dust column={576} />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-10 px-5 py-6 sm:px-8">
        <a href="/" className="text-meta text-subtext0 hover:text-pink w-fit no-underline">
          ← {t.home}
        </a>

        <header className="flex flex-col gap-3">
          <h1 className="text-text m-0 text-5xl leading-none font-bold tracking-[-0.05em]">
            {t.admin}
          </h1>
          <p className="text-body text-subtext0 m-0 max-w-[52ch]">{code ? t.codeIntro : intro}</p>
        </header>

        {code ? (
          <section className="border-surface0 flex flex-col gap-6 border-t pt-6">
            <h2 className="text-meta text-overlay1 m-0 font-normal">{t.codeTitle}</h2>
            <p className="bg-mantle text-pink text-lead m-0 w-fit px-4 py-3 font-bold tracking-wide select-all">
              {code}
            </p>
            <button
              type="button"
              className={button}
              onClick={() => navigate({ to: "/admin/todo" })}
            >
              {t.saved}
            </button>
          </section>
        ) : (
          <form
            key={mode}
            onSubmit={submit}
            className="border-surface0 flex flex-col gap-6 border-t pt-6"
          >
            <Field label={t.username} name="username" autoComplete="username" />
            {mode === "recover" && (
              <Field label={t.recoveryCode} name="code" autoComplete="one-time-code" />
            )}
            <Field
              label={mode === "recover" ? t.newPassword : t.password}
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "login" ? undefined : 12}
            />

            {error && (
              <p role="alert" className="text-meta text-red m-0">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
              <button type="submit" disabled={busy} className={button}>
                {{ setup: t.create, login: t.signIn, recover: t.reset }[mode]}
              </button>
              {mode === "login" && (
                <button type="button" className={swap} onClick={() => switchTo("recover")}>
                  {t.useCode}
                </button>
              )}
              {mode === "recover" && (
                <button type="button" className={swap} onClick={() => switchTo("login")}>
                  {t.back}
                </button>
              )}
            </div>
          </form>
        )}
      </main>
    </>
  );
};
