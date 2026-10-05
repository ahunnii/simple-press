import { cn } from "~/lib/utils";

/**
 * CSS `url("…")` for the business logo, or null when none is uploaded.
 * Quotes, backslashes and line breaks are hex-escaped so an odd URL can't
 * break out of the string; control characters are dropped.
 */
export function dreamMarkUrlVar(logoUrl: string | null | undefined) {
  const url = logoUrl?.trim().replace(/[\u0000-\u001f\u007f]/g, "");
  if (!url) return null;
  const escaped = url.replace(
    /["\\]/g,
    (c) => `\\${c.charCodeAt(0).toString(16)} `,
  );
  return `url("${escaped}")`;
}

/**
 * The small decorative business mark on empty states, image fallbacks and
 * thumbnails. Painted as a background from `--dream-mark-url` (set once on
 * the `.dream` root by `DreamLayout` from the uploaded logo) so the many
 * server-rendered call sites never need the business threaded through;
 * falls back to the bundled Dream mark. Size, opacity and display come
 * from `className` — the CSS only sets the image, so Tailwind `hidden`
 * keeps working.
 */
export function DreamMark({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("dream-mark", className)} />;
}
