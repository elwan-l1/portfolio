import type { ReactNode } from "react";

const MARK = {
  dark: "bg-mauve text-crust",
  pink: "bg-crust text-pink",
  mauve: "bg-crust text-mauve",
  peach: "bg-crust text-peach",
};

type TitleProps = {
  on?: keyof typeof MARK;
  glyph: string;
  children: ReactNode;
};

export const Title = ({ on = "dark", glyph, children }: TitleProps) => (
  <h2 className="text-lead m-0 leading-tight font-bold tracking-[-0.02em]">
    <span className={`box-decoration-clone px-[0.3em] ${MARK[on]}`}>
      <span aria-hidden className="mr-[0.5em] font-normal">
        {glyph}
      </span>
      {children}
    </span>
  </h2>
);
