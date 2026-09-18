import type { CSSProperties, ReactNode } from "react";

import { cn } from "~/lib/utils";

const TONE_BG: Record<"paper" | "cream" | "white" | "black", string> = {
  paper: "var(--umsc-paper)",
  cream: "var(--umsc-cream)",
  white: "var(--umsc-white)",
  black: "var(--umsc-black)",
};

const TONE_FG: Record<"paper" | "cream" | "white" | "black", string> = {
  paper: "var(--umsc-ink)",
  cream: "var(--umsc-ink)",
  white: "var(--umsc-ink)",
  black: "var(--umsc-cream-on-black)",
};

type Props = {
  tone?: "paper" | "cream" | "white" | "black";
  maxWidth?: number | string;
  padded?: boolean;
  id?: string;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  children: ReactNode;
  /** Extra data attributes (`data-sp-group`) spread onto the root `<section>` for the preview overlay. */
  sectionAttrs?: Record<string, string>;
};

/**
 * UmscSection — shared rhythm wrapper for the umsc template. Renders a
 * `<section>` with a tone-mapped background/foreground and section padding
 * (`--umsc-section-pad-y` / `--umsc-section-pad-x`), then a centred inner
 * `<div>` capped at `--umsc-container`.
 */
export function UmscSection({
  tone = "paper",
  maxWidth = "var(--umsc-container)",
  padded = true,
  id,
  className,
  style,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  children,
  sectionAttrs,
}: Props) {
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      className={className}
      style={{
        background: TONE_BG[tone],
        color: TONE_FG[tone],
        ...(padded
          ? { padding: "var(--umsc-section-pad-y) var(--umsc-section-pad-x)" }
          : {}),
        ...style,
      }}
      {...sectionAttrs}
    >
      <div className={cn("mx-auto")} style={{ maxWidth, margin: "0 auto" }}>
        {children}
      </div>
    </section>
  );
}
