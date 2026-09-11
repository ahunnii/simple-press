import { cn } from "~/lib/utils";

import { WealthReveal } from "./wealth-reveal";

type WealthSectionProps = {
  children: React.ReactNode;
  className?: string;
  /** Spread on the root element for the preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
  /** Wrap contents in the single-pass IO reveal. Defaults to true. */
  reveal?: boolean;
  /** Cap width to `--wealth-container` and center. Defaults to true. */
  contained?: boolean;
};

/**
 * Rhythm wrapper for homepage/page sections: vertical padding on the
 * 25.5px rhythm, optional container max-width, optional single-pass reveal.
 */
export function WealthSection({
  children,
  className,
  sectionAttrs,
  reveal = true,
  contained = true,
}: WealthSectionProps) {
  const inner = contained ? (
    <div className="mx-auto w-full px-[var(--wealth-gutter)] [max-width:var(--wealth-container)]">
      {children}
    </div>
  ) : (
    children
  );

  return (
    <section
      {...sectionAttrs}
      className={cn(
        "py-[calc(var(--wealth-rhythm)*2)]",
        className,
      )}
    >
      {reveal ? <WealthReveal>{inner}</WealthReveal> : inner}
    </section>
  );
}
