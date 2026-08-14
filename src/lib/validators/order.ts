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
 * Follow-up: `updateOrderStatusSchema`, `updateFulfillmentSchema` and
 * `updatePaymentStatusSchema` still take bare `z.string()` for the same three
 * columns and should be pointed at the `*_WRITE_VALUES` tuples below — out of
 * scope here because each has its own callers to audit.
 * `manualOrderInputSchema` has already been converted.
 */

/**
 * The `*_WRITE_VALUES` tuples are the actual stored column values; the
 * `*_VALUES` tuples add the `"all"` sentinel, which is a *filter* concept and
 * must never reach the database. Write paths take the former, the Orders list
 * filters take the latter. Spreading keeps them from drifting apart.
 */

export const ORDER_STATUS_WRITE_VALUES = [
  "open",
  "completed",
  "cancelled",
  "refunded",
] as const;
export const ORDER_STATUS_VALUES = [
  "all",
  ...ORDER_STATUS_WRITE_VALUES,
] as const;
export const ORDER_STATUS_DEFAULT = "all";

export const ORDER_FULFILLMENT_WRITE_VALUES = [
  "unfulfilled",
  "partially_fulfilled",
  "fulfilled",
] as const;
export const ORDER_FULFILLMENT_VALUES = [
  "all",
  ...ORDER_FULFILLMENT_WRITE_VALUES,
] as const;
export const ORDER_FULFILLMENT_DEFAULT = "all";

export const ORDER_PAYMENT_WRITE_VALUES = [
  "pending",
  "paid",
  "failed",
  "refunded",
] as const;
export const ORDER_PAYMENT_VALUES = [
  "all",
  ...ORDER_PAYMENT_WRITE_VALUES,
] as const;
export const ORDER_PAYMENT_DEFAULT = "all";

/** `Order.deliveryMethod` — see prisma/schema.prisma. */
export const ORDER_DELIVERY_METHOD_VALUES = ["ship", "pickup"] as const;

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

/**
 * `.min(1)` on the structurally-required columns is deliberate. These were bare
 * `z.string()`, so toggling "Add address" on the manual order form and saving it
 * blank wrote a ShippingAddress row with an empty `address1`/`city`/`zip`.
 *
 * `state` and `phone` stay optional because they genuinely are: plenty of
 * countries have no province subdivision (`getRegionOptions` returns an empty
 * list for them) and `ShippingAddress.province`/`.phone` are both nullable.
 */
const shippingAddressSchema = z.object({
  line1: z.string().min(1, "Street address is required").max(255),
  line2: z.string().max(255).optional().nullable(),
  city: z.string().min(1, "City is required").max(255),
  state: z.string().max(255).optional().nullable(),
  postal_code: z.string().min(1, "Postal code is required").max(32),
  country: z.string().min(1, "Country is required").max(2),
  phone: z.string().max(32).optional().nullable(),
});

/**
 * The form-side counterpart to `shippingAddressSchema`: same keys, no
 * emptiness requirements. Every field is optional and may be `""`, because the
 * manual order form seeds them all and the address may not be in play at all.
 * `manualOrderFormSchema`'s superRefine adds the requirements back when — and
 * only when — an address is actually being captured.
 */
const formShippingAddressSchema = z.object({
  line1: z.string().max(255).optional(),
  line2: z.string().max(255).optional().nullable(),
  city: z.string().max(255).optional(),
  state: z.string().max(255).optional().nullable(),
  postal_code: z.string().max(32).optional(),
  country: z.string().max(2).optional(),
  phone: z.string().max(32).optional().nullable(),
});

/**
 * One line item on a manual order. Money is in **cents**.
 *
 * `price` IS typed by the admin, not looked up server-side from the product
 * record — `order.createManual` multiplies this client-supplied figure by
 * `quantity` to derive each line's total (see `computeManualOrderTotals`).
 * That is intentional, not a hole: `manualOrderInputSchema` only reaches
 * `order.createManual`, an `ownerAdminProcedure` mutation, so the caller is
 * already a trusted business owner/manager recording a real-world sale (phone
 * order, in-person sale, backdated import) whose price may legitimately
 * differ from the current product record — a discount given verbally, a price
 * that has since changed, etc. This is unlike checkout, where prices are
 * always looked up server-side from the DB because the caller there is an
 * untrusted shopper (see `create-session/route.ts`).
 *
 * `productId` is required (`.min(1)`), unlike the nullable `OrderItem.productId`
 * column. The column is nullable so an item survives its product being deleted;
 * that is a *later* state, not a legal thing to create. It used to be optional
 * here, which let the form's blank starter row through with `productId: ""` —
 * that reached `order.create` as a foreign key to a product that does not exist
 * and surfaced as an unhandled Prisma P2003 (a 500, not a validation error).
 *
 * There is no `total` field: the server derives it as `price * quantity` rather
 * than trusting a client-supplied total figure — see the module-level docblock
 * on `manualOrderInputSchema` below for what "totals are server-derived" means
 * in practice (no `subtotal`/`total` fields at all, both computed from `items`).
 */
const manualOrderItemSchema = z.object({
  productId: z.string().min(1, "Pick a product"),
  productName: z.string().min(1).max(255),
  productVariantId: z.string().optional().nullable(),
  // Snapshotted onto OrderItem. Previously computed on the client and then
  // dropped on the floor, so every manual order with a variant rendered as a
  // bare product name on the detail page, packing slip and invoice.
  variantName: z.string().max(255).optional().nullable(),
  sku: z.string().max(255).optional().nullable(),
  quantity: z.coerce.number().int().positive(),
  // Cents, but deliberately NOT `.int()`: `Product.price` is a Prisma Float,
  // and while the admin product form rounds to whole cents, importers write it
  // directly. A fractional cent on some legacy row must not make the product
  // unorderable — `computeManualOrderTotals` rounds each line anyway, so the
  // stored Int totals come out whole regardless.
  price: z.coerce.number().nonnegative(),
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

/**
 * What `order.createManual` accepts. **All money is in cents.**
 *
 * Note what is absent: `subtotal` and `total`. They used to be here and were
 * written to the Order verbatim, so a crafted request could store `total: 0` on
 * a $500 order and quietly skew the Finances page. The server now derives both
 * from `items` (or `directSubtotal`) — see `computeManualOrderTotals`.
 */
export const manualOrderInputSchema = z
  .object({
    customerName: z.string().min(1).max(255),
    customerEmail: z.string().email().max(255),
    shippingName: z.string().max(255).optional(),
    shippingAddress: shippingAddressSchema.optional().nullable(),
    deliveryMethod: z.enum(ORDER_DELIVERY_METHOD_VALUES).default("ship"),
    items: z.array(manualOrderItemSchema),
    /**
     * The "enter a subtotal directly" escape hatch, for recording a sale whose
     * line items aren't worth itemising. Only consulted when `items` is empty.
     */
    directSubtotal: z.coerce.number().int().nonnegative().optional(),
    shipping: z.coerce.number().int().nonnegative().default(0),
    tax: z.coerce.number().int().nonnegative().default(0),
    discount: z.coerce.number().int().nonnegative().default(0),
    /**
     * Backdates `Order.createdAt`, for phone and in-person sales recorded after
     * the fact. Safe with respect to numbering: `orderNumber` is allocated from
     * the current max, not from the date.
     */
    orderDate: z.coerce.date().optional(),
    notes: z.string().max(2000).optional().nullable(),
    status: z.enum(ORDER_STATUS_WRITE_VALUES),
    paymentStatus: z.enum(ORDER_PAYMENT_WRITE_VALUES),
    paymentMethod: z.string().max(100).optional(),
    fulfillmentStatus: z.enum(ORDER_FULFILLMENT_WRITE_VALUES),
    sendConfirmationEmail: z.boolean(),
  })
  .refine((v) => v.items.length > 0 || v.directSubtotal !== undefined, {
    message: "Add at least one item, or enter a subtotal directly.",
    path: ["items"],
  });

export type ManualOrderInput = z.infer<typeof manualOrderInputSchema>;

/**
 * Derives the authoritative money figures for a manual order, in cents.
 *
 * Lives here rather than in the router so the client can render the same
 * preview the server will actually store — one implementation, no drift.
 */
export function computeManualOrderTotals(input: {
  items: { price: number; quantity: number }[];
  directSubtotal?: number;
  shipping?: number;
  tax?: number;
  discount?: number;
}) {
  const subtotal =
    input.items.length > 0
      ? input.items.reduce(
          (sum, item) => sum + Math.round(item.price * item.quantity),
          0,
        )
      : (input.directSubtotal ?? 0);

  const shipping = input.shipping ?? 0;
  const tax = input.tax ?? 0;
  // Clamped so an over-large discount can't create a negative order total.
  const discount = Math.min(input.discount ?? 0, subtotal + shipping + tax);
  const total = subtotal + shipping + tax - discount;

  return { subtotal, shipping, tax, discount, total };
}

/**
 * What the manual order *form* validates, which is deliberately NOT the same
 * shape as `manualOrderInputSchema`.
 *
 * The difference is units. The four charge fields are typed by a human into
 * `<NumberInput>`s, so they are **dollars** and nullable (an empty input yields
 * `null`, which is how the placeholder stays visible). Item prices come from the
 * product record and stay in **cents**. The form converts dollars to cents once,
 * at submit, via `dollarsToCents`.
 *
 * These were previously one schema doing both jobs, which is why the same
 * `shipping` field meant dollars on the client and cents on the wire.
 *
 * The two mode toggles (`includeAddress`, `useDirectSubtotal`) are fields rather
 * than component state so that `form.reset()` actually restores them and
 * `formState.isDirty` accounts for them — previously they sat in `useState`
 * beside the form, so flipping one left the form reporting itself as pristine
 * and the unsaved-changes guard disarmed.
 */
export const manualOrderFormSchema = z
  .object({
    customerName: z.string().min(1, "Customer name is required").max(255),
    customerEmail: z.string().email("Enter a valid email address").max(255),
    shippingName: z.string().max(255).optional(),
    // Genuinely loose — NOT `shippingAddressSchema.partial()`. `.partial()` only
    // makes keys optional; the `.min(1)` refinements still fire on a key that IS
    // present but empty, and the form's defaultValues seed every address field
    // with `""`. That made the whole form unsubmittable whenever the address was
    // not being captured — including every pickup order — and because the
    // address card is hidden in exactly those states, the errors attached to
    // unrendered fields and Save just silently did nothing.
    //
    // Conditional requirements live in the superRefine below, which is the only
    // place that can see `includeAddress` and `deliveryMethod`.
    shippingAddress: formShippingAddressSchema.optional().nullable(),
    deliveryMethod: z.enum(ORDER_DELIVERY_METHOD_VALUES),
    includeAddress: z.boolean(),
    items: z.array(manualOrderItemSchema),
    useDirectSubtotal: z.boolean(),
    // Dollars. Nullable so an empty field shows its placeholder.
    directSubtotal: z.number().nonnegative().nullable(),
    shipping: z.number().nonnegative().nullable(),
    tax: z.number().nonnegative().nullable(),
    discount: z.number().nonnegative().nullable(),
    orderDate: z.string().optional(),
    notes: z.string().max(2000).optional().nullable(),
    paymentStatus: z.enum(ORDER_PAYMENT_WRITE_VALUES),
    paymentMethod: z.string().max(100).optional(),
    fulfillmentStatus: z.enum(ORDER_FULFILLMENT_WRITE_VALUES),
    sendConfirmationEmail: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.useDirectSubtotal) {
      if (v.directSubtotal == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a subtotal.",
          path: ["directSubtotal"],
        });
      }
    } else if (v.items.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least one item, or enter a subtotal directly.",
        path: ["items"],
      });
    }

    // A pickup order has nothing to ship, so no address is collected.
    if (!v.includeAddress || v.deliveryMethod === "pickup") return;

    const required = [
      ["line1", "Street address is required"],
      ["city", "City is required"],
      ["postal_code", "Postal code is required"],
      ["country", "Country is required"],
    ] as const;

    for (const [key, message] of required) {
      if (!v.shippingAddress?.[key]?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
          path: ["shippingAddress", key],
        });
      }
    }
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
export type ManualOrderFormValues = z.infer<typeof manualOrderFormSchema>;
export type MarkAsRefundedSchema = z.infer<typeof markAsRefundedSchema>;
