import { vi } from "vitest";

import type { DashboardMetricsContext } from "./types";

/** Shared fixtures for the dashboard metrics tests. Test-only. */

export const NOW = new Date("2026-10-16T15:00:00.000Z");

export function makeCtx(
  over: Partial<DashboardMetricsContext> = {},
): DashboardMetricsContext {
  return {
    businessId: "biz_1",
    timeZone: "UTC",
    now: NOW,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    umamiWebsiteId: "site_1",
    isEnabled: () => true,
    ...over,
  };
}

/**
 * Bucket keys the fake `$queryRaw` returns rows for: inside the current 30d
 * window (today) and inside the previous 30d window.
 */
export const CURRENT_BUCKET = "2026-10-16";
export const PREVIOUS_BUCKET = "2026-09-01";
export const CURRENT_MONTH_BUCKET = "2026-10";

/**
 * A db whose raw bucket queries answer with one row per bucket key and whose
 * Prisma delegates return fixed numbers. Whole-window raw queries (no
 * `date_trunc`) answer under the key "all".
 */
export function makeFakeDb() {
  const row = (key: string, n: number) => ({
    key,
    count: n,
    sum: n * 100,
    gross: n * 1000,
    refunded: n * 100,
    net: n * 900,
    refundedOrders: 1,
  });
  const $queryRaw = vi.fn((query: { sql: string }) => {
    const sql = query.sql;
    if (!sql.includes("date_trunc")) return Promise.resolve([row("all", 7)]);
    const monthly = sql.includes("'month'");
    return Promise.resolve(
      monthly
        ? [row(CURRENT_MONTH_BUCKET, 3), row("2026-09", 2)]
        : [row(CURRENT_BUCKET, 3), row(PREVIOUS_BUCKET, 2)],
    );
  });
  return {
    $queryRaw,
    order: { count: vi.fn().mockResolvedValue(5) },
    donation: {
      aggregate: vi.fn().mockResolvedValue({
        _sum: { amountCents: 12_000 },
        _count: { _all: 4 },
      }),
      findMany: vi.fn().mockResolvedValue([
        { createdAt: new Date("2026-10-16T01:00:00Z"), donorEmail: "a@x.com" },
        { createdAt: new Date("2026-10-16T02:00:00Z"), donorEmail: "A@x.com" },
        { createdAt: new Date("2026-10-15T02:00:00Z"), donorEmail: "b@x.com" },
        { createdAt: new Date("2026-10-15T03:00:00Z"), donorEmail: null },
      ]),
    },
    customer: { count: vi.fn().mockResolvedValue(9) },
    quoteSubmission: { count: vi.fn().mockResolvedValue(6) },
    formSubmission: { count: vi.fn().mockResolvedValue(11) },
  };
}
