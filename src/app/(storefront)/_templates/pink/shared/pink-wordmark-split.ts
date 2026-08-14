/**
 * Splits a business name into `{ rest, accent }` where `accent` is the
 * trailing substring matching the owner-set accent word, case-insensitively
 * — e.g. `("PinkArt", "Art")` → `{ rest: "Pink", accent: "Art" }`. `accent`
 * is sliced from `businessName` itself (not from `accentWord`), so it keeps
 * whatever casing the shop's actual name uses.
 *
 * Falls back to `{ rest: businessName, accent: "" }` — render the name in one
 * color — when the accent word is blank after trimming, or the name doesn't
 * end with it. An empty `accent` doubles as the "no split" flag: callers
 * should never color-highlight an empty string, so checking `accent !== ""`
 * is equivalent to the match test.
 *
 * This is the exact split `pink-header.tsx` / `pink-footer.tsx` compute
 * locally as `splitAccentWordmark` (same trim + case-insensitive suffix
 * match, same slice point) — pulled out here so the homepage hero can use
 * the identical rule instead of its own, unrelated wordmark fields. The two
 * callers still inline their own copy rather than importing this one; they
 * can migrate onto it later.
 *
 * Pure, sync — safe on server or client.
 */
export function pinkWordmarkSplit(
  businessName: string,
  accentWord: string,
): { accent: string; rest: string } {
  const trimmedAccent = accentWord.trim();
  if (
    !trimmedAccent ||
    !businessName.toLowerCase().endsWith(trimmedAccent.toLowerCase())
  ) {
    return { accent: "", rest: businessName };
  }
  const splitIndex = businessName.length - trimmedAccent.length;
  return {
    accent: businessName.slice(splitIndex),
    rest: businessName.slice(0, splitIndex),
  };
}
