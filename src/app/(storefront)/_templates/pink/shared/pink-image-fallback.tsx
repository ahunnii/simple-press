type PinkImageFallbackProps = {
  /**
   * Which surface the fallback sits on. `dark` uses the ink tint (for hero
   * bands, story blocks and dark card grids); `paper` uses the inset panel.
   */
  surface?: "dark" | "paper";
  /** Optional caption rendered under the mark (e.g. the tile's own label). */
  label?: string;
  /** CSS `aspect-ratio` value, e.g. `"4 / 5"`. Omit when the parent sizes it. */
  aspect?: string;
  /** Render as a circle — used for avatars. */
  circle?: boolean;
  className?: string;
};

/**
 * Designed stand-in for an image that has no source yet.
 *
 * Two cases produce one symptom in this template, and both land here:
 *   1. an owner-editable `image` field that ships `defaultValue: ""` so it can
 *      stay blank on a dark band (see the `field-conventions.md` exception
 *      noted against E1), and
 *   2. a record that simply has no image — a blog post with no cover, a
 *      testimonial with no avatar.
 *
 * Before this existed, both rendered as an unexplained black or grey rectangle
 * (review 2026-07-29, findings P1/P2). The fill tokens were already reserved —
 * `--pink-ink-tint` is commented "image-placeholder fill on dark" in the
 * `.pink` block — they just had nothing consuming them.
 *
 * The mark is a stitch motif: two crossed strokes, drawn in the surface's
 * subtle color at low emphasis so it reads as "nothing here yet" rather than
 * "broken image". It is decorative — the alt text belongs to whatever the
 * consuming component would have rendered.
 *
 * Server-safe. Design authority: docs/templates/pink/design.md.
 */
export function PinkImageFallback({
  surface = "dark",
  label,
  aspect,
  circle = false,
  className,
}: PinkImageFallbackProps) {
  const dark = surface === "dark";
  const background = dark ? "var(--pink-ink-tint)" : "var(--pink-panel)";
  const border = dark ? "var(--pink-ink-line)" : "var(--pink-line)";
  const mark = dark ? "var(--pink-ink-subtle)" : "var(--pink-subtle)";

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-3${
        className ? ` ${className}` : ""
      }`}
      style={{
        background,
        border: `1px solid ${border}`,
        borderRadius: circle ? "9999px" : undefined,
        ...(aspect ? { aspectRatio: aspect } : {}),
      }}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        style={{
          width: circle ? "40%" : "28px",
          height: "auto",
          color: mark,
          opacity: 0.55,
        }}
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      >
        <path d="M5 5 L19 19" />
        <path d="M19 5 L5 19" />
      </svg>
      {label && !circle && (
        <span
          className="pink-label max-w-[24ch] px-4 text-center"
          style={{ color: mark }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * True when `src` is a real, owner-supplied image — i.e. not empty and not the
 * platform's generic `/placeholder.svg`, which several template fields still
 * carry as their `defaultValue`. Callers use this to decide between rendering
 * `<Image>` and rendering `<PinkImageFallback>`, so a fresh store shows one
 * consistent empty-image treatment instead of two (audit 2026-07-31, P2-7).
 */
export function hasCustomImage(src: string | undefined | null): boolean {
  return !!src && src.trim().length > 0 && src !== "/placeholder.svg";
}
