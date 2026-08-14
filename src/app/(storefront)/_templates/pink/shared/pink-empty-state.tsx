import Link from "next/link";

type PinkEmptyStateProps = {
  heading: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  className?: string;
};

/**
 * `--pink-panel` + `1px` border, centered display heading + muted body + rose
 * button. Used for empty carts, empty shop grids, no-results states, etc.
 * (design.md → Shared component inventory). Server-safe.
 */
export function PinkEmptyState({
  heading,
  body,
  ctaLabel,
  ctaHref,
  className,
}: PinkEmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-4 px-8 py-16 text-center${className ? ` ${className}` : ""}`}
      style={{
        background: "var(--pink-panel)",
        border: "1px solid var(--pink-line)",
      }}
    >
      <h2
        className="pink-display"
        style={{ fontSize: "22px", fontWeight: 600, letterSpacing: "-0.015em" }}
      >
        {heading}
      </h2>
      {body && (
        <p
          className="max-w-[42ch] text-[15px] leading-[1.7]"
          style={{ color: "var(--pink-muted)" }}
        >
          {body}
        </p>
      )}
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="pink-btn pink-btn-solid mt-2">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
