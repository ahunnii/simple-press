import type { Prisma } from "generated/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PLATFORM_TERMS_VERSION } from "~/lib/legal/policy-versions";
import { buildSubscriptionCheckoutParams } from "~/lib/subscriptions/checkout-session";
// The module under test. Does not exist yet — this file is the RED half of
// test-first for `POST /api/stripe/subscriptions/create-session`.
import { POST } from "~/app/api/stripe/subscriptions/create-session/route";

import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createProduct,
  createVariant,
} from "../helpers/factories";

/**
 * RED (test-first) contract for the subscription checkout route — the money
 * endpoint of the Subscribe lane. It is a deliberate parallel of
 * `src/app/api/stripe/create-session/route.ts` (one-time checkout) and shares
 * its conventions: host-header tenant resolution, a rate limiter, shopper-safe
 * error strings, an `httpOnly` pending-session cookie, and server-derived
 * prices.
 *
 * Everything about MONEY is asserted here rather than inferred: the locked
 * price snapshot, the frozen shipping amount, the exact Stripe call arguments
 * (including `{ stripeAccount }` — a missing connected-account option charges
 * the PLATFORM's account), and the fact that a Stripe failure leaves no
 * orphaned `incomplete` row behind.
 *
 * What must NOT happen is asserted too: no `InventoryReservation` is ever
 * created (a subscription holds no stock at signup — stock is checked, then
 * released to other shoppers), and a disabled feature flag must produce zero
 * DB rows and zero Stripe calls.
 */

const ACCOUNT_ID = "acct_test_subcheckout";
/** Set by tests/helpers/test-env.ts — the host suffix `extractSubdomain` strips. */
const PLATFORM_DOMAIN = "simplepress.test";

const STRIPE_CUSTOMER_ID = "cus_test_new";
const STRIPE_SESSION_ID = "cs_test_sub_1";
const STRIPE_SESSION_URL = "https://checkout.stripe.test/c/pay/cs_test_sub_1";

// Stripe: the route creates/updates a Customer and a Checkout Session, both on
// the connected account. Nothing here may touch the network.
const stripeMocks = vi.hoisted(() => ({
  customersCreate: vi.fn(),
  customersUpdate: vi.fn(),
  sessionsCreate: vi.fn(),
}));
vi.mock("~/lib/stripe/client", () => ({
  stripeClient: {
    customers: {
      create: (...args: unknown[]): unknown =>
        stripeMocks.customersCreate(...args),
      update: (...args: unknown[]): unknown =>
        stripeMocks.customersUpdate(...args),
    },
    checkout: {
      sessions: {
        create: (...args: unknown[]): unknown =>
          stripeMocks.sessionsCreate(...args),
      },
    },
  },
}));

// Rate limiter: 10 attempts per 15 minutes per IP would trip partway through
// this file (in-memory limiter, shared across the whole run). Only
// `subscriptionCheckoutLimiter.consume` is replaced so `getClientIp` and every
// other limiter stay real.
const limiterMocks = vi.hoisted(() => ({ consume: vi.fn() }));
vi.mock("~/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    subscriptionCheckoutLimiter: {
      consume: (...args: unknown[]): unknown => limiterMocks.consume(...args),
    },
  };
});

// The route should not send email (the "subscription started" email is the
// webhook's job), but mock the single chokepoint anyway so a stray call can
// never reach Resend.
const emailMocks = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock("~/lib/email/send", () => ({
  sendEmail: (...args: unknown[]): unknown => emailMocks.sendEmail(...args),
  EMAIL_FROM: {
    NOREPLY: "noreply@test.dev",
    ORDERS: "orders@test.dev",
    SUPPORT: "support@test.dev",
  },
}));

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

const PRODUCT_IMAGE_URL = "https://cdn.test/ultra-soft.png";

/** Same 3-tier matrix as tests/integration/shipping-quote.test.ts. */
const WEIGHT_TIERS = [
  { label: "Light", minLb: 0, maxLb: 5 },
  { label: "Medium", minLb: 5, maxLb: 20 },
  { label: "Heavy", minLb: 20, maxLb: null },
];

/**
 * A zone_weight store: zone "Nearby" (MI, OH) priced 500 / 800 / 1200 across
 * the tiers above, fallback 1500. The pilot tenant's whole reason for the
 * Subscribe flow is that shipping must be priced from a real address, so the
 * happy path deliberately runs on the address-dependent shipping mode.
 *
 * `createBusiness` exposes none of these columns, so they're patched on after
 * creation (same approach as shipping-quote.test.ts) rather than editing
 * tests/helpers/factories.ts.
 */
async function createSubscriptionStore(
  opts: {
    subdomain?: string;
    stripeAccountId?: string | null;
    featureFlags?: Record<string, boolean>;
    offersInStorePickup?: boolean;
    stripeAutoTaxEnabled?: boolean;
    salesCountries?: string[];
  } = {},
) {
  const created = await createBusiness({
    subdomain: opts.subdomain ?? "subcheck-biz",
  });
  const business = await db.business.update({
    where: { id: created.id },
    data: {
      // Business.stripeAccountId is @unique, so a second store created with an
      // explicit subdomain gets its own derived account id.
      stripeAccountId:
        opts.stripeAccountId === undefined
          ? opts.subdomain
            ? `${ACCOUNT_ID}_${opts.subdomain}`
            : ACCOUNT_ID
          : opts.stripeAccountId,
      featureFlags: (opts.featureFlags ?? {
        subscriptions: true,
        products: true,
        payments: true,
      }) as Prisma.InputJsonValue,
      offersInStorePickup: opts.offersInStorePickup ?? false,
      stripeAutoTaxEnabled: opts.stripeAutoTaxEnabled ?? false,
      salesCountries: opts.salesCountries ?? [],
      shippingType: "zone_weight",
      shippingWeightTiers: WEIGHT_TIERS as unknown as Prisma.InputJsonValue,
      shippingFallbackRate: 1500,
      shippingDefaultItemWeightLb: 2,
      freeShippingThreshold: null,
    },
  });
  await db.shippingZone.create({
    data: {
      businessId: business.id,
      name: "Nearby",
      states: ["MI", "OH"],
      sortOrder: 0,
      rates: {
        create: [
          { tierIndex: 0, priceCents: 500 },
          { tierIndex: 1, priceCents: 800 },
          { tierIndex: 2, priceCents: 1200 },
        ],
      },
    },
  });
  return business;
}

/**
 * "Ultra Soft 12-pack": product price $9.99, one variant "12-pack" at $10.99
 * (so `listPriceCents` proves the VARIANT price wins), 10% subscribe-and-save,
 * cadences month:1 + week:2, 3 lb each.
 *
 * At quantity 2 that is: list 1099 → unit 989 (round(1099 × 0.9) = 989.1 → 989),
 * items 1978, weight 6 lb → tier 1 of the Nearby zone → shipping 800.
 */
async function createSubscribableProduct(
  businessId: string,
  opts: {
    subscriptionEnabled?: boolean;
    intervals?: string[];
    discountPercent?: number;
    published?: boolean;
    comingSoon?: boolean;
    variantInventoryQty?: number;
    withImage?: boolean;
  } = {},
) {
  const created = await createProduct(businessId, {
    name: "Ultra Soft 12-pack",
    price: 999,
    published: opts.published ?? true,
    inventoryQty: 50,
    ...(opts.comingSoon ? { additionalFields: { comingSoon: true } } : {}),
  });
  const product = await db.product.update({
    where: { id: created.id },
    data: {
      subscriptionEnabled: opts.subscriptionEnabled ?? true,
      subscriptionIntervals: (opts.intervals ?? [
        "month:1",
        "week:2",
      ]) as unknown as Prisma.InputJsonValue,
      subscriptionDiscountPercent: opts.discountPercent ?? 10,
      weight: 3,
      weightUnit: "lb",
    },
  });
  if (opts.withImage !== false) {
    await db.image.create({
      data: { productId: product.id, url: PRODUCT_IMAGE_URL, sortOrder: 0 },
    });
  }
  const variant = await createVariant(product.id, {
    name: "12-pack",
    sku: "TP-12",
    price: 1099,
    inventoryQty: opts.variantInventoryQty ?? 50,
  });
  return { product, variant };
}

type ShippingAddressBody = {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
};

const DEFAULT_ADDRESS: ShippingAddressBody = {
  line1: "12 Main St",
  line2: null,
  city: "Detroit",
  state: "MI",
  postalCode: "48226",
  country: "US",
  phone: null,
};

function shipBody(
  productId: string,
  variantId: string | null,
  overrides: Record<string, unknown> = {},
  customerOverrides: Record<string, unknown> = {},
) {
  return {
    productId,
    variantId,
    intervalKey: "month:1",
    quantity: 2,
    deliveryMethod: "ship",
    customerInfo: {
      email: "shopper@example.com",
      name: "Ada Lovelace",
      phone: "+13135550142",
      shippingAddress: { ...DEFAULT_ADDRESS },
      ...customerOverrides,
    },
    ...overrides,
  };
}

function post(body: unknown, subdomain = "subcheck-biz"): Promise<Response> {
  const host = `${subdomain}.${PLATFORM_DOMAIN}`;
  const req = new Request(
    `https://${host}/api/stripe/subscriptions/create-session`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host,
        "x-forwarded-for": "203.0.113.7",
      },
      body: JSON.stringify(body),
    },
  );
  return POST(req);
}

async function json(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

function onlySubscription() {
  return db.subscription.findFirstOrThrow();
}

describe("POST /api/stripe/subscriptions/create-session", () => {
  beforeEach(async () => {
    await resetDb();
    stripeMocks.customersCreate.mockReset();
    stripeMocks.customersUpdate.mockReset();
    stripeMocks.sessionsCreate.mockReset();
    emailMocks.sendEmail.mockReset();
    limiterMocks.consume.mockReset();
    limiterMocks.consume.mockResolvedValue(undefined);

    stripeMocks.customersCreate.mockResolvedValue({ id: STRIPE_CUSTOMER_ID });
    stripeMocks.customersUpdate.mockImplementation(async (id: string) => ({
      id,
    }));
    stripeMocks.sessionsCreate.mockResolvedValue({
      id: STRIPE_SESSION_ID,
      url: STRIPE_SESSION_URL,
    });
  });

  /* ---------------------------------------------------------------- *
   * Happy path — ship, zone_weight
   * ---------------------------------------------------------------- */

  describe("happy path (ship, zone_weight store)", () => {
    it("creates an incomplete Subscription with the full locked snapshot", async () => {
      const business = await createSubscriptionStore();
      const { product, variant } = await createSubscribableProduct(business.id);

      const res = await post(shipBody(product.id, variant.id));

      expect(res.status).toBe(200);
      expect(await json(res)).toEqual({
        sessionUrl: STRIPE_SESSION_URL,
        sessionId: STRIPE_SESSION_ID,
      });

      const row = await onlySubscription();
      expect(row).toMatchObject({
        businessId: business.id,
        status: "incomplete",
        productId: product.id,
        productVariantId: variant.id,
        productName: "Ultra Soft 12-pack",
        variantName: "12-pack",
        sku: "TP-12",
        quantity: 2,
        intervalKey: "month:1",
        interval: "month",
        intervalCount: 1,
        // Variant price wins over the product's own $9.99.
        listPriceCents: 1099,
        discountPercent: 10,
        unitAmountCents: 989,
        // 3 lb × 2 = 6 lb → Nearby zone, tier 1 (5–20 lb) → $8.00.
        shippingCents: 800,
        deliveryMethod: "ship",
        customerEmail: "shopper@example.com",
        customerName: "Ada Lovelace",
        customerPhone: "+13135550142",
        // Encrypted columns — read back through the Prisma extension, which
        // decrypts on the way out.
        shipFirstName: "Ada",
        shipLastName: "Lovelace",
        shipAddress1: "12 Main St",
        shipAddress2: null,
        shipCity: "Detroit",
        shipProvince: "MI",
        shipZip: "48226",
        shipCountry: "US",
        termsVersion: PLATFORM_TERMS_VERSION,
        stripeCustomerId: STRIPE_CUSTOMER_ID,
        stripeCheckoutSessionId: STRIPE_SESSION_ID,
      });
      expect(row.termsAcceptedAt).toBeInstanceOf(Date);
      // Filled in later by the webhook, never by this route.
      expect(row.stripeSubscriptionId).toBeNull();
      expect(row.currentPeriodEnd).toBeNull();
      expect(row.cancelledAt).toBeNull();
    });

    it("links a Customer and a deduplicated ShippingAddress", async () => {
      const business = await createSubscriptionStore();
      const { product, variant } = await createSubscribableProduct(business.id);

      await post(shipBody(product.id, variant.id));
      const row = await onlySubscription();

      expect(row.customerId).toBeTruthy();
      const customer = await db.customer.findUniqueOrThrow({
        where: { id: row.customerId! },
      });
      expect(customer).toMatchObject({
        businessId: business.id,
        email: "shopper@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
        stripeCustomerId: STRIPE_CUSTOMER_ID,
      });

      expect(row.shippingAddressId).toBeTruthy();
      const address = await db.shippingAddress.findUniqueOrThrow({
        where: { id: row.shippingAddressId! },
      });
      expect(address).toMatchObject({
        customerId: customer.id,
        firstName: "Ada",
        lastName: "Lovelace",
        address1: "12 Main St",
        city: "Detroit",
        province: "MI",
        zip: "48226",
        country: "US",
        // First saved address for this customer → default (findOrCreateShippingAddress).
        isDefault: true,
      });
    });

    it("creates the Stripe Customer on the CONNECTED account with the shipping destination", async () => {
      const business = await createSubscriptionStore();
      const { product, variant } = await createSubscribableProduct(business.id);

      await post(shipBody(product.id, variant.id));

      expect(stripeMocks.customersCreate).toHaveBeenCalledTimes(1);
      expect(stripeMocks.customersUpdate).not.toHaveBeenCalled();
      const [params, options] = stripeMocks.customersCreate.mock.calls[0] as [
        Record<string, unknown>,
        Record<string, unknown>,
      ];
      expect(params).toMatchObject({
        email: "shopper@example.com",
        name: "Ada Lovelace",
        phone: "+13135550142",
        shipping: {
          name: "Ada Lovelace",
          phone: "+13135550142",
          address: {
            line1: "12 Main St",
            city: "Detroit",
            state: "MI",
            postal_code: "48226",
            country: "US",
          },
        },
        // Also set as the billing address so Stripe Tax has a destination in
        // subscription mode, where `customer_update` is deliberately omitted.
        address: {
          line1: "12 Main St",
          city: "Detroit",
          state: "MI",
          postal_code: "48226",
          country: "US",
        },
      });
      expect(options).toEqual({ stripeAccount: ACCOUNT_ID });
    });

    it("creates the Checkout Session with exactly buildSubscriptionCheckoutParams(...) on the connected account", async () => {
      const business = await createSubscriptionStore();
      const { product, variant } = await createSubscribableProduct(business.id);

      await post(shipBody(product.id, variant.id));
      const row = await onlySubscription();

      expect(stripeMocks.sessionsCreate).toHaveBeenCalledTimes(1);
      const [params, options] = stripeMocks.sessionsCreate.mock.calls[0] as [
        unknown,
        Record<string, unknown>,
      ];

      expect(params).toEqual(
        buildSubscriptionCheckoutParams({
          business: {
            id: business.id,
            stripeAccountId: ACCOUNT_ID,
            stripeAutoTaxEnabled: false,
          },
          baseUrl: `https://${business.subdomain}.${PLATFORM_DOMAIN}`,
          productSlug: product.slug,
          // Server-fetched, never client-supplied (same rule as the one-time route).
          imageUrl: PRODUCT_IMAGE_URL,
          stripeCustomerId: STRIPE_CUSTOMER_ID,
          subscription: {
            id: row.id,
            productId: product.id,
            productVariantId: variant.id,
            productName: "Ultra Soft 12-pack",
            variantName: "12-pack",
            sku: "TP-12",
            quantity: 2,
            intervalKey: "month:1",
            interval: "month",
            intervalCount: 1,
            unitAmountCents: 989,
            shippingCents: 800,
            deliveryMethod: "ship",
          },
        }),
      );
      expect(options).toEqual({ stripeAccount: ACCOUNT_ID });
    });

    it("sets the pending_subscription_session cookie (httpOnly, lax, 1 hour)", async () => {
      const business = await createSubscriptionStore();
      const { product, variant } = await createSubscribableProduct(business.id);

      const res = await post(shipBody(product.id, variant.id));
      const cookie = res.headers.get("set-cookie") ?? "";

      expect(cookie).toContain(
        `pending_subscription_session=${STRIPE_SESSION_ID}`,
      );
      expect(cookie).toMatch(/httponly/i);
      // Must be `lax`, not `strict`: the browser lands on `/subscribe/success`
      // via a cross-site top-level GET redirect from checkout.stripe.com, and
      // `strict` cookies are never sent on cross-site navigations. See the
      // comment in create-session/route.ts.
      expect(cookie).toMatch(/samesite=lax/i);
      expect(cookie).toMatch(/path=\//i);
      expect(cookie).toMatch(/max-age=3600/i);
    });

    it("holds no stock: no InventoryReservation, no decrement", async () => {
      const business = await createSubscriptionStore();
      const { product, variant } = await createSubscribableProduct(business.id);

      await post(shipBody(product.id, variant.id));

      // A subscription bills on a cycle; reserving inventory at signup would
      // hold stock away from other shoppers indefinitely. Stock is checked and
      // then released. (Deduction happens per paid invoice, in the webhook.)
      expect(await db.inventoryReservation.count()).toBe(0);
      const freshVariant = await db.productVariant.findUniqueOrThrow({
        where: { id: variant.id },
      });
      expect(freshVariant.inventoryQty).toBe(50);
      expect(freshVariant.reservedQty).toBe(0);
      const freshProduct = await db.product.findUniqueOrThrow({
        where: { id: product.id },
      });
      expect(freshProduct.inventoryQty).toBe(50);
    });

    it("normalizes the customer email (lower-cased, trimmed) on both the Subscription and the Customer", async () => {
      const business = await createSubscriptionStore();
      const { product, variant } = await createSubscribableProduct(business.id);

      await post(
        shipBody(
          product.id,
          variant.id,
          {},
          { email: "  Shopper@Example.COM  " },
        ),
      );

      const row = await onlySubscription();
      expect(row.customerEmail).toBe("shopper@example.com");
      const customer = await db.customer.findFirstOrThrow();
      expect(customer.email).toBe("shopper@example.com");
    });

    it("accepts a phone supplied on the shipping address instead of customerInfo.phone", async () => {
      const business = await createSubscriptionStore();
      const { product, variant } = await createSubscribableProduct(business.id);

      const res = await post(
        shipBody(
          product.id,
          variant.id,
          {},
          {
            phone: null,
            shippingAddress: { ...DEFAULT_ADDRESS, phone: "+13135550199" },
          },
        ),
      );

      expect(res.status).toBe(200);
      const row = await onlySubscription();
      expect(row.customerPhone).toBe("+13135550199");
    });

    it("reuses Customer.stripeCustomerId on a second subscribe by the same email", async () => {
      const business = await createSubscriptionStore();
      const { product, variant } = await createSubscribableProduct(business.id);

      await post(shipBody(product.id, variant.id));
      stripeMocks.sessionsCreate.mockResolvedValue({
        id: "cs_test_sub_2",
        url: "https://checkout.stripe.test/c/pay/cs_test_sub_2",
      });

      const res = await post(
        shipBody(product.id, variant.id, { intervalKey: "week:2" }),
      );

      expect(res.status).toBe(200);
      // Exactly one Stripe Customer per shopper per store, ever.
      expect(stripeMocks.customersCreate).toHaveBeenCalledTimes(1);
      expect(stripeMocks.customersUpdate).toHaveBeenCalledTimes(1);
      const [updateId, , updateOptions] = stripeMocks.customersUpdate.mock
        .calls[0] as [string, unknown, Record<string, unknown>];
      expect(updateId).toBe(STRIPE_CUSTOMER_ID);
      expect(updateOptions).toEqual({ stripeAccount: ACCOUNT_ID });

      expect(await db.customer.count()).toBe(1);
      expect(await db.subscription.count()).toBe(2);
      const rows = await db.subscription.findMany();
      expect(rows.every((r) => r.stripeCustomerId === STRIPE_CUSTOMER_ID)).toBe(
        true,
      );
    });
  });

  /* ---------------------------------------------------------------- *
   * Happy path — pickup
   * ---------------------------------------------------------------- */

  describe("happy path (in-store pickup)", () => {
    it("charges no shipping, stores no address, and sends one line item to Stripe", async () => {
      const business = await createSubscriptionStore({
        offersInStorePickup: true,
      });
      const { product, variant } = await createSubscribableProduct(business.id);

      const res = await post(
        shipBody(
          product.id,
          variant.id,
          { deliveryMethod: "pickup" },
          { phone: null, shippingAddress: null },
        ),
      );

      expect(res.status).toBe(200);
      const row = await onlySubscription();
      expect(row).toMatchObject({
        deliveryMethod: "pickup",
        shippingCents: 0,
        shippingAddressId: null,
        shipFirstName: null,
        shipLastName: null,
        shipAddress1: null,
        shipCity: null,
        shipProvince: null,
        shipZip: null,
        shipCountry: null,
      });
      expect(await db.shippingAddress.count()).toBe(0);

      const [createParams] = stripeMocks.customersCreate.mock.calls[0] as [
        Record<string, unknown>,
      ];
      expect(createParams).not.toHaveProperty("shipping");
      expect(createParams).not.toHaveProperty("address");

      const [params] = stripeMocks.sessionsCreate.mock.calls[0] as [
        { line_items: unknown[] },
      ];
      expect(params.line_items).toHaveLength(1);
    });
  });

  /* ---------------------------------------------------------------- *
   * Rejections
   * ---------------------------------------------------------------- */

  describe("rejections", () => {
    it("400 'Invalid request.' on a body the schema rejects", async () => {
      const business = await createSubscriptionStore();
      await createSubscribableProduct(business.id);

      const res = await post({ productId: "", intervalKey: "yearly" });

      expect(res.status).toBe(400);
      expect(await json(res)).toEqual({ error: "Invalid request." });
      expect(await db.subscription.count()).toBe(0);
      expect(stripeMocks.sessionsCreate).not.toHaveBeenCalled();
    });

    it("429 when the subscription checkout limiter rejects", async () => {
      const business = await createSubscriptionStore();
      const { product, variant } = await createSubscribableProduct(business.id);
      limiterMocks.consume.mockRejectedValue(new Error("rate limited"));

      const res = await post(shipBody(product.id, variant.id));

      expect(res.status).toBe(429);
      expect(await json(res)).toEqual({
        error: "Too many requests. Please try again later.",
      });
      expect(await db.subscription.count()).toBe(0);
      expect(stripeMocks.sessionsCreate).not.toHaveBeenCalled();
    });

    it("400 when the store has never connected Stripe", async () => {
      const business = await createSubscriptionStore({
        stripeAccountId: null,
      });
      const { product, variant } = await createSubscribableProduct(business.id);

      const res = await post(shipBody(product.id, variant.id));

      expect(res.status).toBe(400);
      expect(await json(res)).toEqual({
        error: "Store payment processing not configured",
      });
      expect(await db.subscription.count()).toBe(0);
    });

    it("403 with NO row and NO Stripe call when the `subscriptions` flag is off", async () => {
      const business = await createSubscriptionStore({
        featureFlags: { subscriptions: false, products: true, payments: true },
      });
      const { product, variant } = await createSubscribableProduct(business.id);

      const res = await post(shipBody(product.id, variant.id));

      expect(res.status).toBe(403);
      expect(await json(res)).toEqual({
        error: "Subscriptions are not available for this store.",
      });
      expect(await db.subscription.count()).toBe(0);
      expect(await db.customer.count()).toBe(0);
      expect(stripeMocks.customersCreate).not.toHaveBeenCalled();
      expect(stripeMocks.sessionsCreate).not.toHaveBeenCalled();
    });

    it("403 when `subscriptions` is cascaded off by a disabled parent (payments)", async () => {
      const business = await createSubscriptionStore({
        featureFlags: { subscriptions: true, products: true, payments: false },
      });
      const { product, variant } = await createSubscribableProduct(business.id);

      const res = await post(shipBody(product.id, variant.id));

      expect(res.status).toBe(403);
      expect(await db.subscription.count()).toBe(0);
    });

    it("404 for an unpublished product", async () => {
      const business = await createSubscriptionStore();
      const { product, variant } = await createSubscribableProduct(
        business.id,
        { published: false },
      );

      const res = await post(shipBody(product.id, variant.id));

      expect(res.status).toBe(404);
      expect(await json(res)).toEqual({ error: "Product not found" });
      expect(await db.subscription.count()).toBe(0);
    });

    it("404 for a product belonging to another store", async () => {
      await createSubscriptionStore();
      const other = await createSubscriptionStore({ subdomain: "other-biz" });
      const { product, variant } = await createSubscribableProduct(other.id);

      const res = await post(shipBody(product.id, variant.id));

      expect(res.status).toBe(404);
      expect(await db.subscription.count()).toBe(0);
    });

    it("400 when the product has subscriptions turned off", async () => {
      const business = await createSubscriptionStore();
      const { product, variant } = await createSubscribableProduct(
        business.id,
        { subscriptionEnabled: false },
      );

      const res = await post(shipBody(product.id, variant.id));

      expect(res.status).toBe(400);
      expect(await json(res)).toEqual({
        error: "This product is not available for subscription.",
      });
      expect(await db.subscription.count()).toBe(0);
    });

    it("400 when the product has subscriptions on but no valid cadences configured", async () => {
      const business = await createSubscriptionStore();
      const { product, variant } = await createSubscribableProduct(
        business.id,
        { intervals: [] },
      );

      const res = await post(shipBody(product.id, variant.id));

      expect(res.status).toBe(400);
      expect(await json(res)).toEqual({
        error: "This product is not available for subscription.",
      });
    });

    it("400 for a cadence the owner did not enable on this product", async () => {
      const business = await createSubscriptionStore();
      const { product, variant } = await createSubscribableProduct(
        business.id,
        { intervals: ["month:1"] },
      );

      const res = await post(
        shipBody(product.id, variant.id, { intervalKey: "month:3" }),
      );

      expect(res.status).toBe(400);
      expect(await json(res)).toEqual({
        error: "That delivery schedule is not available for this product.",
      });
      expect(await db.subscription.count()).toBe(0);
    });

    it("400 when no variant is posted for a product that has variants", async () => {
      const business = await createSubscriptionStore();
      const { product } = await createSubscribableProduct(business.id);

      const res = await post(shipBody(product.id, null));

      expect(res.status).toBe(400);
      expect(await json(res)).toEqual({
        error: "Please choose an option before subscribing.",
      });
      expect(await db.subscription.count()).toBe(0);
    });

    it("400 for a variant that belongs to a different product", async () => {
      const business = await createSubscriptionStore();
      const { product } = await createSubscribableProduct(business.id);
      const foreign = await createSubscribableProduct(business.id);

      const res = await post(shipBody(product.id, foreign.variant.id));

      expect(res.status).toBe(400);
      expect(await json(res)).toEqual({
        error: "Please choose an available option.",
      });
      expect(await db.subscription.count()).toBe(0);
    });

    it("400 for a product flagged comingSoon (even with stock)", async () => {
      const business = await createSubscriptionStore();
      const { product, variant } = await createSubscribableProduct(
        business.id,
        { comingSoon: true },
      );

      const res = await post(shipBody(product.id, variant.id));

      expect(res.status).toBe(400);
      expect(await json(res)).toEqual({
        error: "This item is out of stock or no longer available.",
      });
      expect(await db.subscription.count()).toBe(0);
    });

    it("400 when the requested quantity exceeds available stock", async () => {
      const business = await createSubscriptionStore();
      const { product, variant } = await createSubscribableProduct(
        business.id,
        { variantInventoryQty: 1 },
      );

      const res = await post(shipBody(product.id, variant.id));

      expect(res.status).toBe(400);
      expect(await json(res)).toEqual({
        error: "This item is out of stock or no longer available.",
      });
      expect(await db.subscription.count()).toBe(0);
    });

    it("400 for pickup when the store does not offer it", async () => {
      const business = await createSubscriptionStore({
        offersInStorePickup: false,
      });
      const { product, variant } = await createSubscribableProduct(business.id);

      const res = await post(
        shipBody(
          product.id,
          variant.id,
          { deliveryMethod: "pickup" },
          { shippingAddress: null },
        ),
      );

      expect(res.status).toBe(400);
      expect(await json(res)).toEqual({
        error: "In-store pickup is not available for this store",
      });
      expect(await db.subscription.count()).toBe(0);
    });

    it("400 for a ship order with no shipping address at all", async () => {
      const business = await createSubscriptionStore();
      const { product, variant } = await createSubscribableProduct(business.id);

      const res = await post(
        shipBody(product.id, variant.id, {}, { shippingAddress: null }),
      );

      expect(res.status).toBe(400);
      expect(await json(res)).toEqual({
        error: "Complete shipping address is required",
      });
      expect(await db.subscription.count()).toBe(0);
    });

    it("400 for a whitespace-only address field (passes the schema's min(1), fails here)", async () => {
      const business = await createSubscriptionStore();
      const { product, variant } = await createSubscribableProduct(business.id);

      const res = await post(
        shipBody(
          product.id,
          variant.id,
          {},
          { shippingAddress: { ...DEFAULT_ADDRESS, line1: "   " } },
        ),
      );

      expect(res.status).toBe(400);
      expect(await json(res)).toEqual({
        error: "Complete shipping address is required",
      });
    });

    it("400 for a country outside the store's salesCountries", async () => {
      const business = await createSubscriptionStore({ salesCountries: [] });
      const { product, variant } = await createSubscribableProduct(business.id);

      const res = await post(
        shipBody(
          product.id,
          variant.id,
          {},
          {
            shippingAddress: {
              ...DEFAULT_ADDRESS,
              state: "ON",
              postalCode: "M5V 2T6",
              country: "CA",
            },
          },
        ),
      );

      expect(res.status).toBe(400);
      expect(await json(res)).toEqual({
        error: "Complete shipping address is required",
      });
      expect(await db.subscription.count()).toBe(0);
    });

    it("400 for a ship order with no phone number anywhere", async () => {
      const business = await createSubscriptionStore();
      const { product, variant } = await createSubscribableProduct(business.id);

      const res = await post(
        shipBody(
          product.id,
          variant.id,
          {},
          {
            phone: null,
            shippingAddress: { ...DEFAULT_ADDRESS, phone: null },
          },
        ),
      );

      expect(res.status).toBe(400);
      expect(await json(res)).toEqual({
        error: "A phone number is required for delivery.",
      });
      expect(await db.subscription.count()).toBe(0);
    });
  });

  /* ---------------------------------------------------------------- *
   * Stripe failure
   * ---------------------------------------------------------------- */

  describe("Stripe failure", () => {
    it("500s and deletes the incomplete row when Checkout Session creation throws", async () => {
      const business = await createSubscriptionStore();
      const { product, variant } = await createSubscribableProduct(business.id);
      stripeMocks.sessionsCreate.mockRejectedValue(
        new Error("Stripe is unavailable"),
      );

      const res = await post(shipBody(product.id, variant.id));

      expect(res.status).toBe(500);
      expect(await json(res)).toEqual({
        error: "Failed to start subscription checkout. Please try again.",
      });
      // No orphaned `incomplete` row: it would otherwise sit in the admin list
      // and in the cron sweep forever, for a subscription that never existed.
      expect(await db.subscription.count()).toBe(0);
    });
  });
});
