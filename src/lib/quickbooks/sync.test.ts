/**
 * QuickBooks invoice-sync engine tests.
 *
 * Three things here are worth more than the happy path:
 *
 *  1. The SKIP tests (no active connection, flag off, wrong environment). Each
 *     asserts a *negative* — no network call, no write, no `lastSyncedAt`
 *     stamp — because the failure mode they guard is invisible in post-state
 *     terms: a sync that "works" but burns a QBO round-trip and a write for
 *     every tenant on every 15-minute tick costs real money and rate limit,
 *     and nothing about it looks broken.
 *
 *  2. The realm-mismatch test. Querying a reconnected company for an id issued
 *     by the previous one returns nothing, which is indistinguishable from
 *     "deleted in QuickBooks" — so without the guard a real, possibly paid,
 *     invoice would be silently marked `voided`. The rule now lives in the
 *     invoice query's `where` (a `(businessId, realmId)` pair per live
 *     connection), so the test asserts the pairs are actually there AND that a
 *     stale row that somehow arrives anyway is still kept out of the QBO query.
 *
 *  3. The query-shape block. The throttle clause moved under `AND` when the
 *     realm pairs claimed `OR`; nothing about a lost throttle would fail
 *     loudly, it would just quietly re-poll every open invoice every tick.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QboInvoice } from "~/lib/quickbooks/types";
import {
  QBO_MIN_INVOICE_SYNC_INTERVAL_MS,
  QBO_REALM_MISMATCH_ERROR,
  QBO_SYNC_BATCH,
  qboEnvironmentMismatchMessage,
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

// The sweep compares each connection's stored environment against the
// deployment's; pinning it here is what makes the mismatch test's fixture
// ("production" against a sandbox deployment) mean something.
vi.mock("~/env", () => ({
  env: { QBO_ENVIRONMENT: "sandbox", NODE_ENV: "test" },
}));

const { queryQboInvoices } = await import("~/lib/quickbooks/invoices");
const mockQuery = vi.mocked(queryQboInvoices);

const Sentry = await import("@sentry/nextjs");
const mockCapture = vi.mocked(Sentry.captureException);

// ── fixtures ────────────────────────────────────────────────────────────────

const NOW = new Date("2026-07-31T12:00:00.000Z");
const REALM = "realm_1";
/** Must match the mocked `env.QBO_ENVIRONMENT` above. */
const PLATFORM_ENV = "sandbox";
const TIME_ZONE = "America/Detroit";

type InvoiceRow = {
  id: string;
  businessId: string;
  realmId: string;
  qboInvoiceId: string | null;
  status: string;
  amountCents: number;
  paidAt: Date | null;
};

type ConnectionRow = {
  businessId: string;
  status: string;
  realmId: string;
  environment: string;
};

type BusinessRow = {
  id: string;
  featureFlags: unknown;
  /**
   * The business's connection, as the fixtures describe it. The sweep reads
   * connections from their own table now, not through this relation — the
   * harness derives that query's answer from these (see `makeDb`), so one
   * fixture still describes one tenant end to end.
   */
  quickBooksConnection: {
    status: string;
    realmId: string;
    environment?: string;
  } | null;
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

/** The connection rows a set of business fixtures implies. */
function connectionsFor(businesses: readonly BusinessRow[]): ConnectionRow[] {
  return businesses.flatMap((business) =>
    business.quickBooksConnection
      ? [
          {
            businessId: business.id,
            status: business.quickBooksConnection.status,
            realmId: business.quickBooksConnection.realmId,
            environment:
              business.quickBooksConnection.environment ?? PLATFORM_ENV,
          },
        ]
      : [],
  );
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

type ThrottleClause = { lastSyncedAt: null } | { lastSyncedAt: { lt: Date } };

type InvoiceFindManyArgs = {
  where: {
    status: { in: readonly string[] };
    qboInvoiceId: { not: null };
    businessId?: string;
    /** One `(businessId, realmId)` pair per live connection. */
    OR?: { businessId: string; realmId: string }[];
    /** The throttle, nested one level down now that `OR` is taken. */
    AND?: { OR: ThrottleClause[] }[];
  };
  orderBy?: unknown;
  take?: number;
  select?: unknown;
};

type ConnectionFindManyArgs = {
  where: { status: string; businessId?: string };
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
 * clause and the realm pairs are actually present.
 *
 * `quickBooksConnection.findMany` is the exception: it DOES honour its `where`
 * (`status: "active"`, plus `businessId` when scoped), because that filter is
 * the gate the whole run gets to skip through, and a double that ignored it
 * would make every skip test pass for the wrong reason.
 */
function makeDb(opts: {
  invoices?: InvoiceRow[];
  businesses?: BusinessRow[];
  /** Override the connections the business fixtures would imply. */
  connections?: ConnectionRow[];
}) {
  const invoices = opts.invoices ?? [];
  const businesses = opts.businesses ?? [makeBusiness()];
  const connections = opts.connections ?? connectionsFor(businesses);

  const connectionFindMany = vi.fn((args: ConnectionFindManyArgs) =>
    Promise.resolve(
      connections.filter(
        (c) =>
          c.status === args.where.status &&
          (args.where.businessId === undefined ||
            c.businessId === args.where.businessId),
      ),
    ),
  );

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
    Promise.resolve(
      businesses
        .filter((b) => args.where.id.in.includes(b.id))
        .map((b) => ({ ...b, timeZone: TIME_ZONE })),
    ),
  );

  const db = {
    quickBooksInvoice: {
      findMany: invoiceFindMany,
      update: invoiceUpdate,
      updateMany: invoiceUpdateMany,
    },
    quickBooksConnection: {
      findMany: connectionFindMany,
      update: connectionUpdate,
    },
    business: { findMany: businessFindMany },
  };

  return {
    db: db as unknown as Parameters<typeof syncQuickBooksInvoices>[0],
    connectionFindMany,
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
  it("returns 0 on ONE query when no business has an active connection", async () => {
    const harness = makeDb({
      invoices: [makeInvoice()],
      connections: [],
    });

    const count = await syncQuickBooksInvoices(harness.db, { now: NOW });

    expect(count).toBe(0);
    // The steady state on a platform where nobody uses QuickBooks — and the
    // cost this whole ordering exists to keep at one small SELECT. The invoice
    // table, which is the big one, is never touched.
    expect(harness.connectionFindMany).toHaveBeenCalledTimes(1);
    expect(harness.invoiceFindMany).not.toHaveBeenCalled();
    expect(harness.businessFindMany).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
    expect(harness.invoiceUpdate).not.toHaveBeenCalled();
    expect(harness.connectionUpdate).not.toHaveBeenCalled();
  });

  it("returns 0 when a connection exists but no invoice is due for a poll", async () => {
    const harness = makeDb({ invoices: [] });

    const count = await syncQuickBooksInvoices(harness.db, { now: NOW });

    expect(count).toBe(0);
    // No business load, no network, no writes.
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
    // Filtered out by `status: "active"` on the very first query, so the run
    // ends before the invoice table is read at all.
    expect(harness.invoiceFindMany).not.toHaveBeenCalled();
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
    expect(harness.invoiceFindMany).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
    expect(harness.invoiceUpdate).not.toHaveBeenCalled();
  });

  it("skips a connection made in the wrong Intuit environment, telling the owner why", async () => {
    const harness = makeDb({
      invoices: [makeInvoice()],
      businesses: [
        makeBusiness({
          quickBooksConnection: {
            status: "active",
            realmId: REALM,
            // A production realm on a sandbox deployment: its ids name nothing
            // on the API this deployment talks to.
            environment: "production",
          },
        }),
      ],
    });

    const count = await syncQuickBooksInvoices(harness.db, { now: NOW });

    expect(count).toBe(0);
    // No request is made against a realm that cannot resolve...
    expect(mockQuery).not.toHaveBeenCalled();
    // ...and no invoice row is stamped, so all of them retry the instant the
    // owner reconnects.
    expect(harness.invoiceUpdate).not.toHaveBeenCalled();
    expect(harness.invoiceUpdateMany).not.toHaveBeenCalled();

    // The owner-facing half: the reason lands on the connection, without a
    // `lastSyncAt` (nothing synced).
    expect(harness.connectionCalls()).toEqual([
      {
        where: { businessId: "biz_1" },
        data: {
          lastSyncError: qboEnvironmentMismatchMessage(
            "production",
            PLATFORM_ENV,
          ),
        },
      },
    ]);
    // Not an operator event — only the owner can fix it, and it would re-fire
    // on every tick until they did.
    expect(mockCapture).not.toHaveBeenCalled();
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

  it("leaves balanceCents alone when QBO reports no Balance", async () => {
    const harness = makeDb({ invoices: [makeInvoice()] });
    // A read of a freshly created invoice that Intuit hasn't finished indexing
    // omits `Balance` entirely.
    mockQuery.mockResolvedValue([
      makeQboInvoice({ Balance: undefined, SyncToken: "4" }),
    ]);

    expect(await syncQuickBooksInvoices(harness.db, { now: NOW })).toBe(1);

    const data = harness.updateCalls()[0]?.data;
    // `undefined`, not `null`: writing null would blank a balance we already
    // knew and show nothing owed on an unpaid invoice.
    expect(data).toHaveProperty("balanceCents", undefined);
    expect(data?.qboSyncToken).toBe("4");
  });

  it("judges overdue against the business's calendar day, not the server's", async () => {
    // 2026-08-01T02:00Z is still 2026-07-31 in America/Detroit (UTC-4). An
    // invoice due 2026-07-31 is therefore NOT late for this store — but it
    // looks a day late to anyone comparing against UTC, which is exactly the
    // bug a missing `timeZone` passthrough would reintroduce for the last few
    // hours of every single day.
    const lateEvening = new Date("2026-08-01T02:00:00.000Z");
    const harness = makeDb({ invoices: [makeInvoice()] });
    mockQuery.mockResolvedValue([
      makeQboInvoice({ DueDate: "2026-07-31", Balance: 100 }),
    ]);

    expect(await syncQuickBooksInvoices(harness.db, { now: lateEvening })).toBe(
      1,
    );

    expect(harness.updateCalls()[0]?.data.status).toBe("sent");
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
  it("selects only rows whose realm matches a live connection", async () => {
    const harness = makeDb({
      invoices: [],
      businesses: [
        makeBusiness({ id: "biz_1" }),
        makeBusiness({
          id: "biz_2",
          quickBooksConnection: { status: "active", realmId: "realm_2" },
        }),
        // Disconnected: contributes no pair, so none of its rows can be picked
        // up by another tenant's pair either.
        makeBusiness({
          id: "biz_3",
          quickBooksConnection: { status: "disconnected", realmId: "realm_3" },
        }),
      ],
    });

    await syncQuickBooksInvoices(harness.db, { now: NOW });

    const args = harness.invoiceFindMany.mock.calls[0]?.[0];
    expect(args?.where.OR).toEqual([
      { businessId: "biz_1", realmId: REALM },
      { businessId: "biz_2", realmId: "realm_2" },
    ]);
  });

  it("keeps a stale-realm row that reaches the loop out of the QBO query", async () => {
    // The `where` above should make this unreachable; the in-loop filter is the
    // second reader of a rule whose failure mode is marking a real, possibly
    // paid, invoice `voided`.
    const harness = makeDb({
      invoices: [
        makeInvoice({ id: "inv_old", realmId: "realm_old", qboInvoiceId: "9" }),
        makeInvoice({ id: "inv_new", qboInvoiceId: "102" }),
      ],
    });
    mockQuery.mockResolvedValue([makeQboInvoice({ Id: "102", Balance: 0 })]);

    const count = await syncQuickBooksInvoices(harness.db, { now: NOW });

    expect(count).toBe(1);

    // Asking the new company for the old company's id would return nothing and
    // look exactly like a deletion — so it must never be asked.
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0]?.[2]).toEqual(["102"]);

    // The label is the OAuth callback's job now, at the moment the company
    // changes — the sweep writes nothing to the orphaned row.
    expect(harness.invoiceUpdateMany).not.toHaveBeenCalled();

    expect(harness.updateCalls()).toHaveLength(1);
    expect(harness.updateCalls()[0]?.where).toEqual({ id: "inv_new" });
  });

  it("exports the label the callback stamps", () => {
    // Shared verbatim with `src/app/api/quickbooks/connect/callback/route.ts`;
    // it is owner-facing text rendered in the admin invoice list.
    expect(QBO_REALM_MISMATCH_ERROR).toBe(
      "Belongs to a previous QuickBooks company",
    );
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
    // `OR` is the realm pairs, so the throttle lives one level down under
    // `AND` — Prisma takes exactly one `OR` per level.
    expect(args?.where.AND).toEqual([
      {
        OR: [
          { lastSyncedAt: null },
          {
            lastSyncedAt: {
              lt: new Date(NOW.getTime() - QBO_MIN_INVOICE_SYNC_INTERVAL_MS),
            },
          },
        ],
      },
    ]);
    expect(args?.take).toBe(QBO_SYNC_BATCH);
    expect(args?.orderBy).toEqual([
      { lastSyncedAt: { sort: "asc", nulls: "first" } },
    ]);
  });

  it("drops the throttle clause and narrows to one business on demand", async () => {
    const harness = makeDb({
      invoices: [],
      businesses: [makeBusiness({ id: "biz_7" })],
    });

    await syncQuickBooksInvoices(harness.db, {
      now: NOW,
      businessId: "biz_7",
      ignoreInterval: true,
      take: 5,
    });

    const args = harness.invoiceFindMany.mock.calls[0]?.[0];
    expect(args?.where.businessId).toBe("biz_7");
    // The human clicking "Refresh" wants a poll now — but the batch cap stays.
    expect(args?.where.AND).toBeUndefined();
    expect(args?.take).toBe(5);
    // The connection query is scoped too, so a tenant's own Refresh can never
    // widen into a platform-wide sweep.
    expect(harness.connectionFindMany.mock.calls[0]?.[0].where).toEqual({
      status: "active",
      businessId: "biz_7",
    });
  });
});
