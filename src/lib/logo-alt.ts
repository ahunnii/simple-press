/**
 * Resolve the accessible name for a business logo image.
 *
 * `??` is wrong here: `SiteContent.logoAltText` holds `""` once an owner clears
 * the field, and a blank value must fall through to the business name rather
 * than win it. A coalescing ternary would trip `prefer-nullish-coalescing`,
 * which this repo enforces as an error.
 */
export function resolveLogoAlt(
  logoAltText: string | null | undefined,
  businessName: string,
): string {
  const trimmed = logoAltText?.trim();
  if (trimmed === undefined || trimmed.length === 0) return businessName;
  return trimmed;
}
