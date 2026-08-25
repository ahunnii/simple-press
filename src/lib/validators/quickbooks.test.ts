import { describe, expect, it } from "vitest";

import type { InvoiceSortRow, QboInvoiceSortValue } from "./quickbooks";

import {
  compareInvoiceRows,
  QBO_INVOICE_SORT_DEFAULT,
  QBO_INVOICE_SORT_VALUES,
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
