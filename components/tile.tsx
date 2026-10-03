import type { ReactNode } from "react";

// 1px border a little lighter than the fill: surface0 on dark tiles, a pale tint on coloured ones.
const EDGE = {
  dark: "border-surface0",
  pink: "border-[color-mix(in_srgb,var(--color-pink),white_45%)]",
  mauve: "border-[color-mix(in_srgb,var(--color-mauve),white_45%)]",
  peach: "border-[color-mix(in_srgb,var(--color-peach),white_45%)]",
};

type TileProps = {
  as?: "section" | "figure";
  edge?: keyof typeof EDGE;
  className?: string;
  children: ReactNode;
};

export const Tile = ({
  as: Tag = "section",
  edge = "dark",
  className = "",
  children,
}: TileProps) => (
  <Tag className={`relative m-0 border ${EDGE[edge]} tall:p-6 p-5 ${className}`}>{children}</Tag>
);

type FigProps = {
  n: number;
  label: string;
  className?: string;
  children: ReactNode;
};

export const Fig = ({ n, label, className = "", children }: FigProps) => (
  <figcaption className={`text-meta text-subtext0 m-0 leading-snug ${className}`}>
    <span className="text-pink">
      {label} {n}
    </span>
    &ensp;{children}
  </figcaption>
);
