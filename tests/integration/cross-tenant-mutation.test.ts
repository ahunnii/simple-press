import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createCollection,
  createDiscount,
  createOrder,
  createOwnerUser,
  createProduct,
} from "../helpers/factories";

/**
 * `tenant-isolation.test.ts` proves cross-tenant READS are blocked for a
 * handful of routers. This file proves the more dangerous half: cross-tenant
 * WRITES. Being unable to *see* business B's order is a privacy bug; being
 * able to *refund* it is a fraud vector. A dropped `businessId` in a single
 * `findFirst`/`findUnique`/`update`/`delete` call is a breach, not a bug.
 *
 * Pattern per case, mirroring tenant-isolation.test.ts:
 *   1. Two businesses (A, B), each with an OWNER.
 *   2. Act as A's owner (`reqHost` pointed at A's subdomain).
 *   3. Attempt the mutation against B's record by id -> assert rejection.
 *   4. Run the SAME mutation against A's own record -> assert it succeeds.
 * Step 4 is not decorative: without it, a rejection could mean "the guard
 * works" OR "the call shape/schema was wrong", and those look identical from
 * the `rejects` side alone.
 *
 * To add the next router: drop a new `it()` in the matching (or a new)
 * `describe` block, following the four steps above. `expectCrossTenantMutationBlocked`
 * below packages steps 3-4 for the common case; reach past it (as `order.refund`
 * does) when an extra assertion has to run *between* the rejection and the
 * positive control.
 */

// Procedures resolve the ACTING tenant from the request host via
// `next/headers` — same hoisted-mock idiom as tenant-isolation.test.ts.
const reqHost = vi.hoisted(() => ({ value: "tenant-a.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

// order.refund talks to Stripe directly — mocked so no network call is ever
// made, and so we can assert it was never invoked for a blocked attempt. See
// order-refund.test.ts for the reference pattern.
const stripeMocks = vi.hoisted(() => ({
  refundsCreate: vi.fn(),
  chargesRetrieve: vi.fn(),
}));
vi.mock("~/lib/stripe/client", () => ({
  stripeClient: {
    refunds: {
      create: (...args: unknown[]): unknown =>
        stripeMocks.refundsCreate(...args),
    },
    charges: {
      retrieve: (...args: unknown[]): unknown =>
        stripeMocks.chargesRetrieve(...args),
    },
  },
}));

// Several order mutations send transactional email on success — mock the
// whole module so every test here stays off the network regardless of which
// branch it exercises.
vi.mock("~/lib/email/templates", () => ({
  sendOrderCancelled: vi.fn().mockResolvedValue({ success: true }),
  sendOrderConfirmation: vi.fn().mockResolvedValue({ success: true }),
  sendOrderFulfilled: vi.fn().mockResolvedValue({ success: true }),
  sendOrderReadyForPickup: vi.fn().mockResolvedValue({ success: true }),
  sendOrderRefunded: vi.fn().mockResolvedValue({ success: true }),
  sendOrderShipped: vi.fn().mockResolvedValue({ success: true }),
}));

/**
 * Fresh two-business fixture. `coupons` and `collections` default OFF
 * platform-wide (see src/lib/features/registry.ts) — without forcing them on
 * here, `featureGate` would reject with FORBIDDEN before a mutation's own
 * tenant guard is ever reached, which would silently mask the thing this
 * file exists to test. `orders`/`products` already default on.
 */
async function setupTenants() {
  const featureFlags = { coupons: true, collections: true };
  const businessA = await createBusiness({
    subdomain: "tenant-a",
    featureFlags,
  });
  const businessB = await createBusiness({
    subdomain: "tenant-b",
    featureFlags,
  });
  const ownerA = await createOwnerUser(businessA.id);

  reqHost.value = "tenant-a.simplepress.test";
  const callerA = createTestCaller({ userId: ownerA.id });

  return { businessA, businessB, ownerA, callerA };
}

/**
 * Runs `attempt` (a mutation aimed at a record owned by business B, called
 * while acting as business A) and asserts it rejects with `expectedCode`.
 * Then runs `positiveControl` — the identical mutation shape against
 * business A's OWN record — and returns its resolved value so the caller can
 * make further assertions on it.
 *
 * The positive control is load-bearing, not decorative: it proves the
 * rejection above is the tenant guard doing its job, not a malformed call
 * that would have failed against anyone's record.
 */
async function expectCrossTenantMutationBlocked<T>(opts: {
  attempt: () => Promise<unknown>;
  expectedCode: string;
  /** Extra assertion to run after the rejection, before the positive control. */
  afterRejection?: () => void;
  positiveControl: () => Promise<T>;
}): Promise<T> {
  await expect(opts.attempt()).rejects.toMatchObject({
    code: opts.expectedCode,
  });
  opts.afterRejection?.();
  return opts.positiveControl();
}

describe("cross-tenant mutation isolation (money + inventory routers)", () => {
  beforeEach(async () => {
    await resetDb();
    stripeMocks.refundsCreate.mockReset();
    stripeMocks.chargesRetrieve.mockReset();
    stripeMocks.refundsCreate.mockImplementation(
      async (params: { amount: number }) => ({
        id: "re_test",
        amount: params.amount,
        status: "succeeded",
        charge: "ch_test",
      }),
    );
    stripeMocks.chargesRetrieve.mockResolvedValue({ amount_refunded: 0 });
  });

  // ── order.* — highest priority: money ───────────────────────────────────

  describe("order.refund", () => {
    it("rejects a foreign order id, NEVER calls Stripe, and succeeds against the caller's own order", async () => {
      // Consequence if this guard is dropped: any business owner could
      // trigger a Stripe refund against ANOTHER store's order/payment intent
      // through their own session — the single worst mutation in the
      // platform to leave unscoped.
      const { businessA, businessB, callerA } = await setupTenants();
      const orderB = await createOrder(businessB.id, {
        total: 5000,
        subtotal: 5000,
      });
      const orderA = await createOrder(businessA.id, {
        total: 5000,
        subtotal: 5000,
      });

      const result = await expectCrossTenantMutationBlocked({
        attempt: () =>
          callerA.order.refund({ orderId: orderB.id, amount: 1000 }),
        expectedCode: "NOT_FOUND",
        // Stronger than the error code alone — proves the guard fires
        // BEFORE any Stripe side effect, not just that the DB write failed.
        afterRejection: () =>
          expect(stripeMocks.refundsCreate).not.toHaveBeenCalled(),
        positiveControl: () =>
          callerA.order.refund({ orderId: orderA.id, amount: 1000 }),
      });

      expect(result.success).toBe(true);
      expect(stripeMocks.refundsCreate).toHaveBeenCalledTimes(1);

      // B's order was never touched.
      const orderBAfter = await db.order.findUniqueOrThrow({
        where: { id: orderB.id },
      });
      expect(orderBAfter.refundAmountCents).toBeNull();
      expect(orderBAfter.status).toBe("open");
    });
  });

  describe("order.updateStatus", () => {
    it("rejects a foreign order id and succeeds against the caller's own order", async () => {
      // Consequence if dropped: any owner could flip the status of another
      // store's order — including to "cancelled" (triggers restock +
      // cancellation email) or "completed" (credits the wrong store's
      // customer spend aggregates).
      const { businessA, businessB, callerA } = await setupTenants();
      const orderB = await createOrder(businessB.id);
      const orderA = await createOrder(businessA.id);

      const updated = await expectCrossTenantMutationBlocked({
        attempt: () =>
          callerA.order.updateStatus({
            orderId: orderB.id,
            status: "cancelled",
          }),
        expectedCode: "NOT_FOUND",
        positiveControl: () =>
          callerA.order.updateStatus({
            orderId: orderA.id,
            status: "cancelled",
          }),
      });

      expect(updated.status).toBe("cancelled");

      const orderBAfter = await db.order.findUniqueOrThrow({
        where: { id: orderB.id },
      });
      expect(orderBAfter.status).toBe("open");
    });
  });

  describe("order.markAsRefunded", () => {
    it("rejects a foreign order id and succeeds against the caller's own order", async () => {
      // Consequence if dropped: any owner could mark another store's order
      // as fully refunded (no Stripe call required for this manual path),
      // corrupting that store's own refund/finance records.
      const { businessA, businessB, callerA } = await setupTenants();
      const orderB = await createOrder(businessB.id, {
        total: 3000,
        subtotal: 3000,
      });
      const orderA = await createOrder(businessA.id, {
        total: 3000,
        subtotal: 3000,
      });

      const updated = await expectCrossTenantMutationBlocked({
        attempt: () => callerA.order.markAsRefunded({ orderId: orderB.id }),
        expectedCode: "NOT_FOUND",
        positiveControl: () =>
          callerA.order.markAsRefunded({ orderId: orderA.id }),
      });

      expect(updated.status).toBe("refunded");
      expect(updated.refundAmountCents).toBe(3000);

      const orderBAfter = await db.order.findUniqueOrThrow({
        where: { id: orderB.id },
      });
      expect(orderBAfter.status).toBe("open");
      expect(orderBAfter.refundAmountCents).toBeNull();
    });
  });

  describe("order.updateShippingAddress", () => {
    it("rejects a foreign order id and succeeds against the caller's own order", async () => {
      // Consequence if dropped: any owner could overwrite (or attach) a
      // shipping address on another store's order — corrupting/redirecting
      // a real customer's shipment.
      const { businessA, businessB, callerA } = await setupTenants();
      const customerA = await db.customer.create({
        data: { businessId: businessA.id, email: "buyer-a@test.dev" },
      });
      const orderB = await createOrder(businessB.id);
      const orderA = await createOrder(businessA.id, {
        customerId: customerA.id,
      });

      const address = {
        firstName: "Hacked",
        lastName: "Address",
        address1: "1 Attacker Way",
        city: "Springfield",
        zip: "12345",
        country: "US",
      };

      await expectCrossTenantMutationBlocked({
        attempt: () =>
          callerA.order.updateShippingAddress({
            orderId: orderB.id,
            ...address,
          }),
        expectedCode: "NOT_FOUND",
        positiveControl: () =>
          callerA.order.updateShippingAddress({
            orderId: orderA.id,
            ...address,
          }),
      });

      // Positive control created a new address and linked it (orderA had none).
      const orderAAfter = await db.order.findUniqueOrThrow({
        where: { id: orderA.id },
      });
      expect(orderAAfter.shippingAddressId).not.toBeNull();
      const linkedAddress = await db.shippingAddress.findUnique({
        where: { id: orderAAfter.shippingAddressId! },
      });
      expect(linkedAddress?.city).toBe("Springfield");

      // B's order was never touched.
      const orderBAfter = await db.order.findUniqueOrThrow({
        where: { id: orderB.id },
      });
      expect(orderBAfter.shippingAddressId).toBeNull();
    });
  });

  // ── product.* / inventory.* — inventory ─────────────────────────────────

  describe("product.update", () => {
    it("never changes B's product from A's call, and succeeds against the caller's own product", async () => {
      // Consequence if dropped: any owner could overwrite another store's
      // product — name, price, publish state, inventory.
      //
      // FINDING (not exploitable, but worth fixing): unlike every other
      // `product.update` re-fetches the row scoped to the caller's tenant
      // before writing, so a foreign id yields null and it throws NOT_FOUND.
      //
      // This test originally pinned INTERNAL_SERVER_ERROR, because the guard
      // did not exist: the write was still correctly blocked (Prisma's
      // compound `where` matches zero rows) but it surfaced as a raw P2025,
      // which tRPC wraps as INTERNAL_SERVER_ERROR — a 500 for what is really
      // a 404, and one the tRPC error handler forwards to Sentry as a server
      // bug on every stale-id click. The guard was added and this assertion
      // tightened; keep it at NOT_FOUND so the regression is caught.
      const { businessA, businessB, callerA } = await setupTenants();
      const productB = await createProduct(businessB.id, {
        name: "B's Product",
      });
      const productA = await createProduct(businessA.id, {
        name: "A's Product",
      });

      await expect(
        callerA.product.update({
          id: productB.id,
          name: "Hacked Name",
          slug: "hacked-product-slug",
          published: true,
          featured: false,
          trackInventory: true,
          allowBackorders: false,
          price: 999,
          variants: [],
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      const updated = await callerA.product.update({
        id: productA.id,
        name: "Updated A Name",
        slug: "updated-a-product-slug",
        published: true,
        featured: false,
        trackInventory: true,
        allowBackorders: false,
        price: 1500,
        variants: [],
      });
      expect(updated.productId).toBe(productA.id);

      const productAAfter = await db.product.findUniqueOrThrow({
        where: { id: productA.id },
      });
      expect(productAAfter.name).toBe("Updated A Name");

      // The write never happened, whatever the error code says.
      const productBAfter = await db.product.findUniqueOrThrow({
        where: { id: productB.id },
      });
      expect(productBAfter.name).toBe("B's Product");
      expect(productBAfter.slug).not.toBe("hacked-product-slug");
    });
  });

  describe("product.delete", () => {
    it("rejects a foreign product id and succeeds against the caller's own product", async () => {
      // Consequence if dropped: any owner could delete another store's
      // product — cascading to its variants, images and collection joins,
      // and best-effort deleting its S3 objects. Unrecoverable without a
      // restore.
      const { businessA, businessB, callerA } = await setupTenants();
      const productB = await createProduct(businessB.id);
      const productA = await createProduct(businessA.id);

      await expectCrossTenantMutationBlocked({
        attempt: () => callerA.product.delete(productB.id),
        expectedCode: "NOT_FOUND",
        positiveControl: () => callerA.product.delete(productA.id),
      });

      expect(
        await db.product.findUnique({ where: { id: productA.id } }),
      ).toBeNull();
      // B's product survives.
      expect(
        await db.product.findUnique({ where: { id: productB.id } }),
      ).not.toBeNull();
    });
  });

  describe("inventory.updateProductInventory", () => {
    // This is the actual "inventory-adjust" procedure for a base (no
    // variant) product. It lives in src/server/api/routers/inventory.ts, NOT
    // product.ts — grepping product.ts alone would miss it entirely.
    it("rejects a foreign product id and succeeds against the caller's own product", async () => {
      // Consequence if dropped: any owner could overwrite another store's
      // stock level directly — silently oversell (or falsely zero out) a
      // competitor/unrelated store's inventory.
      const { businessA, businessB, callerA } = await setupTenants();
      const productB = await createProduct(businessB.id, {
        trackInventory: true,
        inventoryQty: 10,
      });
      const productA = await createProduct(businessA.id, {
        trackInventory: true,
        inventoryQty: 10,
      });

      await expectCrossTenantMutationBlocked({
        attempt: () =>
          callerA.inventory.updateProductInventory({
            productId: productB.id,
            quantity: 0,
          }),
        expectedCode: "NOT_FOUND",
        positiveControl: () =>
          callerA.inventory.updateProductInventory({
            productId: productA.id,
            quantity: 42,
          }),
      });

      const productAAfter = await db.product.findUniqueOrThrow({
        where: { id: productA.id },
      });
      expect(productAAfter.inventoryQty).toBe(42);

      const productBAfter = await db.product.findUniqueOrThrow({
        where: { id: productB.id },
      });
      expect(productBAfter.inventoryQty).toBe(10);
    });
  });

  // ── discount.* — money ───────────────────────────────────────────────────

  describe("discount.update", () => {
    it("never changes B's discount from A's call, and succeeds against the caller's own discount", async () => {
      // Consequence if dropped: any owner could rewrite another store's
      // discount code — e.g. widen a 10%-off code to 100%-off, or repoint
      // its `code` string to collide with a code that store's shoppers use.
      //
      // FINDING (not exploitable, but worth fixing): same shape as
      // `product.update` above. `discount.update` has no pre-check; it goes
      // straight to `ctx.db.discountCode.update({ where: { id, businessId } })`.
      // A cross-tenant id makes Prisma throw P2025, uncaught here, which
      // now converted to NOT_FOUND by a P2025 catch (it used to leak out as a raw
      // Prisma error and surface as INTERNAL_SERVER_ERROR + a Sentry report). The
      // write is still blocked (verified below via direct DB read), but the
      // error code is wrong and every attempt gets Sentry-reported as a 500.
      const { businessA, businessB, callerA } = await setupTenants();
      const discountB = await createDiscount(businessB.id, {
        code: "BSTORE10",
        value: 10,
      });
      const discountA = await createDiscount(businessA.id, {
        code: "ASTORE10",
        value: 10,
      });

      await expect(
        callerA.discount.update({
          id: discountB.id,
          code: "HACKED100",
          type: "percentage",
          value: 100,
          active: true,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      const result = await callerA.discount.update({
        id: discountA.id,
        code: "ASTORE15",
        type: "percentage",
        value: 15,
        active: true,
      });
      expect(result.data.value).toBe(15);

      const discountBAfter = await db.discountCode.findUniqueOrThrow({
        where: { id: discountB.id },
      });
      expect(discountBAfter.code).toBe("BSTORE10");
      expect(discountBAfter.value).toBe(10);
    });
  });

  describe("discount.delete", () => {
    it("never deletes B's discount from A's call, and succeeds against the caller's own discount", async () => {
      // Consequence if dropped: any owner could delete another store's
      // discount code out from under it — orders already using it keep
      // their `discountCodeId` (onDelete: SetNull leaves the id null), but
      // the code itself stops working for that store's shoppers.
      //
      // FINDING (not exploitable, but worth fixing): `discount.delete` has
      // NO pre-check at all — it is a single bare
      // `ctx.db.discountCode.delete({ where: { id, businessId } })`. Same
      // P2025 -> NOT_FOUND handling as `discount.update` above.
      const { businessA, businessB, callerA } = await setupTenants();
      const discountB = await createDiscount(businessB.id, {
        code: "BSTORE-DEL",
      });
      const discountA = await createDiscount(businessA.id, {
        code: "ASTORE-DEL",
      });

      await expect(callerA.discount.delete(discountB.id)).rejects.toMatchObject(
        { code: "NOT_FOUND" },
      );

      await callerA.discount.delete(discountA.id);

      expect(
        await db.discountCode.findUnique({ where: { id: discountA.id } }),
      ).toBeNull();
      // B's discount survives, completely untouched.
      const discountBAfter = await db.discountCode.findUnique({
        where: { id: discountB.id },
      });
      expect(discountBAfter).not.toBeNull();
      expect(discountBAfter?.code).toBe("BSTORE-DEL");
    });
  });

  // ── collections.* — no prior tenant test at all ─────────────────────────

  describe("collections.update", () => {
    it("rejects a foreign collection id and succeeds against the caller's own collection", async () => {
      // Consequence if dropped: any owner could rename/republish/reslug
      // another store's collection, or replace its product list —
      // `collections.update` also has explicit product-ownership checks that
      // this test doesn't need to reach, since the tenant guard here fires
      // first via a clean pre-check.
      const { businessA, businessB, callerA } = await setupTenants();
      const collectionB = await createCollection(businessB.id, {
        name: "B Collection",
      });
      const collectionA = await createCollection(businessA.id, {
        name: "A Collection",
      });

      const updated = await expectCrossTenantMutationBlocked({
        attempt: () =>
          callerA.collections.update({
            id: collectionB.id,
            name: "Hacked Collection",
            slug: "hacked-collection",
            published: true,
            productIds: [],
          }),
        expectedCode: "NOT_FOUND",
        positiveControl: () =>
          callerA.collections.update({
            id: collectionA.id,
            name: "Updated A Collection",
            slug: "updated-a-collection",
            published: true,
            productIds: [],
          }),
      });

      expect(updated.name).toBe("Updated A Collection");

      const collectionBAfter = await db.collection.findUniqueOrThrow({
        where: { id: collectionB.id },
      });
      expect(collectionBAfter.name).toBe("B Collection");
    });
  });

  describe("collections.delete", () => {
    it("rejects a foreign collection id and succeeds against the caller's own collection", async () => {
      // Consequence if dropped: any owner could delete another store's
      // collection outright.
      const { businessA, businessB, callerA } = await setupTenants();
      const collectionB = await createCollection(businessB.id);
      const collectionA = await createCollection(businessA.id);

      await expectCrossTenantMutationBlocked({
        attempt: () => callerA.collections.delete(collectionB.id),
        expectedCode: "NOT_FOUND",
        positiveControl: () => callerA.collections.delete(collectionA.id),
      });

      expect(
        await db.collection.findUnique({ where: { id: collectionA.id } }),
      ).toBeNull();
      expect(
        await db.collection.findUnique({ where: { id: collectionB.id } }),
      ).not.toBeNull();
    });
  });

  // ── faq.* — no prior tenant test at all ─────────────────────────────────

  describe("faq.update", () => {
    it("rejects a foreign FAQ item id and succeeds against the caller's own item", async () => {
      // Consequence if dropped: any owner could rewrite another store's FAQ
      // content directly on its public storefront (faq.list is public and
      // unauthenticated).
      //
      // This pins the P2025-narrowing change called out in the task brief:
      // faq.ts's `.update()`/`.delete()` catch ONLY Prisma P2025 and rethrow
      // it as NOT_FOUND; any other error is left to propagate. A
      // cross-tenant id must still surface as the P2025 case, i.e. a clean
      // NOT_FOUND here — this is the correct pattern that product.update /
      // discount.update / discount.delete above are missing.
      const { businessA, businessB, callerA } = await setupTenants();
      const faqB = await db.faqItem.create({
        data: {
          businessId: businessB.id,
          question: "B question?",
          answer: "B answer.",
        },
      });
      const faqA = await db.faqItem.create({
        data: {
          businessId: businessA.id,
          question: "A question?",
          answer: "A answer.",
        },
      });

      const updated = await expectCrossTenantMutationBlocked({
        attempt: () =>
          callerA.faq.update({ id: faqB.id, question: "Hacked question?" }),
        expectedCode: "NOT_FOUND",
        positiveControl: () =>
          callerA.faq.update({ id: faqA.id, question: "Updated A question?" }),
      });

      expect(updated.question).toBe("Updated A question?");

      const faqBAfter = await db.faqItem.findUniqueOrThrow({
        where: { id: faqB.id },
      });
      expect(faqBAfter.question).toBe("B question?");
    });
  });

  describe("faq.delete", () => {
    it("rejects a foreign FAQ item id and succeeds against the caller's own item", async () => {
      // Consequence if dropped: any owner could delete another store's FAQ
      // content outright.
      const { businessA, businessB, callerA } = await setupTenants();
      const faqB = await db.faqItem.create({
        data: {
          businessId: businessB.id,
          question: "B question?",
          answer: "B answer.",
        },
      });
      const faqA = await db.faqItem.create({
        data: {
          businessId: businessA.id,
          question: "A question?",
          answer: "A answer.",
        },
      });

      await expectCrossTenantMutationBlocked({
        attempt: () => callerA.faq.delete({ id: faqB.id }),
        expectedCode: "NOT_FOUND",
        positiveControl: () => callerA.faq.delete({ id: faqA.id }),
      });

      expect(
        await db.faqItem.findUnique({ where: { id: faqA.id } }),
      ).toBeNull();
      expect(
        await db.faqItem.findUnique({ where: { id: faqB.id } }),
      ).not.toBeNull();
    });
  });
});
