import { z } from "zod";

import {
  ADMIN_BULK_DELETE_LIMIT,
  ADMIN_BULK_SELECTION_LIMIT,
} from "~/lib/validators/admin-table";
import { productSubscriptionFieldsSchema } from "~/lib/validators/subscription";

const productFeatureSchema = z.object({
  icon: z.string(),
  text: z.string(),
});

const additionalFieldsSchema = z
  .object({
    additionalInformation: z.record(z.string(), z.unknown()).optional(),
    productFeatures: z.array(productFeatureSchema).optional(),
    comingSoon: z.boolean().optional().nullable(),
    productTagline: z.string().optional().nullable(),
  })
  .optional();

export const productImageSchema = z.object({
  id: z.string().optional(),
  url: z.string().url("Enter a valid image URL"),
  altText: z.string().optional().nullable(),
  sortOrder: z.number().int("Sort order must be a whole number"),
});

function hasValidComparePrice(data: {
  price: number;
  compareAtPrice?: number;
}): boolean {
  return (
    data.compareAtPrice === undefined ||
    data.compareAtPrice === null ||
    data.compareAtPrice > data.price
  );
}

const compareAtPriceRefinement = {
  message: "Compare-at price must be greater than price",
  path: ["compareAtPrice"],
};

const variantObjectSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1, "Variant name is required")
    .max(255, "Name must be 255 characters or fewer"),
  sku: z.string().max(100, "SKU must be 100 characters or fewer").optional(),
  price: z.coerce
    .number()
    .nonnegative("Price can't be negative")
    .finite("Price must be a finite number"),
  compareAtPrice: z.coerce
    .number()
    .nonnegative("Compare-at price can't be negative")
    .finite("Compare-at price must be a finite number")
    .optional(),
  inventoryQty: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .nonnegative("Quantity can't be negative"),
  options: z.record(z.string(), z.string()),
  imageUrl: z.string().url("Enter a valid image URL").optional().nullable(),
});

export const variantSchema = variantObjectSchema.refine(
  hasValidComparePrice,
  compareAtPriceRefinement,
);

const productFormObjectSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or fewer"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(255, "Slug must be 255 characters or fewer")
    .regex(
      /^[a-z0-9._~-]+$/i,
      "Use letters, numbers, dots, underscores, tildes, and hyphens",
    ),
  description: z
    .string()
    .max(10000, "Description must be 10,000 characters or fewer")
    .optional(),
  price: z.coerce
    .number()
    .nonnegative("Price can't be negative")
    .finite("Price must be a finite number"),
  compareAtPrice: z.coerce
    .number()
    .nonnegative("Compare-at price can't be negative")
    .finite("Compare-at price must be a finite number")
    .optional(),
  cost: z.coerce
    .number()
    .nonnegative("Cost can't be negative")
    .finite("Cost must be a finite number")
    .optional()
    .nullable(),
  published: z.boolean(),
  featured: z.boolean(),
  // Form-level value: datetime-local string ("" = no schedule). Router schemas
  // override this with a real Date.
  scheduledPublishAt: z.string().optional().nullable(),
  sku: z.string().max(100, "SKU must be 100 characters or fewer").optional(),
  trackInventory: z.boolean(),
  allowBackorders: z.boolean(),
  inventoryQty: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .nonnegative("Quantity can't be negative")
    .optional(),
  lowInventoryThreshold: z.coerce
    .number()
    .int("Low stock threshold must be a whole number")
    .positive("Low stock threshold must be greater than 0")
    .optional(),
  baseInventoryUnitId: z.string().nullable().optional(),
  baseUnitsConsumed: z.coerce
    .number()
    .int("Units consumed must be a whole number")
    .positive("Units consumed must be greater than 0")
    .nullable()
    .optional(),
  variants: z.array(variantSchema).optional(),
  images: z.array(productImageSchema).optional(),
  additionalFields: additionalFieldsSchema,
  metaTitle: z
    .string()
    .max(60, "Meta title must be 60 characters or fewer")
    .optional()
    .nullable(),
  metaDescription: z
    .string()
    .max(160, "Meta description must be 160 characters or fewer")
    .optional()
    .nullable(),
  metaKeywords: z.string().optional().nullable(),
  ogImage: z.string().url("Enter a valid image URL").optional().nullable(),
  weight: z.coerce
    .number()
    .nonnegative("Weight can't be negative")
    .finite("Weight must be a finite number")
    .optional()
    .nullable(),
  weightUnit: z.enum(["lb", "kg"]).optional(),
  // Merged in (not spread inline) so `productSubscriptionFieldsSchema`
  // (`~/lib/validators/subscription`) stays the single source of truth for
  // these three fields — the product form, `productCreateSchema`, and
  // `productUpdateSchema` below all inherit them from this one `.extend()`.
  ...productSubscriptionFieldsSchema.shape,
});

export const productFormSchema = productFormObjectSchema.refine(
  hasValidComparePrice,
  compareAtPriceRefinement,
);

const productCreateObjectSchema = productFormObjectSchema
  .omit({
    images: true,
  })
  .extend({
    variants: z.array(variantSchema),
    weight: z
      .number()
      .nonnegative("Weight can't be negative")
      .finite("Weight must be a finite number")
      .nullable()
      .optional(),
    // Wire-level price/cost are cents, not dollars — the form schema above
    // takes dollar input and the client always rounds to whole cents before
    // sending (`Math.round(data.price * 100)` / `Math.round(data.cost * 100)`
    // in product-form.tsx). `.int()` closes off a hand-rolled caller storing
    // fractional cents.
    price: z
      .number()
      .int("Price must be a whole number of cents")
      .nonnegative("Price can't be negative")
      .finite("Price must be a finite number"),
    cost: z
      .number()
      .int("Cost must be a whole number of cents")
      .nonnegative("Cost can't be negative")
      .finite("Cost must be a finite number")
      .nullable()
      .optional(),
    weightUnit: z.enum(["lb", "kg"]).optional(),
    scheduledPublishAt: z.date().nullable().optional(),
  });

export const productCreateSchema = productCreateObjectSchema.refine(
  hasValidComparePrice,
  compareAtPriceRefinement,
);

const productUpdateObjectSchema = productFormObjectSchema
  .omit({
    images: true,
  })
  .extend({
    id: z.string(),
    variants: z.array(variantSchema),
    weight: z
      .number()
      .nonnegative("Weight can't be negative")
      .finite("Weight must be a finite number")
      .nullable()
      .optional(),
    // See the matching note in productCreateObjectSchema above.
    price: z
      .number()
      .int("Price must be a whole number of cents")
      .nonnegative("Price can't be negative")
      .finite("Price must be a finite number"),
    cost: z
      .number()
      .int("Cost must be a whole number of cents")
      .nonnegative("Cost can't be negative")
      .finite("Cost must be a finite number")
      .nullable()
      .optional(),
    weightUnit: z.enum(["lb", "kg"]).optional(),
    scheduledPublishAt: z.date().nullable().optional(),
  });

export const productUpdateSchema = productUpdateObjectSchema.refine(
  hasValidComparePrice,
  compareAtPriceRefinement,
);

/**
 * The accepted values for the admin Products list's filter and sort params —
 * the same single-source-of-truth contract `~/lib/validators/customer` sets out
 * at length, for the same two failure modes:
 *
 * - a UI option the `z.enum` below doesn't accept is a CRASH (`pickParam`
 *   whitelists it against the page's tuple, tRPC rejects it as BAD_REQUEST, and
 *   `rethrowTrpcForErrorBoundary` blanks the page);
 * - a default that disagrees between page and router is SILENT (`AdminFilters`
 *   deletes a param set to its `defaultValue`, so the router applies its own).
 *
 * One `as const` tuple per param, consumed by `z.enum` here, by `pickParam` and
 * the `FilterDefFor` option lists on the page, and by `secureList`'s
 * `orderByMap` (via `satisfies`), removes both. This file used to hold a
 * fourth, hand-maintained copy in each of those places.
 */
export const PRODUCT_STATUS_VALUES = ["all", "published", "draft"] as const;
export const PRODUCT_STATUS_DEFAULT = "all";

export const PRODUCT_SORT_VALUES = [
  "newest",
  "oldest",
  "name-asc",
  "name-desc",
  "price-asc",
  "price-desc",
] as const;
export const PRODUCT_SORT_DEFAULT = "newest";

export type ProductSortValue = (typeof PRODUCT_SORT_VALUES)[number];

export const productListFiltersSchema = z
  .object({
    // Truncated, not rejected: the value comes from `?search=` in the URL, so a
    // `.max()` would throw BAD_REQUEST and error-boundary the page instead of
    // showing results. 200 chars is far past any real query, and this feeds four
    // ILIKE `contains` clauses (one of them across the variants relation).
    search: z
      .string()
      .transform((s) => s.slice(0, 200))
      .optional(),
    status: z.enum(PRODUCT_STATUS_VALUES).optional(),
    sort: z.enum(PRODUCT_SORT_VALUES).optional(),
    page: z
      .number()
      .int("Page must be a whole number")
      .positive("Page must be greater than 0")
      .optional(),
  })
  .optional();

export type ProductFormSchema = z.infer<typeof productFormSchema>;
export type ProductListFiltersSchema = z.infer<typeof productListFiltersSchema>;

// ─── Bulk operations ──────────────────────────────────────────────────────────

/**
 * Products carries no bulk caps of its own: publish/unpublish take
 * ADMIN_BULK_SELECTION_LIMIT and delete takes the much lower
 * ADMIN_BULK_DELETE_LIMIT, exactly as Collections and Services do. The old
 * products-only `PRODUCT_BULK_SELECTION_LIMIT` was one of four hand-kept copies
 * of the same number; see ~/lib/validators/admin-table for where each is
 * enforced.
 */
export const productBulkPublishSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one product id is required")
    .max(
      ADMIN_BULK_SELECTION_LIMIT,
      `Too many products selected — publish or unpublish at most ${ADMIN_BULK_SELECTION_LIMIT} at a time`,
    ),
  published: z.boolean(),
});

export const productBulkDeleteSchema = z.object({
  ids: z
    .array(z.string())
    .min(1, "At least one product id is required")
    .max(
      ADMIN_BULK_DELETE_LIMIT,
      `Too many products selected — delete at most ${ADMIN_BULK_DELETE_LIMIT} at a time`,
    ),
});
