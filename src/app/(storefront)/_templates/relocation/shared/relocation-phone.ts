/**
 * Derives a `tel:` href from `Business.phoneNumber`.
 *
 * Returns `""` for a blank/whitespace-only phone so callers can guard
 * rendering (never emit `href="tel:"` with an empty target). Otherwise
 * strips everything but digits and a leading `+` — matches the convention
 * in `happy-bamboo/layout/happy-bamboo-footer.tsx` around line 145.
 *
 * TDZ rule: this file must NEVER be imported by any field-definition
 * `index.ts` module (see `relocation/homepage/index.ts` / `./rows.ts` for
 * why — those modules sit inside `~/lib/template-fields`'s aggregation
 * cycle and a runtime edge back into it TDZ-crashes every storefront
 * route). Components only.
 */
export function relocationTelHref(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed === "") return "";
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
