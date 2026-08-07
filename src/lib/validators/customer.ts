/**
 * The accepted values for the admin Customers list's filter and sort params.
 *
 * These live here, outside both the router and the page, because they are one
 * contract with two halves that fail differently when they drift:
 *
 * - An option offered in the admin UI that the router's `z.enum` doesn't accept
 *   is a **crash**: `pickParam` whitelists it against the page's own tuple and
 *   passes it through, tRPC rejects it as BAD_REQUEST, and
 *   `rethrowTrpcForErrorBoundary` escalates that to the error boundary. Picking
 *   a sort option blanks the page.
 * - A default that disagrees between the two is **silent**: `AdminFilters`
 *   deletes a param set to its `defaultValue`, so the router applies its own
 *   default instead and the control appears selected while doing nothing.
 *
 * One `as const` tuple per param, consumed by `z.enum` on the server and by
 * `pickParam` plus the `AdminFilterDef` option lists on the page, removes both.
 */

export const CUSTOMER_MARKETING_VALUES = ["all", "yes", "no"] as const;
export const CUSTOMER_MARKETING_DEFAULT = "all";

export const CUSTOMER_PRIVACY_VALUES = [
  "all",
  "deletion-requested",
  "anonymized",
] as const;
export const CUSTOMER_PRIVACY_DEFAULT = "all";

export const CUSTOMER_SORT_VALUES = [
  "newest",
  "oldest",
  "name-asc",
  "name-desc",
  "orders-desc",
  "spent-desc",
] as const;
export const CUSTOMER_SORT_DEFAULT = "newest";
