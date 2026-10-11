import { type ReactNode, useEffect, useRef, useState } from "react";

import type { Board } from "@/lib/todo.server";

import { TEXT as t } from "@/constants/todo";

export type Tag = Board["tags"][number];

export const tint = (color: string) => ({ color: `var(--color-${color})` });

export const button =
  "bg-pink text-crust hover:bg-mauve disabled:bg-surface1 disabled:text-overlay1 w-fit cursor-pointer border-0 px-3 py-1.5 font-[inherit] font-bold";

export const quiet =
  "text-subtext0 hover:text-pink w-fit cursor-pointer border-0 bg-transparent p-0 font-[inherit] disabled:text-overlay0";

export const danger = `${quiet} text-red! hover:text-maroon!`;

export const control =
  "text-text text-body border-surface0 bg-base w-full rounded-none border-0 border-b px-0 pb-2 font-[inherit] outline-none! focus:border-current";

const days = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });

export const formatDay = (day: string) => days.format(new Date(day));

export const useAction = () => {
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
    setBusy(false);
  };

  return { error, busy, run };
};

export const Alert = ({ message }: { message?: string }) =>
  message && (
    <p role="alert" className="text-meta text-red m-0">
      {message}
    </p>
  );

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="text-overlay1 focus-within:text-pink flex min-w-0 flex-1 flex-col gap-2">
    <span className="text-meta">{label}</span>
    {children}
  </label>
);

export const Tags = ({ tags }: { tags: Tag[] }) =>
  tags.length > 0 && (
    <span className="text-meta flex flex-wrap gap-x-3 gap-y-1">
      {tags.map((tag) => (
        <span key={tag.id} style={tint(tag.color)}>
          {tag.icon} {tag.name}
        </span>
      ))}
    </span>
  );

type DialogProps = { title: string; onClose: () => void; children: ReactNode };

// the close button comes last so showModal focuses the first field
export const Dialog = ({ title, onClose, children }: DialogProps) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => ref.current?.showModal(), []);

  return (
    <dialog
      ref={ref}
      closedby="any"
      onClose={onClose}
      className="bg-base text-text border-surface1 backdrop:bg-crust m-auto max-h-[calc(100dvh-2rem)] w-[min(42rem,calc(100vw-2rem))] border p-0"
    >
      <div className="flex flex-col gap-6 p-6">
        <h2 className="m-0 pr-8 text-2xl leading-tight font-bold tracking-[-0.03em]">{title}</h2>
        {children}
      </div>
      <button
        type="button"
        aria-label={t.close}
        onClick={onClose}
        className={`${quiet} text-lead absolute top-6 right-6 leading-none`}
      >
        ×
      </button>
    </dialog>
  );
};
