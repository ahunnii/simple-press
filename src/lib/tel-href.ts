/**
 * Derives a `tel:` href from a business phone number.
 *
 * Returns `""` for a blank/whitespace-only phone so callers can guard
 * rendering (never emit `href="tel:"` with an empty target). Otherwise
 * strips everything but digits and a leading `+` — matches the convention
 * in `happy-bamboo/layout/happy-bamboo-footer.tsx` around line 145.
 *
 * Promoted from `relocation/shared/relocation-phone.ts` (same precedent as
 * `~/lib/nav-utils.ts`'s `isActiveNavLink`) so every template shares one
 * digit-strip implementation instead of emitting a raw `tel:${phone}` link.
 * Relocation still imports it under its original name — see the re-export
 * in that file.
 */
export function telHref(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed === "") return "";
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
