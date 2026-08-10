import type { Prisma } from "generated/prisma";
import { z } from "zod";

/**
 * The accepted values for the admin Orders list's filter params.
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
 * One `as const` tuple per param, consumed by `z.enum` on the server (both
 * `order.getAll` and `export.exportOrders`) and by `pickParam` plus the
 * `AdminFilterDef` option lists on the page, removes both.
 *
 * The status/fulfillment/payment members are the Order model's documented
 * column values (see the trailing comments on `status`, `paymentStatus` and
 * `fulfillmentStatus` in prisma/schema.prisma) plus the `"all"` sentinel.
 *
 * Follow-up: the write-path schemas below (`manualOrderFormSchema`,
 * `updateOrderStatusSchema`, `updateFulfillmentSchema`,
 * `updatePaymentStatusSchema`) still take bare `z.string()` for the same three
 * columns. They should be pointed at these tuples (minus `"all"`) so a typo'd
 * status can't be written in the first place — out of scope here because they
 * are write paths with their own callers to audit.
 */

export const ORDER_STATUS_VALUES = [
  "all",
  "open",
  "completed",
  "cancelled",
  "refunded",
] as const;
export const ORDER_STATUS_DEFAULT = "all";

export const ORDER_FULFILLMENT_VALUES = [
  "all",
  "unfulfilled",
  "partially_fulfilled",
  "fulfilled",
] as const;
export const ORDER_FULFILLMENT_DEFAULT = "all";

export const ORDER_PAYMENT_VALUES = [
  "all",
  "pending",
  "paid",
  "failed",
  "refunded",
] as const;
export const ORDER_PAYMENT_DEFAULT = "all";

export const ORDER_SORT_VALUES = [
  "newest",
  "oldest",
  "total_desc",
  "total_asc",
] as const;
export const ORDER_SORT_DEFAULT = "newest";
export type OrderSortValue = (typeof ORDER_SORT_VALUES)[number];

/**
 * Postgres `int4` upper bound. `Order.orderNumber` is an `Int`, so handing
 * Prisma anything above this throws at query time rather than matching nothing.
 */
const INT4_MAX = 2_147_483_647;

/**
 * The `where` behind the admin Orders list, shared by `order.getAll` and
 * `export.exportOrders` so "Export CSV" can never disagree with the table it
 * sits above. The two used to hand-roll the same clauses side by side, and had
 * already drifted: the export copy lacked the order-number branch, so exporting
 * after searching "#1042" matched nothing and threw NOT_FOUND.
 */
export function buildOrderListWhere({
  businessId,
  status,
  fulfillment,
  paymentStatus,
  search,
}: {
  businessId: string;
  status: (typeof ORDER_STATUS_VALUES)[number];
  fulfillment: (typeof ORDER_FULFILLMENT_VALUES)[number];
  paymentStatus: (typeof ORDER_PAYMENT_VALUES)[number];
  search: string | undefined;
}): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = { businessId };

  if (status !== "all") where.status = status;
  if (fulfillment !== "all") where.fulfillmentStatus = fulfillment;
  if (paymentStatus !== "all") where.paymentStatus = paymentStatus;

  // Tokenized search — each whitespace-separated word must match SOME field
  // (AND of ORs), not the query as a whole in one field, matching
  // `customer.list` and `product.secureList`. Otherwise "Jane Smith" matches
  // nothing when the order's `customerName` is stored differently from how it
  // was typed, and "jane 1042" can never combine a name with an order number.
  const tokens = search?.trim()
    ? search.trim().split(/\s+/).filter(Boolean)
    : [];
  if (tokens.length > 0) {
    where.AND = tokens.map((token) => {
      const or: Prisma.OrderWhereInput[] = [
        { customerEmail: { contains: token, mode: "insensitive" } },
        { customerName: { contains: token, mode: "insensitive" } },
        { id: { contains: token, mode: "insensitive" } },
      ];

      // Customers quote the human order number (e.g. "#1042"), not the UUID.
      // Two deliberate deltas from the pre-migration behaviour:
      //  1. A strict all-digits test instead of `Number.parseInt`, which
      //     happily returns 10 for "10abc" and made that query match order #10.
      //  2. An int4 bound, because `orderNumber` is an `Int`: a pasted tracking
      //     number like "99999999999999" is a perfectly good integer that
      //     Prisma then rejects at query time, turning a search into a 500.
      const bare = token.replace(/^#/, "");
      if (/^\d+$/.test(bare) && Number(bare) <= INT4_MAX) {
        or.push({ orderNumber: Number(bare) });
      }

      return { OR: or };
    });
  }

  return where;
}

const shippingAddressSchema = z.object({
  line1: z.string(),
  city: z.string(),
  state: z.string(),
  postal_code: z.string(),
  country: z.string(),
});

const orderItemSchema = z.object({
  productId: z.string().optional().nullable(),
  productName: z.string().max(255).optional().nullable(),
  productVariantId: z.string().optional().nullable(),
  quantity: z.coerce.number().int().positive(),
  price: z.coerce.number().nonnegative(),
  total: z.coerce.number().nonnegative(),
});

export const shipmentItemInputSchema = z.object({
  orderItemId: z.string(),
  quantity: z.number().int().positive(),
});

export const shipmentInputSchema = z.object({
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().optional(),
  // Line items contained in this shipment. Omitted/empty = legacy behavior
  // (ship everything remaining on the order).
  items: z.array(shipmentItemInputSchema).optional(),
});

export const manualOrderFormSchema = z.object({
  customerName: z.string().min(1).max(255),
  customerEmail: z.string().email().max(255),
  shippingName: z.string().max(255).optional(),
  shippingAddress: shippingAddressSchema.optional().nullable(),
  items: z.array(orderItemSchema),
  subtotal: z.coerce.number().nonnegative(),
  shipping: z.coerce.number().nonnegative(),
  tax: z.coerce.number().nonnegative(),
  total: z.coerce.number().nonnegative(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.string(),
  paymentStatus: z.string(),
  paymentMethod: z.string().max(100).optional(),
  fulfillmentStatus: z.string(),
  sendConfirmationEmail: z.boolean(),
});

export const updateFulfillmentSchema = z.object({
  orderId: z.string(),
  fulfillmentStatus: z.string(),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string(),
  status: z.string(),
  restockItems: z.boolean().default(false),
  sendEmail: z.boolean().default(false),
});

export const updatePaymentStatusSchema = z.object({
  orderId: z.string(),
  paymentStatus: z.string(),
});

export const refundOrderSchema = z.object({
  orderId: z.string(),
  amount: z.number().positive(),
  reason: z.string().max(500).optional(),
  restockItems: z.boolean().default(false),
  sendEmail: z.boolean().default(true),
});

export const markAsRefundedSchema = z.object({
  orderId: z.string(),
  reason: z.string().max(500).optional(),
  restockItems: z.boolean().default(false),
  sendEmail: z.boolean().default(true),
});

export const orderFiltersSchema = z.object({
  // Truncated, not rejected: the value comes from `?search=` in the URL, so a
  // `.max()` would throw BAD_REQUEST and error-boundary the page instead of
  // showing results. 200 chars is far past any real query, and this feeds three
  // ILIKE `contains` clauses per token.
  search: z
    .string()
    .transform((s) => s.slice(0, 200))
    .optional(),
  // MAX_REQUESTED_PAGE clamping happens in the router, before `page` becomes a
  // Postgres OFFSET — see `customer.list`.
  page: z.coerce.number().int().positive().optional(),
  // Every filter/sort field is defaulted, so the whole object is required (the
  // admin orders page is the sole caller and always passes one) while an
  // omitted field still means "unfiltered, newest-first".
  status: z.enum(ORDER_STATUS_VALUES).default(ORDER_STATUS_DEFAULT),
  fulfillment: z
    .enum(ORDER_FULFILLMENT_VALUES)
    .default(ORDER_FULFILLMENT_DEFAULT),
  paymentStatus: z.enum(ORDER_PAYMENT_VALUES).default(ORDER_PAYMENT_DEFAULT),
  sort: z.enum(ORDER_SORT_VALUES).default(ORDER_SORT_DEFAULT),
});

export const markAsFulfilledSchema = z.object({
  orderId: z.string(),
  shipments: z.array(shipmentInputSchema).min(1),
});

export const addShipmentSchema = z.object({
  orderId: z.string(),
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().optional(),
  // Line items contained in this shipment. Omitted/empty = legacy behavior
  // (ship everything remaining on the order).
  items: z.array(shipmentItemInputSchema).optional(),
});

export const updateShipmentSchema = z.object({
  shipmentId: z.string(),
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().optional(),
});

export const updateShippingAddressSchema = z.object({
  orderId: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().optional().nullable(),
  address1: z.string().min(1),
  address2: z.string().optional().nullable(),
  city: z.string().min(1),
  province: z.string().optional().nullable(),
  zip: z.string().min(1),
  country: z.string().min(1),
  phone: z.string().optional().nullable(),
});

export const fulfillmentFormSchema = z
  .object({
    hasTracking: z.boolean(),
    shipAllRemaining: z.boolean(),
    packages: z.array(
      z.object({
        carrier: z.string().optional(),
        trackingNumber: z.string().optional(),
        trackingUrl: z
          .string()
          .url("Invalid tracking URL")
          .optional()
          .or(z.literal("")),
        // Per-item quantities for this package (used when shipAllRemaining
        // is false). 0 = item not included in the package.
        items: z
          .array(
            z.object({
              orderItemId: z.string(),
              quantity: z.coerce.number().int().min(0),
            }),
          )
          .optional(),
      }),
    ),
  })
  .superRefine((data, ctx) => {
    if (!data.hasTracking) return;
    data.packages.forEach((pkg, i) => {
      if (!pkg.carrier?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Carrier is required",
          path: ["packages", i, "carrier"],
        });
      }
      if (!pkg.trackingNumber?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Tracking number is required",
          path: ["packages", i, "trackingNumber"],
        });
      }
    });
  });

export type FulfillmentFormValues = z.infer<typeof fulfillmentFormSchema>;
export type ShipmentInput = z.infer<typeof shipmentInputSchema>;
export type ShipmentItemInput = z.infer<typeof shipmentItemInputSchema>;
export type ManualOrderFormSchema = z.infer<typeof manualOrderFormSchema>;
export type MarkAsRefundedSchema = z.infer<typeof markAsRefundedSchema>;
