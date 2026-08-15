import { z } from "zod";

import {
  ADMIN_BULK_DELETE_LIMIT,
  ADMIN_BULK_SELECTION_LIMIT,
} from "~/lib/validators/admin-table";

/**
 * Form schema for the owner-review dialog (admin/reviews). Mirrors the
 * constraints on `review.ownerCreate` / `review.ownerUpdate` in
 * `src/server/api/routers/review.ts`. The same shape is used for both
 * create and edit — on edit the full form is still submitted (not a partial
 * patch), so the stricter create-side constraints apply in both cases.
 *
 * `productId` is only shown/editable on create (the product a review
 * belongs to can't be changed once created), but stays in the schema so the
 * form type is uniform; on edit it's seeded from the existing review and
 * simply omitted from the update payload.
 */
export const ownerReviewFormSchema = z.object({
  productId: z.string().min(1, "Please select a product"),
  customerName: z.string().trim().min(1, "Reviewer name is required"),
  customerEmail: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
  customerTitle: z.string().trim().optional().or(z.literal("")),
  rating: z
    .number({ invalid_type_error: "Rating is required" })
    .int()
    .min(1, "Rating is required")
    .max(5, "Rating must be between 1 and 5"),
  title: z.string().trim().optional().or(z.literal("")),
  comment: z.string().trim().min(1, "Review text is required"),
  verifiedPurchase: z.boolean(),
  isApproved: z.boolean(),
  reviewDate: z.string().min(1, "Review date is required"),
});

export type OwnerReviewFormData = z.infer<typeof ownerReviewFormSchema>;

/**
 * The accepted values for the admin Reviews list's filter and sort params.
 *
 * These live here, outside both the router and the page, because they are
 * one contract with two halves that fail differently when they drift — same
 * hazard as the Testimonials and Discounts lists (see
 * `src/lib/validators/testimonials.ts` and `src/lib/validators/discounts.ts`),
 * and the same shape of consumer: `review.getAll` is an **in-memory**
 * pipeline (input-free, filtered/sorted/paginated on the server component via
 * `buildTablePage`), so there is no router `z.enum` to keep in sync here. The
 * two halves are the page's own `pickParam` calls and the `FilterDefFor`
 * option lists that render the filter/sort dropdowns:
 *
 * - An option the dropdown offers that `pickParam` doesn't recognize against
 *   these tuples is a **silent** failure: `pickParam` falls back to the
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

export const REVIEW_STATUS_VALUES = [
  "all",
  "pending",
  "published",
  "hidden",
] as const;
export const REVIEW_STATUS_DEFAULT = "all";
export type ReviewStatusValue = (typeof REVIEW_STATUS_VALUES)[number];
export type ReviewStatus = Exclude<ReviewStatusValue, "all">;

export const REVIEW_SOURCE_VALUES = ["all", "customer", "owner"] as const;
export const REVIEW_SOURCE_DEFAULT = "all";
export type ReviewSourceValue = (typeof REVIEW_SOURCE_VALUES)[number];

export const REVIEW_SORT_VALUES = [
  "newest",
  "oldest",
  "rating-high",
  "rating-low",
  "most-helpful",
] as const;
export const REVIEW_SORT_DEFAULT = "newest";
export type ReviewSortValue = (typeof REVIEW_SORT_VALUES)[number];

// Note: no name A–Z/Z–A sorts because a review's identity is a review of a
// product, not a named entity (Orders precedent); "most-helpful" mirrors the
// storefront's own helpful sort and is a data-derived sort like Customers'
// "Most orders".

/**
 * The single status derivation for the whole admin Reviews list. It is
 * used by every consumer that must never disagree: the list page's status
 * filter predicate and the table row's status badge.
 *
 * Priority is **hidden ▸ published ▸ pending**, checked in that order.
 * Notably, hidden wins even when `isApproved` is still `true`: a review
 * that has been hidden after being approved must still read "Hidden" here,
 * not "Published" — schema.prisma documents this same ordering on the
 * `Review` model. "Published" replaces the old router enum's "approved"
 * spelling to match the cross-entity vocabulary.
 */
export function getReviewStatus(review: {
  isApproved: boolean;
  isHidden: boolean;
}): ReviewStatus {
  if (review.isHidden) return "hidden";
  if (review.isApproved) return "published";
  return "pending";
}

// Caps come from ~/lib/validators/admin-table, shared with the other admin
// list bulk actions — delete is far lower than approve/hide on purpose.
export const reviewBulkApproveSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one review id is required")
    .max(
      ADMIN_BULK_SELECTION_LIMIT,
      `Too many reviews selected — approve or unapprove at most ${ADMIN_BULK_SELECTION_LIMIT} at a time`,
    ),
  isApproved: z.boolean(),
});

export const reviewBulkHideSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one review id is required")
    .max(
      ADMIN_BULK_SELECTION_LIMIT,
      `Too many reviews selected — hide or unhide at most ${ADMIN_BULK_SELECTION_LIMIT} at a time`,
    ),
  isHidden: z.boolean(),
});

export const reviewBulkDeleteSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one review id is required")
    .max(
      ADMIN_BULK_DELETE_LIMIT,
      `Too many reviews selected — delete at most ${ADMIN_BULK_DELETE_LIMIT} at a time`,
    ),
});
