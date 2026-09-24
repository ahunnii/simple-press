import { describe, expect, it } from "vitest";

import type { UnifiedInvoiceRow } from "./unified-list";
import type { InvoiceListSort } from "~/lib/validators/invoice";
import {
  INVOICE_LIST_SORT_VALUES,
  INVOICE_LIST_STATUS_FILTER_VALUES,
} from "~/lib/validators/invoice";

import {
  compareUnifiedRows,
  mapNativeRow,
  mapQboRow,
  matchesInvoiceSearch,
  matchesListSourceFilter,
  matchesListStatusFilter,
  mergeUnifiedPage,
  nativeInvoiceOrderBy,
  nativeInvoiceSearchWhere,
  nativeListStatusWhere,
} from "./unified-list";

const NOW = new Date("2026-10-01T12:00:00Z");
const TZ = "America/Detroit"; // local date on NOW: 2026-10-01

const nativeBase = {
  id: "n1",
  invoiceNumber: 12,
  numberPrefix: "INV-",
  status: "SENT",
  customerName: "Jane Doe",
  customerEmail: "jane@example.com",
  totalCents: 10_000,
  amountPaidCents: 0,
  dueDate: new Date("2026-09-30T00:00:00Z"),
  createdAt: new Date("2026-09-01T00:00:00Z"),
};

const qboBase = {
  id: "q1",
  createdAt: new Date("2026-09-02T00:00:00Z"),
  amountCents: 5000,
  balanceCents: 5000,
  status: "sent",
  dueDate: new Date("2026-10-05T00:00:00Z"),
  customerName: "Bob Smith",
  customerEmail: "bob@example.com",
  qboDocNumber: "1043",
  kind: "custom",
  qboInvoiceId: "qbo-123",
  lastError: null,
  quoteSubmission: null,
};

describe("mapNativeRow", () => {
  it("maps an open, overdue native invoice", () => {
    expect(mapNativeRow(nativeBase, NOW, TZ)).toEqual({
      source: "native",
      id: "n1",
      displayNumber: "INV-0012",
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      totalCents: 10_000,
      balanceCents: 10_000,
      status: "outstanding",
      rawStatus: "SENT",
      isOverdue: true,
      dueDate: nativeBase.dueDate,
      createdAt: nativeBase.createdAt,
      href: "/admin/invoices/n1",
    });
  });

  it("uses the business's padding and maps every status", () => {
    expect(mapNativeRow(nativeBase, NOW, TZ, 6).displayNumber).toBe(
      "INV-000012",
    );
    const statuses = [
      ["DRAFT", "draft"],
      ["SENT", "outstanding"],
      ["PARTIALLY_PAID", "partially_paid"],
      ["PAID", "paid"],
      ["CANCELLED", "cancelled"],
    ] as const;
    for (const [raw, unified] of statuses) {
      expect(mapNativeRow({ ...nativeBase, status: raw }, NOW, TZ).status).toBe(
        unified,
      );
    }
  });

  it("shows the balance for partial payments and 0 once cancelled", () => {
    const partial = {
      ...nativeBase,
      status: "PARTIALLY_PAID",
      amountPaidCents: 2500,
    };
    expect(mapNativeRow(partial, NOW, TZ).balanceCents).toBe(7500);
    expect(
      mapNativeRow({ ...partial, status: "CANCELLED" }, NOW, TZ).balanceCents,
    ).toBe(0);
  });

  it("is not overdue on the due date itself", () => {
    const dueToday = {
      ...nativeBase,
      dueDate: new Date("2026-10-01T00:00:00Z"),
    };
    expect(mapNativeRow(dueToday, NOW, TZ).isOverdue).toBe(false);
  });
});

describe("mapQboRow", () => {
  it("maps an open QuickBooks invoice", () => {
    expect(mapQboRow(qboBase, NOW, TZ)).toEqual({
      source: "quickbooks",
      id: "q1",
      displayNumber: "1043",
      customerName: "Bob Smith",
      customerEmail: "bob@example.com",
      totalCents: 5000,
      balanceCents: 5000,
      status: "outstanding",
      rawStatus: "sent",
      isOverdue: false,
      dueDate: qboBase.dueDate,
      createdAt: qboBase.createdAt,
      href: null,
      qbo: {
        kind: "custom",
        qboInvoiceId: "qbo-123",
        lastError: null,
        lead: null,
      },
    });
  });

  it("carries the linked quote lead for search and the row's Lead column", () => {
    const withLead = {
      ...qboBase,
      quoteSubmission: { id: "lead1", contactName: "Fancy Lead" },
    };
    expect(mapQboRow(withLead, NOW, TZ).qbo?.lead).toEqual({
      id: "lead1",
      contactName: "Fancy Lead",
    });
  });

  it.each([
    ["pending", "pending"],
    ["created", "outstanding"],
    ["sent", "outstanding"],
    ["overdue", "outstanding"],
    ["paid", "paid"],
    ["voided", "cancelled"],
    ["error", "error"],
  ] as const)("QBO %s → %s", (raw, unified) => {
    expect(mapQboRow({ ...qboBase, status: raw }, NOW, TZ).status).toBe(
      unified,
    );
  });

  it("computes overdue from the due date with the native rule", () => {
    const pastDue = { ...qboBase, dueDate: new Date("2026-09-30T00:00:00Z") };
    expect(mapQboRow(pastDue, NOW, TZ).isOverdue).toBe(true);
    // A stale "overdue" status with a future due date is not overdue.
    expect(
      mapQboRow({ ...qboBase, status: "overdue" }, NOW, TZ).isOverdue,
    ).toBe(false);
    // No due date → trust the synced status.
    expect(
      mapQboRow({ ...qboBase, status: "overdue", dueDate: null }, NOW, TZ)
        .isOverdue,
    ).toBe(true);
    // Terminal statuses are never overdue.
    expect(mapQboRow({ ...pastDue, status: "paid" }, NOW, TZ).isOverdue).toBe(
      false,
    );
  });

  it("zeros the balance for paid/voided and falls back to the amount when unsynced", () => {
    expect(
      mapQboRow({ ...qboBase, status: "paid" }, NOW, TZ).balanceCents,
    ).toBe(0);
    expect(
      mapQboRow({ ...qboBase, status: "voided" }, NOW, TZ).balanceCents,
    ).toBe(0);
    expect(
      mapQboRow({ ...qboBase, balanceCents: null }, NOW, TZ).balanceCents,
    ).toBe(5000);
    expect(
      mapQboRow({ ...qboBase, qboDocNumber: null }, NOW, TZ).displayNumber,
    ).toBe("—");
  });
});

describe("matchesListStatusFilter", () => {
  const row = (status: UnifiedInvoiceRow["status"], isOverdue = false) => ({
    status,
    isOverdue,
  });

  it("shows pending/error QuickBooks rows only under 'all'", () => {
    for (const status of ["pending", "error"] as const) {
      const matching = INVOICE_LIST_STATUS_FILTER_VALUES.filter((f) =>
        matchesListStatusFilter(row(status), f),
      );
      expect(matching).toEqual(["all"]);
    }
  });

  it("includes partially paid and overdue invoices in 'outstanding'", () => {
    expect(matchesListStatusFilter(row("partially_paid"), "outstanding")).toBe(
      true,
    );
    expect(
      matchesListStatusFilter(row("outstanding", true), "outstanding"),
    ).toBe(true);
    expect(matchesListStatusFilter(row("outstanding", true), "overdue")).toBe(
      true,
    );
    expect(matchesListStatusFilter(row("outstanding"), "overdue")).toBe(false);
  });

  it("matches the single-status tabs", () => {
    expect(matchesListStatusFilter(row("draft"), "draft")).toBe(true);
    expect(matchesListStatusFilter(row("paid"), "paid")).toBe(true);
    expect(matchesListStatusFilter(row("cancelled"), "cancelled")).toBe(true);
    expect(matchesListStatusFilter(row("paid"), "cancelled")).toBe(false);
  });

  it("agrees with the SQL filter on every native status (overdue excluded: needs a date)", () => {
    const expectedIn: Record<string, string[] | undefined> = {
      draft: ["DRAFT"],
      outstanding: ["SENT", "PARTIALLY_PAID"],
      paid: ["PAID"],
      cancelled: ["CANCELLED"],
    };
    for (const filter of [
      "draft",
      "outstanding",
      "paid",
      "cancelled",
    ] as const) {
      const where = nativeListStatusWhere(filter, NOW, TZ);
      const sqlStatuses =
        typeof where.status === "string"
          ? [where.status]
          : (where.status as { in: string[] }).in;
      expect(sqlStatuses).toEqual(expectedIn[filter]);
      for (const raw of [
        "DRAFT",
        "SENT",
        "PARTIALLY_PAID",
        "PAID",
        "CANCELLED",
      ]) {
        const mapped = mapNativeRow(
          { ...nativeBase, status: raw, dueDate: null },
          NOW,
          TZ,
        );
        expect(matchesListStatusFilter(mapped, filter)).toBe(
          sqlStatuses.includes(raw),
        );
      }
    }
  });

  it("builds the overdue SQL filter from the local date", () => {
    expect(nativeListStatusWhere("overdue", NOW, TZ)).toEqual({
      status: { in: ["SENT", "PARTIALLY_PAID"] },
      dueDate: { lt: new Date("2026-10-01T00:00:00Z") },
    });
    expect(nativeListStatusWhere("all", NOW, TZ)).toEqual({});
  });
});

describe("matchesListSourceFilter", () => {
  it("filters by source", () => {
    expect(matchesListSourceFilter({ source: "native" }, "all")).toBe(true);
    expect(matchesListSourceFilter({ source: "native" }, "quickbooks")).toBe(
      false,
    );
    expect(
      matchesListSourceFilter({ source: "quickbooks" }, "quickbooks"),
    ).toBe(true);
  });
});

describe("search", () => {
  const row = mapQboRow(qboBase, NOW, TZ);

  it("matches name, email and number, case-insensitively", () => {
    expect(matchesInvoiceSearch(row, "")).toBe(true);
    expect(matchesInvoiceSearch(row, "  ")).toBe(true);
    expect(matchesInvoiceSearch(row, "BOB")).toBe(true);
    expect(matchesInvoiceSearch(row, "example.com")).toBe(true);
    expect(matchesInvoiceSearch(row, "104")).toBe(true);
    expect(matchesInvoiceSearch(row, "#1043")).toBe(true);
    expect(matchesInvoiceSearch(row, "jane")).toBe(false);
    expect(matchesInvoiceSearch(row, "#104")).toBe(false);
  });

  it("also matches the linked quote lead's name (QuickBooks rows only)", () => {
    const withLead = mapQboRow(
      {
        ...qboBase,
        quoteSubmission: { id: "lead1", contactName: "Fancy Lead" },
      },
      NOW,
      TZ,
    );
    expect(matchesInvoiceSearch(withLead, "fancy")).toBe(true);
    expect(matchesInvoiceSearch(withLead, "lead")).toBe(true);
    // No lead on this row — never throws, just doesn't match.
    expect(matchesInvoiceSearch(row, "fancy")).toBe(false);
  });

  it("builds the native SQL search, adding the number only when it parses", () => {
    expect(nativeInvoiceSearchWhere("")).toBeUndefined();
    expect(nativeInvoiceSearchWhere("jane")).toEqual({
      OR: [
        { customerName: { contains: "jane", mode: "insensitive" } },
        { customerEmail: { contains: "jane", mode: "insensitive" } },
      ],
    });
    expect(nativeInvoiceSearchWhere(" INV-0012 ")?.OR).toContainEqual({
      invoiceNumber: 12,
    });
  });
});

describe("compareUnifiedRows", () => {
  const make = (
    id: string,
    over: Partial<UnifiedInvoiceRow> = {},
  ): UnifiedInvoiceRow => ({
    ...mapNativeRow({ ...nativeBase, id }, NOW, TZ),
    ...over,
  });

  it("puts null due dates last under due-asc", () => {
    const rows = [
      make("a", { dueDate: null }),
      make("b", { dueDate: new Date("2026-10-10T00:00:00Z") }),
      make("c", { dueDate: new Date("2026-10-02T00:00:00Z") }),
    ];
    expect(rows.sort(compareUnifiedRows("due-asc")).map((r) => r.id)).toEqual([
      "c",
      "b",
      "a",
    ]);
  });

  it("breaks full ties by id ascending", () => {
    const rows = [make("z"), make("a"), make("m")];
    for (const sort of INVOICE_LIST_SORT_VALUES) {
      expect([...rows].sort(compareUnifiedRows(sort)).map((r) => r.id)).toEqual(
        ["a", "m", "z"],
      );
    }
  });

  it("orders natively in SQL by the same key chain", () => {
    expect(nativeInvoiceOrderBy("due-asc")).toEqual([
      { dueDate: { sort: "asc", nulls: "last" } },
      { createdAt: "desc" },
      { id: "asc" },
    ]);
    expect(nativeInvoiceOrderBy("oldest")).toEqual([
      { createdAt: "asc" },
      { id: "asc" },
    ]);
    expect(nativeInvoiceOrderBy("amount-desc")[0]).toEqual({
      totalCents: "desc",
    });
  });
});

describe("mergeUnifiedPage", () => {
  // Deterministic PRNG so failures are reproducible.
  function rng(seed: number) {
    let s = seed;
    return () => {
      s = (s * 1_103_515_245 + 12_345) % 2_147_483_648;
      return s / 2_147_483_648;
    };
  }

  function buildRows(
    seed: number,
    count: number,
    source: "native" | "quickbooks",
  ) {
    const rand = rng(seed);
    // Small value pools force plenty of ties on every sort key.
    const days = [1, 2, 3, 3, 4];
    const amounts = [1000, 2500, 2500, 5000];
    return Array.from({ length: count }, (_, i): UnifiedInvoiceRow => {
      const pick = <T>(pool: T[]) => pool[Math.floor(rand() * pool.length)]!;
      const dueDay = pick([...days, 0]);
      return {
        source,
        id: `${source === "native" ? "n" : "q"}${String(i).padStart(3, "0")}`,
        displayNumber: String(i),
        customerName: "X",
        customerEmail: "x@example.com",
        totalCents: pick(amounts),
        balanceCents: 0,
        status: "outstanding",
        rawStatus: "SENT",
        isOverdue: false,
        dueDate: dueDay === 0 ? null : new Date(Date.UTC(2026, 9, dueDay)),
        createdAt: new Date(Date.UTC(2026, 8, pick(days))),
        href: null,
      };
    });
  }

  const cases: [native: number, qbo: number, pageSize: number][] = [
    [37, 23, 7],
    [5, 40, 6],
    [40, 3, 5],
    [0, 12, 5],
    [12, 0, 5],
    [25, 25, 25],
  ];

  it.each(
    INVOICE_LIST_SORT_VALUES.flatMap((sort) =>
      cases.map(([n, q, size]) => [sort, n, q, size] as const),
    ),
  )(
    "sort=%s, %d native + %d QBO, pageSize %d: every page equals brute force",
    (sort: InvoiceListSort, nativeCount, qboCount, pageSize) => {
      const native = buildRows(nativeCount * 31 + 7, nativeCount, "native");
      const qbo = buildRows(qboCount * 17 + 3, qboCount, "quickbooks");
      const compare = compareUnifiedRows(sort);

      // What SQL would return, in order (nativeInvoiceOrderBy ≡ compare).
      const nativeSorted = [...native].sort(compare);
      const bruteForce = [...native, ...qbo].sort(compare);

      const totalPages = Math.max(
        1,
        Math.ceil((nativeCount + qboCount) / pageSize),
      );
      for (let page = 1; page <= totalPages; page++) {
        const merged = mergeUnifiedPage({
          nativeTop: nativeSorted.slice(0, page * pageSize),
          // Shuffle order doesn't matter: the merge sorts.
          qboMatches: [...qbo].reverse(),
          page,
          pageSize,
          sort,
        });
        const expected = bruteForce.slice(
          (page - 1) * pageSize,
          page * pageSize,
        );
        expect(merged.map((r) => r.id)).toEqual(expected.map((r) => r.id));
      }
    },
  );
});
