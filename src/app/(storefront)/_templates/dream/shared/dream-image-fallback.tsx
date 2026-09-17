import { cn } from "~/lib/utils";

type DreamImageFallbackProps = {
  className?: string;
  /** Optional short message shown under the mark (e.g. an empty-state note). */
  message?: string;
  /**
   * `sky` (default): tinted sky-gradient panel for fallbacks sitting on a
   * paper/sky surface. `paper`: a paper `.88` fill with a gold hairline
   * border — for fallbacks that need to carry weight against a busier
   * background. `warm`: the `--dream-placeholder` gradient with a soft
   * highlight ellipse and NO logo mark (design.md: "Empty state = the warm
   * placeholder" — the hero orbit photos' empty state, matching the
   * reference `index.html`'s tiles, which carry no mark).
   */
  tone?: "sky" | "paper" | "warm";
};

/**
 * Tinted panel with the mini logo mark centered at low opacity — the
 * designed empty state for every image slot (craft floor: "every image
 * slot has a designed fallback"; design.md shared-component inventory:
 * `DreamImageFallback`). Used directly for empty gallery/lane tiles and by
 * `DreamPhoto` when `src` is unset or `/placeholder.svg`.
 */
export function DreamImageFallback({
  className,
  message,
  tone = "sky",
}: DreamImageFallbackProps) {
  return (
    <div className={cn("dream-image-fallback", className)} data-tone={tone}>
      {tone === "warm" ? null : (
        <img
          src="/templates/dream/images/logo.webp"
          alt=""
          aria-hidden="true"
          className="dream-image-fallback-mark"
          draggable={false}
        />
      )}
      {message ? (
        <p className="dream-image-fallback-message">{message}</p>
      ) : null}
    </div>
  );
}
