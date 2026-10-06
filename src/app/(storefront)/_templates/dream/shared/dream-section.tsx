import { cn } from "~/lib/utils";

import { DreamReveal } from "./dream-reveal";

type DreamSectionProps = {
  children: React.ReactNode;
  className?: string;
  /** Anchor id on the root element (in-page links like `#packages`). */
  id?: string;
  /** Spread on the root element for the preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
  /** Wrap contents in the single-pass IO reveal. Defaults to true. */
  reveal?: boolean;
  /** Cap width to `--dream-container` and center. Defaults to true. */
  contained?: boolean;
  /** Sky-gradient vs. flat paper background. Defaults to "paper". */
  tone?: "paper" | "sky";
  "aria-label"?: string;
};

/**
 * Rhythm wrapper for homepage/page sections: vertical padding on the dream
 * section rhythm, optional container max-width, optional single-pass
 * reveal, optional sky-gradient tone.
 */
export function DreamSection({
  id,
  children,
  className,
  sectionAttrs,
  reveal = true,
  contained = true,
  tone = "paper",
  "aria-label": ariaLabel,
}: DreamSectionProps) {
  const inner = contained ? (
    <div className="mx-auto w-full [max-width:var(--dream-container)] px-[var(--dream-gutter)]">
      {children}
    </div>
  ) : (
    children
  );

  return (
    <section
      {...sectionAttrs}
      id={id}
      aria-label={ariaLabel}
      className={cn(
        "dream-section",
        tone === "sky" && "dream-section--sky",
        className,
      )}
    >
      {reveal ? <DreamReveal>{inner}</DreamReveal> : inner}
    </section>
  );
}
