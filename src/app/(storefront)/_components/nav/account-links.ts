/**
 * Flag-gated list of customer-account links for storefront headers, mobile
 * overlays, and account sidebars.
 *
 * Mirrors `BASE_NAV_ITEMS` in
 * `src/app/(storefront)/_templates/default/account/default-account-layout.tsx`
 * (labels, hrefs, and flag gating) so every template's chrome agrees with
 * Default's own account sidebar about which links exist and when they show.
 * Pure module — no React, no hooks.
 */

import { AUTH_BASE_PATHS, SETTINGS_VIEW_PATHS } from "~/lib/auth-paths";

export type AccountNavLink = { key: string; label: string; href: string };

const ACCOUNT_BASE = AUTH_BASE_PATHS.settings; // "/account"

/**
 * `isEnabled` mirrors `useStorefrontFlags().isEnabled` / the `isEnabled`
 * returned by `getBusinessFlags()` (both `~/lib/features/resolve-flags.ts`'s
 * `ResolvedFlags["isEnabled"]`), which take a bare `string` — the feature
 * registry (`~/lib/features/registry.ts`) has no narrower exported key type.
 */
type IsEnabled = (flag: string) => boolean;

/**
 * Order matches Default's sidebar reading top-to-bottom, with Address Book
 * placed right after Orders since both are about shipping.
 *
 * - Orders — gated on `"orders"`: `account/orders/layout.tsx` 404s when
 *   `orders` is off, so the link requires the same flag.
 * - Address Book — gated on `"checkout"`, where saved addresses are used (the
 *   checkout `SavedAddressPicker`). The route itself isn't flag-gated: every
 *   checkout saves its shipping address to the customer's book regardless of
 *   `orders`, so customers must always be able to edit or delete them.
 * - Subscriptions — gated on `"subscriptions"`.
 * - Invoices — gated on `"invoices"`. (The route itself isn't flag-gated —
 *   existing invoices must stay reachable — only the nav link is, matching
 *   Default.)
 * - Rewards — gated on `"loyalty"`. (Same story as Invoices: the route stays
 *   reachable for an existing balance; only the link is gated.)
 * - Account settings, Security, Preferences — always shown.
 */
export function getAccountNavLinks({
  isEnabled,
  includeAdmin = false,
}: {
  isEnabled: IsEnabled;
  includeAdmin?: boolean;
}): AccountNavLink[] {
  const links: AccountNavLink[] = [];

  if (isEnabled("orders")) {
    links.push({
      key: "orders",
      label: "Orders",
      href: `${ACCOUNT_BASE}/orders`,
    });
  }

  if (isEnabled("checkout")) {
    links.push({
      key: "address-book",
      label: "Address Book",
      href: `${ACCOUNT_BASE}/address-book`,
    });
  }

  if (isEnabled("subscriptions")) {
    links.push({
      key: "subscriptions",
      label: "Subscriptions",
      href: `${ACCOUNT_BASE}/subscriptions`,
    });
  }

  if (isEnabled("invoices")) {
    links.push({
      key: "invoices",
      label: "Invoices",
      href: `${ACCOUNT_BASE}/invoices`,
    });
  }

  if (isEnabled("loyalty")) {
    links.push({
      key: "rewards",
      label: "Rewards",
      href: `${ACCOUNT_BASE}/rewards`,
    });
  }

  links.push({
    key: "settings",
    label: "Settings",
    href: `${ACCOUNT_BASE}/${SETTINGS_VIEW_PATHS.account}`,
  });
  links.push({
    key: "security",
    label: "Security",
    href: `${ACCOUNT_BASE}/${SETTINGS_VIEW_PATHS.security}`,
  });
  links.push({
    key: "preferences",
    label: "Preferences",
    href: `${ACCOUNT_BASE}/preferences`,
  });

  if (includeAdmin) {
    links.push({ key: "admin", label: "Admin", href: "/admin" });
  }

  return links;
}
