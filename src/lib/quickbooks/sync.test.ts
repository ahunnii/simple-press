/**
 * QuickBooks invoice-sync engine tests.
 *
 * Two things here are worth more than the happy path:
 *
 *  1. The SKIP tests (flag off, connection not active, no open rows). Each
 *     asserts a *negative* — no network call, no write, no `lastSyncedAt`
 *     stamp — because the failure mode they guard is invisible in post-state
 *     terms: a sync that "works" but burns a QBO round-trip and a write for
 *     every tenant on every 15-minute tick costs real money and rate limit,
 *     and nothing about it looks broken.
 *
 *  2. The realm-mismatch test. Querying a reconnected company for an id issued
 *     by the previous one returns nothing, which is indistinguishable from
 *     "deleted in QuickBooks" — so without the guard a real, possibly paid,
 *     invoice would be silently marked `voided`. The test asserts both halves:
 *     those ids never reach the query, and they get the explanatory stamp.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QboInvoice } from "~/lib/quickbooks/types";
import {
  QBO_MIN_INVOICE_SYNC_INTERVAL_MS,
  QBO_SYNC_BATCH,
} from "~/lib/quickbooks/constants";
import { QboNeedsReconnectError } from "~/lib/quickbooks/errors";
import { syncQuickBooksInvoices } from "~/lib/quickbooks/sync";
import { QBO_OPEN_INVOICE_STATUSES } from "~/lib/validators/quickbooks";

vi.mock("~/lib/quickbooks/invoices", () => ({
  queryQboInvoices: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const { queryQboInvoices } = await import("~/lib/quickbooks/invoices");
const mockQuery = vi.mocked(queryQboInvoices);

const Sentry = await import("@sentry/nextjs");
const mockCapture = vi.mocked(Sentry.captureException);

// ── fixtures ────────────────────────────────────────────────────────────────

const NOW = new Date("2026-07-31T12:00:00.000Z");
const REALM = "realm_1";

type InvoiceRow = {
  id: string;
  businessId: string;
  realmId: string;
  qboInvoiceId: string | null;
  status: string;
  amountCents: number;
  paidAt: Date | null;
};

type BusinessRow = {
  id: string;
  featureFlags: unknown;
  quickBooksConnection: { status: string; realmId: string } | null;
};

function makeInvoice(overrides: Partial<InvoiceRow> = {}): InvoiceRow {
  return {
    id: "inv_1",
    businessId: "biz_1",
    realmId: REALM,
    qboInvoiceId: "101",
    status: "sent",
    amountCents: 10_000,
    paidAt: null,
    ...overrides,
  };
}

function makeBusiness(overrides: Partial<BusinessRow> = {}): BusinessRow {
  return {
    id: "biz_1",
    featureFlags: { quickbooks: true },
    quickBooksConnection: { status: "active", realmId: REALM },
    ...overrides,
  };
}

function makeQboInvoice(overrides: Partial<QboInvoice> = {}): QboInvoice {
  return {
    Id: "101",
    SyncToken: "1",
    TotalAmt: 100,
    Balance: 100,
    ...overrides,
  };
}

type InvoiceFindManyArgs = {
  where: {
    status: { in: readonly string[] };
    qboInvoiceId: { not: null };
    businessId?: string;
    OR?: ({ lastSyncedAt: null } | { lastSyncedAt: { lt: Date } })[];
  };
  orderBy?: unknown;
  take?: number;
  select?: unknown;
};

type InvoiceUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type InvoiceUpdateManyArgs = {
  where: { id: { in: string[] } };
  data: Record<string, unknown>;
};

type ConnectionUpdateArgs = {
  where: { businessId: string };
  data: Record<string, unknown>;
};

type BusinessFindManyArgs = {
  where: { id: { in: string[] } };
  select?: unknown;
};

/**
 * A hand-rolled `db` double. `quickBooksInvoice.findMany` returns the given
 * rows verbatim rather than re-implementing the `where` — the selection logic
 * is asserted directly against the query arguments instead (see the
 * "query shape" describe block), which is the only way to prove the throttle
 * clause is actually present.
 */
function makeDb(opts: { invoices?: InvoiceRow[]; businesses?: BusinessRow[] }) {
  const invoices = opts.invoices ?? [];
  const businesses = opts.businesses ?? [makeBusiness()];

  const invoiceFindMany = vi.fn((_args: InvoiceFindManyArgs) =>
    Promise.resolve(invoices),
  );
  const invoiceUpdate = vi.fn((_args: InvoiceUpdateArgs) =>
    Promise.resolve({}),
  );
  const invoiceUpdateMany = vi.fn((_args: InvoiceUpdateManyArgs) =>
    Promise.resolve({ count: 0 }),
  );
  const connectionUpdate = vi.fn((_args: ConnectionUpdateArgs) =>
    Promise.resolve({}),
  );
  const businessFindMany = vi.fn((args: BusinessFindManyArgs) =>
    Promise.resolve(businesses.filter((b) => args.where.id.in.includes(b.id))),
  );

  const db = {
    quickBooksInvoice: {
      findMany: invoiceFindMany,
      update: invoiceUpdate,
      updateMany: invoiceUpdateMany,
    },
    quickBooksConnection: { update: connectionUpdate },
    business: { findMany: businessFindMany },
  };

  return {
    db: db as unknown as Parameters<typeof syncQuickBooksInvoices>[0],
    invoiceFindMany,
    invoiceUpdate,
    invoiceUpdateMany,
    connectionUpdate,
    businessFindMany,
    updateCalls: () => invoiceUpdate.mock.calls.map((c) => c[0]),
    connectionCalls: () => connectionUpdate.mock.calls.map((c) => c[0]),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue([]);
});

// ── the cheap path ──────────────────────────────────────────────────────────

describe("nothing to do", () => {
  it("returns 0 on one SELECT when no invoice is due for a poll", async () => {
    const harness = makeDb({ invoices: [] });

    const count = await syncQuickBooksInvoices(harness.db, { now: NOW });

    expect(count).toBe(0);
    // The steady state for every tenant without QuickBooks: no business load,
    // no network, no writes.
    expect(harness.businessFindMany).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
    expect(harness.invoiceUpdate).not.toHaveBeenCalled();
    expect(harness.connectionUpdate).not.toHaveBeenCalled();
  });
});

// ── skips: no write, no network ─────────────────────────────────────────────

describe("skips", () => {
  it("skips a business whose quickbooks flag is off, without stamping", async () => {
    const harness = makeDb({
      invoices: [makeInvoice()],
      businesses: [makeBusiness({ featureFlags: { quickbooks: false } })],
    });

    const count = await syncQuickBooksInvoices(harness.db, { now: NOW });

    expect(count).toBe(0);
    expect(mockQuery).not.toHaveBeenCalled();
    // Crucially: no lastSyncedAt stamp, so the row resumes on the next tick if
    // the flag is turned back on rather than sitting out the interval.
    expect(harness.invoiceUpdate).not.toHaveBeenCalled();
    expect(harness.invoiceUpdateMany).not.toHaveBeenCalled();
    expect(harness.connectionUpdate).not.toHaveBeenCalled();
  });

  it("skips a business whose connection needs reconnecting", async () => {
    const harness = makeDb({
      invoices: [makeInvoice()],
      businesses: [
        makeBusiness({
          quickBooksConnection: { status: "needs_reconnect", realmId: REALM },
        }),
      ],
    });

    const count = await syncQuickBooksInvoices(harness.db, { now: NOW });

    expect(count).toBe(0);
    expect(mockQuery).not.toHaveBeenCalled();
    expect(harness.invoiceUpdate).not.toHaveBeenCalled();
    expect(harness.connectionUpdate).not.toHaveBeenCalled();
  });

  it("skips a business with no connection row at all", async () => {
    const harness = makeDb({
      invoices: [makeInvoice()],
      businesses: [makeBusiness({ quickBooksConnection: null })],
    });

    expect(await syncQuickBooksInvoices(harness.db, { now: NOW })).toBe(0);
    expect(mockQuery).not.toHaveBeenCalled();
    expect(harness.invoiceUpdate).not.toHaveBeenCalled();
  });
});

// ── the happy path ──────────────────────────────────────────────────────────

describe("status sync", () => {
  it("writes paid and overdue from QBO and stamps the connection", async () => {
    const harness = makeDb({
      invoices: [
        makeInvoice({ id: "inv_1", qboInvoiceId: "101" }),
        makeInvoice({ id: "inv_2", qboInvoiceId: "102", amountCents: 20_000 }),
      ],
    });

    mockQuery.mockResolvedValue([
      // Fully paid.
      makeQboInvoice({
        Id: "101",
        SyncToken: "3",
        Balance: 0,
        DocNumber: "1001",
      }),
      // Still owing, and the due date is a month in the past.
      makeQboInvoice({
        Id: "102",
        SyncToken: "1",
        TotalAmt: 200,
        Balance: 200,
        DueDate: "2026-07-01",
      }),
    ]);

    const count = await syncQuickBooksInvoices(harness.db, { now: NOW });

    expect(count).toBe(2);

    const [paid, overdue] = harness.updateCalls();

    expect(paid?.where).toEqual({ id: "inv_1" });
    expect(paid?.data).toMatchObject({
      status: "paid",
      balanceCents: 0,
      qboSyncToken: "3",
      qboDocNumber: "1001",
      paidAt: NOW,
      lastSyncedAt: NOW,
      lastError: null,
    });
    // QBO sent no DueDate — "no news", not "cleared".
    expect(paid?.data.dueDate).toBeUndefined();

    expect(overdue?.where).toEqual({ id: "inv_2" });
    expect(overdue?.data).toMatchObject({
      status: "overdue",
      balanceCents: 20_000,
      dueDate: new Date("2026-07-01T00:00:00.000Z"),
      lastSyncedAt: NOW,
      lastError: null,
    });
    // Not paid — must not stamp a payment time.
    expect(overdue?.data.paidAt).toBeUndefined();

    expect(harness.connectionCalls()).toEqual([
      {
        where: { businessId: "biz_1" },
        data: { lastSyncAt: NOW, lastSyncError: null },
      },
    ]);
  });

  it("never moves paidAt once it is already set", async () => {
    const alreadyPaidAt = new Date("2026-07-20T09:00:00.000Z");
    const harness = makeDb({
      invoices: [makeInvoice({ paidAt: alreadyPaidAt })],
    });
    mockQuery.mockResolvedValue([makeQboInvoice({ Balance: 0 })]);

    expect(await syncQuickBooksInvoices(harness.db, { now: NOW })).toBe(1);

    const data = harness.updateCalls()[0]?.data;
    expect(data?.status).toBe("paid");
    // `undefined`, so Prisma leaves the original observation timestamp alone.
    expect(data?.paidAt).toBeUndefined();
  });

  it("voids a row QuickBooks no longer returns", async () => {
    const harness = makeDb({ invoices: [makeInvoice()] });
    mockQuery.mockResolvedValue([]);

    expect(await syncQuickBooksInvoices(harness.db, { now: NOW })).toBe(1);

    expect(harness.updateCalls()).toEqual([
      {
        where: { id: "inv_1" },
        data: {
          status: "voided",
          lastSyncedAt: NOW,
          lastError: "Not found in QuickBooks",
        },
      },
    ]);
  });
});

// ── realm mismatch ──────────────────────────────────────────────────────────

describe("realm mismatch", () => {
  it("stamps rows from a previous company and keeps their ids out of the query", async () => {
    const harness = makeDb({
      invoices: [
        makeInvoice({ id: "inv_old", realmId: "realm_old", qboInvoiceId: "9" }),
        makeInvoice({ id: "inv_new", qboInvoiceId: "102" }),
      ],
    });
    mockQuery.mockResolvedValue([makeQboInvoice({ Id: "102", Balance: 0 })]);

    const count = await syncQuickBooksInvoices(harness.db, { now: NOW });

    // The stale-realm stamp is bookkeeping, not a status we learned.
    expect(count).toBe(1);

    expect(harness.invoiceUpdateMany).toHaveBeenCalledTimes(1);
    expect(harness.invoiceUpdateMany.mock.calls[0]?.[0]).toEqual({
      where: { id: { in: ["inv_old"] } },
      data: {
        lastSyncedAt: NOW,
        lastError: "Belongs to a previous QuickBooks company",
      },
    });

    // Asking the new company for the old company's id would return nothing and
    // look exactly like a deletion — so it must never be asked.
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0]?.[2]).toEqual(["102"]);

    expect(harness.updateCalls()).toHaveLength(1);
    expect(harness.updateCalls()[0]?.where).toEqual({ id: "inv_new" });
  });
});

// ── failure isolation ───────────────────────────────────────────────────────

describe("per-business isolation", () => {
  it("reports one business's failure and still syncs the other", async () => {
    const harness = makeDb({
      invoices: [
        makeInvoice({ id: "inv_a", businessId: "biz_1", qboInvoiceId: "101" }),
        makeInvoice({ id: "inv_b", businessId: "biz_2", qboInvoiceId: "201" }),
      ],
      businesses: [
        makeBusiness({ id: "biz_1" }),
        makeBusiness({ id: "biz_2" }),
      ],
    });

    mockQuery.mockImplementation((_db, businessId) =>
      businessId === "biz_1"
        ? Promise.reject(new Error("QuickBooks is down"))
        : Promise.resolve([makeQboInvoice({ Id: "201", Balance: 0 })]),
    );

    const count = await syncQuickBooksInvoices(harness.db, { now: NOW });

    // Only biz_2's row actually synced.
    expect(count).toBe(1);
    expect(harness.updateCalls()).toHaveLength(1);
    expect(harness.updateCalls()[0]?.where).toEqual({ id: "inv_b" });

    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(mockCapture.mock.calls[0]?.[1]).toMatchObject({
      tags: {
        service: "quickbooks",
        "quickbooks.step": "sync",
        businessId: "biz_1",
      },
    });

    // The failing business records the error but NOT a lastSyncAt — that field
    // means "last successful sync".
    expect(harness.connectionCalls()).toContainEqual({
      where: { businessId: "biz_1" },
      data: { lastSyncError: "QuickBooks is down" },
    });
    expect(harness.connectionCalls()).toContainEqual({
      where: { businessId: "biz_2" },
      data: { lastSyncAt: NOW, lastSyncError: null },
    });
  });

  it("records a needs-reconnect failure without double-capturing it", async () => {
    const harness = makeDb({ invoices: [makeInvoice()] });
    mockQuery.mockRejectedValue(new QboNeedsReconnectError());

    const count = await syncQuickBooksInvoices(harness.db, { now: NOW });

    expect(count).toBe(0);
    expect(harness.invoiceUpdate).not.toHaveBeenCalled();
    expect(harness.connectionCalls()).toEqual([
      {
        where: { businessId: "biz_1" },
        data: { lastSyncError: "QuickBooks needs to be reconnected" },
      },
    ]);
    // tokens.ts already captured this where the refresh grant was rejected.
    expect(mockCapture).not.toHaveBeenCalled();
  });
});

// ── selection query shape ───────────────────────────────────────────────────

describe("query shape", () => {
  it("throttles by lastSyncedAt and caps the batch by default", async () => {
    const harness = makeDb({ invoices: [] });

    await syncQuickBooksInvoices(harness.db, { now: NOW });

    const args = harness.invoiceFindMany.mock.calls[0]?.[0];
    expect(args?.where.status).toEqual({ in: [...QBO_OPEN_INVOICE_STATUSES] });
    expect(args?.where.qboInvoiceId).toEqual({ not: null });
    expect(args?.where.businessId).toBeUndefined();
    expect(args?.where.OR).toEqual([
      { lastSyncedAt: null },
      {
        lastSyncedAt: {
          lt: new Date(NOW.getTime() - QBO_MIN_INVOICE_SYNC_INTERVAL_MS),
        },
      },
    ]);
    expect(args?.take).toBe(QBO_SYNC_BATCH);
    expect(args?.orderBy).toEqual([
      { lastSyncedAt: { sort: "asc", nulls: "first" } },
    ]);
  });

  it("drops the throttle clause and narrows to one business on demand", async () => {
    const harness = makeDb({ invoices: [] });

    await syncQuickBooksInvoices(harness.db, {
      now: NOW,
      businessId: "biz_7",
      ignoreInterval: true,
      take: 5,
    });

    const args = harness.invoiceFindMany.mock.calls[0]?.[0];
    expect(args?.where.businessId).toBe("biz_7");
    // The human clicking "Refresh" wants a poll now — but the batch cap stays.
    expect(args?.where.OR).toBeUndefined();
    expect(args?.take).toBe(5);
  });
});
