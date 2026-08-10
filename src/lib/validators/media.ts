import { z } from "zod";

import { ADMIN_BULK_DELETE_LIMIT } from "~/lib/validators/admin-table";

/**
 * Optional `businessId` — honored only when the caller is a PLATFORM_ADMIN.
 * Non-platform-admins are silently scoped to their own business.
 */
export const mediaListInput = z.object({
  businessId: z.string().optional(),
});

export const mediaDeleteInput = z.object({
  key: z.string().min(1),
  businessId: z.string().optional(),
});

export const mediaDownloadInput = z.object({
  key: z.string().min(1),
  businessId: z.string().optional(),
});

/**
 * The accepted values for the admin Media Library list's filter and sort
 * params.
 *
 * These live here, outside the page, for the same reason as the Customers
 * list (see `src/lib/validators/customer.ts`) and the Discounts list (see
 * `src/lib/validators/discounts.ts`) — but with a narrower pair of consumers
 * than either. The Media Library has no router `z.enum` to keep in sync at
 * all: `media.list` is input-free (besides the optional platform-admin
 * `businessId`) and returns the whole S3 listing, filtered/sorted/paginated
 * entirely **in memory** on the page/client, so there is no server-side
 * validation step these tuples must agree with. The two consumers are both
 * client-side: the page's own `pickParam` call and the `FilterDefFor` option
 * lists that render the filter/sort dropdowns.
 *
 * An option the dropdown offers that `pickParam` doesn't recognize against
 * these tuples is a **silent** failure: `pickParam` falls back to the
 * default, so the control appears selected while the underlying rows are
 * unfiltered/unsorted. Same for a dropdown option with no matching `case` in
 * the page's filter predicate or comparator — it falls through to the
 * `default` branch instead of crashing.
 *
 * One `as const` tuple per param, consumed by `pickParam` and the
 * `FilterDefFor` option lists on the page, keeps both in sync. Tuple order is
 * menu order — `FilterDefFor` maps each tuple positionally into the
 * dropdown's option list.
 */

export const MEDIA_TYPE_VALUES = [
  "all",
  "image",
  "video",
  "logo",
  "favicon",
  "testimonial",
  "gallery",
  "other",
] as const;
export const MEDIA_TYPE_DEFAULT = "all";
export type MediaTypeValue = (typeof MEDIA_TYPE_VALUES)[number];

export const MEDIA_USAGE_VALUES = [
  "all",
  "used",
  "inactive",
  "unused",
] as const;
export const MEDIA_USAGE_DEFAULT = "all";
export type MediaUsageValue = (typeof MEDIA_USAGE_VALUES)[number];

/**
 * The three-bucket usage status a media file falls into, derived from its
 * `usedBy` array. Disjoint from `MediaUsageValue` above (that tuple adds the
 * `"all"` filter option; this type is the actual per-file classification) —
 * "used" and "unused" happen to share a spelling with two of that tuple's
 * members, but "inactive" here means "inactive-template-only", not the
 * filter's `"inactive"` option value, even though they're wired together on
 * the page.
 */
export type MediaUsageStatus = "used" | "inactive" | "unused";

/**
 * The single derivation of a file's usage bucket from its `usedBy` array —
 * shared by the Media Library's `used` filter predicate (page.tsx), the
 * `UsageBadge` component (media-library-client.tsx), and conceptually the
 * `media.delete` / `media.bulkDelete` deletability guard in the router
 * (`src/server/api/routers/media.ts` — not this file, kept in sync by
 * convention since the router derives deletability from the same
 * `inactiveTemplate` flag rather than importing this helper directly).
 *
 * - `"unused"` — no usages at all.
 * - `"inactive"` — at least one usage, and EVERY usage has
 *   `inactiveTemplate === true` (the file is leftover content from a
 *   template the owner switched away from — nothing on the LIVE storefront
 *   references it).
 * - `"used"` — at least one usage lacks the flag (i.e. `inactiveTemplate` is
 *   `false` or `undefined`), meaning at least one reference is live.
 */
export function getMediaUsageStatus(
  usedBy: Array<{ inactiveTemplate?: boolean }>,
): MediaUsageStatus {
  if (usedBy.length === 0) return "unused";
  return usedBy.every((usage) => usage.inactiveTemplate === true)
    ? "inactive"
    : "used";
}

export const MEDIA_SORT_VALUES = [
  "newest",
  "oldest",
  "name-asc",
  "name-desc",
  "largest",
  "smallest",
] as const;
export const MEDIA_SORT_DEFAULT = "newest";
export type MediaSortValue = (typeof MEDIA_SORT_VALUES)[number];

// Cap comes from ~/lib/validators/admin-table, shared with every other admin
// bulk-delete action — far lower than a selection/publish cap because
// deleting reaches outside the database (S3 object removal).
export const mediaBulkDeleteInput = z.object({
  keys: z
    .array(z.string().min(1))
    .min(1, "At least one file is required")
    .max(
      ADMIN_BULK_DELETE_LIMIT,
      `Too many files selected — delete at most ${ADMIN_BULK_DELETE_LIMIT} at a time`,
    ),
  businessId: z.string().optional(),
});

/**
 * Generic entity-type search keywords, keyed by the usage index's
 * `entityType` values (see `buildUsedMediaIndex` in `~/lib/media/usage` —
 * that file is the source of truth for the key set; an entityType missing
 * here simply contributes no keywords, it never throws).
 *
 * Why these exist when `location` strings like "Product image" are already
 * searchable: tokenized search is a case-insensitive SUBSTRING match per
 * token, so the singular "product" hits "Product image" but the plural
 * "products" does not — and some locations don't name their entity at all
 * ("Event flier" vs "events"). Each alias carries singular + plural so
 * typing either pulls up every file used by that kind of entity.
 */
const USAGE_TYPE_KEYWORDS: Record<string, string> = {
  product: "product products",
  productVariant: "product products variant variants",
  productReview: "product products review reviews",
  // A ProductImage gallery row — its location already reads "Product image";
  // the alias adds the plural.
  image: "product products",
  collection: "collection collections",
  service: "service services",
  serviceItem: "service services",
  event: "event events",
  video: "video videos",
  page: "page pages",
  galleryImage: "gallery galleries",
  testimonial: "testimonial testimonials",
  // No entry for `siteContent` — its location string "Site Content" already
  // substring-matches both words, and it has no meaningful plural.
};

/**
 * Search-field extraction for the Media Library's tokenized search.
 *
 * Returns the filename (the last `/`-separated segment of the key), the full
 * key, every usage's `location` and `entityLabel`, and generic entity-type
 * keywords per usage — so searching "hero" finds an image used as a site
 * content hero image, and "products" finds every file attached to any
 * product, even though neither ever appears in the generated S3 key.
 * Deliberately dependency-free (no import from `~/lib/media/usage`, which is
 * server-only) — the filename is derived inline with the same
 * `key.split("/").pop()` shape `classifyKind` in `~/lib/s3/list` uses for
 * its own suffix parsing.
 */
export function getMediaSearchFields(item: {
  key: string;
  usedBy: Array<{
    location: string;
    entityLabel?: string | null;
    entityType?: string;
  }>;
}): Array<string | null | undefined> {
  const filename = item.key.split("/").pop();
  return [
    filename,
    item.key,
    ...item.usedBy.map((u) => u.location),
    ...item.usedBy.map((u) => u.entityLabel),
    ...item.usedBy.map((u) =>
      u.entityType ? USAGE_TYPE_KEYWORDS[u.entityType] : undefined,
    ),
  ];
}
