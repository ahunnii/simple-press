import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CardData, StatCardData } from "~/lib/dashboard/card-data";
import type { DashboardLayout } from "~/lib/dashboard/layout-schema";
import { zonedDayKey } from "~/lib/dashboard/buckets";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  MAX_DASHBOARD_CARDS,
} from "~/lib/dashboard/layout-schema";
import { getWidget, WIDGET_IDS } from "~/lib/dashboard/widgets";
import { financeOrderScope } from "~/lib/finance/order-scope";
import { summarizeOrderMoney } from "~/lib/orders/order-money";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBaseInventoryUnit,
  createBusiness,
  createDonation,
  createOrder,
  createOwnerUser,
  createProduct,
  createUser,
} from "../helpers/factories";

// Procedures resolve the tenant from the request host via `next/headers` — see
// tenant-isolation.test.ts for the reference pattern.
const reqHost = vi.hoisted(() => ({ value: "dash-biz.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

/**
 * The dashboard and Finances both resolve windows in the STORE's zone. Pin the
 * test store to the runner's zone so the local-noon fixtures below land on
 * the store-local day they name. (finance-breakdown.test.ts covers a store
 * whose zone differs from the runner's.)
 */
const RUNNER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Local noon `n` days ago: solidly inside a day for both zone conventions. */
function localNoonDaysAgo(n: number): Date {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  d.setDate(d.getDate() - n);
  return d;
}

function layoutOf(...cards: DashboardLayout["cards"]): DashboardLayout {
  return { version: 1, cards };
}

function expectStat(data: CardData): StatCardData {
  expect(data.kind).toBe("stat");
  return data as StatCardData;
}

async function expectForbidden(promise: Promise<unknown>) {
  await expect(promise).rejects.toMatchObject({ code: "FORBIDDEN" });
}

describe("dashboard router", () => {
  beforeEach(async () => {
    await resetDb();
  });

  async function setup(
    featureFlags: Record<string, boolean> = { orders: true, donations: true },
  ) {
    const business = await createBusiness({
      featureFlags,
      timeZone: RUNNER_TZ,
    });
    reqHost.value = `${business.subdomain}.simplepress.test`;
    const owner = await createOwnerUser(business.id);
    const manager = await createOwnerUser(business.id, { role: "MANAGER" });
    const staff = await createOwnerUser(business.id, { role: "STAFF" });
    return {
      business,
      owner,
      manager,
      staff,
      ownerCaller: createTestCaller({ userId: owner.id }),
      managerCaller: createTestCaller({ userId: manager.id }),
      staffCaller: createTestCaller({ userId: staff.id }),
    };
  }

  describe("layouts", () => {
    it("never-customized members get the default layout and can edit", async () => {
      const { ownerCaller } = await setup();
      const result = await ownerCaller.dashboard.getLayout();
      expect(result.usedDefault).toBe(true);
      expect(result.canEdit).toBe(true);
      expect(result.layout).toEqual(DEFAULT_DASHBOARD_LAYOUT);
      expect(result.availableWidgetIds).toContain("net-revenue");
      expect(result.availableWidgetIds).not.toContain("invoices-overdue");
      // Default cards whose feature is off are hidden, not dropped.
      const available = new Set<string>(result.availableWidgetIds);
      expect(result.hiddenCards).toEqual(
        DEFAULT_DASHBOARD_LAYOUT.cards.filter((c) => !available.has(c.widget)),
      );
      expect(result.visibleCards.map((c) => c.widget)).toContain("net-revenue");
    }, 30_000);

    it("owner and manager keep separate layouts", async () => {
      const { ownerCaller, managerCaller } = await setup();
      const ownerLayout = layoutOf({
        id: "o1",
        widget: "net-revenue",
        size: "1x1",
        range: "week",
      });
      const managerLayout = layoutOf(
        { id: "m1", widget: "order-count", size: "2x1", range: "month" },
        { id: "m2", widget: "donations-total", size: "1x1" },
      );

      await ownerCaller.dashboard.saveLayout(ownerLayout);
      await managerCaller.dashboard.saveLayout(managerLayout);

      const owner = await ownerCaller.dashboard.getLayout();
      const manager = await managerCaller.dashboard.getLayout();
      expect(owner.usedDefault).toBe(false);
      expect(owner.layout.cards.map((c) => c.id)).toEqual(["o1"]);
      expect(manager.layout.cards.map((c) => c.id)).toEqual(["m1", "m2"]);
      expect(manager.layout.cards[0]).toMatchObject({
        widget: "order-count",
        size: "2x1",
        range: "month",
      });
    }, 30_000);

    it("STAFF is forbidden on every procedure (with a positive control)", async () => {
      const { ownerCaller, staffCaller } = await setup();
      await expect(ownerCaller.dashboard.getLayout()).resolves.toBeDefined();

      await expectForbidden(staffCaller.dashboard.getLayout());
      await expectForbidden(staffCaller.dashboard.saveLayout(layoutOf()));
      await expectForbidden(staffCaller.dashboard.resetLayout());
      await expectForbidden(
        staffCaller.dashboard.cardData({
          widget: "order-count",
          range: "30d",
          compare: false,
          series: false,
        }),
      );
    }, 30_000);

    it("a platform admin without a membership reads the default, cannot edit or save", async () => {
      const { business } = await setup();
      const admin = await createUser({ platformRole: "PLATFORM_ADMIN" });
      const adminCaller = createTestCaller({
        userId: admin.id,
        platformRole: "PLATFORM_ADMIN",
      });

      const result = await adminCaller.dashboard.getLayout();
      expect(result.canEdit).toBe(false);
      expect(result.usedDefault).toBe(true);

      await expectForbidden(
        adminCaller.dashboard.saveLayout(
          layoutOf({ id: "x", widget: "net-revenue", size: "1x1" }),
        ),
      );
      await expectForbidden(adminCaller.dashboard.resetLayout());

      // Cards still load for them.
      const card = await adminCaller.dashboard.cardData({
        widget: "order-count",
        range: "30d",
        compare: false,
        series: false,
      });
      expect(card.kind).toBe("stat");
      expect(
        await db.businessMembership.count({
          where: { businessId: business.id, userId: admin.id },
        }),
      ).toBe(0);
    }, 30_000);

    it("re-attaches stored cards hidden by a feature that is off, and restores them when it returns", async () => {
      const { business, ownerCaller } = await setup();
      await ownerCaller.dashboard.saveLayout(
        layoutOf(
          { id: "a", widget: "net-revenue", size: "1x1" },
          { id: "d", widget: "donations-total", size: "1x1", range: "year" },
        ),
      );

      await db.business.update({
        where: { id: business.id },
        data: { featureFlags: { orders: true, donations: false } },
      });

      const hidden = await ownerCaller.dashboard.getLayout();
      expect(hidden.visibleCards.map((c) => c.id)).toEqual(["a"]);
      expect(hidden.hiddenCards.map((c) => c.id)).toEqual(["d"]);

      // The editor only sees "a"; it adds "b" and saves.
      const saved = await ownerCaller.dashboard.saveLayout(
        layoutOf(
          { id: "a", widget: "net-revenue", size: "1x1" },
          { id: "b", widget: "order-count", size: "1x1" },
        ),
      );
      expect(saved.layout.cards.map((c) => c.id)).toEqual(["a", "b", "d"]);
      expect(saved.layout.cards[2]).toMatchObject({ range: "year" });

      await db.business.update({
        where: { id: business.id },
        data: { featureFlags: { orders: true, donations: true } },
      });
      const restored = await ownerCaller.dashboard.getLayout();
      expect(restored.visibleCards.map((c) => c.id)).toEqual(["a", "b", "d"]);
      expect(restored.hiddenCards).toEqual([]);
    }, 30_000);

    it("rejects a save that would exceed the cap once hidden cards are re-attached", async () => {
      const { business, ownerCaller } = await setup();
      await ownerCaller.dashboard.saveLayout(
        layoutOf({ id: "d", widget: "donations-total", size: "1x1" }),
      );
      await db.business.update({
        where: { id: business.id },
        data: { featureFlags: { orders: true, donations: false } },
      });

      const full = layoutOf(
        ...Array.from({ length: MAX_DASHBOARD_CARDS }, (_, i) => ({
          id: `c${i}`,
          widget: "order-count" as const,
          size: "1x1" as const,
        })),
      );
      const err = await ownerCaller.dashboard
        .saveLayout(full)
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("BAD_REQUEST");
      expect((err as TRPCError).message).toMatch(/up to 24 cards/);
    }, 30_000);

    it("a never-customized member's first save keeps the default's feature-off cards", async () => {
      // Products off (and orders with it, by dependency) hides every default
      // card; getLayout reports them hidden and the editor promises they
      // come back, so the first save must keep them.
      const { business, ownerCaller } = await setup({
        products: false,
        inventory: false,
        donations: true,
      });
      const before = await ownerCaller.dashboard.getLayout();
      expect(before.usedDefault).toBe(true);
      const defaultIds = DEFAULT_DASHBOARD_LAYOUT.cards.map((c) => c.id);
      expect(before.hiddenCards.map((c) => c.id)).toEqual(defaultIds);
      expect(before.visibleCards).toEqual([]);

      const saved = await ownerCaller.dashboard.saveLayout(
        layoutOf({ id: "d1", widget: "donations-total", size: "1x1" }),
      );
      expect(saved.layout.cards.map((c) => c.id)).toEqual([
        "d1",
        ...defaultIds,
      ]);
      expect(saved.layout.cards.slice(1)).toEqual(
        DEFAULT_DASHBOARD_LAYOUT.cards,
      );

      await db.business.update({
        where: { id: business.id },
        data: { featureFlags: { donations: true } },
      });
      const restored = await ownerCaller.dashboard.getLayout();
      expect(restored.usedDefault).toBe(false);
      expect(restored.hiddenCards).toEqual([]);
      expect(restored.visibleCards.map((c) => c.id)).toEqual([
        "d1",
        ...defaultIds,
      ]);
    }, 30_000);

    it("a never-customized member's hidden default cards count toward the cap", async () => {
      const { ownerCaller } = await setup({
        products: false,
        inventory: false,
        donations: true,
      });
      const hiddenCount = DEFAULT_DASHBOARD_LAYOUT.cards.length;
      const cardsOf = (n: number) =>
        layoutOf(
          ...Array.from({ length: n }, (_, i) => ({
            id: `c${i}`,
            widget: "donations-total" as const,
            size: "1x1" as const,
          })),
        );

      const err = await ownerCaller.dashboard
        .saveLayout(cardsOf(MAX_DASHBOARD_CARDS - hiddenCount + 1))
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("BAD_REQUEST");
      expect((err as TRPCError).message).toContain(
        `${hiddenCount} saved cards are hidden`,
      );

      const ok = await ownerCaller.dashboard.saveLayout(
        cardsOf(MAX_DASHBOARD_CARDS - hiddenCount),
      );
      expect(ok.layout.cards).toHaveLength(MAX_DASHBOARD_CARDS);
    }, 30_000);

    it("rejects invalid payloads (unknown widget, bad size)", async () => {
      const { ownerCaller } = await setup();
      await expect(
        ownerCaller.dashboard.saveLayout({
          version: 1,
          cards: [{ id: "x", widget: "nope", size: "1x1" }],
        } as never),
      ).rejects.toBeDefined();
      await expect(
        ownerCaller.dashboard.saveLayout(
          layoutOf({ id: "x", widget: "net-revenue", size: "4x2" }),
        ),
      ).rejects.toBeDefined();
    }, 30_000);

    it("reset writes SQL NULL and returns the default", async () => {
      const { owner, business, ownerCaller } = await setup();
      await ownerCaller.dashboard.saveLayout(
        layoutOf({ id: "a", widget: "net-revenue", size: "1x1" }),
      );

      const reset = await ownerCaller.dashboard.resetLayout();
      expect(reset.layout).toEqual(DEFAULT_DASHBOARD_LAYOUT);

      const rows = await db.$queryRaw<Array<{ isNull: boolean }>>`
        SELECT "dashboardLayout" IS NULL AS "isNull"
        FROM "BusinessMembership"
        WHERE "userId" = ${owner.id} AND "businessId" = ${business.id}
      `;
      expect(rows[0]?.isNull).toBe(true);
      expect((await ownerCaller.dashboard.getLayout()).usedDefault).toBe(true);
    }, 30_000);
  });

  describe("cardData", () => {
    it("returns unavailable (feature-off) when the widget's flag is off", async () => {
      const { ownerCaller } = await setup({ orders: true, donations: false });
      const data = await ownerCaller.dashboard.cardData({
        widget: "donations-total",
        range: "30d",
        compare: false,
        series: false,
      });
      expect(data).toMatchObject({
        kind: "unavailable",
        reason: "feature-off",
      });
    }, 30_000);

    it("net revenue (30d) equals Finances' netCollectedCents, including refunds and cancelled orders", async () => {
      const { business, ownerCaller } = await setup();
      await createOrder(business.id, {
        total: 10000,
        tax: 833,
        shipping: 599,
        refundAmountCents: 3333,
        createdAt: localNoonDaysAgo(2),
      });
      await createOrder(business.id, {
        total: 5000,
        createdAt: localNoonDaysAgo(5),
      });
      await createOrder(business.id, {
        total: 8000,
        paymentStatus: "refunded",
        status: "refunded",
        refundAmountCents: 8000,
        createdAt: localNoonDaysAgo(4),
      });
      await createOrder(business.id, {
        total: 9000,
        status: "cancelled",
        createdAt: localNoonDaysAgo(3),
      });
      await createOrder(business.id, {
        total: 7000,
        paymentStatus: "pending",
        createdAt: localNoonDaysAgo(1),
      });

      const finance = await ownerCaller.finance.getBreakdown({ range: "30d" });
      const net = expectStat(
        await ownerCaller.dashboard.cardData({
          widget: "net-revenue",
          range: "30d",
          compare: false,
          series: false,
        }),
      );
      const gross = expectStat(
        await ownerCaller.dashboard.cardData({
          widget: "gross-revenue",
          range: "30d",
          compare: false,
          series: false,
        }),
      );
      const count = expectStat(
        await ownerCaller.dashboard.cardData({
          widget: "order-count",
          range: "30d",
          compare: false,
          series: false,
        }),
      );

      expect(net.value).toBe(finance.orders.netCollectedCents);
      expect(net.value).toBe(6667 + 5000);
      expect(gross.value).toBe(finance.orders.totalChargedCents);
      expect(count.value).toBe(finance.orders.orderCount);
      expect(count.value).toBe(3);
    }, 30_000);

    it("SQL money totals match summarizeOrderMoney and Finances on edge-case orders", async () => {
      const { business, ownerCaller } = await setup();
      const seed: Array<Parameters<typeof createOrder>[1]> = [
        // Zero and negative totals: charged, but nothing refunded or netted.
        { total: 0, refundAmountCents: 500 },
        { total: -200 },
        // Over-refund: clamps to the total.
        { total: 3000, refundAmountCents: 5000, paymentStatus: "refunded" },
        // Null refund.
        { total: 4200, refundAmountCents: null },
        // Negative stored refund: treated as none.
        { total: 1500, refundAmountCents: -100 },
        // Partial refund with tax and shipping.
        { total: 10001, tax: 833, shipping: 599, refundAmountCents: 3333 },
        // Full refund.
        {
          total: 8000,
          refundAmountCents: 8000,
          paymentStatus: "refunded",
          status: "refunded",
        },
        // Disputed counts.
        { total: 2500, paymentStatus: "disputed" },
        // Out of scope: cancelled, pending, failed.
        { total: 9000, status: "cancelled" },
        { total: 7000, paymentStatus: "pending" },
        { total: 6000, paymentStatus: "failed" },
      ];
      for (const [i, opts] of seed.entries()) {
        await createOrder(business.id, {
          ...opts,
          createdAt: localNoonDaysAgo(1 + (i % 6)),
        });
      }

      const rows = await db.order.findMany({
        where: financeOrderScope(business.id),
        select: {
          total: true,
          tax: true,
          shipping: true,
          discount: true,
          refundAmountCents: true,
          paymentMethod: true,
        },
      });
      const expected = summarizeOrderMoney(rows);
      expect(expected.orderCount).toBe(8);

      const finance = await ownerCaller.finance.getBreakdown({ range: "30d" });
      expect(finance.orders).toEqual(expected);

      for (const range of ["30d", "all"] as const) {
        const ask = (
          widget:
            | "gross-revenue"
            | "net-revenue"
            | "refunds"
            | "order-count"
            | "avg-order-value",
        ) =>
          ownerCaller.dashboard
            .cardData({ widget, range, compare: false, series: true })
            .then(expectStat);

        const gross = await ask("gross-revenue");
        const net = await ask("net-revenue");
        const refunds = await ask("refunds");
        const count = await ask("order-count");
        const aov = await ask("avg-order-value");

        expect(gross.value, range).toBe(expected.totalChargedCents);
        expect(net.value, range).toBe(expected.netCollectedCents);
        expect(net.value, range).toBe(finance.orders.netCollectedCents);
        expect(refunds.value, range).toBe(expected.refundedCents);
        expect(count.value, range).toBe(expected.orderCount);
        expect(aov.value, range).toBe(
          Math.round(expected.netCollectedCents / expected.orderCount),
        );
        // Rows with a positive stored refund (incl. the zero-total one).
        expect(refunds.detail, range).toEqual(["4 orders refunded"]);

        // Bucketed sums add back up to the window totals.
        const total = (stat: StatCardData) =>
          (stat.series ?? []).reduce((sum, p) => sum + p.value, 0);
        expect(total(gross), range).toBe(expected.totalChargedCents);
        expect(total(net), range).toBe(expected.netCollectedCents);
        expect(total(refunds), range).toBe(expected.refundedCents);
        expect(total(count), range).toBe(expected.orderCount);

        const chart = await ownerCaller.dashboard.cardData({
          widget: "revenue-chart",
          range,
          compare: false,
          series: false,
        });
        expect(chart.kind).toBe("revenueChart");
        if (chart.kind === "revenueChart") {
          expect(chart.totals, range).toEqual({
            gross: expected.totalChargedCents,
            refunded: expected.refundedCents,
            net: expected.netCollectedCents,
          });
          const buckets = chart.buckets;
          const sum = (pick: (b: (typeof buckets)[number]) => number) =>
            buckets.reduce((acc, b) => acc + pick(b), 0);
          expect(sum((b) => b.gross)).toBe(expected.totalChargedCents);
          expect(sum((b) => b.refunded)).toBe(expected.refundedCents);
          expect(sum((b) => b.net)).toBe(expected.netCollectedCents);
        }
      }
    }, 60_000);

    it("low stock works for an inventory-only store (products off): pools only", async () => {
      const { business, ownerCaller } = await setup({
        products: false,
        inventory: true,
        donations: true,
      });
      await createBaseInventoryUnit(business.id, {
        name: "Napkins",
        inventoryQty: 2,
      });
      await createBaseInventoryUnit(business.id, {
        name: "Plenty",
        inventoryQty: 500,
      });
      // A low product exists, but products are off: not listed.
      await createProduct(business.id, { inventoryQty: 1 });

      const layout = await ownerCaller.dashboard.getLayout();
      expect(layout.availableWidgetIds).toContain("low-stock-list");
      expect(layout.availableWidgetIds).toContain("low-stock-count");

      const list = await ownerCaller.dashboard.cardData({
        widget: "low-stock-list",
        range: null,
        compare: false,
        series: false,
      });
      expect(list.kind).toBe("lowStock");
      if (list.kind === "lowStock") {
        expect(list.pools.map((p) => p.name)).toEqual(["Napkins"]);
        expect(list.variants).toEqual([]);
        expect(list.totalCount).toBe(1);
      }
      const count = expectStat(
        await ownerCaller.dashboard.cardData({
          widget: "low-stock-count",
          range: null,
          compare: false,
          series: false,
        }),
      );
      expect(count.value).toBe(1);

      // Both off: the cards are unavailable.
      await db.business.update({
        where: { id: business.id },
        data: { featureFlags: { products: false, inventory: false } },
      });
      expect(
        await ownerCaller.dashboard.cardData({
          widget: "low-stock-list",
          range: null,
          compare: false,
          series: false,
        }),
      ).toMatchObject({ kind: "unavailable", reason: "feature-off" });
    }, 30_000);

    it("low stock lists products but not pools when inventory is off", async () => {
      const { business, ownerCaller } = await setup({
        orders: true,
        inventory: false,
        donations: true,
      });
      await createBaseInventoryUnit(business.id, { inventoryQty: 1 });
      await createProduct(business.id, { name: "Mugs", inventoryQty: 3 });

      const list = await ownerCaller.dashboard.cardData({
        widget: "low-stock-list",
        range: null,
        compare: false,
        series: false,
      });
      expect(list.kind).toBe("lowStock");
      if (list.kind === "lowStock") {
        expect(list.pools).toEqual([]);
        expect(list.variants.map((v) => v.productName)).toEqual(["Mugs"]);
        expect(list.totalCount).toBe(1);
      }
    }, 30_000);

    it("compares against the previous window and zero-fills a store-zone series", async () => {
      const { business, ownerCaller } = await setup();
      await createOrder(business.id, {
        total: 4000,
        createdAt: localNoonDaysAgo(1),
      });
      // Previous 7 days (days 8-14 ago).
      await createOrder(business.id, {
        total: 1000,
        createdAt: localNoonDaysAgo(10),
      });
      await createOrder(business.id, {
        total: 2000,
        status: "cancelled",
        fulfillmentStatus: "unfulfilled",
        createdAt: localNoonDaysAgo(1),
      });
      await createOrder(business.id, {
        total: 3000,
        status: "completed",
        fulfillmentStatus: "fulfilled",
        createdAt: localNoonDaysAgo(1),
      });

      const stat = expectStat(
        await ownerCaller.dashboard.cardData({
          widget: "gross-revenue",
          range: "7d",
          compare: true,
          series: true,
        }),
      );
      expect(stat.value).toBe(7000);
      expect(stat.previous).toBe(1000);
      expect(stat.comparisonLabel).toBe("vs prior 7 days");
      expect(stat.series).toHaveLength(7);

      const yesterdayKey = zonedDayKey(localNoonDaysAgo(1), RUNNER_TZ);
      const yesterday = stat.series?.find((p) => p.key === yesterdayKey);
      expect(yesterday?.value).toBe(7000);
      expect(stat.series?.reduce((sum, p) => sum + p.value, 0)).toBe(7000);

      // SQL-bucketed series lands in the same store-local day.
      const fulfilled = expectStat(
        await ownerCaller.dashboard.cardData({
          widget: "orders-fulfilled",
          range: "7d",
          compare: false,
          series: true,
        }),
      );
      expect(fulfilled.value).toBe(1);
      expect(fulfilled.series?.find((p) => p.key === yesterdayKey)?.value).toBe(
        1,
      );
      expect(fulfilled.note).toMatch(/placed in this period/);

      const cancelled = expectStat(
        await ownerCaller.dashboard.cardData({
          widget: "orders-cancelled",
          range: "7d",
          compare: false,
          series: false,
        }),
      );
      expect(cancelled.value).toBe(1);
    }, 30_000);

    it("every non-traffic widget computes without erroring at every size/range combination it supports", async () => {
      const { business, ownerCaller } = await setup({
        orders: true,
        products: true,
        donations: true,
        invoices: true,
        subscriptions: true,
        customerAccounts: true,
        quoteCalculator: true,
        forms: true,
        inventory: true,
      });
      await createOrder(business.id, { total: 2500 });

      for (const id of WIDGET_IDS) {
        const def = getWidget(id);
        if (def.requires.umami) continue;
        const ranges = def.supportsRange
          ? (["today", "year", "all"] as const).filter((r) =>
              def.allowedRanges.includes(r),
            )
          : [null];
        for (const range of ranges) {
          const data = await ownerCaller.dashboard.cardData({
            widget: id,
            range,
            compare: def.supportsComparison,
            series: def.sparkline,
          });
          expect(data.kind, `${id} @ ${String(range)}`).not.toBe("unavailable");
        }
      }
    }, 120_000);

    it("traffic widgets are unavailable when Umami is not set up", async () => {
      const { ownerCaller } = await setup({ orders: true, analytics: true });
      const data = await ownerCaller.dashboard.cardData({
        widget: "visitors",
        range: "30d",
        compare: false,
        series: false,
      });
      expect(data).toMatchObject({ kind: "unavailable" });
    }, 30_000);

    it("hides comparison for All time", async () => {
      const { business, ownerCaller } = await setup();
      await createOrder(business.id, { total: 4000 });
      const stat = expectStat(
        await ownerCaller.dashboard.cardData({
          widget: "net-revenue",
          range: "all",
          compare: true,
          series: false,
        }),
      );
      expect(stat.value).toBe(4000);
      expect(stat.previous).toBeNull();
      expect(stat.comparisonLabel).toBeNull();
    }, 30_000);

    it("counts open work and lists recent orders / top products", async () => {
      const { business, ownerCaller } = await setup();
      await createOrder(business.id, { customerName: "A", total: 1000 });
      await createOrder(business.id, {
        paymentStatus: "pending",
        customerName: "B",
      });

      const toFulfill = expectStat(
        await ownerCaller.dashboard.cardData({
          widget: "orders-to-fulfill",
          range: null,
          compare: false,
          series: false,
        }),
      );
      expect(toFulfill.value).toBe(1);

      const awaiting = expectStat(
        await ownerCaller.dashboard.cardData({
          widget: "orders-awaiting-payment",
          range: null,
          compare: false,
          series: false,
        }),
      );
      expect(awaiting.value).toBe(1);

      const recent = await ownerCaller.dashboard.cardData({
        widget: "recent-orders",
        range: null,
        compare: false,
        series: false,
      });
      expect(recent.kind).toBe("recentOrders");
      if (recent.kind === "recentOrders") {
        expect(recent.orders).toHaveLength(2);
        expect(typeof recent.orders[0]?.createdAt).toBe("string");
      }

      const top = await ownerCaller.dashboard.cardData({
        widget: "top-products",
        range: "30d",
        compare: false,
        series: false,
      });
      expect(top.kind).toBe("topProducts");
    }, 30_000);

    it("donations: totals, average, and donors deduplicated by email (blank emails left out)", async () => {
      const { business, ownerCaller } = await setup();
      const at = localNoonDaysAgo(2);
      await createDonation(business.id, {
        amountCents: 1000,
        donorEmail: "Sam@Example.com",
        createdAt: at,
      });
      await createDonation(business.id, {
        amountCents: 3000,
        donorEmail: "sam@example.com",
        createdAt: at,
      });
      await createDonation(business.id, {
        amountCents: 2000,
        donorEmail: null,
        createdAt: at,
      });

      const ask = (
        widget:
          | "donations-total"
          | "donations-count"
          | "donors-count"
          | "donation-average",
      ) =>
        ownerCaller.dashboard
          .cardData({ widget, range: "30d", compare: false, series: true })
          .then(expectStat);

      expect((await ask("donations-total")).value).toBe(6000);
      expect((await ask("donations-count")).value).toBe(3);
      expect((await ask("donation-average")).value).toBe(2000);
      const donors = await ask("donors-count");
      expect(donors.value).toBe(1);
      expect(donors.note).toMatch(/without an email/);
      expect(donors.series?.reduce((s, p) => s + p.value, 0)).toBe(1);
    }, 30_000);
  });
});
