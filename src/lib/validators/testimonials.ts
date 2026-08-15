import { z } from "zod";

import {
  ADMIN_BULK_DELETE_LIMIT,
  ADMIN_BULK_SELECTION_LIMIT,
} from "~/lib/validators/admin-table";

/**
 * Form schema for the owner-testimonial dialog (admin/testimonials). Mirrors
 * the constraints on `testimonial.ownerCreate` / `testimonial.ownerUpdate`
 * in `src/server/api/routers/testimonials.ts`. The same shape is used for
 * both create and edit — on edit the full form is still submitted (not a
 * partial patch), so the stricter create-side constraints apply in both
 * cases.
 */
export const ownerTestimonialFormSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, "Customer name is required")
    .max(200, "Customer name must be 200 characters or fewer"),
  customerEmail: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("")),
  customerTitle: z
    .string()
    .trim()
    .max(200, "Customer title must be 200 characters or fewer")
    .optional()
    .or(z.literal("")),
  customerCompany: z
    .string()
    .trim()
    .max(200, "Customer company must be 200 characters or fewer")
    .optional()
    .or(z.literal("")),
  title: z
    .string()
    .trim()
    .max(300, "Headline must be 300 characters or fewer")
    .optional()
    .or(z.literal("")),
  text: z
    .string()
    .trim()
    .min(1, "Testimonial text is required")
    .max(5000, "Testimonial text must be 5000 characters or fewer"),
  photoUrls: z.array(z.string().url()).max(5, "Maximum 5 photos allowed"),
  isApproved: z.boolean(),
  testimonialDate: z.string().min(1, "Testimonial date is required"),
});

export type OwnerTestimonialFormData = z.infer<
  typeof ownerTestimonialFormSchema
>;

/**
 * The accepted values for the admin Testimonials list's filter and sort
 * params.
 *
 * These live here, outside both the router and the page, because they are
 * one contract with two halves that fail differently when they drift — same
 * hazard as the Discounts list (see `src/lib/validators/discounts.ts`), and
 * the same shape of consumer: `testimonial.getAll` is an **in-memory**
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

export const TESTIMONIAL_STATUS_VALUES = [
  "all",
  "pending",
  "published",
  "hidden",
] as const;
export const TESTIMONIAL_STATUS_DEFAULT = "all";
export type TestimonialStatusValue = (typeof TESTIMONIAL_STATUS_VALUES)[number];
export type TestimonialStatus = Exclude<TestimonialStatusValue, "all">;

export const TESTIMONIAL_SOURCE_VALUES = ["all", "customer", "owner"] as const;
export const TESTIMONIAL_SOURCE_DEFAULT = "all";
export type TestimonialSourceValue = (typeof TESTIMONIAL_SOURCE_VALUES)[number];

export const TESTIMONIAL_SORT_VALUES = [
  "newest",
  "oldest",
  "name-asc",
  "name-desc",
] as const;
export const TESTIMONIAL_SORT_DEFAULT = "newest";
export type TestimonialSortValue = (typeof TESTIMONIAL_SORT_VALUES)[number];

export const INVITE_STATUS_VALUES = [
  "all",
  "completed",
  "pending",
  "expired",
] as const;
export const INVITE_STATUS_DEFAULT = "all";
export type InviteStatusValue = (typeof INVITE_STATUS_VALUES)[number];
export type InviteStatus = Exclude<InviteStatusValue, "all">;

/**
 * The single status derivation for the whole admin Testimonials list. It is
 * used by every consumer that must never disagree: the list page's status
 * filter predicate and the table row's status badge.
 *
 * Priority is **hidden ▸ published ▸ pending**, checked in that order.
 * Notably, hidden wins even when `isApproved` is still `true`: a testimonial
 * that has been hidden after being approved must still read "Hidden" here,
 * not "Published" — schema.prisma documents this same ordering on the
 * `Testimonial` model.
 */
export function getTestimonialStatus(testimonial: {
  isApproved: boolean;
  isHidden: boolean;
}): TestimonialStatus {
  if (testimonial.isHidden) return "hidden";
  if (testimonial.isApproved) return "published";
  return "pending";
}

/**
 * The single status derivation for the admin Testimonials "invites" tab. It
 * is used by every consumer that must never disagree: the list's status
 * filter predicate and the table row's status badge.
 *
 * Priority is **completed ▸ expired ▸ pending**, checked in that order —
 * `used` wins outright, so a used invite reads "Completed" even if its
 * `expiresAt` has since passed.
 *
 * The `expiresAt <= now` comparison (not `<`) is load-bearing:
 * `testimonial.cancelInvite` soft-expires an invite by setting
 * `expiresAt = now` rather than deleting the row, so a just-cancelled invite
 * must read "expired" the moment that write lands — a strict `<` would leave
 * it reading "pending" until the clock ticks past `now` on a later render.
 */
export function getInviteStatus(
  invite: { used: boolean; expiresAt: Date },
  now: Date,
): InviteStatus {
  if (invite.used) return "completed";
  if (invite.expiresAt <= now) return "expired";
  return "pending";
}

// Caps come from ~/lib/validators/admin-table, shared with the other admin
// list bulk actions — delete is far lower than approve/hide on purpose.
export const testimonialBulkApproveSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one testimonial id is required")
    .max(
      ADMIN_BULK_SELECTION_LIMIT,
      `Too many testimonials selected — approve or unapprove at most ${ADMIN_BULK_SELECTION_LIMIT} at a time`,
    ),
  isApproved: z.boolean(),
});

export const testimonialBulkHideSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one testimonial id is required")
    .max(
      ADMIN_BULK_SELECTION_LIMIT,
      `Too many testimonials selected — hide or unhide at most ${ADMIN_BULK_SELECTION_LIMIT} at a time`,
    ),
  isHidden: z.boolean(),
});

export const testimonialBulkDeleteSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one testimonial id is required")
    .max(
      ADMIN_BULK_DELETE_LIMIT,
      `Too many testimonials selected — delete at most ${ADMIN_BULK_DELETE_LIMIT} at a time`,
    ),
});
