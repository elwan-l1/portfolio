"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils";

type TerminalCardProps = {
  title?: string;
  children?: ReactNode;
  className?: string;
};

const TerminalCard = ({
  title = "👻 Ghostty",
  children,
  className = "",
}: TerminalCardProps) => {
  return (
    <div
      className={cn(
        `relative w-full h-full border border-white bg-black text-white`,
        className,
      )}
    >
      <div className="absolute top-0 left-0 right-0 flex items-center justify-center h-10">
        <div className="absolute left-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
        </div>

        {/* TITLE */}
        <div className="text-sm tracking-wide text-white/90">{title}</div>
      </div>

      {/* CONTENT */}
      <div className="pt-10 w-full h-full">{children}</div>
    </div>
  );
};

export default TerminalCard;
