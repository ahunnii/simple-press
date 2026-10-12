import Papa from "papaparse";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createMembership,
  createOwnerUser,
  createUser,
} from "../helpers/factories";

/**
 * Coverage for `invoice.activity` / `invoice.exportActivity` — the store-wide
 * Invoices → Activity log: business scoping, type / date (business time zone)
 * / search filters, page clamp, the actor lookup, the ungated read tier, and
 * the CSV export.
 *
 * Tenant resolution reads the request host through `next/headers` — mocked
 * with a mutable host, same idiom as `invoice-router.test.ts`.
 */
const reqHost = vi.hoisted(() => ({
  value: "invoice-activity.simplepress.test",
}));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

async function setup(
  opts: { featureFlags?: Record<string, boolean>; timeZone?: string } = {},
) {
  const business = await createBusiness({
    featureFlags: opts.featureFlags ?? { invoices: true },
    timeZone: opts.timeZone ?? "America/Detroit",
  });
  reqHost.value = `${business.subdomain}.simplepress.test`;
  const owner = await createOwnerUser(business.id);
  const caller = createTestCaller({ userId: owner.id, email: owner.email });
  return { business, owner, caller };
}

/** Write an invoice row directly (no router, so no auto-logged events). */
function seedInvoice(
  businessId: string,
  opts: {
    invoiceNumber: number;
    customerName?: string;
    customerEmail?: string;
    numberPrefix?: string;
  },
) {
  return db.invoice.create({
    data: {
      businessId,
      invoiceNumber: opts.invoiceNumber,
      numberPrefix: opts.numberPrefix ?? "INV-",
      status: "SENT",
      customerName: opts.customerName ?? "Grace Hopper",
      customerEmail:
        opts.customerEmail ?? `grace-${opts.invoiceNumber}@customer.test`,
      lineItems: JSON.stringify([
        { id: "l1", description: "Work", quantity: 1, unitPriceCents: 10_000 },
      ]),
      subtotalCents: 10_000,
      totalCents: 10_000,
      sentAt: new Date(),
      sentVia: "manual",
    },
  });
}

function seedEvent(
  invoice: { id: string; businessId: string },
  opts: {
    type?: string;
    createdAt?: Date;
    actorUserId?: string | null;
    metadata?: Record<string, unknown>;
  } = {},
) {
  return db.invoiceEvent.create({
    data: {
      invoiceId: invoice.id,
      businessId: invoice.businessId,
      type: opts.type ?? "SENT",
      createdAt: opts.createdAt ?? new Date(),
      actorUserId: opts.actorUserId ?? null,
      ...(opts.metadata
        ? { metadata: opts.metadata as unknown as object }
        : {}),
    },
  });
}

describe("invoice.activity", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("returns only this business's events, newest first, with the invoice summary", async () => {
    const { business, caller } = await setup();
    const other = await createBusiness({ featureFlags: { invoices: true } });

    const mine = await seedInvoice(business.id, { invoiceNumber: 1 });
    const theirs = await seedInvoice(other.id, {
      invoiceNumber: 1,
      customerName: "Foreign Customer",
    });
    await seedEvent(mine, {
      type: "CREATED",
      createdAt: new Date("2026-09-01T12:00:00Z"),
    });
    await seedEvent(mine, {
      type: "SENT",
      createdAt: new Date("2026-09-02T12:00:00Z"),
    });
    await seedEvent(theirs, { type: "SENT" });

    const result = await caller.invoice.activity({});

    expect(result.totalCount).toBe(2);
    expect(result.rows.map((r) => r.type)).toEqual(["SENT", "CREATED"]);
    expect(result.rows.every((r) => r.invoice.id === mine.id)).toBe(true);
    expect(result.rows[0]!.invoice).toEqual({
      id: mine.id,
      invoiceNumber: 1,
      numberPrefix: "INV-",
      displayNumber: "INV-0001",
      customerName: "Grace Hopper",
      customerEmail: "grace-1@customer.test",
      status: "SENT",
    });
    expect(result).toMatchObject({
      page: 1,
      pageCount: 1,
      pageSize: 25,
      timeZone: "America/Detroit",
    });
  });

  it("is not feature-gated: history stays readable with invoices turned off", async () => {
    const { business, caller } = await setup({
      featureFlags: { invoices: false },
    });
    const invoice = await seedInvoice(business.id, { invoiceNumber: 1 });
    await seedEvent(invoice);

    const result = await caller.invoice.activity({});
    expect(result.totalCount).toBe(1);
  });

  it("refuses STAFF", async () => {
    const { business } = await setup();
    const staff = await createUser();
    await createMembership(business.id, staff.id, "STAFF");
    const staffCaller = createTestCaller({
      userId: staff.id,
      email: staff.email,
    });

    await expect(staffCaller.invoice.activity({})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("filters by event type", async () => {
    const { business, caller } = await setup();
    const invoice = await seedInvoice(business.id, { invoiceNumber: 1 });
    await seedEvent(invoice, { type: "CREATED" });
    await seedEvent(invoice, { type: "PAYMENT_RECORDED" });
    await seedEvent(invoice, { type: "PAYMENT_RECORDED" });

    const result = await caller.invoice.activity({ type: "PAYMENT_RECORDED" });
    expect(result.totalCount).toBe(2);
    expect(result.rows.every((r) => r.type === "PAYMENT_RECORDED")).toBe(true);
  });

  it("filters by date range in the business time zone (inclusive `to`)", async () => {
    // Detroit is UTC-4 in September: 02:00Z on the 10th is still the 9th locally.
    const { business, caller } = await setup({ timeZone: "America/Detroit" });
    const invoice = await seedInvoice(business.id, { invoiceNumber: 1 });
    const lateNinth = await seedEvent(invoice, {
      createdAt: new Date("2026-09-10T02:00:00Z"),
    });
    const earlyTenth = await seedEvent(invoice, {
      createdAt: new Date("2026-09-10T05:00:00Z"),
    });

    const ninth = await caller.invoice.activity({
      from: "2026-09-09",
      to: "2026-09-09",
    });
    expect(ninth.rows.map((r) => r.id)).toEqual([lateNinth.id]);

    const tenth = await caller.invoice.activity({
      from: "2026-09-10",
      to: "2026-09-10",
    });
    expect(tenth.rows.map((r) => r.id)).toEqual([earlyTenth.id]);

    const both = await caller.invoice.activity({
      from: "2026-09-09",
      to: "2026-09-10",
    });
    expect(both.totalCount).toBe(2);

    const fromOnly = await caller.invoice.activity({ from: "2026-09-10" });
    expect(fromOnly.rows.map((r) => r.id)).toEqual([earlyTenth.id]);

    const toOnly = await caller.invoice.activity({ to: "2026-09-09" });
    expect(toOnly.rows.map((r) => r.id)).toEqual([lateNinth.id]);
  });

  it("rejects a non-calendar date", async () => {
    const { caller } = await setup();
    await expect(
      caller.invoice.activity({ from: "2026-02-30" }),
    ).rejects.toThrow();
  });

  describe("search", () => {
    it("matches customer name and email (case-insensitive) and the invoice number", async () => {
      const { business, caller } = await setup();
      const ada = await seedInvoice(business.id, {
        invoiceNumber: 7,
        customerName: "Ada Lovelace",
        customerEmail: "ada@analytical.test",
      });
      const alan = await seedInvoice(business.id, {
        invoiceNumber: 12,
        customerName: "Alan Turing",
        customerEmail: "alan@bletchley.test",
      });
      await seedEvent(ada);
      await seedEvent(ada, { type: "VIEWED" });
      await seedEvent(alan);

      const byName = await caller.invoice.activity({ search: "LOVELACE" });
      expect(byName.totalCount).toBe(2);
      expect(byName.rows.every((r) => r.invoice.id === ada.id)).toBe(true);

      const byEmail = await caller.invoice.activity({ search: "bletchley" });
      expect(byEmail.rows.map((r) => r.invoice.id)).toEqual([alan.id]);

      for (const search of ["12", "#12", "INV-0012", "inv-12"]) {
        const byNumber = await caller.invoice.activity({ search });
        expect(byNumber.rows.map((r) => r.invoice.id)).toEqual([alan.id]);
      }

      const none = await caller.invoice.activity({ search: "nobody-here" });
      expect(none.totalCount).toBe(0);
      expect(none.rows).toEqual([]);
    });

    it("never reaches another business's invoice with the same number", async () => {
      const { business, caller } = await setup();
      const other = await createBusiness({ featureFlags: { invoices: true } });
      const mine = await seedInvoice(business.id, { invoiceNumber: 3 });
      const theirs = await seedInvoice(other.id, { invoiceNumber: 3 });
      await seedEvent(mine);
      await seedEvent(theirs);

      const result = await caller.invoice.activity({ search: "3" });
      expect(result.rows.map((r) => r.invoice.id)).toEqual([mine.id]);
    });
  });

  it("pages at 25 and clamps an out-of-range page to the last", async () => {
    const { business, caller } = await setup();
    const invoice = await seedInvoice(business.id, { invoiceNumber: 1 });
    await db.invoiceEvent.createMany({
      data: Array.from({ length: 30 }, (_, i) => ({
        invoiceId: invoice.id,
        businessId: business.id,
        type: "VIEWED",
        createdAt: new Date(Date.UTC(2026, 8, 1, 0, i)),
      })),
    });

    const first = await caller.invoice.activity({ page: 1 });
    expect(first).toMatchObject({ totalCount: 30, pageCount: 2, page: 1 });
    expect(first.rows).toHaveLength(25);

    const clamped = await caller.invoice.activity({ page: 999 });
    expect(clamped.page).toBe(2);
    expect(clamped.rows).toHaveLength(5);
    // Newest first across pages: page 2 holds the oldest five.
    expect(clamped.rows.at(-1)!.createdAt.toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );

    const empty = await createBusiness({ featureFlags: { invoices: true } });
    reqHost.value = `${empty.subdomain}.simplepress.test`;
    const emptyOwner = await createOwnerUser(empty.id);
    const emptyCaller = createTestCaller({
      userId: emptyOwner.id,
      email: emptyOwner.email,
    });
    const none = await emptyCaller.invoice.activity({ page: 5 });
    expect(none).toMatchObject({ totalCount: 0, page: 1, pageCount: 1 });
  });

  it("resolves actors to name/email, with null for customer/system events", async () => {
    const { business, owner, caller } = await setup();
    const unnamed = await db.user.create({
      data: { name: "", email: "unnamed@store.test", emailVerified: true },
    });
    const invoice = await seedInvoice(business.id, { invoiceNumber: 1 });
    await seedEvent(invoice, {
      type: "PAYMENT_RECORDED",
      actorUserId: owner.id,
      createdAt: new Date("2026-09-03T12:00:00Z"),
    });
    await seedEvent(invoice, {
      type: "UPDATED",
      actorUserId: unnamed.id,
      createdAt: new Date("2026-09-02T12:00:00Z"),
    });
    await seedEvent(invoice, {
      type: "VIEWED",
      createdAt: new Date("2026-09-01T12:00:00Z"),
    });

    const { rows } = await caller.invoice.activity({});
    expect(rows.map((r) => r.actor)).toEqual([
      { name: "Test Owner", email: owner.email },
      { name: "", email: "unnamed@store.test" },
      null,
    ]);
  });
});

describe("invoice.exportActivity", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("exports the filtered feed as CSV with labelled columns", async () => {
    const { business, owner, caller } = await setup();
    const other = await createBusiness({ featureFlags: { invoices: true } });
    const invoice = await seedInvoice(business.id, {
      invoiceNumber: 12,
      customerName: "Ada Lovelace",
    });
    const foreign = await seedInvoice(other.id, { invoiceNumber: 1 });
    await seedEvent(invoice, {
      type: "PAYMENT_RECORDED",
      actorUserId: owner.id,
      createdAt: new Date("2026-09-03T12:00:00Z"),
      metadata: { amountCents: 4000, method: "card" },
    });
    await seedEvent(invoice, {
      type: "VIEWED",
      createdAt: new Date("2026-09-02T12:00:00Z"),
    });
    await seedEvent(invoice, {
      type: "OVERDUE_ALERTED",
      createdAt: new Date("2026-09-01T12:00:00Z"),
    });
    await seedEvent(foreign);

    const result = await caller.invoice.exportActivity({});
    expect(result.capped).toBe(false);
    expect(result.filename).toMatch(
      /^invoice-activity-\d{4}-\d{2}-\d{2}\.csv$/,
    );

    const parsed = Papa.parse<Record<string, string>>(result.csv, {
      header: true,
      skipEmptyLines: true,
    });
    expect(parsed.meta.fields).toEqual([
      "Date",
      "Invoice #",
      "Customer",
      "Event",
      "Details",
      "By",
    ]);
    expect(parsed.data).toEqual([
      {
        Date: "2026-09-03T12:00:00.000Z",
        "Invoice #": "INV-0012",
        Customer: "Ada Lovelace",
        Event: "Payment recorded",
        Details: "$40.00 · Card",
        By: "Test Owner",
      },
      {
        Date: "2026-09-02T12:00:00.000Z",
        "Invoice #": "INV-0012",
        Customer: "Ada Lovelace",
        Event: "Viewed by customer",
        Details: "",
        By: "Customer",
      },
      {
        Date: "2026-09-01T12:00:00.000Z",
        "Invoice #": "INV-0012",
        Customer: "Ada Lovelace",
        Event: "Overdue alert sent to you",
        Details: "",
        By: "System",
      },
    ]);

    const filtered = await caller.invoice.exportActivity({
      type: "VIEWED",
    });
    const filteredRows = Papa.parse<Record<string, string>>(filtered.csv, {
      header: true,
      skipEmptyLines: true,
    }).data;
    expect(filteredRows.map((r) => r.Event)).toEqual(["Viewed by customer"]);
  });
});
