import type { CSSProperties, ReactNode } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

type GloveHeadingProps = {
  children: ReactNode;
  as?: "h1" | "h2" | "h3" | "h4";
  align?: "center" | "left";
  /** ink (default), primary, or light (white on a dark band). */
  tone?: "ink" | "primary" | "light";
  className?: string;
  style?: CSSProperties;
  id?: string;
  /** Template field key when the whole text is one field (live editor patch). */
  fieldKey?: string;
};

const TONE: Record<NonNullable<GloveHeadingProps["tone"]>, string> = {
  ink: "text-[var(--glove-ink)]",
  primary: "text-[var(--glove-primary)]",
  light: "text-white",
};

/** Poppins section heading. Size via `glove-heading`; override with `className`. */
export function GloveHeading({
  children,
  as: Tag = "h2",
  align = "center",
  tone = "ink",
  className,
  style,
  id,
  fieldKey,
}: GloveHeadingProps) {
  return (
    <Tag
      id={id}
      className={cn(
        "glove-heading",
        align === "center" ? "text-center" : "text-left",
        TONE[tone],
        className,
      )}
      style={style}
      {...(fieldKey ? fieldAttr(fieldKey) : {})}
    >
      {children}
    </Tag>
  );
}
