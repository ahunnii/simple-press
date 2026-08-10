import { z } from "zod";

import {
  ADMIN_BULK_DELETE_LIMIT,
  ADMIN_BULK_SELECTION_LIMIT,
} from "~/lib/validators/admin-table";

// NOTE: this schema is used both by the client form (discount-form.tsx) and,
// via `discountFormSchema.extend({ id })`, by the server router
// (src/server/api/routers/discount.ts). It must stay a plain ZodObject —
// wrapping it in `.refine()`/`.superRefine()` would turn it into a
// ZodEffects, which does not support `.extend()` and would break the
// router's update procedure. Cross-field checks (e.g. startsAt < expiresAt)
// therefore can't live on this exact export without also touching the
// router; see `validateDiscountDateRange` below for a reusable check that
// can be applied wherever the date pair is available.
export const discountFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(50, "Code must be at most 50 characters"),
  type: z.enum(["percentage", "fixed", "free_shipping"]),
  value: z.coerce.number().min(0, "Value can't be negative"),
  active: z.boolean(),
  usageLimit: z.coerce
    .number()
    .int("Usage limit must be a whole number")
    .nonnegative("Usage limit can't be negative")
    .max(1_000_000, "Usage limit must be at most 1,000,000")
    .optional()
    .nullable(),
  perCustomerLimit: z.coerce
    .number()
    .int("Per-customer limit must be a whole number")
    .min(1, "Per-customer limit must be at least 1")
    .optional()
    .nullable(),
  startsAt: z.date().nullable().optional(),
  expiresAt: z.date().nullable().optional(),
  minPurchase: z.coerce
    .number()
    .nonnegative("Minimum purchase can't be negative")
    .optional()
    .nullable(),
  maxDiscount: z.coerce
    .number()
    .nonnegative("Maximum discount can't be negative")
    .optional()
    .nullable(),
});

export type DiscountFormSchema = z.infer<typeof discountFormSchema>;

/**
 * Cross-field check: when both dates are set, the start date must precede
 * the expiration date. Not baked into `discountFormSchema` itself (see note
 * above) — call this from wherever both fields are validated together.
 */
export function validateDiscountDateRange(data: {
  startsAt?: Date | null;
  expiresAt?: Date | null;
}): boolean {
  if (!data.startsAt || !data.expiresAt) return true;
  return data.startsAt < data.expiresAt;
}

export const DISCOUNT_DATE_RANGE_ERROR =
  "Start date must be before the expiration date";

/**
 * The accepted values for the admin Discounts list's filter and sort params.
 *
 * These live here, outside both the router and the page, because they are one
 * contract with two halves that fail differently when they drift — same
 * hazard as the Customers list (see `src/lib/validators/customer.ts`), but
 * with a different pair of consumers: `discount.getAll` is an **in-memory**
 * pipeline (input-free, filtered/sorted/paginated on the server component via
 * `buildTablePage`), so there is no router `z.enum` to keep in sync here. The
 * two halves are the page's own `pickParam` call and the `FilterDefFor`
 * option lists that render the filter/sort dropdowns:
 *
 * - An option the dropdown offers that `pickParam` doesn't recognize against
 *   this tuple is a **silent** failure: `pickParam` falls back to the
 *   default, so the control appears selected while the underlying rows are
 *   unfiltered/unsorted.
 * - A dropdown option with no matching `case` in the page's `comparePrimary`
 *   switch or filter predicate is also **silent** — it falls through to the
 *   `default` branch instead of crashing, so a typo just quietly reverts to
 *   the default sort/filter instead of surfacing as an error.
 *
 * One `as const` tuple per param, consumed by `pickParam` and the
 * `AdminFilterDef` option lists on the page, keeps both in sync. Tuple order
 * is menu order — `FilterDefFor` maps each tuple positionally into the
 * dropdown's option list.
 */

export const DISCOUNT_STATUS_VALUES = [
  "all",
  "active",
  "scheduled",
  "expired",
  "inactive",
] as const;
export const DISCOUNT_STATUS_DEFAULT = "all";
export type DiscountStatusValue = (typeof DISCOUNT_STATUS_VALUES)[number];
export type DiscountStatus = Exclude<DiscountStatusValue, "all">;

export const DISCOUNT_SORT_VALUES = [
  "newest",
  "code-asc",
  "code-desc",
  "oldest",
  "used-desc",
  "expires-asc",
] as const;
export const DISCOUNT_SORT_DEFAULT = "newest";
export type DiscountSortValue = (typeof DISCOUNT_SORT_VALUES)[number];

/**
 * The single status derivation for the whole admin Discounts surface. It is
 * used by three consumers that must never disagree: the list page's status
 * filter predicate, the table row's status badge, and — mirrored as a Prisma
 * `where` clause, not called directly — `discount.bulkSetActive`'s
 * skip-expired guard (a row that would derive "expired" here is excluded
 * from reactivation because the write-on-GET materializer,
 * `deactivateExpiredDiscountCodes` in `src/lib/deactivate-expired-discounts.ts`,
 * would just flip it back to inactive on the next page load).
 *
 * Priority is **expired ▸ inactive ▸ scheduled ▸ active**, checked in that
 * order. Notably, expired wins even when `active` is still `true`: a
 * discount whose `expiresAt` has passed but hasn't yet been swept by the
 * materializer must still read "Expired" here, not "Active" — the derivation
 * has to be correct standing alone, independent of whether the materializer
 * has run yet.
 *
 * The `expiresAt < now` / `startsAt > now` comparisons are raw-instant on
 * purpose, not calendar-day comparisons. This deliberately matches
 * `deactivateExpiredDiscountCodes` and the pre-migration table's status
 * badges — and just as deliberately does NOT match checkout validation
 * (`src/lib/discount-validation.ts`), which extends a discount's expiry to
 * the end of its calendar day so a shopper's local "today" still works. The
 * admin list is reporting the code's mechanical state (what the materializer
 * will do / has done), not whether a shopper could still redeem it right
 * now, so it must stay in lockstep with the materializer's rule rather than
 * the shopper-facing one.
 */
export function getDiscountStatus(
  discount: { active: boolean; startsAt: Date | null; expiresAt: Date | null },
  now: Date,
): DiscountStatus {
  if (discount.expiresAt && discount.expiresAt < now) return "expired";
  if (!discount.active) return "inactive";
  if (discount.startsAt && discount.startsAt > now) return "scheduled";
  return "active";
}

// Caps come from ~/lib/validators/admin-table, shared with Collections and
// Products — delete is far lower than activate/deactivate on purpose.
export const discountBulkActiveSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one discount id is required")
    .max(
      ADMIN_BULK_SELECTION_LIMIT,
      `Too many discounts selected — activate or deactivate at most ${ADMIN_BULK_SELECTION_LIMIT} at a time`,
    ),
  active: z.boolean(),
});

export const discountBulkDeleteSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one discount id is required")
    .max(
      ADMIN_BULK_DELETE_LIMIT,
      `Too many discounts selected — delete at most ${ADMIN_BULK_DELETE_LIMIT} at a time`,
    ),
});
