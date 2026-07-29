type PinkDarkBandProps = {
  children: React.ReactNode;
  className?: string;
  sectionAttrs?: Record<string, string>;
  id?: string;
  ariaLabel?: string;
};

/**
 * Full-bleed `--pink-ink` section wrapper with the standard
 * `76–88px 40px` padding. Used for every interstitial dark band across the
 * template (design.md → Shared component inventory). Server-safe.
 */
export function PinkDarkBand({
  children,
  className,
  sectionAttrs,
  id,
  ariaLabel,
}: PinkDarkBandProps) {
  // `pink-dark` is what activates the dark-surface variants in globals.css
  // (ghost-button color, solid-button hover, input fills, and the
  // focus-visible ring). Without it a ghost button inside a dark band renders
  // its label in `--pink-ink` on `--pink-ink` — invisible.
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={`pink-dark px-5 py-[76px] md:px-10 md:py-[88px]${className ? ` ${className}` : ""}`}
      style={{ background: "var(--pink-ink)", color: "var(--pink-paper)" }}
      {...sectionAttrs}
    >
      <div className="mx-auto max-w-[1400px]">{children}</div>
    </section>
  );
}
