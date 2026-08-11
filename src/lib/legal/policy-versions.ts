/**
 * Single source of truth for platform policy versions.
 *
 * A recorded acceptance is only as good as the version stamped alongside it: if
 * `User.termsVersion` says "2026-05-29" but the page has silently moved on, the
 * column is worse than useless — it asserts something false. So the policy pages
 * under `src/app/platform/policies/` render their "Last Updated" line from
 * `POLICY_LAST_UPDATED` rather than hardcoding a date, and the acceptance code
 * paths stamp from the same constants. The two cannot drift.
 *
 * **When you edit a policy page, bump its date here.** That is the whole ritual.
 */

/** ISO `YYYY-MM-DD`, one per policy document. */
export const POLICY_LAST_UPDATED = {
  termsOfService: "2026-05-29",
  privacyPolicy: "2026-08-11",
  cookie: "2026-08-11",
  sellerMerchant: "2026-05-29",
  acceptableUse: "2026-05-29",
  dmca: "2026-05-29",
  accessibility: "2026-06-07",
  // NOTE: `disclaimer` and `inform-act` are deliberately absent. Neither page
  // renders a "Last Updated" line, so any date here would be invented — and an
  // invented date is worse than none once something starts rendering it. If
  // either page gains a date line, add its key here at the same time.
} as const;

/** Newest date in a set — a bundle is only as current as its stalest member. */
function latest(...dates: string[]): string {
  // Plain lexicographic max: ISO `YYYY-MM-DD` sorts chronologically as a string,
  // which sidesteps `new Date("2026-08-11")` parsing as UTC midnight and then
  // rendering as the 10th for anyone west of Greenwich.
  return dates.reduce((a, b) => (a >= b ? a : b));
}

/**
 * Version stamped on `User.termsVersion` when someone creates an account.
 *
 * Covers the two documents an account holder is asked to accept at signup: the
 * platform Terms of Service and the Privacy Policy.
 */
export const PLATFORM_TERMS_VERSION = latest(
  POLICY_LAST_UPDATED.termsOfService,
  POLICY_LAST_UPDATED.privacyPolicy,
);

/**
 * Version stamped on `BusinessMembership.merchantTermsVersion` when someone
 * creates or claims a store.
 *
 * Covers the Seller & Merchant Agreement and the Acceptable Use Policy — the
 * two documents that actually give the platform grounds to suspend a store.
 */
export const MERCHANT_TERMS_VERSION = latest(
  POLICY_LAST_UPDATED.sellerMerchant,
  POLICY_LAST_UPDATED.acceptableUse,
);

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/**
 * `"2026-08-11"` → `"August 11, 2026"`, for the "Last Updated" line.
 *
 * Deliberately string-sliced rather than `Date`-parsed: `new Date("2026-08-11")`
 * is UTC midnight, so `toLocaleDateString` renders it as the 10th in every US
 * timezone. These dates are calendar labels, not instants.
 */
export function formatPolicyDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  const monthName = MONTHS[Number(month) - 1];
  if (!year || !monthName || !day) return iso;
  return `${monthName} ${Number(day)}, ${year}`;
}
