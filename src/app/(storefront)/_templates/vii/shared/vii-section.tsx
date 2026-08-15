import type { CSSProperties, ReactNode } from "react";

import { cn } from "~/lib/utils";

const TONE_BG: Record<"cream" | "paper" | "navy", string> = {
  cream: "var(--vii-cream)",
  paper: "var(--vii-paper)",
  navy: "var(--vii-navy)",
};

type Props = {
  tone?: "cream" | "paper" | "navy";
  maxWidth?: number | string;
  padded?: boolean;
  id?: string;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  children: ReactNode;
  /** When provided, the inner container gets `ref={revealRef}` and the reveal-group class. */
  revealRef?: (node: HTMLDivElement | null) => void;
  /** Paired with `revealRef`. When true, appends ` is-visible` (note: leading space, fixing the bug in vii-product-rail). */
  revealVisible?: boolean;
  /** Extra data attributes (e.g. `data-sp-group`) spread onto the root `<section>` for the preview overlay. */
  sectionAttrs?: Record<string, string>;
};

/**
 * ViiSection — shared section wrapper for the vii template.
 *
 * Renders a `<section>` with a tone-mapped background and optional
 * section-level padding (`--vii-section-pad-y` / `--vii-section-pad-x`),
 * then a centred inner `<div>` capped at `--vii-container` (1200 px).
 *
 * Optionally wires an IntersectionObserver reveal via `revealRef` +
 * `revealVisible` props (driven by `useViiReveal` in the caller).
 */
export function ViiSection({
  tone = "cream",
  maxWidth = "var(--vii-container)",
  padded = true,
  id,
  className,
  style,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  children,
  revealRef,
  revealVisible,
  sectionAttrs,
}: Props) {
  const sectionStyle: CSSProperties = {
    background: TONE_BG[tone],
    ...(padded
      ? { padding: "var(--vii-section-pad-y) var(--vii-section-pad-x)" }
      : {}),
    ...style,
  };

  const hasReveal = revealRef !== undefined;

  return (
    <section
      id={id}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      className={className}
      style={sectionStyle}
      {...sectionAttrs}
    >
      <div
        ref={hasReveal ? revealRef : undefined}
        className={
          hasReveal
            ? cn("vii-reveal-group", revealVisible && "is-visible")
            : undefined
        }
        style={{ maxWidth, margin: "0 auto" }}
      >
        {children}
      </div>
    </section>
  );
}
