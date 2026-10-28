/**
 * Derive a search-result description from plain body text. Whitespace is
 * collapsed, and text longer than `max` is cut at the last word boundary that
 * fits, with "…" appended. The returned string never exceeds `max`, ellipsis
 * included. Returns "" for empty or whitespace-only input.
 *
 * Pure and dependency-free. Input is already plain text (for example, the
 * output of `extractTiptapLikeText`), so no HTML handling happens here.
 */
// Policies usually open with "Last updated: 4/12/2026" or "Effective date:
// October 1, 2026". That says nothing in a search result, so drop it.
const DATE_LINE_PREFIX =
  /^(?:last\s+updated|last\s+revised|updated|effective(?:\s+date)?)\s*(?:on)?\s*:?\s*[\w ,./-]{0,30}?\b\d{4}\b\.?\s*/i;

export function deriveDescription(
  text: string | null | undefined,
  max = 155,
): string {
  const plain = (text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(DATE_LINE_PREFIX, "");
  if (plain.length <= max) return plain;

  // Reserve one character for the ellipsis.
  const head = plain.slice(0, max - 1);
  // If the character right after the head is a space, the head ends on a
  // complete word. Otherwise cut back to the last space inside the head.
  const boundary =
    plain.charAt(max - 1) === " " ? head.length : head.lastIndexOf(" ");
  const cut = boundary > 0 ? head.slice(0, boundary) : head;

  return `${cut.trimEnd()}…`;
}
