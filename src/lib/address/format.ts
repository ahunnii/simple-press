/**
 * Join structured address parts into the single display line that every
 * template footer / contact page renders from `Business.businessAddress`.
 *
 * `business.updateGeneral` calls this on save whenever any part is set, so
 * owners type the address once (Street / City / State / ZIP) and both the
 * display string and the LocalBusiness `PostalAddress` come from the same
 * source. Pure and dependency-free — also used by the admin form preview.
 */

export interface BusinessAddressParts {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}

function clean(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

/** True when at least one part is non-blank. */
export function hasAddressParts(parts: BusinessAddressParts): boolean {
  return (
    clean(parts.street).length > 0 ||
    clean(parts.city).length > 0 ||
    clean(parts.state).length > 0 ||
    clean(parts.postalCode).length > 0
  );
}

/**
 * "123 Main St, Detroit, MI 48201". Missing parts are omitted, so
 * `{ city: "Detroit", state: "MI" }` → "Detroit, MI" and all-blank → "".
 */
export function formatBusinessAddress(parts: BusinessAddressParts): string {
  const street = clean(parts.street);
  const city = clean(parts.city);
  const stateZip = [clean(parts.state), clean(parts.postalCode)]
    .filter((s) => s.length > 0)
    .join(" ");
  return [street, city, stateZip].filter((s) => s.length > 0).join(", ");
}
