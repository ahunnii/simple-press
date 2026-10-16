/**
 * URL slugs a custom page or blog post may not take.
 *
 * Custom pages (`Page.type` "page" / "custom") are served at `/<slug>` by
 * `src/app/(storefront)/[slug]/page.tsx`. That dynamic route has the lowest
 * priority in the App Router, so a slug that matches a real route folder
 * (`/about`, `/shop`, `/cart`, …) is silently unreachable: the built-in route
 * wins and the owner's page never renders. Likewise the top-level routes under
 * `src/app` (admin, api, auth, …) and the paths the middleware / next.config
 * reserve (`/monitoring-tunnel`, `/favicon…`) shadow tenant pages.
 *
 * Pure module — no server-only imports — because it runs in the admin page
 * editor (client) and in the tRPC `createPage` / `updatePage` mutations.
 *
 * `ROUTE_FOLDER_SLUGS` is a static list on purpose (a runtime fs read doesn't
 * work in a deployed build). `reserved-page-slugs.test.ts` walks `src/app`
 * and fails when a route folder is missing from it, so adding a new storefront
 * route without updating this list breaks CI.
 *
 * Dotted file routes (`sitemap.xml`, `robots.txt`, `manifest.webmanifest`,
 * `indexnow-key.txt`) can't collide: page slugs only allow `[a-z0-9-]`.
 */

/**
 * Route-folder (and middleware-reserved) slugs → how the message names them.
 * `null` means "no friendly name" and falls back to "a built-in page".
 */
const ROUTE_SLUG_LABELS: Readonly<Record<string, string | null>> = {
  // src/app/(storefront)
  about: "About page",
  account: "customer account area",
  blog: "Blog",
  cart: "Cart page",
  checkout: "Checkout",
  collections: "Collections page",
  contact: "Contact page",
  donate: "Donate page",
  "email-preferences": null,
  events: "Events page",
  faq: "FAQ page",
  order: null,
  "order-status": "Order Status page",
  services: "Services page",
  shop: "Shop",
  subscribe: null,
  subscriptions: "Subscriptions page",
  testimonials: "Testimonials page",
  videos: "Videos page",
  wishlist: "Wishlist page",
  // src/app/(storefront)/(auth-redirects)
  "sign-in": "sign-in page",
  "sign-out": null,
  "sign-up": "sign-up page",
  // src/app (top-level, served on tenant hosts too)
  admin: "admin area",
  api: null,
  auth: null,
  editor: null,
  invoice: null,
  "not-permitted": null,
  platform: null,
  "platform-hub": null,
  "site-icon": null,
  // Reserved by src/middleware.ts / next.config.js (not route folders)
  "monitoring-tunnel": null,
  favicon: null,
  "simplepress-favicon": null,
};

/** Slugs that collide with a built-in route (type "page" / "custom" only). */
export const RESERVED_PAGE_SLUGS: ReadonlySet<string> = new Set(
  Object.keys(ROUTE_SLUG_LABELS),
);

/**
 * Fixed slugs of the policy pages (`POLICY_TEMPLATES` in
 * `~/lib/legal/merchant-policy-templates`, checked by the unit test). A custom
 * page or blog post squatting on one would block the owner from ever saving
 * that policy (unique slug) and would never be linked as a policy.
 */
export const RESERVED_POLICY_SLUGS: Readonly<Record<string, string>> = {
  "privacy-policy": "Privacy Policy",
  "terms-of-service": "Terms of Service",
  "refund-policy": "Refund Policy",
  "shipping-policy": "Shipping Policy",
};

/**
 * User-facing reason `slug` can't be used for a page of `type`, or null when
 * it's fine. Policy pages are exempt from both lists (their slugs are fixed
 * and admin-chosen); blog posts live under `/blog/<slug>`, so only the policy
 * slugs apply to them. Anything else is served at `/<slug>`.
 */
export function getReservedPageSlugMessage(
  slug: string,
  type = "page",
): string | null {
  if (type === "policy") return null;

  const policyName = RESERVED_POLICY_SLUGS[slug];
  if (policyName) {
    return `"/${slug}" is reserved for your ${policyName} (Site Setup → Policies) — choose a different URL.`;
  }

  if (type === "blog") return null;

  if (RESERVED_PAGE_SLUGS.has(slug)) {
    const label = ROUTE_SLUG_LABELS[slug];
    return `"/${slug}" is already used by your site's built-in ${label ?? "page"} — choose a different URL.`;
  }

  return null;
}

/** True when `slug` can't be used for a page of `type` (default: a custom page). */
export function isReservedPageSlug(slug: string, type = "page"): boolean {
  return getReservedPageSlugMessage(slug, type) !== null;
}
