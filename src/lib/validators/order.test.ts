import { describe, expect, it } from "vitest";

import {
  buildOrderListWhere,
  computeManualOrderTotals,
  manualOrderFormSchema,
} from "./order";

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

/**
 * `computeManualOrderTotals` is the only thing standing between the manual
 * order form and the Finances page. It used to not exist: `createManual` wrote
 * the client's `subtotal`/`total` verbatim, so a crafted request could record a
 * $500 order as `total: 0`. The server now derives both, and the client renders
 * its preview through this same function so the two cannot drift.
 *
 * Everything here is in cents.
 */
describe("computeManualOrderTotals", () => {
  it("derives the subtotal from line items rather than trusting a caller", () => {
    const totals = computeManualOrderTotals({
      items: [
        { price: 1250, quantity: 2 },
        { price: 999, quantity: 1 },
      ],
    });

    expect(totals.subtotal).toBe(3499);
    expect(totals.total).toBe(3499);
  });

  it("adds shipping and tax on top of the item subtotal", () => {
    const totals = computeManualOrderTotals({
      items: [{ price: 1000, quantity: 1 }],
      shipping: 599,
      tax: 106,
    });

    expect(totals.total).toBe(1705);
  });

  it("subtracts the discount", () => {
    const totals = computeManualOrderTotals({
      items: [{ price: 5000, quantity: 1 }],
      shipping: 500,
      discount: 1000,
    });

    expect(totals.discount).toBe(1000);
    expect(totals.total).toBe(4500);
  });

  it("clamps an over-large discount so the total can never go negative", () => {
    const totals = computeManualOrderTotals({
      items: [{ price: 1000, quantity: 1 }],
      shipping: 200,
      tax: 50,
      // More than the order is worth — a fat-fingered entry must not produce a
      // negative Order.total, which would read as a credit in revenue figures.
      discount: 999_999,
    });

    expect(totals.discount).toBe(1250);
    expect(totals.total).toBe(0);
  });

  it("falls back to directSubtotal only when there are no line items", () => {
    const withItems = computeManualOrderTotals({
      items: [{ price: 1000, quantity: 1 }],
      directSubtotal: 999_999,
    });
    // Line items win: directSubtotal is the no-items escape hatch, not an
    // override that could mask what was actually ordered.
    expect(withItems.subtotal).toBe(1000);

    const withoutItems = computeManualOrderTotals({
      items: [],
      directSubtotal: 2500,
    });
    expect(withoutItems.subtotal).toBe(2500);
    expect(withoutItems.total).toBe(2500);
  });

  it("treats an empty order with no direct subtotal as zero, not NaN", () => {
    expect(computeManualOrderTotals({ items: [] })).toEqual({
      subtotal: 0,
      shipping: 0,
      tax: 0,
      discount: 0,
      total: 0,
    });
  });

  it("rounds each line before summing, so a fractional-cent price cannot leak a float into the Int columns", () => {
    // Product.price is a Prisma Float; importers can write fractional cents.
    const totals = computeManualOrderTotals({
      items: [
        { price: 10.5, quantity: 3 },
        { price: 0.5, quantity: 1 },
      ],
    });

    expect(Number.isInteger(totals.subtotal)).toBe(true);
    expect(totals.subtotal).toBe(33); // round(31.5) + round(0.5)
  });
});

/**
 * `manualOrderFormSchema` is what react-hook-form validates, and it had no
 * tests — which is precisely how the bug these first cases pin got shipped.
 *
 * The form seeds every shippingAddress key with `""`. An earlier version built
 * this from `shippingAddressSchema.partial()`, but `.partial()` only makes keys
 * optional: the `.min(1)` refinements still fired on the present-but-empty
 * values. The result was that the form could not be submitted at all unless a
 * full address was filled in — and because the address card is hidden when it
 * isn't being captured, the errors landed on unrendered fields and the Save
 * button silently did nothing. Every pickup order was unreachable.
 */
describe("manualOrderFormSchema", () => {
  const base = {
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
    shippingName: "",
    // As seeded by the form's defaultValues.
    shippingAddress: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "US",
      phone: "",
    },
    deliveryMethod: "ship" as const,
    includeAddress: false,
    items: [
      {
        productId: "prod_1",
        productName: "A Thing",
        productVariantId: null,
        variantName: null,
        sku: null,
        quantity: 1,
        price: 1000,
      },
    ],
    useDirectSubtotal: false,
    directSubtotal: null,
    shipping: null,
    tax: null,
    discount: null,
    orderDate: "",
    notes: "",
    paymentStatus: "pending" as const,
    paymentMethod: undefined,
    fulfillmentStatus: "unfulfilled" as const,
    sendConfirmationEmail: false,
  };

  const issues = (input: unknown) => {
    const result = manualOrderFormSchema.safeParse(input);
    return result.success
      ? []
      : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  };

  it("accepts a ship order with no address captured, despite empty address fields", () => {
    expect(issues(base)).toEqual([]);
  });

  it("accepts a pickup order, which never captures an address", () => {
    expect(issues({ ...base, deliveryMethod: "pickup" as const })).toEqual([]);
  });

  it("requires the address members once an address is being captured", () => {
    expect(issues({ ...base, includeAddress: true })).toEqual([
      "shippingAddress.line1: Street address is required",
      "shippingAddress.city: City is required",
      "shippingAddress.postal_code: Postal code is required",
    ]);
  });

  it("does not require an address for pickup even when includeAddress is on", () => {
    // The address card is hidden for pickup, so a stale `includeAddress: true`
    // must not be able to block submission with errors nobody can see.
    expect(
      issues({
        ...base,
        includeAddress: true,
        deliveryMethod: "pickup" as const,
      }),
    ).toEqual([]);
  });

  it("treats a whitespace-only address field as missing", () => {
    expect(
      issues({
        ...base,
        includeAddress: true,
        shippingAddress: {
          ...base.shippingAddress,
          line1: "   ",
          city: "NY",
          postal_code: "10001",
        },
      }),
    ).toEqual(["shippingAddress.line1: Street address is required"]);
  });

  it("rejects a line item with no product picked", () => {
    const blankRow = { ...base.items[0]!, productId: "", productName: "" };
    expect(issues({ ...base, items: [blankRow] })).toContain(
      "items.0.productId: Pick a product",
    );
  });

  it("requires either line items or a direct subtotal", () => {
    expect(issues({ ...base, items: [] })).toEqual([
      "items: Add at least one item, or enter a subtotal directly.",
    ]);

    expect(
      issues({
        ...base,
        items: [],
        useDirectSubtotal: true,
        directSubtotal: 25,
      }),
    ).toEqual([]);

    expect(
      issues({
        ...base,
        items: [],
        useDirectSubtotal: true,
        directSubtotal: null,
      }),
    ).toEqual(["directSubtotal: Enter a subtotal."]);
  });
});
