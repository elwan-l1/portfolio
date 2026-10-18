import { useRef, useState } from "react";

import { startSound } from "@/lib/sound";

import { MUSICIAN } from "@/constants/global";

type SoundToggleProps = {
  label: string;
  /** The word before the musician's name, as in "by Xav". */
  by: string;
};

export const SoundToggle = ({ label, by }: SoundToggleProps) => {
  const [on, setOn] = useState(false);
  const session = useRef<Promise<() => void>>(null);

  const toggle = () => {
    setOn(!on);
    if (on) return void session.current?.then((stop) => stop());
    session.current = startSound();
    session.current.catch(() => setOn(false));
  };

  return (
    <>
      <button
        type="button"
        aria-pressed={on}
        onClick={toggle}
        className={`text-meta cursor-pointer border-0 bg-transparent p-0 ${
          on ? "text-pink underline underline-offset-4" : "text-subtext0 hover:text-text"
        }`}
      >
        ♪ {label}
      </button>
      {on && (
        <a
          href={MUSICIAN.url}
          target="_blank"
          rel="noreferrer"
          className="text-meta text-subtext0 hover:text-text no-underline"
        >
          {by} {MUSICIAN.name} →
        </a>
      )}
    </>
  );
};
