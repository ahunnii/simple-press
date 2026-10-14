/**
 * Donate-placement rule shared by every template's header and footer
 * (Settings → Donations "Show link in header navigation / footer"). Pure — no
 * React — so it is safe in a client header and a server footer alike.
 *
 * Apply AFTER `resolveNav` + `filterNavByFlags` (or `resolveFooterQuickLinks`,
 * which takes a `donate` option). Templates whose header renders Donate as a
 * separate CTA (Pink) may dedupe against the nav instead of appending.
 */

import type { NavItem } from "./resolve-nav";
import { resolveDonationLabel } from "~/lib/donations/label";

/**
 * Settings → Donations ("show in header / footer") is toggle-authoritative:
 * it only ADDS a /donate link. Run it on the resolved, flag-filtered list so
 * the switch still works once an owner has saved a custom menu or custom
 * footer quick links. It never removes a link the owner placed themselves and
 * never duplicates one — an existing /donate entry (top-level or inside a
 * dropdown's children) makes this a no-op. Appends as the last top-level item.
 */
export function withDonateLink<T extends NavItem>(
  items: T[],
  opts: { show: boolean; label: string },
): Array<T | NavItem> {
  if (!opts.show) return items;
  const hasDonate = items.some(
    (item) =>
      item.href === "/donate" ||
      (item.children?.some((child) => child.href === "/donate") ?? false),
  );
  if (hasDonate) return items;
  return [...items, { href: "/donate", label: opts.label }];
}

/**
 * The `{ show, label }` options for `withDonateLink` from the business's
 * Donations settings: shown only when the donations feature flag is on AND
 * the owner enabled the link for this placement. Label follows the owner's
 * chosen wording (Donate / Tip / Support).
 */
export function donateLinkOptions(
  business:
    | {
        donationShowInHeader?: boolean | null;
        donationShowInFooter?: boolean | null;
        donationLabel?: string | null;
      }
    | null
    | undefined,
  isEnabled: (key: string) => boolean,
  placement: "header" | "footer",
): { show: boolean; label: string } {
  const flag =
    placement === "header"
      ? business?.donationShowInHeader
      : business?.donationShowInFooter;
  return {
    show: isEnabled("donations") && !!flag,
    label: resolveDonationLabel(business?.donationLabel).verb,
  };
}
