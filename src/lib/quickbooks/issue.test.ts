/**
 * `issueInvoice` — the only code path that can bill a real customer twice.
 *
 * These tests are almost entirely about ONE failure: an invoice that was
 * successfully created at Intuit while the local row failed to record it. The
 * row is what every later decision reads, so if the record is lost the retry
 * button — offered precisely because the row says `error` — creates a SECOND
 * invoice in the owner's books and emails their customer again. Nothing about
 * that looks broken from SimplePress's side; the owner finds out from the
 * customer.
 *
 * So the tests below assert the ordering that prevents it (ids captured before
 * the write, re-persisted from the catch), the resume behaviour that acts on
 * it (a row holding an Intuit id sends rather than re-creates, whatever its
 * status says), and the Sentry breadcrumb for the one case nothing can fix
 * automatically — both writes failed and an operator has to repair the row by
 * hand.
 *
 * Everything that talks to Intuit is mocked; `mapping.ts` is deliberately NOT,
 * so the `BillAddr` assertions check the real payload an owner's customer would
 * see rather than a stubbed shape. `server-only` needs no mock — vitest.config
 * aliases it for every project.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DbClient } from "~/server/db";

vi.mock("~/lib/quickbooks/customers", () => ({
  ensureCustomer: vi.fn(),
}));

vi.mock("~/lib/quickbooks/items", () => ({
  ensureServiceItemId: vi.fn(),
  resetItemCache: vi.fn(),
}));

vi.mock("~/lib/quickbooks/invoices", () => ({
  createQboInvoice: vi.fn(),
  sendQboInvoice: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const { ensureCustomer } = await import("~/lib/quickbooks/customers");
const { createQboInvoice, sendQboInvoice } =
  await import("~/lib/quickbooks/invoices");
const { ensureServiceItemId } = await import("~/lib/quickbooks/items");
const Sentry = await import("@sentry/nextjs");
const { issueInvoice } = await import("~/lib/quickbooks/issue");

const mockEnsureCustomer = vi.mocked(ensureCustomer);
const mockEnsureItem = vi.mocked(ensureServiceItemId);
const mockCreate = vi.mocked(createQboInvoice);
const mockSend = vi.mocked(sendQboInvoice);
const mockCapture = vi.mocked(Sentry.captureException);

// ── fixtures ────────────────────────────────────────────────────────────────

const BUSINESS_ID = "biz_1";
const ROW_ID = "inv_1";
const REALM = "realm_1";
const QBO_INVOICE_ID = "555";
const QBO_CUSTOMER_ID = "77";

const ADDRESS = {
  line1: "123 Woodward Ave",
  line2: "Suite 4",
  city: "Detroit",
  state: "MI",
  zip: "48226",
};

/** The `BillAddr` `toQboBillAddr` produces for `ADDRESS` — Intuit's vocabulary. */
const QBO_BILL_ADDR = {
  Line1: "123 Woodward Ave",
  Line2: "Suite 4",
  City: "Detroit",
  CountrySubDivisionCode: "MI",
  PostalCode: "48226",
  Country: "USA",
};

type InvoiceRow = {
  id: string;
  businessId: string;
  quoteSubmissionId: string | null;
  kind: string;
  status: string;
  amountCents: number;
  memo: string | null;
  description: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  billingAddress: string | null;
  dueDate: Date | null;
  realmId: string;
  qboInvoiceId: string | null;
  qboCustomerId: string | null;
};

function makeRow(overrides: Partial<InvoiceRow> = {}): InvoiceRow {
  return {
    id: ROW_ID,
    businessId: BUSINESS_ID,
    quoteSubmissionId: null,
    kind: "deposit",
    status: "pending",
    amountCents: 25_000,
    memo: null,
    description: "Deposit",
    customerName: "Jane Smith",
    customerEmail: "jane@example.com",
    customerPhone: null,
    billingAddress: null,
    dueDate: new Date("2026-09-01T00:00:00.000Z"),
    realmId: REALM,
    qboInvoiceId: null,
    qboCustomerId: null,
    ...overrides,
  };
}

type UpdateArgs = { where: { id: string }; data: Record<string, unknown> };

/**
 * A STATEFUL `db` double: `update` merges into the same row `findUnique` hands
 * back, so a second `issueInvoice` call sees exactly what the first one
 * managed to persist. That is the whole point — the duplicate-invoice bug only
 * exists in the gap between two runs.
 *
 * `failUpdates` names the 0-based update calls that should reject, which is how
 * "the write that records the Intuit id fails" gets reproduced.
 */
function makeHarness(
  overrides: Partial<InvoiceRow> = {},
  opts: { failUpdates?: number[] } = {},
) {
  const row = makeRow(overrides);
  const failUpdates = new Set(opts.failUpdates ?? []);
  let updateCount = 0;

  const invoiceUpdate = vi.fn((args: UpdateArgs) => {
    const index = updateCount++;
    if (failUpdates.has(index)) {
      return Promise.reject(new Error("connection terminated"));
    }
    Object.assign(row, args.data);
    return Promise.resolve({ ...row });
  });

  const db = {
    quickBooksInvoice: {
      findUnique: vi.fn(() => Promise.resolve({ ...row })),
      findUniqueOrThrow: vi.fn(() => Promise.resolve({ ...row })),
      findFirst: vi.fn(() => Promise.resolve(null)),
      update: invoiceUpdate,
    },
    quickBooksConnection: {
      findUnique: vi.fn(() =>
        Promise.resolve({
          status: "active",
          realmId: REALM,
          defaultDueDays: 7,
        }),
      ),
    },
    business: {
      findUnique: vi.fn(() =>
        Promise.resolve({
          name: "Handy Relocations",
          timeZone: "America/Detroit",
        }),
      ),
    },
  };

  return {
    db: db as unknown as DbClient,
    row,
    invoiceUpdate,
    updateArgs: () => invoiceUpdate.mock.calls.map((c) => c[0]),
  };
}

function issue(db: DbClient, send = true) {
  return issueInvoice(db, {
    businessId: BUSINESS_ID,
    invoiceRowId: ROW_ID,
    send,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEnsureItem.mockResolvedValue("item_1");
  mockEnsureCustomer.mockResolvedValue({ id: QBO_CUSTOMER_ID });
  mockCreate.mockResolvedValue({
    Id: QBO_INVOICE_ID,
    SyncToken: "0",
    DocNumber: "1042",
    Balance: 250,
  });
  mockSend.mockResolvedValue({ Id: QBO_INVOICE_ID, SyncToken: "1" });
});

// ── the happy path ──────────────────────────────────────────────────────────

describe("issuing", () => {
  it("creates, records, and sends in one run", async () => {
    const harness = makeHarness();

    await issue(harness.db);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledTimes(1);

    const [created, sent] = harness.updateArgs();
    expect(created?.data).toMatchObject({
      status: "created",
      qboInvoiceId: QBO_INVOICE_ID,
      qboCustomerId: QBO_CUSTOMER_ID,
      qboDocNumber: "1042",
      realmId: REALM,
      lastError: null,
    });
    expect(sent?.data).toMatchObject({ status: "sent", lastError: null });
  });
});

// ── the duplicate-invoice hole ──────────────────────────────────────────────

describe("a create that succeeded but could not be recorded", () => {
  it("persists the Intuit ids from the catch instead of marking the row error", async () => {
    // The failure: Intuit created the invoice, then the write recording it died.
    const harness = makeHarness({}, { failUpdates: [0] });

    await expect(issue(harness.db)).rejects.toThrow("connection terminated");

    const recovery = harness.updateArgs()[1];
    // `error` here is what would offer a Retry that creates a SECOND invoice.
    expect(recovery?.data.status).toBe("created");
    expect(recovery?.data.qboInvoiceId).toBe(QBO_INVOICE_ID);
    expect(recovery?.data.qboCustomerId).toBe(QBO_CUSTOMER_ID);
    expect(recovery?.data.realmId).toBe(REALM);
    expect(recovery?.data.lastError).toBe("connection terminated");

    // The send never ran — the row's state was unknown at that point.
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("resumes at the send on the next run, with no second create", async () => {
    const harness = makeHarness({}, { failUpdates: [0] });

    await expect(issue(harness.db)).rejects.toThrow();
    expect(mockCreate).toHaveBeenCalledTimes(1);

    // Same row, same harness: the retry sees what the catch salvaged.
    await issue(harness.db);

    // The assertion the whole ordering exists for.
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      harness.db,
      BUSINESS_ID,
      QBO_INVOICE_ID,
      "jane@example.com",
    );
  });

  it("reports to Sentry when the salvage write ALSO fails", async () => {
    const harness = makeHarness({}, { failUpdates: [0, 1] });

    await expect(issue(harness.db)).rejects.toThrow("connection terminated");

    // Nothing else will ever reconcile this row — an operator needs the ids.
    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(mockCapture.mock.calls[0]?.[1]).toMatchObject({
      tags: {
        service: "quickbooks",
        "quickbooks.step": "persist-invoice-id",
        businessId: BUSINESS_ID,
      },
      extra: { invoiceRowId: ROW_ID, qboInvoiceId: QBO_INVOICE_ID },
    });
  });

  it("still records a plain failure as error when nothing reached Intuit", async () => {
    const harness = makeHarness();
    mockCreate.mockRejectedValue(new Error("Intuit is down"));

    await expect(issue(harness.db)).rejects.toThrow("Intuit is down");

    expect(harness.updateArgs()[0]?.data).toEqual({
      status: "error",
      lastError: "Intuit is down",
    });
    expect(mockCapture).not.toHaveBeenCalled();
  });
});

// ── resume ──────────────────────────────────────────────────────────────────

describe("resume", () => {
  it("sends a pending row that already holds an Intuit invoice id", async () => {
    // The exact state the salvage write above leaves behind if IT was the one
    // that landed first: a row whose status never advanced past `pending` but
    // which does carry a real invoice.
    const harness = makeHarness({
      status: "pending",
      qboInvoiceId: QBO_INVOICE_ID,
      qboCustomerId: QBO_CUSTOMER_ID,
    });

    await issue(harness.db);

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(harness.updateArgs()[0]?.data).toMatchObject({ status: "sent" });
  });

  it("does not send a pending row with nothing at Intuit yet when send is off", async () => {
    const harness = makeHarness();

    await issue(harness.db, false);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockSend).not.toHaveBeenCalled();
  });
});

// ── billing address ─────────────────────────────────────────────────────────

describe("billing address", () => {
  it("puts the snapshot on both the new customer and the invoice", async () => {
    const harness = makeHarness({ billingAddress: JSON.stringify(ADDRESS) });

    await issue(harness.db);

    expect(mockEnsureCustomer.mock.calls[0]?.[2]).toMatchObject({
      billAddr: QBO_BILL_ADDR,
    });
    expect(mockCreate.mock.calls[0]?.[2]).toMatchObject({
      BillAddr: QBO_BILL_ADDR,
    });
  });

  it("issues without a BillAddr when the column is null or unparseable", async () => {
    for (const billingAddress of [null, "not json", '{"city":"Detroit"}']) {
      vi.clearAllMocks();
      mockEnsureItem.mockResolvedValue("item_1");
      mockEnsureCustomer.mockResolvedValue({ id: QBO_CUSTOMER_ID });
      mockCreate.mockResolvedValue({ Id: QBO_INVOICE_ID, SyncToken: "0" });
      mockSend.mockResolvedValue({ Id: QBO_INVOICE_ID, SyncToken: "1" });

      const harness = makeHarness({ billingAddress });
      await issue(harness.db);

      // A row from before the column existed must issue exactly as it always
      // did, not fail validation.
      expect(mockEnsureCustomer.mock.calls[0]?.[2]).toMatchObject({
        billAddr: null,
      });
      expect(mockCreate.mock.calls[0]?.[2]).not.toHaveProperty("BillAddr");
    }
  });
});
