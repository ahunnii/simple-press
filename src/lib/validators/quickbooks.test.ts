import { describe, expect, it } from "vitest";

import type { InvoiceSortRow, QboInvoiceSortValue } from "./quickbooks";

import {
  compareInvoiceRows,
  parseBillingAddressJson,
  QBO_INVOICE_SORT_DEFAULT,
  QBO_INVOICE_SORT_VALUES,
  quickBooksBillingAddressSchema,
  quickBooksCreateInvoiceSchema,
} from "./quickbooks";

/**
 * Base valid input for `quickBooksCreateInvoiceSchema` — only `dueDate`
 * varies between the two cases below. Covers the `.refine()` added to reject
 * calendar dates that pass the `YYYY-MM-DD` regex but don't actually exist
 * (e.g. `2026-02-30`, which `new Date()` would otherwise silently roll over
 * into March).
 */
const BASE_INPUT = {
  kind: "custom" as const,
  amountCents: 10000,
  customerName: "Test Customer",
  customerEmail: "test@example.com",
  send: true,
};

describe("quickBooksCreateInvoiceSchema dueDate", () => {
  it("rejects 2026-02-30", () => {
    const result = quickBooksCreateInvoiceSchema.safeParse({
      ...BASE_INPUT,
      dueDate: "2026-02-30",
    });

    expect(result.success).toBe(false);
  });

  it("accepts 2026-02-28", () => {
    const result = quickBooksCreateInvoiceSchema.safeParse({
      ...BASE_INPUT,
      dueDate: "2026-02-28",
    });

    expect(result.success).toBe(true);
  });
});

describe("quickBooksCreateInvoiceSchema amountCents", () => {
  it("rejects a $0 invoice with a message an owner can act on", () => {
    // The default zod message for this is "Number must be greater than or
    // equal to 1", which reads as nonsense next to a dollar-denominated
    // input the owner is typing into — the field is cents on the wire but
    // dollars on screen.
    const result = quickBooksCreateInvoiceSchema.safeParse({
      ...BASE_INPUT,
      amountCents: 0,
      dueDate: "2026-09-01",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Enter an amount of at least $0.01",
    );
  });

  it("accepts a single cent", () => {
    const result = quickBooksCreateInvoiceSchema.safeParse({
      ...BASE_INPUT,
      amountCents: 1,
      dueDate: "2026-09-01",
    });

    expect(result.success).toBe(true);
  });
});

/**
 * The billing address is snapshotted onto the invoice row and sent to Intuit
 * as `BillAddr`. QBO will happily accept a malformed state or ZIP and print
 * it on the invoice the customer receives, so this schema is the only place
 * that shape is actually enforced — there is no second check downstream.
 */
describe("quickBooksBillingAddressSchema", () => {
  const VALID = {
    line1: "1200 Woodward Ave",
    city: "Detroit",
    state: "MI",
    zip: "48226",
  };

  it("upper-cases the state code, so 'mi' and 'MI' are the same address", () => {
    // Owners type it either way; QBO only accepts the uppercase form.
    const result = quickBooksBillingAddressSchema.safeParse({
      ...VALID,
      state: " mi ",
    });

    expect(result.success).toBe(true);
    expect(result.data?.state).toBe("MI");
  });

  it("rejects a state name spelled out in full", () => {
    const result = quickBooksBillingAddressSchema.safeParse({
      ...VALID,
      state: "Michigan",
    });

    expect(result.success).toBe(false);
  });

  it("accepts ZIP+4", () => {
    const result = quickBooksBillingAddressSchema.safeParse({
      ...VALID,
      zip: "48226-1234",
    });

    expect(result.success).toBe(true);
    expect(result.data?.zip).toBe("48226-1234");
  });

  it("rejects a 4-digit ZIP (a dropped leading zero)", () => {
    // The failure this guards is a real one: an East-Coast ZIP like 02134
    // loses its leading zero the moment it round-trips through a number.
    const result = quickBooksBillingAddressSchema.safeParse({
      ...VALID,
      zip: "2134",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a blank street address or city", () => {
    expect(
      quickBooksBillingAddressSchema.safeParse({ ...VALID, line1: "   " })
        .success,
    ).toBe(false);
    expect(
      quickBooksBillingAddressSchema.safeParse({ ...VALID, city: "" }).success,
    ).toBe(false);
  });

  it("treats line2 as genuinely optional", () => {
    const withoutLine2 = quickBooksBillingAddressSchema.safeParse(VALID);
    expect(withoutLine2.success).toBe(true);
    expect(withoutLine2.data?.line2).toBeUndefined();

    const withLine2 = quickBooksBillingAddressSchema.safeParse({
      ...VALID,
      line2: "Suite 400",
    });
    expect(withLine2.data?.line2).toBe("Suite 400");
  });

  it("is optional on the create-invoice schema", () => {
    // A `custom` invoice typed straight into the admin dialog, or a lead
    // captured before the calculator had an address question, has no address
    // to snapshot — and must still be issuable.
    expect(
      quickBooksCreateInvoiceSchema.safeParse({
        ...BASE_INPUT,
        dueDate: "2026-09-01",
      }).success,
    ).toBe(true);

    const withAddress = quickBooksCreateInvoiceSchema.safeParse({
      ...BASE_INPUT,
      dueDate: "2026-09-01",
      billingAddress: { ...VALID, state: "mi" },
    });
    expect(withAddress.success).toBe(true);
    expect(withAddress.data?.billingAddress?.state).toBe("MI");
  });

  it("rejects a create-invoice input whose address is present but malformed", () => {
    // Optional must not mean lenient: an address that IS supplied is held to
    // the full shape rather than silently dropped.
    expect(
      quickBooksCreateInvoiceSchema.safeParse({
        ...BASE_INPUT,
        dueDate: "2026-09-01",
        billingAddress: { ...VALID, zip: "nope" },
      }).success,
    ).toBe(false);
  });
});

describe("parseBillingAddressJson", () => {
  it("round-trips a stored address", () => {
    const stored = JSON.stringify({
      line1: "1200 Woodward Ave",
      line2: "Suite 400",
      city: "Detroit",
      state: "MI",
      zip: "48226",
    });

    expect(parseBillingAddressJson(stored)).toEqual({
      line1: "1200 Woodward Ave",
      line2: "Suite 400",
      city: "Detroit",
      state: "MI",
      zip: "48226",
    });
  });

  it("returns null for NULL/empty column values rather than throwing", () => {
    // Every invoice issued before this column existed reads back NULL.
    expect(parseBillingAddressJson(null)).toBeNull();
    expect(parseBillingAddressJson(undefined)).toBeNull();
    expect(parseBillingAddressJson("")).toBeNull();
  });

  it("returns null for text that isn't JSON at all", () => {
    // A decryption that produced garbage must not take down the invoice list.
    expect(parseBillingAddressJson("{not json")).toBeNull();
    expect(parseBillingAddressJson("1200 Woodward Ave, Detroit MI")).toBeNull();
  });

  it("returns null for JSON of the wrong shape", () => {
    expect(parseBillingAddressJson(JSON.stringify({ city: "Detroit" }))).toBe(
      null,
    );
    expect(parseBillingAddressJson(JSON.stringify(["a", "b"]))).toBeNull();
    expect(parseBillingAddressJson("null")).toBeNull();
  });
});

/**
 * `compareInvoiceRows` is the single primary ordering behind `/admin/invoices`
 * — the page hands it straight to `buildTablePage`'s `comparePrimary`, which
 * appends the `id` tie-break. These rows therefore carry no `id`: the
 * comparator must never need one, and `PrimaryOrdering<Row>`'s
 * `Omit<Row, "id">` argument type enforces that at the call site.
 *
 * Every case below sorts a shuffled array rather than asserting on a single
 * pairwise call, because that is how the comparator is actually used and it
 * exercises the tie-breaks along the way.
 */
describe("compareInvoiceRows", () => {
  const at = (iso: string) => new Date(iso);

  function row(overrides: Partial<InvoiceSortRow> = {}): InvoiceSortRow {
    return {
      customerName: "Customer",
      amountCents: 10_000,
      dueDate: at("2026-09-01T00:00:00Z"),
      createdAt: at("2026-08-01T12:00:00Z"),
      ...overrides,
    };
  }

  /** Sort a copy and report the field that identifies each row in that case. */
  function sortedBy<K extends keyof InvoiceSortRow>(
    rows: InvoiceSortRow[],
    sort: QboInvoiceSortValue,
    key: K,
  ): Array<InvoiceSortRow[K]> {
    return [...rows]
      .sort((a, b) => compareInvoiceRows(sort, a, b))
      .map((r) => r[key]);
  }

  describe("createdAt sorts", () => {
    const oldest = row({ createdAt: at("2026-01-01T00:00:00Z") });
    const middle = row({ createdAt: at("2026-05-01T00:00:00Z") });
    const newest = row({ createdAt: at("2026-08-01T00:00:00Z") });
    const rows = [middle, newest, oldest];

    it("newest puts the most recently created invoice first", () => {
      expect(sortedBy(rows, "newest", "createdAt")).toEqual([
        newest.createdAt,
        middle.createdAt,
        oldest.createdAt,
      ]);
    });

    it("oldest reverses it", () => {
      expect(sortedBy(rows, "oldest", "createdAt")).toEqual([
        oldest.createdAt,
        middle.createdAt,
        newest.createdAt,
      ]);
    });
  });

  describe("customer sorts", () => {
    // Deliberately mixed case: a code-unit comparison ("Bob" < "alice", since
    // every uppercase letter sorts below every lowercase one) would put the
    // capitalized names first and read as broken to an owner scanning A–Z.
    const rows = [
      row({ customerName: "Bob's Hauling" }),
      row({ customerName: "alice landscaping" }),
      row({ customerName: "Carla Tile" }),
    ];

    it("customer-asc is A–Z and case-insensitive", () => {
      expect(sortedBy(rows, "customer-asc", "customerName")).toEqual([
        "alice landscaping",
        "Bob's Hauling",
        "Carla Tile",
      ]);
    });

    it("customer-desc is Z–A and case-insensitive", () => {
      expect(sortedBy(rows, "customer-desc", "customerName")).toEqual([
        "Carla Tile",
        "Bob's Hauling",
        "alice landscaping",
      ]);
    });

    it("breaks a same-name tie with newest-first, not the id tie-break", () => {
      const older = row({
        customerName: "Same Name",
        createdAt: at("2026-01-01T00:00:00Z"),
      });
      const newer = row({
        customerName: "Same Name",
        createdAt: at("2026-06-01T00:00:00Z"),
      });

      expect(sortedBy([older, newer], "customer-asc", "createdAt")).toEqual([
        newer.createdAt,
        older.createdAt,
      ]);
    });
  });

  describe("amount sorts", () => {
    const small = row({ amountCents: 1_000 });
    const medium = row({ amountCents: 50_000 });
    const large = row({ amountCents: 250_000 });
    const rows = [medium, small, large];

    it("amount-desc is highest first", () => {
      expect(sortedBy(rows, "amount-desc", "amountCents")).toEqual([
        250_000, 50_000, 1_000,
      ]);
    });

    it("amount-asc is lowest first", () => {
      expect(sortedBy(rows, "amount-asc", "amountCents")).toEqual([
        1_000, 50_000, 250_000,
      ]);
    });

    it("breaks an equal-amount tie with newest-first", () => {
      const older = row({
        amountCents: 5_000,
        createdAt: at("2026-01-01T00:00:00Z"),
      });
      const newer = row({
        amountCents: 5_000,
        createdAt: at("2026-06-01T00:00:00Z"),
      });

      expect(sortedBy([older, newer], "amount-desc", "createdAt")).toEqual([
        newer.createdAt,
        older.createdAt,
      ]);
    });
  });

  describe("due-asc", () => {
    const soon = row({ dueDate: at("2026-08-05T00:00:00Z") });
    const later = row({ dueDate: at("2026-12-05T00:00:00Z") });
    const noDueDate = row({ dueDate: null });

    it("orders by due date ascending", () => {
      expect(sortedBy([later, soon], "due-asc", "dueDate")).toEqual([
        soon.dueDate,
        later.dueDate,
      ]);
    });

    it("puts a null due date LAST, not first", () => {
      // The failure this guards: `null` coerced through `getTime()` (NaN) or
      // treated as 0 would float undated invoices to the top of a "Due
      // soonest" list, above the ones that are genuinely due tomorrow.
      expect(sortedBy([noDueDate, later, soon], "due-asc", "dueDate")).toEqual([
        soon.dueDate,
        later.dueDate,
        null,
      ]);
    });

    it("orders two null due dates newest-first rather than arbitrarily", () => {
      const olderNull = row({
        dueDate: null,
        createdAt: at("2026-01-01T00:00:00Z"),
      });
      const newerNull = row({
        dueDate: null,
        createdAt: at("2026-06-01T00:00:00Z"),
      });

      expect(sortedBy([olderNull, newerNull], "due-asc", "createdAt")).toEqual([
        newerNull.createdAt,
        olderNull.createdAt,
      ]);
    });

    it("breaks an identical due date with newest-first", () => {
      const older = row({ createdAt: at("2026-01-01T00:00:00Z") });
      const newer = row({ createdAt: at("2026-06-01T00:00:00Z") });

      expect(sortedBy([older, newer], "due-asc", "createdAt")).toEqual([
        newer.createdAt,
        older.createdAt,
      ]);
    });
  });

  it("returns a stable, non-arbitrary order for every value in the tuple", () => {
    // The silent failure the sort tuple's docblock names: a value added to
    // QBO_INVOICE_SORT_VALUES with no `case` falls through to `default` and
    // quietly behaves like "newest". This can't detect that on its own, but it
    // does guarantee every declared option is at least reachable and total
    // (comparing a row with itself must be 0, or Array.prototype.sort is free
    // to produce different results on different engines).
    const self = row();
    for (const sort of QBO_INVOICE_SORT_VALUES) {
      expect(compareInvoiceRows(sort, self, self)).toBe(0);
    }
  });

  it("defaults to the same ordering as QBO_INVOICE_SORT_DEFAULT", () => {
    // The other half of the drift docblock: a default that disagrees between
    // the tuple and the comparator's `default` branch is invisible, because
    // AdminFilters deletes a param set to its defaultValue.
    const older = row({ createdAt: at("2026-01-01T00:00:00Z") });
    const newer = row({ createdAt: at("2026-06-01T00:00:00Z") });

    expect(QBO_INVOICE_SORT_DEFAULT).toBe("newest");
    expect(compareInvoiceRows(QBO_INVOICE_SORT_DEFAULT, older, newer)).toBe(
      compareInvoiceRows("newest", older, newer),
    );
  });
});
