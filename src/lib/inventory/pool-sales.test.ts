import { describe, expect, it } from "vitest";

import type { PoolLedgerGroupRow } from "./pool-sales";

import {
  EMPTY_POOL_SALES,
  poolSalesWhere,
  summarizePoolSales,
} from "./pool-sales";

describe("summarizePoolSales", () => {
  it("flips the sign of negative sale rows into a positive grossSoldUnits", () => {
    const rows: PoolLedgerGroupRow[] = [
      {
        baseInventoryUnitId: "pool-1",
        reason: "sale",
        _sum: { changeQty: -12 },
        _count: { _all: 3 },
      },
    ];

    const result = summarizePoolSales(rows);

    expect(result.get("pool-1")?.grossSoldUnits).toBe(12);
    expect(result.get("pool-1")?.netSoldUnits).toBe(12);
  });

  it("treats a null _sum.changeQty as 0", () => {
    const rows: PoolLedgerGroupRow[] = [
      {
        baseInventoryUnitId: "pool-1",
        reason: "sale",
        _sum: { changeQty: null },
        _count: { _all: 0 },
      },
      {
        baseInventoryUnitId: "pool-1",
        reason: "return",
        _sum: { changeQty: null },
        _count: { _all: 0 },
      },
    ];

    const result = summarizePoolSales(rows);

    expect(result.get("pool-1")).toEqual({
      grossSoldUnits: 0,
      returnedUnits: 0,
      netSoldUnits: 0,
      oversellEvents: 0,
    });
  });

  it("keys multiple pools independently in the returned map", () => {
    const rows: PoolLedgerGroupRow[] = [
      {
        baseInventoryUnitId: "pool-1",
        reason: "sale",
        _sum: { changeQty: -10 },
        _count: { _all: 2 },
      },
      {
        baseInventoryUnitId: "pool-2",
        reason: "sale",
        _sum: { changeQty: -5 },
        _count: { _all: 1 },
      },
    ];

    const result = summarizePoolSales(rows);

    expect(result.get("pool-1")?.grossSoldUnits).toBe(10);
    expect(result.get("pool-2")?.grossSoldUnits).toBe(5);
  });

  it("omits pools with no movement from the map (callers default to EMPTY_POOL_SALES)", () => {
    const rows: PoolLedgerGroupRow[] = [
      {
        baseInventoryUnitId: "pool-1",
        reason: "sale",
        _sum: { changeQty: -10 },
        _count: { _all: 2 },
      },
    ];

    const result = summarizePoolSales(rows);

    expect(result.has("pool-2")).toBe(false);
    expect(EMPTY_POOL_SALES).toEqual({
      grossSoldUnits: 0,
      returnedUnits: 0,
      netSoldUnits: 0,
      oversellEvents: 0,
    });
  });

  it("counts oversell rows as events but never contributes their (zero) changeQty to units", () => {
    const rows: PoolLedgerGroupRow[] = [
      {
        baseInventoryUnitId: "pool-1",
        reason: "sale",
        _sum: { changeQty: -10 },
        _count: { _all: 2 },
      },
      {
        baseInventoryUnitId: "pool-1",
        reason: "oversell",
        _sum: { changeQty: 0 },
        _count: { _all: 4 },
      },
    ];

    const result = summarizePoolSales(rows);

    expect(result.get("pool-1")?.oversellEvents).toBe(4);
    expect(result.get("pool-1")?.grossSoldUnits).toBe(10);
    expect(result.get("pool-1")?.netSoldUnits).toBe(10);
  });

  it("computes netSoldUnits as grossSoldUnits minus returnedUnits", () => {
    const rows: PoolLedgerGroupRow[] = [
      {
        baseInventoryUnitId: "pool-1",
        reason: "sale",
        _sum: { changeQty: -20 },
        _count: { _all: 5 },
      },
      {
        baseInventoryUnitId: "pool-1",
        reason: "return",
        _sum: { changeQty: 6 },
        _count: { _all: 2 },
      },
    ];

    const result = summarizePoolSales(rows);

    expect(result.get("pool-1")).toEqual({
      grossSoldUnits: 20,
      returnedUnits: 6,
      netSoldUnits: 14,
      oversellEvents: 0,
    });
  });

  it("skips rows whose baseInventoryUnitId is null", () => {
    const rows: PoolLedgerGroupRow[] = [
      {
        baseInventoryUnitId: null,
        reason: "sale",
        _sum: { changeQty: -10 },
        _count: { _all: 2 },
      },
    ];

    const result = summarizePoolSales(rows);

    expect(result.size).toBe(0);
  });
});

describe("poolSalesWhere", () => {
  it("scopes baseInventoryUnitId to { not: null } when no poolId is passed", () => {
    const where = poolSalesWhere({ businessId: "biz-1" });

    expect(where.businessId).toBe("biz-1");
    expect(where.baseInventoryUnitId).toEqual({ not: null });
  });

  it("scopes baseInventoryUnitId to the literal id when poolId is passed", () => {
    const where = poolSalesWhere({ businessId: "biz-1", poolId: "pool-1" });

    expect(where.baseInventoryUnitId).toBe("pool-1");
  });

  it("puts orderId: { not: null } on the return leg only, never on sale/oversell", () => {
    const where = poolSalesWhere({ businessId: "biz-1" });

    expect(where.OR).toEqual([
      { reason: { in: ["sale", "oversell"] } },
      { reason: "return", orderId: { not: null } },
    ]);
  });
});
