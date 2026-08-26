// RED-phase (test-first) file: `~/lib/subscriptions/sync`,
// `~/lib/subscriptions/webhook`, and `~/lib/subscriptions/order-from-invoice`
// don't exist yet — every `await import(...)` below fails to resolve until
// the GREEN implementer creates them, and typescript-eslint's typed rules
// can't check a file with unresolvable imports. Scoped disable is
// intentional for this RED file per the plan's execution rules (§ "Running");
// remove it once the module exists and the file typechecks normally.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SubscriptionInvoiceParams } from "~/lib/subscriptions/order-from-invoice";
import type { DbClient } from "~/server/db";

import { resetDb } from "../helpers/db";
import { createBusiness } from "../helpers/factories";

/**
 * RED (test-first) coverage for `syncSubscriptions` (`src/lib/subscriptions/sync.ts`,
 * §9 of the plan) — the module does not exist yet, so importing it below makes
 * this whole file fail at module-resolution time. That is the expected RED
 * failure; once the GREEN implementer creates the module, these tests exercise
 * its real behavior.
 *
 * Mirrors the shape of `src/lib/quickbooks/sync.ts` (the cron-module
 * precedent named in the plan): one indexed SELECT, per-business isolation,
 * `lastSyncedAt` stamped only on success, an injectable `now` for determinism.
 *
 * Mocked dependencies:
 *  - `~/lib/stripe/client` — `stripeClient.subscriptions.retrieve`. No real
 *    Stripe call is ever made.
 *  - `~/lib/subscriptions/webhook` — `applyStripeSubscriptionState`. This
 *    module doesn't exist yet either; its own behavior (status/period/pause
 *    derivation) is covered by the Phase 2a webhook test file, not here. This
 *    file only asserts sync.ts CALLS it with the right (row, stripeSub) pair.
 *  - `~/lib/subscriptions/order-from-invoice` — `processPaidInvoice`. Also
 *    Phase 2a's responsibility; this file only asserts sync.ts invokes it
 *    exactly when `latest_invoice.status === "paid"` and no Order already
 *    carries that `stripeInvoiceId` (the missed-webhook self-heal path).
 *  - `@sentry/nextjs` — `captureException`, so the per-row error-isolation
 *    tags can be asserted without a real Sentry transport.
 *
 * PINNED INTERPRETATIONS (the plan's prose left these ambiguous — flagged in
 * the final report for the GREEN implementer to confirm or push back on):
 *
 *  1. The `Promise<number>` return value counts only rows that were
 *     successfully synced against Stripe (a `subscriptions.retrieve` call
 *     that did not throw, after which `lastSyncedAt` is stamped) — mirroring
 *     `syncQuickBooksInvoices`, where administrative housekeeping (there,
 *     realm-mismatch stamps; here, the stale-`incomplete` delete) is NOT
 *     counted, and a row that errored is NOT counted either.
 *  2. "incomplete older than 25h" is measured from `Subscription.createdAt`
 *     (there is no better candidate timestamp — the row has no
 *     `stripeSubscriptionId` yet, so it was never synced and `lastSyncedAt`
 *     is always null for it).
 *
 * NOT tested here (left for the GREEN implementer / a follow-up): a selected
 * `incomplete` row younger than 25h that ALSO has a null `stripeSubscriptionId`
 * — the plan's "otherwise → `subscriptions.retrieve(stripeSubscriptionId, ...)`"
 * branch doesn't say what happens when that id is null and the row isn't old
 * enough to delete yet. Calling Stripe's `retrieve` with a null id makes no
 * sense, so this is a real gap in the spec, not an oversight here.
 */

const NOW = new Date("2026-08-25T12:00:00.000Z");
function hoursAgo(h: number): Date {
  return new Date(NOW.getTime() - h * 60 * 60 * 1000);
}

let seq = 0;
function uniq(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${seq++}`;
}

/**
 * Typed wrapper around `expect.objectContaining` for use as a NESTED object
 * property value (e.g. `tags: matchesObject({...})` inside an outer
 * `expect.objectContaining({...})`). Vitest's own types declare
 * `objectContaining: <T = any>(expected: DeeplyAllowMatchers<T>) => any`,
 * which trips `@typescript-eslint/no-unsafe-assignment` once the result
 * becomes a property value rather than a bare call argument. The runtime
 * value is unchanged — still the real asymmetric matcher — only the
 * compile-time type is corrected here.
 */
function matchesObject<T extends object>(expected: T): T {
  return expect.objectContaining(
    expected as Record<string, unknown>,
  ) as unknown as T;
}

/**
 * Typed so `.mock.calls[i][0]` etc. read as `string`/known shapes rather than
 * `any` — a plain untyped `vi.fn()` here made every read of `.mock.calls`
 * trip `@typescript-eslint/no-unsafe-return`/`no-unsafe-assignment`. `params`
 * and `options` stay `unknown`: this file never inspects them, only the
 * literal values it itself passed in via `toHaveBeenCalledWith`.
 */
type StripeSubscriptionsRetrieve = (
  id: string,
  params?: unknown,
  options?: unknown,
) => Promise<unknown>;

const stripeMocks = vi.hoisted(() => ({
  subscriptionsRetrieve: vi.fn<StripeSubscriptionsRetrieve>(),
}));
vi.mock("~/lib/stripe/client", () => ({
  stripeClient: {
    subscriptions: {
      retrieve: (
        ...args: Parameters<typeof stripeMocks.subscriptionsRetrieve>
      ): ReturnType<typeof stripeMocks.subscriptionsRetrieve> =>
        stripeMocks.subscriptionsRetrieve(...args),
    },
  },
}));

const webhookMocks = vi.hoisted(() => ({
  applyStripeSubscriptionState: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("~/lib/subscriptions/webhook", () => ({
  applyStripeSubscriptionState: (...args: unknown[]): unknown =>
    webhookMocks.applyStripeSubscriptionState(...args),
}));

/**
 * Typed with the module's real `SubscriptionInvoiceParams` so the self-heal
 * test below can read `.mock.calls[0][1]` fields directly instead of
 * `JSON.stringify`-ing a call whose first argument is now the live Prisma
 * client (circular structure).
 */
type ProcessPaidInvoice = (
  db: unknown,
  params: SubscriptionInvoiceParams,
) => Promise<unknown>;

const orderFromInvoiceMocks = vi.hoisted(() => ({
  processPaidInvoice: vi.fn<ProcessPaidInvoice>().mockResolvedValue(undefined),
}));
vi.mock("~/lib/subscriptions/order-from-invoice", () => ({
  processPaidInvoice: (
    ...args: Parameters<typeof orderFromInvoiceMocks.processPaidInvoice>
  ): ReturnType<typeof orderFromInvoiceMocks.processPaidInvoice> =>
    orderFromInvoiceMocks.processPaidInvoice(...args),
}));

const sentryMocks = vi.hoisted(() => ({
  captureException: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]): unknown =>
    sentryMocks.captureException(...args),
}));

function fakeStripeSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: overrides.id ?? "sub_fake",
    status: "active",
    pause_collection: null,
    items: {
      data: [
        {
          current_period_start: Math.floor(NOW.getTime() / 1000),
          current_period_end: Math.floor(NOW.getTime() / 1000) + 2_592_000,
        },
      ],
    },
    latest_invoice: null,
    ...overrides,
  };
}

/** Direct DB insert — `tests/helpers/factories.ts` has no Subscription factory yet. */
async function createSubscriptionRow(
  db: DbClient,
  businessId: string,
  opts: {
    status?: string;
    stripeSubscriptionId?: string | null;
    lastSyncedAt?: Date | null;
    createdAt?: Date;
    customerEmail?: string;
  } = {},
) {
  return db.subscription.create({
    data: {
      businessId,
      customerEmail: opts.customerEmail ?? "sub-cust@test.dev",
      productName: "Test Product",
      quantity: 1,
      intervalKey: "month:1",
      interval: "month",
      intervalCount: 1,
      listPriceCents: 1000,
      unitAmountCents: 1000,
      status: opts.status ?? "active",
      stripeSubscriptionId:
        opts.stripeSubscriptionId === undefined
          ? uniq("sub")
          : opts.stripeSubscriptionId,
      lastSyncedAt: opts.lastSyncedAt === undefined ? null : opts.lastSyncedAt,
      ...(opts.createdAt !== undefined ? { createdAt: opts.createdAt } : {}),
    },
  });
}

async function createStripeConnectedBusiness(
  opts: {
    subdomain?: string;
    featureFlags?: Record<string, boolean>;
  } = {},
) {
  const business = await createBusiness({
    subdomain: opts.subdomain,
    ...(opts.featureFlags ? { featureFlags: opts.featureFlags } : {}),
  });
  const { db } = await import("../helpers/db");
  return db.business.update({
    where: { id: business.id },
    data: { stripeAccountId: uniq("acct") },
  });
}

describe("syncSubscriptions (src/lib/subscriptions/sync.ts)", () => {
  beforeEach(async () => {
    await resetDb();
    stripeMocks.subscriptionsRetrieve.mockReset();
    webhookMocks.applyStripeSubscriptionState.mockClear();
    orderFromInvoiceMocks.processPaidInvoice.mockClear();
    sentryMocks.captureException.mockClear();
  });

  it("returns 0 and makes zero Stripe calls when nothing qualifies", async () => {
    const { syncSubscriptions } = await import("~/lib/subscriptions/sync");
    const { db } = await import("../helpers/db");
    await createStripeConnectedBusiness({ subdomain: "sync-empty" });

    const result = await syncSubscriptions(db, { now: NOW });

    expect(result).toBe(0);
    expect(stripeMocks.subscriptionsRetrieve).not.toHaveBeenCalled();
  });

  it("skips businesses without a stripeAccountId — the row is left untouched", async () => {
    const { syncSubscriptions } = await import("~/lib/subscriptions/sync");
    const { db } = await import("../helpers/db");
    // No stripeAccountId set — createBusiness() leaves it null by default.
    const business = await createBusiness({ subdomain: "sync-no-stripe" });
    const row = await createSubscriptionRow(db, business.id, {
      status: "active",
      lastSyncedAt: null,
    });

    const result = await syncSubscriptions(db, { now: NOW });

    expect(result).toBe(0);
    expect(stripeMocks.subscriptionsRetrieve).not.toHaveBeenCalled();
    const untouched = await db.subscription.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(untouched.lastSyncedAt).toBeNull();
  });

  it("does NOT consult the subscriptions feature flag — a flag-off business is still synced", async () => {
    const { syncSubscriptions } = await import("~/lib/subscriptions/sync");
    const { db } = await import("../helpers/db");
    const business = await createStripeConnectedBusiness({
      subdomain: "sync-flag-off",
      featureFlags: { subscriptions: false },
    });
    const row = await createSubscriptionRow(db, business.id, {
      status: "active",
      lastSyncedAt: null,
    });
    stripeMocks.subscriptionsRetrieve.mockResolvedValue(
      fakeStripeSubscription({ id: row.stripeSubscriptionId }),
    );

    const result = await syncSubscriptions(db, { now: NOW });

    expect(stripeMocks.subscriptionsRetrieve).toHaveBeenCalledTimes(1);
    expect(result).toBe(1);
  });

  it("processes a fresh eligible row: calls Stripe with the right args, applies state, stamps lastSyncedAt", async () => {
    const { syncSubscriptions } = await import("~/lib/subscriptions/sync");
    const { db } = await import("../helpers/db");
    const business = await createStripeConnectedBusiness({
      subdomain: "sync-happy",
    });
    const row = await createSubscriptionRow(db, business.id, {
      status: "active",
      lastSyncedAt: null,
    });
    const fakeSub = fakeStripeSubscription({ id: row.stripeSubscriptionId });
    stripeMocks.subscriptionsRetrieve.mockResolvedValue(fakeSub);

    const result = await syncSubscriptions(db, { now: NOW });

    expect(result).toBe(1);
    expect(stripeMocks.subscriptionsRetrieve).toHaveBeenCalledWith(
      row.stripeSubscriptionId,
      { expand: ["latest_invoice", "latest_invoice.payments"] },
      { stripeAccount: business.stripeAccountId },
    );
    expect(webhookMocks.applyStripeSubscriptionState).toHaveBeenCalledTimes(1);
    expect(webhookMocks.applyStripeSubscriptionState).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: row.id }),
      fakeSub,
    );

    const updated = await db.subscription.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(updated.lastSyncedAt).not.toBeNull();
  });

  it("orders the sweep by lastSyncedAt ascending, nulls first, and skips a fresh (< 6h) row", async () => {
    const { syncSubscriptions } = await import("~/lib/subscriptions/sync");
    const { db } = await import("../helpers/db");
    const business = await createStripeConnectedBusiness({
      subdomain: "sync-order",
    });
    const rowFresh = await createSubscriptionRow(db, business.id, {
      status: "active",
      lastSyncedAt: hoursAgo(1), // < 6h — must be excluded
    });
    const rowOld = await createSubscriptionRow(db, business.id, {
      status: "active",
      lastSyncedAt: hoursAgo(7), // > 6h — eligible, second in order
    });
    const rowNull = await createSubscriptionRow(db, business.id, {
      status: "active",
      lastSyncedAt: null, // never synced — eligible, first in order
    });
    stripeMocks.subscriptionsRetrieve.mockImplementation(async (id: string) =>
      fakeStripeSubscription({ id }),
    );

    const result = await syncSubscriptions(db, { now: NOW });

    expect(result).toBe(2);
    const calledIds = stripeMocks.subscriptionsRetrieve.mock.calls.map(
      (call) => call[0],
    );
    expect(calledIds).toEqual([
      rowNull.stripeSubscriptionId,
      rowOld.stripeSubscriptionId,
    ]);
    expect(calledIds).not.toContain(rowFresh.stripeSubscriptionId);
  });

  it("respects the businessId option — only that business's rows are processed", async () => {
    const { syncSubscriptions } = await import("~/lib/subscriptions/sync");
    const { db } = await import("../helpers/db");
    const businessA = await createStripeConnectedBusiness({
      subdomain: "sync-biz-a",
    });
    const businessB = await createStripeConnectedBusiness({
      subdomain: "sync-biz-b",
    });
    const rowA = await createSubscriptionRow(db, businessA.id, {
      status: "active",
      lastSyncedAt: null,
    });
    await createSubscriptionRow(db, businessB.id, {
      status: "active",
      lastSyncedAt: null,
    });
    stripeMocks.subscriptionsRetrieve.mockImplementation(async (id: string) =>
      fakeStripeSubscription({ id }),
    );

    const result = await syncSubscriptions(db, {
      now: NOW,
      businessId: businessA.id,
    });

    expect(result).toBe(1);
    expect(stripeMocks.subscriptionsRetrieve).toHaveBeenCalledTimes(1);
    expect(stripeMocks.subscriptionsRetrieve).toHaveBeenCalledWith(
      rowA.stripeSubscriptionId,
      expect.anything(),
      expect.anything(),
    );
  });

  it("ignoreInterval bypasses the freshness throttle but not the flag/connection checks", async () => {
    const { syncSubscriptions } = await import("~/lib/subscriptions/sync");
    const { db } = await import("../helpers/db");
    const business = await createStripeConnectedBusiness({
      subdomain: "sync-ignore-interval",
    });
    const row = await createSubscriptionRow(db, business.id, {
      status: "active",
      lastSyncedAt: hoursAgo(1), // fresh — normally excluded
    });
    stripeMocks.subscriptionsRetrieve.mockResolvedValue(
      fakeStripeSubscription({ id: row.stripeSubscriptionId }),
    );

    const skipped = await syncSubscriptions(db, { now: NOW });
    expect(skipped).toBe(0);
    expect(stripeMocks.subscriptionsRetrieve).not.toHaveBeenCalled();

    const forced = await syncSubscriptions(db, {
      now: NOW,
      ignoreInterval: true,
    });
    expect(forced).toBe(1);
    expect(stripeMocks.subscriptionsRetrieve).toHaveBeenCalledTimes(1);
  });

  it("deletes a stale incomplete row (>25h old, no stripeSubscriptionId) without calling Stripe", async () => {
    const { syncSubscriptions } = await import("~/lib/subscriptions/sync");
    const { db } = await import("../helpers/db");
    const business = await createStripeConnectedBusiness({
      subdomain: "sync-stale-incomplete",
    });
    const row = await createSubscriptionRow(db, business.id, {
      status: "incomplete",
      stripeSubscriptionId: null,
      lastSyncedAt: null,
      createdAt: hoursAgo(26),
    });

    await syncSubscriptions(db, { now: NOW });

    expect(stripeMocks.subscriptionsRetrieve).not.toHaveBeenCalled();
    const gone = await db.subscription.findUnique({ where: { id: row.id } });
    expect(gone).toBeNull();
  });

  it("isolates a per-row Stripe error: reports to Sentry, does not stop other rows, leaves lastSyncedAt unchanged on the failed row", async () => {
    const { syncSubscriptions } = await import("~/lib/subscriptions/sync");
    const { db } = await import("../helpers/db");
    const business = await createStripeConnectedBusiness({
      subdomain: "sync-error-isolation",
    });
    const bad = await createSubscriptionRow(db, business.id, {
      status: "active",
      lastSyncedAt: null,
    });
    const good = await createSubscriptionRow(db, business.id, {
      status: "past_due",
      lastSyncedAt: null,
    });
    stripeMocks.subscriptionsRetrieve.mockImplementation(async (id: string) => {
      if (id === bad.stripeSubscriptionId) {
        throw new Error("stripe blew up");
      }
      return fakeStripeSubscription({ id });
    });

    const result = await syncSubscriptions(db, { now: NOW });

    // Only the good row counts — see the file's "PINNED INTERPRETATIONS" note.
    expect(result).toBe(1);
    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
    expect(sentryMocks.captureException).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tags: matchesObject({
          "cron.job": "subscription-sync",
          service: "stripe",
          businessId: business.id,
        }),
      }),
    );

    const badRow = await db.subscription.findUniqueOrThrow({
      where: { id: bad.id },
    });
    expect(badRow.lastSyncedAt).toBeNull();

    const goodRow = await db.subscription.findUniqueOrThrow({
      where: { id: good.id },
    });
    expect(goodRow.lastSyncedAt).not.toBeNull();
  });

  // ── missed-webhook self-heal ───────────────────────────────────────────

  it("self-heals a missed invoice.paid webhook: calls processPaidInvoice when latest_invoice is paid and no Order carries that stripeInvoiceId", async () => {
    const { syncSubscriptions } = await import("~/lib/subscriptions/sync");
    const { db } = await import("../helpers/db");
    const business = await createStripeConnectedBusiness({
      subdomain: "sync-self-heal",
    });
    const row = await createSubscriptionRow(db, business.id, {
      status: "active",
      lastSyncedAt: null,
    });
    const invoiceId = uniq("in_selfheal");
    stripeMocks.subscriptionsRetrieve.mockResolvedValue(
      fakeStripeSubscription({
        id: row.stripeSubscriptionId,
        latest_invoice: { id: invoiceId, status: "paid" },
      }),
    );

    await syncSubscriptions(db, { now: NOW });

    expect(orderFromInvoiceMocks.processPaidInvoice).toHaveBeenCalledTimes(1);
    // Inspect the real call args instead of JSON.stringify-ing them — the
    // first argument is now the live Prisma client, and stringifying it
    // throws ("Converting circular structure to JSON"). Loosely shaped: the
    // exact param names belong to Phase 2a's order-from-invoice.test.ts, not
    // this file — just prove the right business and invoice were referenced.
    const [, params] = orderFromInvoiceMocks.processPaidInvoice.mock.calls[0]!;
    expect(params.business.id).toBe(business.id);
    expect(params.invoice.id).toBe(invoiceId);
  });

  it("forwards the PaymentIntent id when self-healing, so the healed Order is refundable", async () => {
    // `stripePaymentIntentId` is what `order.refund` issues a refund against.
    // The invoice's `payments` list only exists when it was EXPANDED on the
    // way in, so a sync that expands `latest_invoice` alone would create an
    // order the owner can never refund from the admin screen.
    const { syncSubscriptions } = await import("~/lib/subscriptions/sync");
    const { db } = await import("../helpers/db");
    const business = await createStripeConnectedBusiness({
      subdomain: "sync-heal-pi",
    });
    const row = await createSubscriptionRow(db, business.id, {
      status: "active",
      lastSyncedAt: null,
    });
    const invoiceId = uniq("in_healpi");
    stripeMocks.subscriptionsRetrieve.mockResolvedValue(
      fakeStripeSubscription({
        id: row.stripeSubscriptionId,
        latest_invoice: {
          id: invoiceId,
          status: "paid",
          payments: {
            data: [
              {
                payment: {
                  type: "payment_intent",
                  payment_intent: "pi_healed_1",
                },
              },
            ],
          },
        },
      }),
    );

    await syncSubscriptions(db, { now: NOW });

    expect(orderFromInvoiceMocks.processPaidInvoice).toHaveBeenCalledTimes(1);
    const [, params] = orderFromInvoiceMocks.processPaidInvoice.mock.calls[0]!;
    expect(params.paymentIntentId).toBe("pi_healed_1");
  });

  it("does not call processPaidInvoice when an Order already exists for that invoice (idempotent)", async () => {
    const { syncSubscriptions } = await import("~/lib/subscriptions/sync");
    const { db } = await import("../helpers/db");
    const business = await createStripeConnectedBusiness({
      subdomain: "sync-already-order",
    });
    const row = await createSubscriptionRow(db, business.id, {
      status: "active",
      lastSyncedAt: null,
    });
    const invoiceId = uniq("in_already");
    await db.order.create({
      data: {
        orderNumber: 900_000 + seq++,
        businessId: business.id,
        customerEmail: "buyer@test.dev",
        subtotal: 1000,
        total: 1000,
        stripeInvoiceId: invoiceId,
        subscriptionId: row.id,
      },
    });
    stripeMocks.subscriptionsRetrieve.mockResolvedValue(
      fakeStripeSubscription({
        id: row.stripeSubscriptionId,
        latest_invoice: { id: invoiceId, status: "paid" },
      }),
    );

    const result = await syncSubscriptions(db, { now: NOW });

    expect(result).toBe(1);
    expect(orderFromInvoiceMocks.processPaidInvoice).not.toHaveBeenCalled();
    // State sync (status/periods) still happens even when the order half is
    // a no-op.
    expect(webhookMocks.applyStripeSubscriptionState).toHaveBeenCalledTimes(1);
  });

  it("does not call processPaidInvoice when the latest invoice is not paid", async () => {
    const { syncSubscriptions } = await import("~/lib/subscriptions/sync");
    const { db } = await import("../helpers/db");
    const business = await createStripeConnectedBusiness({
      subdomain: "sync-invoice-open",
    });
    const row = await createSubscriptionRow(db, business.id, {
      status: "active",
      lastSyncedAt: null,
    });
    stripeMocks.subscriptionsRetrieve.mockResolvedValue(
      fakeStripeSubscription({
        id: row.stripeSubscriptionId,
        latest_invoice: { id: uniq("in_open"), status: "open" },
      }),
    );

    await syncSubscriptions(db, { now: NOW });

    expect(orderFromInvoiceMocks.processPaidInvoice).not.toHaveBeenCalled();
  });

  // ── cron registration ───────────────────────────────────────────────────

  it("is registered in the cron JOBS array as subscriptionSync / subscription-sync", () => {
    // `JOBS` in src/app/api/cron/route.ts is a module-private const — not
    // exported, and no existing test drives it through the route handler
    // (grepped tests/ for "JOBS" and cron-route imports: no precedent), so
    // there is nothing to call here. This is a structural source check
    // instead — it starts passing the moment the job entry lands, and would
    // start failing again if the key/name/import were ever renamed apart
    // from each other. See the plan's fallback instruction for this case.
    const source = readFileSync(
      join(process.cwd(), "src/app/api/cron/route.ts"),
      "utf-8",
    );
    expect(source).toMatch(
      /import\s*\{\s*syncSubscriptions\s*\}\s*from\s*["']~\/lib\/subscriptions\/sync["']/,
    );
    expect(source).toMatch(/key:\s*["']subscriptionSync["']/);
    expect(source).toMatch(/name:\s*["']subscription-sync["']/);
  });
});
