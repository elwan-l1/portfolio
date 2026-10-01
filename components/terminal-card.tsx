"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils";

type TerminalCardProps = {
  title?: string;
  children?: ReactNode;
  className?: string;
};

const TerminalCard = ({ title = "👻 Ghostty", children, className = "" }: TerminalCardProps) => {
  return (
    <div
      className={cn(
        `relative h-150 w-250 rounded-md border-[0.5px] border-white bg-black text-white`,
        className,
      )}
    >
      <div className="absolute top-0 right-0 left-0 flex h-10 items-center justify-center">
        <div className="absolute left-4 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
          <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
          <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
        </div>

        {/* TITLE */}
        <div className="text-sm tracking-wide text-white/90">{title}</div>
      </div>

      {/* CONTENT */}
      <div className="h-full w-full pt-10">{children}</div>
    </div>
  );
};

export default TerminalCard;
