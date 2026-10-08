import type { CSSProperties, ReactNode } from "react";

import { cn } from "~/lib/utils";

import { GloveContainer } from "./glove-container";
import { GloveReveal } from "./glove-reveal";

export type GloveSectionTone =
  | "paper"
  | "lavender"
  | "mist"
  | "cloud"
  | "navy"
  | "primary"
  | "fade";

const TONE_CLASS: Record<GloveSectionTone, string> = {
  paper: "bg-[var(--glove-paper)]",
  lavender: "bg-[var(--glove-lavender)]",
  mist: "bg-[var(--glove-mist)]",
  cloud: "bg-[var(--glove-cloud)]",
  navy: "bg-[var(--glove-navy)] glove-on-dark text-white",
  primary: "bg-[var(--glove-primary)] glove-on-dark text-white",
  fade: "bg-[image:var(--glove-purple-fade)] glove-on-dark text-white",
};

type GloveSectionProps = {
  children: ReactNode;
  tone?: GloveSectionTone;
  id?: string;
  className?: string;
  style?: CSSProperties;
  /** Spread onto the root `<section>`: pass `sectionGroupAttr(page, group)`. */
  sectionAttrs?: Record<string, string>;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /** Vertical rhythm padding. Default true. */
  padded?: boolean;
  /** Wrap children in the 1222px container. Default true. */
  contained?: boolean;
  /** Wrap in the reveal primitive. Default true. Never wrap a form section. */
  reveal?: boolean;
  /** Reveal threshold; use 0 for tall sections. */
  revealThreshold?: number;
};

/**
 * Rhythm wrapper for a page section: tone background, vertical padding,
 * optional container + reveal, and a `sectionGroupAttr` passthrough so the
 * visual editor hotspot lands on the section root.
 */
export function GloveSection({
  children,
  tone = "paper",
  id,
  className,
  style,
  sectionAttrs,
  padded = true,
  contained = true,
  reveal = true,
  revealThreshold,
  ...aria
}: GloveSectionProps) {
  const inner = contained ? (
    <GloveContainer>{children}</GloveContainer>
  ) : (
    children
  );
  return (
    <section
      id={id}
      className={cn(TONE_CLASS[tone], padded && "glove-section", className)}
      style={style}
      aria-label={aria["aria-label"]}
      aria-labelledby={aria["aria-labelledby"]}
      {...sectionAttrs}
    >
      {reveal ? (
        <GloveReveal threshold={revealThreshold}>{inner}</GloveReveal>
      ) : (
        inner
      )}
    </section>
  );
}
