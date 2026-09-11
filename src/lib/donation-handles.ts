/**
 * Handle resolution for the Donations/Tips feature's Venmo and Cash App
 * lanes (`Business.venmoHandle` / `Business.cashAppHandle`).
 *
 * Deliberately a PARALLEL module to `social-links.ts`, not an extension of
 * it: Venmo and Cash App are payment handles, not social networks, and must
 * never be merged into `SOCIAL_NETWORKS` — that registry feeds footer icon
 * rows and JSON-LD `sameAs`, neither of which should ever list a payment
 * handle.
 *
 * Presentation-agnostic like `social-links.ts` for the same reason: no
 * icons, colors, or template tokens here — just data. Templates own how the
 * result is styled and laid out.
 */

export type DonationHandleKey = "venmo" | "cashapp";

export interface ResolvedDonationHandle {
  key: DonationHandleKey;
  label: string;
  /** e.g. "@janedoe" or "$janedoe" — ready to render as-is. */
  displayHandle: string;
  url: string;
}

/**
 * Trims a Venmo handle and strips a single leading "@", if present. Returns
 * `null` for empty/whitespace-only input. Handles are stored without the
 * leading "@" (see `Business.venmoHandle` comment in `prisma/schema.prisma`).
 */
export function normalizeVenmoHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^@/, "");
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Trims a Cash App cashtag and strips a single leading "$", if present.
 * Returns `null` for empty/whitespace-only input. Handles are stored without
 * the leading "$" (see `Business.cashAppHandle` comment in `prisma/schema.prisma`).
 */
export function normalizeCashAppHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^\$/, "");
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Builds a Venmo payment-intent link from a handle already stripped of its
 * leading "@", with a prefilled note (no amount). Uses `/<handle>`
 * (Venmo's payment-link path), not `/u/<handle>` (the profile page, which
 * redirects and may drop query params).
 *
 * Encodes the note with `encodeURIComponent` rather than `URLSearchParams` —
 * the latter renders spaces as `+`, which some Venmo clients display
 * literally instead of decoding.
 */
export function venmoUrl(handle: string, note: string): string {
  return `https://venmo.com/${handle}?txn=pay&note=${encodeURIComponent(note)}`;
}

/** Builds a Cash App profile URL from a cashtag already stripped of its leading "$". */
export function cashAppUrl(cashtag: string): string {
  return `https://cash.app/$${cashtag}`;
}

/** Prefilled payment note used in Venmo payment-intent links. */
export function donationNote(businessName: string): string {
  return `Donation to ${businessName}`;
}

/**
 * Resolves a business's payment handles to display-ready entries, Venmo
 * first, omitting whichever handle isn't set. Safe against `null` fields —
 * always returns an array.
 */
export function resolveDonationHandles(business: {
  name: string;
  venmoHandle: string | null;
  cashAppHandle: string | null;
}): ResolvedDonationHandle[] {
  const resolved: ResolvedDonationHandle[] = [];

  const venmo = normalizeVenmoHandle(business.venmoHandle);
  if (venmo) {
    resolved.push({
      key: "venmo",
      label: "Venmo",
      displayHandle: `@${venmo}`,
      url: venmoUrl(venmo, donationNote(business.name)),
    });
  }

  const cashapp = normalizeCashAppHandle(business.cashAppHandle);
  if (cashapp) {
    resolved.push({
      key: "cashapp",
      label: "Cash App",
      displayHandle: `$${cashapp}`,
      url: cashAppUrl(cashapp),
    });
  }

  return resolved;
}
