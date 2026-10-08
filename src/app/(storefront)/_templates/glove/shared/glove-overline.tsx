import type { ReactNode } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

type GloveOverlineProps = {
  children: ReactNode;
  align?: "center" | "left";
  /** primary (default), muted, or light (white on a dark band). */
  tone?: "primary" | "muted" | "light";
  className?: string;
  fieldKey?: string;
};

const TONE: Record<NonNullable<GloveOverlineProps["tone"]>, string> = {
  primary: "text-[var(--glove-primary)]",
  muted: "text-[var(--glove-muted)]",
  light: "text-white",
};

/** Uppercase tracked Poppins label above a heading. */
export function GloveOverline({
  children,
  align = "center",
  tone = "primary",
  className,
  fieldKey,
}: GloveOverlineProps) {
  return (
    <p
      className={cn(
        "glove-overline",
        align === "center" ? "text-center" : "text-left",
        TONE[tone],
        className,
      )}
      {...(fieldKey ? fieldAttr(fieldKey) : {})}
    >
      {children}
    </p>
  );
}
