import { cn } from "~/lib/utils";

type OliveLeafMarkProps = {
  /** Rendered square size in px. Keep it ≤ 24 — this is a mark, not an image. */
  size?: number;
  className?: string;
};

/**
 * The rivet that holds every olive card together: the leaf from the Olive Mode
 * logo, drawn as two mirrored curves around a midrib. Inherits `currentColor`
 * so it takes the ink of whatever it sits on (leaf green on white cards, white
 * on the sage field), and is always decorative — every place it appears, the
 * meaning is carried by adjacent text.
 *
 * Authored geometry, not a trace: an almond lens tilted 45°, pointed at both
 * ends, with a soft fill so it reads at 16–24px without looking like an
 * outline icon borrowed from a set.
 */
export function OliveLeafMark({ size = 20, className }: OliveLeafMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <path
        d="M19 5Q16.4 16.4 5 19Q7.6 7.6 19 5Z"
        fill="currentColor"
        fillOpacity="0.14"
      />
      <path
        d="M19 5Q16.4 16.4 5 19Q7.6 7.6 19 5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M17.7 6.3 6.6 17.4"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />
    </svg>
  );
}
