// RED-phase (test-first) file: the `subscription` router does not exist yet
// and is not registered in `src/server/api/root.ts`, so `caller.subscription`
// does not type-check (and throws a TypeError at runtime — the expected RED
// failure). `~/lib/subscriptions/actions` and `~/lib/subscriptions/portal`
// don't exist either. Scoped disable is intentional for this RED file per
// the plan's execution rules (§ "Running"); remove it once the router is
// registered and the file typechecks normally.
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as RateLimitModule from "~/lib/rate-limit";
import type { DbClient } from "~/server/db";
import { verifySubscriptionToken } from "~/lib/subscriptions/token";

import { createTestCaller } from "../helpers/caller";
import { resetDb } from "../helpers/db";
import {
  createBusiness,
  createCustomer,
  createMembership,
  createOwnerUser,
  createProduct,
  createUser,
} from "../helpers/factories";

/**
 * RED (test-first) coverage for `src/server/api/routers/subscription.ts`
 * (plan §6) and its registration as `subscription` in
 * `src/server/api/root.ts`. Neither exists yet, so every `caller.subscription.*`
 * call below throws a `TypeError` ("Cannot read properties of undefined") at
 * runtime rather than a typed tRPC error — that IS the expected RED failure
 * for this file; a real router turns those into the typed assertions written
 * below.
 *
 * Mocked dependencies (the router calls into modules that don't exist yet
 * either — Phase 2c/3b's job, not this file's):
 *  - `~/lib/subscriptions/actions` — `cancelSubscription`, `pauseSubscription`,
 *    `resumeSubscription`, `skipNextDelivery`, plus a `SubscriptionActionError`
 *    class the router is expected to catch and remap to NOT_FOUND/BAD_REQUEST.
 *  - `~/lib/subscriptions/portal` — `createPaymentMethodUpdateUrl`.
 *  - `~/lib/subscriptions/sync` — `syncSubscriptions` (admin `syncNow`).
 *  - `~/lib/email/templates` — `sendSubscriptionManageLinks` (per the plan's
 *    §10 email table: this is the helper `requestManageLinks` is expected to
 *    call, mirroring `sendOrderStatusLink` in `order-lookup.ts`).
 *  - `~/lib/rate-limit` — `subscriptionLookupLimiter` / `subscriptionManageLimiter`
 *    are replaced with no-op stubs (real module's `getClientIpFromHeaders` is
 *    kept via `importOriginal`) so many `it()`s hitting the same in-memory
 *    limiter singleton within one file can't cross-contaminate each other's
 *    quota. One test explicitly makes the lookup limiter reject once to prove
 *    the router surfaces TOO_MANY_REQUESTS. The MANAGE limiter belongs to the
 *    mutations only — `getByToken` must not spend it, since every mutation
 *    `router.refresh()`es the page and would otherwise cost two of twenty.
 *  - `next/headers` — the `reqHost` hoisted mutable host, same idiom as
 *    `tenant-isolation.test.ts` / `procedure-tiers.test.ts`.
 *
 * PINNED INTERPRETATIONS the plan's prose left open (flagged for the GREEN
 * implementer to confirm or push back on — see the final report):
 *  - `canUpdatePaymentMethod` in `getByToken`'s projection: true for a row
 *    that has a `stripeSubscriptionId` and isn't `cancelled`; false for a
 *    cancelled row. Only the cancelled-row case is asserted as a hard
 *    `false` below — the rest is asserted only as `typeof === "boolean"`.
 *  - `requestManageLinks` sends exactly ONE email per matching address
 *    (containing one link per matching subscription), not one email per
 *    subscription — the plan's wording ("sendEmail is called ONCE ... and
 *    one link per subscription") is read literally here.
 */

const reqHost = vi.hoisted(() => ({ value: "sub-biz.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

const SubscriptionActionError = vi.hoisted(() => {
  return class SubscriptionActionError extends Error {
    code: "not_found" | "invalid_state";
    constructor(code: "not_found" | "invalid_state", message?: string) {
      super(message ?? code);
      this.name = "SubscriptionActionError";
      this.code = code;
    }
  };
});

const actionsMocks = vi.hoisted(() => ({
  cancelSubscription: vi.fn().mockResolvedValue(undefined),
  pauseSubscription: vi.fn().mockResolvedValue(undefined),
  resumeSubscription: vi.fn().mockResolvedValue(undefined),
  skipNextDelivery: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("~/lib/subscriptions/actions", () => ({
  cancelSubscription: (...args: unknown[]): unknown =>
    actionsMocks.cancelSubscription(...args),
  pauseSubscription: (...args: unknown[]): unknown =>
    actionsMocks.pauseSubscription(...args),
  resumeSubscription: (...args: unknown[]): unknown =>
    actionsMocks.resumeSubscription(...args),
  skipNextDelivery: (...args: unknown[]): unknown =>
    actionsMocks.skipNextDelivery(...args),
  SubscriptionActionError,
}));

const portalMocks = vi.hoisted(() => ({
  // Real signature: `createPaymentMethodUpdateUrl(db, {...})` resolves a bare
  // `string` (the Stripe portal session URL) — the router wraps it as `{ url }`.
  createPaymentMethodUpdateUrl: vi
    .fn()
    .mockResolvedValue("https://stripe-portal.test/session"),
}));
vi.mock("~/lib/subscriptions/portal", () => ({
  createPaymentMethodUpdateUrl: (...args: unknown[]): unknown =>
    portalMocks.createPaymentMethodUpdateUrl(...args),
}));

const syncMocks = vi.hoisted(() => ({
  syncSubscriptions: vi.fn().mockResolvedValue(0),
}));
vi.mock("~/lib/subscriptions/sync", () => ({
  syncSubscriptions: (...args: unknown[]): unknown =>
    syncMocks.syncSubscriptions(...args),
}));

const emailMocks = vi.hoisted(() => ({
  sendSubscriptionManageLinks: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("~/lib/email/templates", () => ({
  sendSubscriptionManageLinks: (...args: unknown[]): unknown =>
    emailMocks.sendSubscriptionManageLinks(...args),
}));

const rateLimitMocks = vi.hoisted(() => ({
  lookupConsume: vi.fn().mockResolvedValue(undefined),
  manageConsume: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("~/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof RateLimitModule>();
  return {
    ...actual,
    subscriptionLookupLimiter: {
      consume: (...args: unknown[]): unknown =>
        rateLimitMocks.lookupConsume(...args),
    },
    subscriptionManageLimiter: {
      consume: (...args: unknown[]): unknown =>
        rateLimitMocks.manageConsume(...args),
    },
  };
});

let seq = 0;
function uniq(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${seq++}`;
}

/**
 * Typed wrapper around `expect.stringContaining` for use as an object
 * property value (e.g. inside `.rejects.toMatchObject({ message: ... })`).
 * Vitest's own types declare `stringContaining: (expected: string) => any`,
 * which trips `@typescript-eslint/no-unsafe-assignment` the moment the
 * result is assigned to a property rather than passed as a bare call
 * argument. The runtime value is unchanged — still the real asymmetric
 * matcher — only the compile-time type is corrected here.
 */
function containsText(text: string): string {
  return expect.stringContaining(text) as unknown as string;
}

/** Direct DB insert — `tests/helpers/factories.ts` has no Subscription factory yet. */
async function createSubscriptionRow(
  db: DbClient,
  businessId: string,
  opts: {
    status?: string;
    customerEmail?: string;
    customerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripeCustomerId?: string | null;
    customerPhone?: string | null;
    productId?: string | null;
    quantity?: number;
    intervalKey?: string;
    interval?: string;
    intervalCount?: number;
    unitAmountCents?: number;
    shippingCents?: number;
    deliveryMethod?: "ship" | "pickup";
    productName?: string;
    variantName?: string | null;
    currentPeriodEnd?: Date | null;
    nextBillingAt?: Date | null;
    pauseResumesAt?: Date | null;
    cancelledAt?: Date | null;
    ship?: {
      firstName?: string;
      lastName?: string;
      address1?: string;
      address2?: string | null;
      city?: string;
      province?: string;
      zip?: string;
      country?: string;
    };
  } = {},
) {
  return db.subscription.create({
    data: {
      businessId,
      customerEmail: opts.customerEmail ?? "sub-cust@test.dev",
      customerId: opts.customerId ?? null,
      productId: opts.productId ?? null,
      productName: opts.productName ?? "Test Product",
      variantName: opts.variantName ?? null,
      quantity: opts.quantity ?? 1,
      intervalKey: opts.intervalKey ?? "month:1",
      interval: opts.interval ?? "month",
      intervalCount: opts.intervalCount ?? 1,
      listPriceCents: 1000,
      unitAmountCents: opts.unitAmountCents ?? 1000,
      shippingCents: opts.shippingCents ?? 0,
      deliveryMethod: opts.deliveryMethod ?? "ship",
      status: opts.status ?? "active",
      stripeSubscriptionId:
        opts.stripeSubscriptionId === undefined
          ? uniq("sub")
          : opts.stripeSubscriptionId,
      stripeCustomerId: opts.stripeCustomerId ?? null,
      customerPhone: opts.customerPhone ?? null,
      currentPeriodEnd: opts.currentPeriodEnd ?? null,
      nextBillingAt: opts.nextBillingAt ?? null,
      pauseResumesAt: opts.pauseResumesAt ?? null,
      cancelledAt: opts.cancelledAt ?? null,
      ...(opts.deliveryMethod !== "pickup"
        ? {
            shipFirstName: opts.ship?.firstName ?? "Jane",
            shipLastName: opts.ship?.lastName ?? "Doe",
            shipAddress1: opts.ship?.address1 ?? "123 Main St",
            shipAddress2: opts.ship?.address2 ?? null,
            shipCity: opts.ship?.city ?? "Detroit",
            shipProvince: opts.ship?.province ?? "MI",
            shipZip: opts.ship?.zip ?? "48201",
            shipCountry: opts.ship?.country ?? "US",
          }
        : {}),
    },
  });
}

async function setupBusiness(
  opts: { subdomain?: string; featureFlags?: Record<string, boolean> } = {},
) {
  const business = await createBusiness({
    subdomain: opts.subdomain ?? "sub-biz",
    ...(opts.featureFlags ? { featureFlags: opts.featureFlags } : {}),
  });
  reqHost.value = `${business.subdomain}.simplepress.test`;
  const owner = await createOwnerUser(business.id);
  const managerUser = await createUser({ name: "Sub Manager" });
  await createMembership(business.id, managerUser.id, "MANAGER");
  const staffUser = await createUser({ name: "Sub Staff" });
  await createMembership(business.id, staffUser.id, "STAFF");

  return {
    business,
    owner,
    managerUser,
    staffUser,
    ownerCaller: createTestCaller({ userId: owner.id }),
    managerCaller: createTestCaller({ userId: managerUser.id }),
    staffCaller: createTestCaller({ userId: staffUser.id }),
    anonCaller: createTestCaller({}),
  };
}

describe("subscription router (src/server/api/routers/subscription.ts)", () => {
  beforeEach(async () => {
    await resetDb();
    reqHost.value = "sub-biz.simplepress.test";
    actionsMocks.cancelSubscription.mockClear().mockResolvedValue(undefined);
    actionsMocks.pauseSubscription.mockClear().mockResolvedValue(undefined);
    actionsMocks.resumeSubscription.mockClear().mockResolvedValue(undefined);
    actionsMocks.skipNextDelivery.mockClear().mockResolvedValue(undefined);
    portalMocks.createPaymentMethodUpdateUrl
      .mockClear()
      .mockResolvedValue("https://stripe-portal.test/session");
    syncMocks.syncSubscriptions.mockClear().mockResolvedValue(0);
    emailMocks.sendSubscriptionManageLinks
      .mockClear()
      .mockResolvedValue({ success: true });
    rateLimitMocks.lookupConsume.mockClear().mockResolvedValue(undefined);
    rateLimitMocks.manageConsume.mockClear().mockResolvedValue(undefined);
  });

  // ── public token procedures ─────────────────────────────────────────────

  describe("getByToken", () => {
    it("returns the safe projection and never leaks stripeCustomerId/stripeSubscriptionId/customerPhone", async () => {
      const { business } = await setupBusiness({ subdomain: "sub-gbt" });
      const { db } = await import("../helpers/db");
      const row = await createSubscriptionRow(db, business.id, {
        status: "active",
        stripeCustomerId: "cus_secret",
        customerPhone: "+15555550123",
      });
      const { createSubscriptionToken } =
        await import("~/lib/subscriptions/token");
      const token = createSubscriptionToken({
        subscriptionId: row.id,
        businessId: business.id,
      });
      const anon = createTestCaller({});

      const result = await anon.subscription.getByToken({ token });

      expect(result.id).toBe(row.id);
      expect(result.status).toBe("active");
      expect(result.productName).toBe(row.productName);
      expect(result.quantity).toBe(row.quantity);
      expect(result.intervalKey).toBe("month:1");
      expect(result.intervalLabel).toBe("Every month");
      expect(result.unitAmountCents).toBe(row.unitAmountCents);
      expect(result.deliveryMethod).toBe("ship");
      expect(result.perDeliveryCents).toBe(
        row.unitAmountCents * row.quantity + row.shippingCents,
      );
      expect(result.shippingAddress).toEqual({
        line1: "123 Main St",
        line2: null,
        city: "Detroit",
        state: "MI",
        postalCode: "48201",
        country: "US",
      });
      expect(Array.isArray(result.recentOrders)).toBe(true);
      // No product row behind this fixture (SetNull / deleted product):
      // "Subscribe again" falls back to the shop index.
      expect(result.productSlug).toBeNull();

      const keys = Object.keys(result);
      expect(keys).not.toContain("stripeCustomerId");
      expect(keys).not.toContain("stripeSubscriptionId");
      expect(keys).not.toContain("customerPhone");
    });

    it("returns shippingAddress: null for a pickup subscription", async () => {
      const { business } = await setupBusiness({ subdomain: "sub-pickup" });
      const { db } = await import("../helpers/db");
      const row = await createSubscriptionRow(db, business.id, {
        deliveryMethod: "pickup",
      });
      const { createSubscriptionToken } =
        await import("~/lib/subscriptions/token");
      const token = createSubscriptionToken({
        subscriptionId: row.id,
        businessId: business.id,
      });
      const anon = createTestCaller({});

      const result = await anon.subscription.getByToken({ token });
      expect(result.shippingAddress).toBeNull();
    });

    it("caps recentOrders at 5, newest first", async () => {
      const { business } = await setupBusiness({ subdomain: "sub-orders" });
      const { db } = await import("../helpers/db");
      const row = await createSubscriptionRow(db, business.id);
      const base = new Date("2026-08-01T00:00:00.000Z");
      for (let i = 0; i < 6; i++) {
        await db.order.create({
          data: {
            orderNumber: 800_000 + seq++,
            businessId: business.id,
            customerEmail: row.customerEmail,
            subtotal: 1000,
            total: 1000,
            subscriptionId: row.id,
            fulfillmentStatus: i === 5 ? "shipped" : "unfulfilled",
            createdAt: new Date(base.getTime() + i * 60_000),
          },
        });
      }
      const { createSubscriptionToken } =
        await import("~/lib/subscriptions/token");
      const token = createSubscriptionToken({
        subscriptionId: row.id,
        businessId: business.id,
      });
      const anon = createTestCaller({});

      const result = await anon.subscription.getByToken({ token });
      expect(result.recentOrders).toHaveLength(5);
      // Newest first: the 6th created order (i=5) sorts first.
      const newest = await db.order.findFirst({
        where: { subscriptionId: row.id },
        orderBy: { createdAt: "desc" },
      });
      expect(result.recentOrders[0]?.id).toBe(newest?.id);
      // Both statuses reach the manage page: `status` for the
      // cancelled/refunded story, `fulfillmentStatus` for "has it shipped".
      expect(result.recentOrders[0]?.status).toBe("open");
      expect(result.recentOrders[0]?.fulfillmentStatus).toBe("shipped");
      expect(result.recentOrders[1]?.fulfillmentStatus).toBe("unfulfilled");
    });

    it("exposes the product slug so a cancelled subscriber can resubscribe", async () => {
      const { business } = await setupBusiness({ subdomain: "sub-slug" });
      const { db } = await import("../helpers/db");
      const product = await createProduct(business.id, { name: "Ultra Soft" });
      const row = await createSubscriptionRow(db, business.id, {
        status: "cancelled",
        productId: product.id,
        cancelledAt: new Date(),
      });
      const { createSubscriptionToken } =
        await import("~/lib/subscriptions/token");
      const token = createSubscriptionToken({
        subscriptionId: row.id,
        businessId: business.id,
      });
      const anon = createTestCaller({});

      const result = await anon.subscription.getByToken({ token });
      expect(result.productSlug).toBe(product.slug);
    });

    it("productSlug is null when the product belongs to another tenant", async () => {
      // Defence in depth: `Subscription.productId` should never point across
      // tenants, but the slug lookup must be businessId-scoped regardless.
      const other = await setupBusiness({ subdomain: "sub-slug-other" });
      const foreignProduct = await createProduct(other.business.id);
      const { business } = await setupBusiness({ subdomain: "sub-slug-mine" });
      const { db } = await import("../helpers/db");
      const row = await createSubscriptionRow(db, business.id, {
        productId: foreignProduct.id,
      });
      const { createSubscriptionToken } =
        await import("~/lib/subscriptions/token");
      const token = createSubscriptionToken({
        subscriptionId: row.id,
        businessId: business.id,
      });
      const anon = createTestCaller({});

      const result = await anon.subscription.getByToken({ token });
      expect(result.productSlug).toBeNull();
    });

    it("canUpdatePaymentMethod is false for a cancelled subscription", async () => {
      const { business } = await setupBusiness({ subdomain: "sub-cupm" });
      const { db } = await import("../helpers/db");
      const row = await createSubscriptionRow(db, business.id, {
        status: "cancelled",
        cancelledAt: new Date(),
      });
      const { createSubscriptionToken } =
        await import("~/lib/subscriptions/token");
      const token = createSubscriptionToken({
        subscriptionId: row.id,
        businessId: business.id,
      });
      const anon = createTestCaller({});

      const result = await anon.subscription.getByToken({ token });
      expect(typeof result.canUpdatePaymentMethod).toBe("boolean");
      expect(result.canUpdatePaymentMethod).toBe(false);
    });

    it("rejects with NOT_FOUND when the token's businessId doesn't match the host-resolved business", async () => {
      const { business: businessA } = await setupBusiness({
        subdomain: "sub-cross-a",
      });
      const businessB = await createBusiness({ subdomain: "sub-cross-b" });
      const { db } = await import("../helpers/db");
      const rowOnB = await createSubscriptionRow(db, businessB.id);
      const { createSubscriptionToken } =
        await import("~/lib/subscriptions/token");
      // Token minted for business B, but the host resolves to business A.
      const token = createSubscriptionToken({
        subscriptionId: rowOnB.id,
        businessId: businessB.id,
      });
      reqHost.value = `${businessA.subdomain}.simplepress.test`;
      const anon = createTestCaller({});

      // Captured once and asserted on directly (rather than two separate
      // `.rejects` expectations, which would call the procedure twice):
      // tRPC's OWN "no procedure found on path" error also carries
      // `code: "NOT_FOUND"` — before the router is registered, that error
      // alone would satisfy a bare `{code: "NOT_FOUND"}` match and make this
      // test pass for completely the wrong reason. The message check is
      // what keeps this red until the real router-level rejection exists.
      const error = (await anon.subscription
        .getByToken({ token })
        .catch((e: unknown) => e)) as { code?: string; message?: string };
      expect(error).toMatchObject({ code: "NOT_FOUND" });
      expect(error.message ?? "").not.toContain("No procedure found");
    });

    it("rejects with NOT_FOUND for a tampered/garbage token", async () => {
      await setupBusiness({ subdomain: "sub-garbage" });
      const anon = createTestCaller({});

      // See the note above — must not pass merely because the router isn't
      // registered yet.
      const error = (await anon.subscription
        .getByToken({ token: "not-a-real-token" })
        .catch((e: unknown) => e)) as { code?: string; message?: string };
      expect(error).toMatchObject({ code: "NOT_FOUND" });
      expect(error.message ?? "").not.toContain("No procedure found");
    });

    // The manage-action budget (20 per 15 min) belongs to the MUTATIONS. Every
    // mutation on the manage page `router.refresh()`es on success, which
    // re-runs this read — charging both would make each click cost two, and a
    // customer who skips, changes their mind and cancels would be locked out
    // of their own subscription. The read is one indexed lookup behind an
    // HMAC-signed token.
    it("does NOT consume subscriptionManageLimiter", async () => {
      const { business } = await setupBusiness({ subdomain: "sub-ratelim" });
      const { db } = await import("../helpers/db");
      const row = await createSubscriptionRow(db, business.id);
      const { createSubscriptionToken } =
        await import("~/lib/subscriptions/token");
      const token = createSubscriptionToken({
        subscriptionId: row.id,
        businessId: business.id,
      });
      const anon = createTestCaller({});

      await anon.subscription.getByToken({ token });

      expect(rateLimitMocks.manageConsume).not.toHaveBeenCalled();
    });

    it("reports whether the store charges Stripe Tax, so the total can be labelled pre-tax", async () => {
      const { business } = await setupBusiness({ subdomain: "sub-tax" });
      const { db } = await import("../helpers/db");
      const row = await createSubscriptionRow(db, business.id);
      const { createSubscriptionToken } =
        await import("~/lib/subscriptions/token");
      const token = createSubscriptionToken({
        subscriptionId: row.id,
        businessId: business.id,
      });
      const anon = createTestCaller({});

      expect(
        (await anon.subscription.getByToken({ token })).taxAppliedAtCheckout,
      ).toBe(false);

      await db.business.update({
        where: { id: business.id },
        data: { stripeAutoTaxEnabled: true },
      });

      expect(
        (await anon.subscription.getByToken({ token })).taxAppliedAtCheckout,
      ).toBe(true);
    });
  });

  describe("cancelByToken", () => {
    it("works even when the subscriptions flag is OFF", async () => {
      const { business } = await setupBusiness({
        subdomain: "sub-cancel-off",
        featureFlags: { subscriptions: false },
      });
      const { db } = await import("../helpers/db");
      const row = await createSubscriptionRow(db, business.id, {
        status: "active",
      });
      const { createSubscriptionToken } =
        await import("~/lib/subscriptions/token");
      const token = createSubscriptionToken({
        subscriptionId: row.id,
        businessId: business.id,
      });
      const anon = createTestCaller({});

      await anon.subscription.cancelByToken({ token });

      expect(actionsMocks.cancelSubscription).toHaveBeenCalledTimes(1);
      expect(actionsMocks.cancelSubscription).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          businessId: business.id,
          subscriptionId: row.id,
          reason: "customer",
        }),
      );
    });

    it("maps SubscriptionActionError('not_found') to NOT_FOUND", async () => {
      const { business } = await setupBusiness({ subdomain: "sub-cancel-nf" });
      const { db } = await import("../helpers/db");
      const row = await createSubscriptionRow(db, business.id);
      const { createSubscriptionToken } =
        await import("~/lib/subscriptions/token");
      const token = createSubscriptionToken({
        subscriptionId: row.id,
        businessId: business.id,
      });
      actionsMocks.cancelSubscription.mockRejectedValueOnce(
        new SubscriptionActionError("not_found", "gone"),
      );
      const anon = createTestCaller({});

      // Same "no procedure found" trap as getByToken's NOT_FOUND tests above
      // — must not pass merely because the router isn't registered yet.
      const error = (await anon.subscription
        .cancelByToken({ token })
        .catch((e: unknown) => e)) as { code?: string; message?: string };
      expect(error).toMatchObject({ code: "NOT_FOUND" });
      expect(error.message ?? "").not.toContain("No procedure found");
    });

    it("maps SubscriptionActionError('invalid_state') to BAD_REQUEST", async () => {
      const { business } = await setupBusiness({ subdomain: "sub-cancel-is" });
      const { db } = await import("../helpers/db");
      const row = await createSubscriptionRow(db, business.id);
      const { createSubscriptionToken } =
        await import("~/lib/subscriptions/token");
      const token = createSubscriptionToken({
        subscriptionId: row.id,
        businessId: business.id,
      });
      actionsMocks.cancelSubscription.mockRejectedValueOnce(
        new SubscriptionActionError("invalid_state", "already cancelled"),
      );
      const anon = createTestCaller({});

      await expect(
        anon.subscription.cancelByToken({ token }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  // pause/resume/skip share the same gating + action-mapping shape —
  // table-driven to keep the three nearly-identical procedures from turning
  // into 300 lines of copy-paste. `createPortalSessionByToken` used to sit in
  // this table and no longer does: it is ungated, and has its own describe.
  const gatedByTokenCases = [
    {
      procedure: "pauseByToken",
      mockKey: "pauseSubscription",
    },
    {
      procedure: "resumeByToken",
      mockKey: "resumeSubscription",
    },
    {
      procedure: "skipNextByToken",
      mockKey: "skipNextDelivery",
    },
  ] as const;

  for (const { procedure, mockKey } of gatedByTokenCases) {
    describe(procedure, () => {
      it("is FORBIDDEN when the subscriptions flag is off, and succeeds once it's on", async () => {
        const { business } = await setupBusiness({
          subdomain: `sub-${procedure.toLowerCase()}`,
          featureFlags: { subscriptions: false },
        });
        const { db } = await import("../helpers/db");
        const row = await createSubscriptionRow(db, business.id, {
          status: "active",
        });
        const { createSubscriptionToken } =
          await import("~/lib/subscriptions/token");
        const token = createSubscriptionToken({
          subscriptionId: row.id,
          businessId: business.id,
        });
        const anon = createTestCaller({});

        await expect(
          anon.subscription[procedure]({ token }),
        ).rejects.toMatchObject({
          code: "FORBIDDEN",
          message: containsText("Settings"),
        });
        expect(actionsMocks[mockKey]).not.toHaveBeenCalled();

        await db.business.update({
          where: { id: business.id },
          data: { featureFlags: { subscriptions: true } },
        });

        await anon.subscription[procedure]({ token });
        expect(actionsMocks[mockKey]).toHaveBeenCalledTimes(1);
        expect(actionsMocks[mockKey]).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            businessId: business.id,
            subscriptionId: row.id,
          }),
        );
      });
    });
  }

  describe("createPortalSessionByToken", () => {
    // Ungated, like `cancelByToken`. Updating a card is an exit from harm, not
    // a convenience: the dunning email tells a past-due customer to "update
    // your card", and a flag flipped off between the send and the click would
    // land them on a page with no way to do it — their subscription then dies
    // of a payment failure they were actively trying to fix.
    it("works even when the subscriptions flag is OFF", async () => {
      const { business } = await setupBusiness({
        subdomain: "sub-portal",
        featureFlags: { subscriptions: false },
      });
      const { db } = await import("../helpers/db");
      const row = await createSubscriptionRow(db, business.id, {
        status: "past_due",
      });
      const { createSubscriptionToken } =
        await import("~/lib/subscriptions/token");
      const token = createSubscriptionToken({
        subscriptionId: row.id,
        businessId: business.id,
      });
      const anon = createTestCaller({});

      const result = await anon.subscription.createPortalSessionByToken({
        token,
        returnUrl: "https://sub-portal.simplepress.test/subscriptions/x",
      });
      expect(result).toEqual({ url: "https://stripe-portal.test/session" });
      expect(portalMocks.createPaymentMethodUpdateUrl).toHaveBeenCalledTimes(1);

      await db.business.update({
        where: { id: business.id },
        data: { featureFlags: { subscriptions: true } },
      });

      const onResult = await anon.subscription.createPortalSessionByToken({
        token,
        returnUrl: "https://sub-portal.simplepress.test/subscriptions/x",
      });
      expect(onResult).toEqual({ url: "https://stripe-portal.test/session" });
    });

    it("still consumes the manage-action rate limit", async () => {
      const { business } = await setupBusiness({ subdomain: "sub-portal-rl" });
      const { db } = await import("../helpers/db");
      const row = await createSubscriptionRow(db, business.id, {
        status: "active",
      });
      const { createSubscriptionToken } =
        await import("~/lib/subscriptions/token");
      const token = createSubscriptionToken({
        subscriptionId: row.id,
        businessId: business.id,
      });
      rateLimitMocks.manageConsume.mockRejectedValueOnce(
        new Error("rate limited"),
      );
      const anon = createTestCaller({});

      await expect(
        anon.subscription.createPortalSessionByToken({
          token,
          returnUrl: "https://sub-portal-rl.simplepress.test/subscriptions/x",
        }),
      ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    });
  });

  // ── requestManageLinks ──────────────────────────────────────────────────

  describe("requestManageLinks", () => {
    it("always returns { success: true } for an unknown email, and sends no email", async () => {
      await setupBusiness({ subdomain: "sub-rml-unknown" });
      const anon = createTestCaller({});

      const result = await anon.subscription.requestManageLinks({
        email: "nobody@test.dev",
      });

      expect(result).toEqual({ success: true });
      expect(emailMocks.sendSubscriptionManageLinks).not.toHaveBeenCalled();
    });

    it("sends ONE email containing a link per matching (non-incomplete) subscription", async () => {
      const { business } = await setupBusiness({ subdomain: "sub-rml-hit" });
      const { db } = await import("../helpers/db");
      const email = "match@test.dev";
      const active = await createSubscriptionRow(db, business.id, {
        customerEmail: email,
        status: "active",
      });
      const paused = await createSubscriptionRow(db, business.id, {
        customerEmail: email,
        status: "paused",
      });
      // Excluded: status incomplete.
      await createSubscriptionRow(db, business.id, {
        customerEmail: email,
        status: "incomplete",
      });
      const anon = createTestCaller({});

      const result = await anon.subscription.requestManageLinks({ email });

      expect(result).toEqual({ success: true });
      expect(emailMocks.sendSubscriptionManageLinks).toHaveBeenCalledTimes(1);
      const dump = JSON.stringify(
        emailMocks.sendSubscriptionManageLinks.mock.calls[0],
      );
      expect(dump).toContain(active.id);
      expect(dump).toContain(paused.id);
    });

    it("matches the customer email case-insensitively", async () => {
      const { business } = await setupBusiness({
        subdomain: "sub-rml-case",
      });
      const { db } = await import("../helpers/db");
      await createSubscriptionRow(db, business.id, {
        customerEmail: "MixedCase@Test.dev",
        status: "active",
      });
      const anon = createTestCaller({});

      const result = await anon.subscription.requestManageLinks({
        email: "mixedcase@test.dev",
      });

      expect(result).toEqual({ success: true });
      expect(emailMocks.sendSubscriptionManageLinks).toHaveBeenCalledTimes(1);
    });

    it("does not include another business's subscriptions for the same email", async () => {
      const { business: businessA } = await setupBusiness({
        subdomain: "sub-rml-a",
      });
      const businessB = await createBusiness({ subdomain: "sub-rml-b" });
      const { db } = await import("../helpers/db");
      const email = "shared@test.dev";
      await createSubscriptionRow(db, businessA.id, {
        customerEmail: email,
        status: "active",
      });
      const rowOnB = await createSubscriptionRow(db, businessB.id, {
        customerEmail: email,
        status: "active",
      });

      reqHost.value = `${businessA.subdomain}.simplepress.test`;
      const anon = createTestCaller({});
      await anon.subscription.requestManageLinks({ email });

      const dump = JSON.stringify(
        emailMocks.sendSubscriptionManageLinks.mock.calls[0],
      );
      expect(dump).not.toContain(rowOnB.id);
    });

    it("surfaces TOO_MANY_REQUESTS when subscriptionLookupLimiter rejects", async () => {
      await setupBusiness({ subdomain: "sub-rml-limit" });
      rateLimitMocks.lookupConsume.mockRejectedValueOnce(
        new Error("rate limited"),
      );
      const anon = createTestCaller({});

      await expect(
        anon.subscription.requestManageLinks({ email: "x@test.dev" }),
      ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    });
  });

  // ── account.getMine ──────────────────────────────────────────────────────

  describe("getMine", () => {
    it("rejects a null-session caller with UNAUTHORIZED", async () => {
      await setupBusiness({ subdomain: "sub-mine-unauth" });
      const anon = createTestCaller({});

      await expect(anon.subscription.getMine()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("returns [] when the signed-in user has no Customer record", async () => {
      await setupBusiness({ subdomain: "sub-mine-nocust" });
      const shopper = await createUser({ email: "shopper@test.dev" });
      const caller = createTestCaller({
        userId: shopper.id,
        email: shopper.email,
      });

      await expect(caller.subscription.getMine()).resolves.toEqual([]);
    });

    it("returns the customer's subscriptions with a working manageUrl, newest first", async () => {
      const { business } = await setupBusiness({ subdomain: "sub-mine-hit" });
      const { db } = await import("../helpers/db");
      const shopper = await createUser({ email: "mine@test.dev" });
      const customer = await createCustomer(business.id, {
        email: shopper.email,
        userId: shopper.id,
      });
      const older = await createSubscriptionRow(db, business.id, {
        customerId: customer.id,
        customerEmail: shopper.email,
        status: "cancelled",
      });
      await db.subscription.update({
        where: { id: older.id },
        data: { createdAt: new Date("2026-01-01T00:00:00.000Z") },
      });
      const newer = await createSubscriptionRow(db, business.id, {
        customerId: customer.id,
        customerEmail: shopper.email,
        status: "active",
      });
      const caller = createTestCaller({
        userId: shopper.id,
        email: shopper.email,
      });

      const result = await caller.subscription.getMine();

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe(newer.id);
      expect(result[1]?.id).toBe(older.id);

      const manageUrl = result[0]!.manageUrl;
      expect(typeof manageUrl).toBe("string");
      const token = manageUrl.split("/subscriptions/")[1];
      expect(token).toBeTruthy();
      const verified = verifySubscriptionToken(token!);
      expect(verified).toEqual({
        subscriptionId: newer.id,
        businessId: business.id,
      });
    });

    it("returns an explicit allowlist projection — never the bare Stripe ids or encrypted columns", async () => {
      const { business } = await setupBusiness({ subdomain: "sub-mine-proj" });
      const { db } = await import("../helpers/db");
      const shopper = await createUser({ email: "proj@test.dev" });
      const customer = await createCustomer(business.id, {
        email: shopper.email,
        userId: shopper.id,
      });
      const product = await createProduct(business.id, { name: "Ultra Soft" });
      await createSubscriptionRow(db, business.id, {
        customerId: customer.id,
        customerEmail: shopper.email,
        productId: product.id,
        status: "active",
        customerPhone: "+13135550142",
        ship: { address1: "42 Elm St", city: "Ann Arbor" },
      });
      const caller = createTestCaller({
        userId: shopper.id,
        email: shopper.email,
      });

      const result = await caller.subscription.getMine();
      expect(result).toHaveLength(1);
      const row = result[0]!;

      // Positive allowlist.
      expect(row).toMatchObject({
        status: "active",
        productName: "Test Product",
        productSlug: product.slug,
        quantity: expect.any(Number) as number,
        intervalKey: "month:1",
        intervalLabel: expect.any(String) as string,
        unitAmountCents: expect.any(Number) as number,
        shippingCents: expect.any(Number) as number,
        perDeliveryCents: expect.any(Number) as number,
        deliveryMethod: "ship",
      });
      expect(typeof row.manageUrl).toBe("string");

      // Negative allowlist: none of these keys may appear in the projection,
      // even though they exist on the underlying `Subscription` row.
      const forbiddenKeys = [
        "stripeCustomerId",
        "stripeSubscriptionId",
        "stripeCheckoutSessionId",
        "customerPhone",
        "shipAddress1",
      ];
      for (const key of forbiddenKeys) {
        expect(Object.keys(row)).not.toContain(key);
      }
    });

    it("resolves productSlug from the product relation scoped to the business, null when the product was deleted", async () => {
      const { business } = await setupBusiness({ subdomain: "sub-mine-slug" });
      const { db } = await import("../helpers/db");
      const shopper = await createUser({ email: "slug@test.dev" });
      const customer = await createCustomer(business.id, {
        email: shopper.email,
        userId: shopper.id,
      });
      const product = await createProduct(business.id, { name: "Ultra Soft" });
      const withProduct = await createSubscriptionRow(db, business.id, {
        customerId: customer.id,
        customerEmail: shopper.email,
        productId: product.id,
      });
      const deletedProduct = await createSubscriptionRow(db, business.id, {
        customerId: customer.id,
        customerEmail: shopper.email,
        productId: null,
      });
      const caller = createTestCaller({
        userId: shopper.id,
        email: shopper.email,
      });

      const result = await caller.subscription.getMine();
      const byId = new Map(result.map((r) => [r.id, r]));
      expect(byId.get(withProduct.id)?.productSlug).toBe(product.slug);
      expect(byId.get(deletedProduct.id)?.productSlug).toBeNull();
    });

    it("never returns another business's subscriptions for the same user", async () => {
      const { business: businessA } = await setupBusiness({
        subdomain: "sub-mine-a",
      });
      const businessB = await createBusiness({ subdomain: "sub-mine-b" });
      const { db } = await import("../helpers/db");
      const shopper = await createUser({ email: "cross-mine@test.dev" });
      const customerA = await createCustomer(businessA.id, {
        email: shopper.email,
        userId: shopper.id,
      });
      const customerB = await createCustomer(businessB.id, {
        email: shopper.email,
        userId: shopper.id,
      });
      const rowA = await createSubscriptionRow(db, businessA.id, {
        customerId: customerA.id,
        customerEmail: shopper.email,
      });
      await createSubscriptionRow(db, businessB.id, {
        customerId: customerB.id,
        customerEmail: shopper.email,
      });

      reqHost.value = `${businessA.subdomain}.simplepress.test`;
      const caller = createTestCaller({
        userId: shopper.id,
        email: shopper.email,
      });

      const result = await caller.subscription.getMine();
      expect(result.map((r) => r.id)).toEqual([rowA.id]);
    });
  });

  // ── admin ────────────────────────────────────────────────────────────────

  describe("admin: list / get (ungated reads)", () => {
    it("list works with the subscriptions flag off, and STAFF is rejected", async () => {
      const { business, ownerCaller, staffCaller } = await setupBusiness({
        subdomain: "sub-admin-list",
        featureFlags: { subscriptions: false },
      });
      const { db } = await import("../helpers/db");
      await createSubscriptionRow(db, business.id, { status: "active" });

      await expect(ownerCaller.subscription.list({})).resolves.toBeTruthy();
      await expect(staffCaller.subscription.list({})).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Not a business member",
      });
    });

    it("get works with the flag off, includes orders + decrypted address, and 404s cross-tenant", async () => {
      const { business: businessA, ownerCaller } = await setupBusiness({
        subdomain: "sub-admin-get-a",
        featureFlags: { subscriptions: false },
      });
      const businessB = await createBusiness({ subdomain: "sub-admin-get-b" });
      const { db } = await import("../helpers/db");
      const row = await createSubscriptionRow(db, businessA.id, {
        status: "active",
        ship: { address1: "42 Elm St", city: "Ann Arbor" },
      });
      await db.order.create({
        data: {
          orderNumber: 700_000 + seq++,
          businessId: businessA.id,
          customerEmail: row.customerEmail,
          subtotal: 1000,
          total: 1000,
          subscriptionId: row.id,
        },
      });
      const rowOnB = await createSubscriptionRow(db, businessB.id);

      const result = await ownerCaller.subscription.get({ id: row.id });
      expect(result.id).toBe(row.id);
      expect(result.shipAddress1).toBe("42 Elm St");
      expect(result.shipCity).toBe("Ann Arbor");
      expect(result.orders).toHaveLength(1);

      await expect(
        ownerCaller.subscription.get({ id: rowOnB.id }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("admin: cancel (ungated write)", () => {
    it("works with the flag off and calls cancelSubscription with reason: owner", async () => {
      const { business, ownerCaller, managerCaller } = await setupBusiness({
        subdomain: "sub-admin-cancel",
        featureFlags: { subscriptions: false },
      });
      const { db } = await import("../helpers/db");
      const row = await createSubscriptionRow(db, business.id, {
        status: "active",
      });

      await ownerCaller.subscription.cancel({ id: row.id });

      expect(actionsMocks.cancelSubscription).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          businessId: business.id,
          subscriptionId: row.id,
          reason: "owner",
        }),
      );

      // Positive control: MANAGER (ownerAdminProcedure) can also cancel.
      const row2 = await createSubscriptionRow(db, business.id, {
        status: "active",
      });
      await managerCaller.subscription.cancel({ id: row2.id });
      expect(actionsMocks.cancelSubscription).toHaveBeenCalledTimes(2);
    });

    it("is closed to STAFF", async () => {
      const { business, staffCaller } = await setupBusiness({
        subdomain: "sub-admin-cancel-staff",
      });
      const { db } = await import("../helpers/db");
      const row = await createSubscriptionRow(db, business.id);

      await expect(
        staffCaller.subscription.cancel({ id: row.id }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Not a business member",
      });
      expect(actionsMocks.cancelSubscription).not.toHaveBeenCalled();
    });
  });

  describe("admin: pause / resume / syncNow (gated writes)", () => {
    it("pause and resume are FORBIDDEN with the flag off, and succeed once it's on", async () => {
      const { business, ownerCaller } = await setupBusiness({
        subdomain: "sub-admin-pause",
        featureFlags: { subscriptions: false },
      });
      const { db } = await import("../helpers/db");
      const row = await createSubscriptionRow(db, business.id, {
        status: "paused",
      });

      await expect(
        ownerCaller.subscription.pause({ id: row.id }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: containsText("Settings"),
      });
      await expect(
        ownerCaller.subscription.resume({ id: row.id }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      await db.business.update({
        where: { id: business.id },
        data: { featureFlags: { subscriptions: true } },
      });

      await ownerCaller.subscription.pause({ id: row.id });
      expect(actionsMocks.pauseSubscription).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          businessId: business.id,
          subscriptionId: row.id,
        }),
      );
      await ownerCaller.subscription.resume({ id: row.id });
      expect(actionsMocks.resumeSubscription).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          businessId: business.id,
          subscriptionId: row.id,
        }),
      );
    });

    it("syncNow is FORBIDDEN with the flag off, and calls syncSubscriptions({businessId, ignoreInterval:true}) once it's on", async () => {
      const { business, ownerCaller } = await setupBusiness({
        subdomain: "sub-admin-syncnow",
        featureFlags: { subscriptions: false },
      });

      await expect(ownerCaller.subscription.syncNow()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });

      const { db } = await import("../helpers/db");
      await db.business.update({
        where: { id: business.id },
        data: { featureFlags: { subscriptions: true } },
      });

      await ownerCaller.subscription.syncNow();
      expect(syncMocks.syncSubscriptions).toHaveBeenCalledWith(
        expect.anything(),
        { businessId: business.id, ignoreInterval: true },
      );
    });
  });

  it("every tier answers a null session with UNAUTHORIZED on the admin procedures", async () => {
    await setupBusiness({ subdomain: "sub-admin-anon" });
    const anon = createTestCaller({});

    await expect(anon.subscription.list({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(
      anon.subscription.cancel({ id: "nonexistent" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
