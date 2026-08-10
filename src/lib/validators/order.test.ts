import { describe, expect, it } from "vitest";

import { buildOrderListWhere } from "./order";

/**
 * `buildOrderListWhere` is the single `where` behind BOTH the admin Orders list
 * (`order.getAll`) and its CSV export (`export.exportOrders`) — the two used to
 * hand-roll the same clauses and had already drifted apart on order-number
 * search. These tests pin the contract both callers depend on:
 *
 * - `"all"` is a sentinel meaning "no clause", not a value to match on.
 * - Search is tokenized: AND of per-token ORs, so every word must match some
 *   field. A whitespace-only query adds no `AND` key at all.
 * - The order-number branch is opt-in per token and deliberately stricter than
 *   the `parseInt` it replaced ("10abc" must not match order #10), with an int4
 *   bound so a pasted long number can't make Prisma throw.
 */
describe("buildOrderListWhere", () => {
  const base = {
    businessId: "biz_1",
    status: "all",
    fulfillment: "all",
    paymentStatus: "all",
    search: undefined,
  } as const;

  describe("no filters", () => {
    it("returns exactly { businessId } when nothing is filtered", () => {
      expect(buildOrderListWhere({ ...base })).toEqual({
        businessId: "biz_1",
      });
    });

    it('adds no keys for explicit "all" values', () => {
      const where = buildOrderListWhere({
        ...base,
        status: "all",
        fulfillment: "all",
        paymentStatus: "all",
      });
      expect(Object.keys(where)).toEqual(["businessId"]);
    });
  });

  describe("exact-match filters", () => {
    it("sets status when it is not 'all'", () => {
      const where = buildOrderListWhere({ ...base, status: "cancelled" });
      expect(where.status).toBe("cancelled");
      expect(where.fulfillmentStatus).toBeUndefined();
      expect(where.paymentStatus).toBeUndefined();
    });

    it("sets fulfillmentStatus (not `fulfillment`) from the fulfillment param", () => {
      const where = buildOrderListWhere({
        ...base,
        fulfillment: "partially_fulfilled",
      });
      expect(where.fulfillmentStatus).toBe("partially_fulfilled");
    });

    it("sets paymentStatus when it is not 'all'", () => {
      const where = buildOrderListWhere({ ...base, paymentStatus: "paid" });
      expect(where.paymentStatus).toBe("paid");
    });

    it("combines all three filters with businessId", () => {
      const where = buildOrderListWhere({
        ...base,
        status: "completed",
        fulfillment: "fulfilled",
        paymentStatus: "paid",
      });
      expect(where).toEqual({
        businessId: "biz_1",
        status: "completed",
        fulfillmentStatus: "fulfilled",
        paymentStatus: "paid",
      });
    });
  });

  describe("tokenized search", () => {
    it("builds one OR clause per whitespace-separated token", () => {
      const where = buildOrderListWhere({ ...base, search: "jane doe" });
      expect(where.AND).toHaveLength(2);
    });

    it("covers customerEmail, customerName and id in every token's OR", () => {
      const where = buildOrderListWhere({ ...base, search: "jane" });
      const clauses = where.AND as { OR: Record<string, unknown>[] }[];
      expect(clauses[0]?.OR).toEqual([
        { customerEmail: { contains: "jane", mode: "insensitive" } },
        { customerName: { contains: "jane", mode: "insensitive" } },
        { id: { contains: "jane", mode: "insensitive" } },
      ]);
    });

    it("collapses runs of whitespace rather than emitting empty tokens", () => {
      const where = buildOrderListWhere({ ...base, search: "  jane   doe  " });
      expect(where.AND).toHaveLength(2);
    });

    it("keeps businessId and the exact-match filters alongside the search", () => {
      const where = buildOrderListWhere({
        ...base,
        status: "open",
        search: "jane",
      });
      expect(where.businessId).toBe("biz_1");
      expect(where.status).toBe("open");
      expect(where.AND).toHaveLength(1);
    });
  });

  describe("order-number branch", () => {
    const orderNumbersIn = (search: string) => {
      const where = buildOrderListWhere({ ...base, search });
      const clauses = (where.AND ?? []) as { OR: Record<string, unknown>[] }[];
      return clauses.map(
        (clause) =>
          clause.OR.find((c) => "orderNumber" in c)?.orderNumber ?? null,
      );
    };

    it("matches a bare numeric query", () => {
      expect(orderNumbersIn("1042")).toEqual([1042]);
    });

    it("matches a '#'-prefixed order number the way customers quote it", () => {
      expect(orderNumbersIn("#1042")).toEqual([1042]);
    });

    it("keeps the three contains fields alongside the orderNumber clause", () => {
      const where = buildOrderListWhere({ ...base, search: "#1042" });
      const clauses = where.AND as { OR: Record<string, unknown>[] }[];
      expect(clauses[0]?.OR).toHaveLength(4);
      expect(clauses[0]?.OR[0]).toEqual({
        customerEmail: { contains: "#1042", mode: "insensitive" },
      });
    });

    it("applies the branch per token — only the numeric one carries orderNumber", () => {
      expect(orderNumbersIn("john 1042")).toEqual([null, 1042]);
    });

    it("does NOT match '10abc' against order #10 (strict digits, not parseInt)", () => {
      expect(orderNumbersIn("10abc")).toEqual([null]);
    });

    it("does not treat a negative or decimal token as an order number", () => {
      expect(orderNumbersIn("-5")).toEqual([null]);
      expect(orderNumbersIn("10.5")).toEqual([null]);
    });

    it("skips numbers above the Postgres int4 max, which Prisma would throw on", () => {
      expect(orderNumbersIn("99999999999999")).toEqual([null]);
    });

    it("still searches the text fields for an over-int4 number", () => {
      const where = buildOrderListWhere({ ...base, search: "99999999999999" });
      const clauses = where.AND as { OR: Record<string, unknown>[] }[];
      expect(clauses[0]?.OR).toEqual([
        { customerEmail: { contains: "99999999999999", mode: "insensitive" } },
        { customerName: { contains: "99999999999999", mode: "insensitive" } },
        { id: { contains: "99999999999999", mode: "insensitive" } },
      ]);
    });

    it("accepts exactly the int4 max", () => {
      expect(orderNumbersIn("2147483647")).toEqual([2147483647]);
      expect(orderNumbersIn("2147483648")).toEqual([null]);
    });
  });

  describe("empty search", () => {
    it("adds no AND key for an empty string", () => {
      const where = buildOrderListWhere({ ...base, search: "" });
      expect(where.AND).toBeUndefined();
      expect(Object.keys(where)).toEqual(["businessId"]);
    });

    it("adds no AND key for a whitespace-only search", () => {
      const where = buildOrderListWhere({ ...base, search: "   \t " });
      expect(where.AND).toBeUndefined();
      expect(Object.keys(where)).toEqual(["businessId"]);
    });

    it("adds no AND key when search is undefined", () => {
      const where = buildOrderListWhere({ ...base, search: undefined });
      expect(where.AND).toBeUndefined();
    });
  });
});
