import type { Prisma } from "generated/prisma";
import { z } from "zod";

/**
 * Campaign audience segments: an optional narrowing applied ON TOP of the
 * consent filter (`marketingAudienceWhere`). A segment can only ever shrink
 * the audience — it never reaches anyone who hasn't opted in.
 *
 * Stored as JSON on `MarketingCampaign.audience` (null = everyone opted in).
 * Applied once, when the campaign is queued (the recipient snapshot); the
 * worker then only re-checks consent/suppression per batch.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Product ids are cuids; accept any short id-safe token. */
const productIdSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{1,64}$/, "Invalid product id");

export const audienceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("all") }),
  z.object({ type: z.literal("customers") }),
  z.object({ type: z.literal("never-ordered") }),
  z.object({
    type: z.literal("bought"),
    productIds: z
      .array(productIdSchema)
      .min(1, "Pick at least one product")
      .max(20, "Pick up to 20 products")
      .transform((ids) => [...new Set(ids)]),
  }),
  z.object({
    type: z.literal("lapsed"),
    days: z.union([
      z.literal(30),
      z.literal(60),
      z.literal(90),
      z.literal(180),
    ]),
  }),
  z.object({
    type: z.literal("recent-signup"),
    days: z.union([z.literal(7), z.literal(30), z.literal(90)]),
  }),
]);

export type Audience = z.infer<typeof audienceSchema>;
export type AudienceType = Audience["type"];

export const DEFAULT_AUDIENCE: Audience = { type: "all" };

/**
 * A stored/unknown value as an `Audience`, for DISPLAY only (getCampaign, the
 * composer). Null, missing or malformed (e.g. a segment type removed in a
 * later release) falls back to everyone opted in — never throws.
 *
 * Never use this on a send path: a malformed stored segment would silently
 * widen to the whole list. Sends use `parseStoredAudience`.
 */
export function parseAudience(raw: unknown): Audience {
  const parsed = audienceSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_AUDIENCE;
}

export type StoredAudienceResult =
  | { ok: true; audience: Audience }
  | { ok: false };

/**
 * The stored `MarketingCampaign.audience` for a SEND (schedule / queue).
 * Null/undefined means everyone opted in; any other value must match the
 * schema exactly — a stored segment that no longer parses is `ok: false`
 * (the send is blocked) rather than falling back to the whole list.
 */
export function parseStoredAudience(raw: unknown): StoredAudienceResult {
  if (raw === null || raw === undefined) {
    return { ok: true, audience: DEFAULT_AUDIENCE };
  }
  const parsed = audienceSchema.safeParse(raw);
  return parsed.success ? { ok: true, audience: parsed.data } : { ok: false };
}

/**
 * The one definition of "an order that counts as a purchase" for every
 * order-based segment (customers / never-ordered / bought / lapsed): paid,
 * or a $0 checkout (Stripe's `no_payment_required`), and not cancelled.
 * Pending / failed / unpaid orders never happened; refunded ones (and open
 * chargebacks, "disputed") don't count either.
 *
 * Deliberately not `Customer.orderCount`: that counter is also bumped for $0
 * orders but never decremented on a refund or cancel, so it would keep a
 * refunded-only shopper in "customers" forever.
 */
export const COUNTED_ORDER_PAYMENT_STATUSES = [
  "paid",
  "no_payment_required",
] as const;

export const COUNTED_ORDER_WHERE = {
  paymentStatus: { in: [...COUNTED_ORDER_PAYMENT_STATUSES] },
  status: { not: "cancelled" },
} satisfies Prisma.OrderWhereInput;

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * MS_PER_DAY);
}

/**
 * The segment's extra `Customer` predicate (empty for "all"). Combine with
 * the consent filter via `marketingAudienceWhere(businessId, audience, now)`.
 */
export function audienceSegmentWhere(
  audience: Audience,
  now: Date = new Date(),
): Prisma.CustomerWhereInput {
  switch (audience.type) {
    case "all":
      return {};
    // Every order-based segment goes through `Order.customerId` and the same
    // `COUNTED_ORDER_WHERE` predicate, so they always agree on what an order is.
    case "customers":
      return { orders: { some: COUNTED_ORDER_WHERE } };
    case "never-ordered":
      return { orders: { none: COUNTED_ORDER_WHERE } };
    case "bought":
      // Matched through `Order.customerId`. Every checkout with an email
      // (guest checkouts included) upserts a Customer and links the order, as
      // do manual orders and subscription renewals; only a Stripe session
      // with no email at all creates an unlinked order — and such a shopper
      // can't be on the marketing list anyway. Orders whose customer was
      // deleted (FK SetNull) are no longer attributed to anyone.
      return {
        orders: {
          some: {
            ...COUNTED_ORDER_WHERE,
            items: { some: { productId: { in: audience.productIds } } },
          },
        },
      };
    case "lapsed":
      // Same `Order.customerId` linkage as "bought" (unlinked no-email orders
      // aren't matched). Refunded orders count as neither a past nor a
      // recent purchase.
      return {
        orders: {
          some: COUNTED_ORDER_WHERE,
          none: {
            ...COUNTED_ORDER_WHERE,
            createdAt: { gte: daysAgo(now, audience.days) },
          },
        },
      };
    case "recent-signup":
      return { marketingConsentAt: { gte: daysAgo(now, audience.days) } };
  }
}

/**
 * The owner-facing base wording for each segment — the ONE vocabulary shared
 * by the audience picker and every place a campaign's audience is described.
 * "lapsed" and "recent-signup" are completed with a number of days
 * ("Haven't ordered in" + "90 days"); the picker shows them with a trailing
 * ellipsis while the dropdown supplies the days.
 */
export const AUDIENCE_LABELS = {
  all: "All subscribers",
  customers: "Customers who've ordered",
  "never-ordered": "Subscribers who haven't ordered",
  bought: "Bought specific products",
  lapsed: "Haven't ordered in",
  "recent-signup": "Signed up in the last",
} as const satisfies Record<AudienceType, string>;

/**
 * A short owner-facing label for the segment ("All subscribers", "Bought
 * Lavender Candle", "Haven't ordered in 90 days"). `productNames` maps product id
 * → name for "bought"; missing names fall back to a count.
 */
export function describeAudience(
  audience: Audience,
  productNames?: Record<string, string>,
): string {
  switch (audience.type) {
    case "all":
      return AUDIENCE_LABELS.all;
    case "customers":
      return AUDIENCE_LABELS.customers;
    case "never-ordered":
      return AUDIENCE_LABELS["never-ordered"];
    case "bought": {
      const names = audience.productIds
        .map((id) => productNames?.[id]?.trim())
        .filter((name): name is string => !!name);
      const total = audience.productIds.length;
      if (names.length === 0) {
        return total === 1
          ? "Bought a selected product"
          : `Bought any of ${total} products`;
      }
      const [first] = names;
      if (total === 1) return `Bought ${first}`;
      if (total === 2 && names.length === 2) {
        return `Bought ${names[0]} or ${names[1]}`;
      }
      const others = total - 1;
      return `Bought ${first} or ${others} other${others === 1 ? "" : "s"}`;
    }
    case "lapsed":
      return `${AUDIENCE_LABELS.lapsed} ${audience.days} days`;
    case "recent-signup":
      return `${AUDIENCE_LABELS["recent-signup"]} ${audience.days} days`;
  }
}
