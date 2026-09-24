import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as EmailTemplates from "~/lib/email/templates";
import { formatInvoiceNumber } from "~/lib/invoices/number";
import { notifyOverdueInvoices } from "~/lib/invoices/overdue-alerts";
import { sendInvoiceDigests } from "~/lib/invoices/weekly-digest";

import { db, resetDb } from "../helpers/db";
import { createBusiness } from "../helpers/factories";

/**
 * Coverage for the two invoice cron jobs (`src/lib/invoices/overdue-alerts.ts`
 * and `src/lib/invoices/weekly-digest.ts`), called directly with an injected
 * clock — same idiom as `loyalty-birthday.test.ts`: nothing here resolves a
 * tenant from the request host, so `next/headers` needs no mock.
 *
 * The invoice owner-email helpers are replaced with spies (everything else in
 * the templates module stays real), matching `invoice-router.test.ts`.
 */
const emailMocks = vi.hoisted(() => ({
  sendInvoiceOverdueOwnerAlert: vi.fn(),
  sendInvoiceWeeklyDigest: vi.fn(),
}));
vi.mock("~/lib/email/templates", async (importOriginal) => {
  const actual = await importOriginal<typeof EmailTemplates>();
  return {
    ...actual,
    sendInvoiceOverdueOwnerAlert: (...args: unknown[]): unknown =>
      emailMocks.sendInvoiceOverdueOwnerAlert(...args),
    sendInvoiceWeeklyDigest: (...args: unknown[]): unknown =>
      emailMocks.sendInvoiceWeeklyDigest(...args),
  };
});

/** A business with the invoices flag on, in a given time zone. */
async function setupStore(
  opts: { featureFlags?: Record<string, boolean>; timeZone?: string } = {},
) {
  return createBusiness({
    featureFlags: opts.featureFlags ?? { invoices: true },
    timeZone: opts.timeZone ?? "UTC",
  });
}

function createInvoiceSettings(
  businessId: string,
  overrides: Partial<{
    overdueAlertsEnabled: boolean;
    weeklyDigestEnabled: boolean;
    numberPadding: number;
    lastDigestWeekKey: string | null;
    lastDigestSentAt: Date | null;
  }> = {},
) {
  return db.invoiceSettings.create({
    data: {
      businessId,
      overdueAlertsEnabled: overrides.overdueAlertsEnabled ?? true,
      weeklyDigestEnabled: overrides.weeklyDigestEnabled ?? true,
      numberPadding: overrides.numberPadding ?? 4,
      lastDigestWeekKey: overrides.lastDigestWeekKey ?? null,
      lastDigestSentAt: overrides.lastDigestSentAt ?? null,
    },
  });
}

let seedNumber = 90_000;
/** Write an invoice row directly, bypassing the (flag-gated) router. */
function seedInvoice(
  businessId: string,
  opts: {
    status?: string;
    totalCents?: number;
    amountPaidCents?: number;
    dueDate?: Date | null;
    overdueNotifiedAt?: Date | null;
    customerName?: string;
  } = {},
) {
  const status = opts.status ?? "SENT";
  const total = opts.totalCents ?? 10_000;
  return db.invoice.create({
    data: {
      businessId,
      invoiceNumber: seedNumber++,
      status,
      customerName: opts.customerName ?? "Test Customer",
      customerEmail: "test-customer@example.test",
      lineItems: JSON.stringify([
        { id: "l1", description: "Work", quantity: 1, unitPriceCents: total },
      ]),
      subtotalCents: total,
      totalCents: total,
      amountPaidCents: opts.amountPaidCents ?? 0,
      issueDate: new Date("2026-09-01T00:00:00Z"),
      dueDate: opts.dueDate ?? null,
      sentAt: new Date("2026-09-01T00:00:00Z"),
      sentVia: "manual",
      overdueNotifiedAt: opts.overdueNotifiedAt ?? null,
    },
  });
}

/**
 * Typed wrapper around `expect.stringMatching` for use as a NESTED object
 * property value (e.g. `idempotencyKey: matchesString(...)` inside an outer
 * `expect.objectContaining({...})`). Vitest's own types declare
 * `stringMatching: (expected) => any`, which trips
 * `@typescript-eslint/no-unsafe-assignment` once the result becomes a
 * property value rather than a bare call argument — the runtime value is
 * unchanged, only the compile-time type is corrected here. Same idiom as
 * `matchesObject` in `subscription-sync.test.ts`.
 */
function matchesString(pattern: RegExp): string {
  return expect.stringMatching(pattern) as unknown as string;
}

function eventTypesFor(invoiceId: string) {
  return db.invoiceEvent
    .findMany({ where: { invoiceId }, select: { type: true } })
    .then((rows) => rows.map((r) => r.type));
}

describe("invoice overdue-alert cron", () => {
  beforeEach(async () => {
    await resetDb();
    emailMocks.sendInvoiceOverdueOwnerAlert.mockReset();
    emailMocks.sendInvoiceOverdueOwnerAlert.mockResolvedValue({
      success: true,
      id: "email_test",
    });
  });

  it("emails the owner once for a newly-overdue invoice, then sends nothing on a second run", async () => {
    const business = await setupStore();
    await createInvoiceSettings(business.id);
    const invoice = await seedInvoice(business.id, {
      dueDate: new Date("2026-09-20T00:00:00Z"),
    });
    const now = new Date("2026-09-23T12:00:00Z");

    expect(await notifyOverdueInvoices(db, { now })).toBe(1);
    expect(emailMocks.sendInvoiceOverdueOwnerAlert).toHaveBeenCalledTimes(1);
    expect(emailMocks.sendInvoiceOverdueOwnerAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 1,
        idempotencyKey: matchesString(
          new RegExp(`^invoice-overdue-${business.id}-[0-9a-f]{16}$`),
        ),
        invoices: [
          expect.objectContaining({
            displayNumber: formatInvoiceNumber(
              "INV-",
              invoice.invoiceNumber,
              4,
            ),
            customerName: "Test Customer",
            balanceCents: 10_000,
          }),
        ],
      }),
    );

    const stamped = await db.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
    });
    expect(stamped.overdueNotifiedAt).not.toBeNull();
    expect(await eventTypesFor(invoice.id)).toEqual(["OVERDUE_ALERTED"]);

    // Nothing left to alert on — the invoice is already stamped.
    expect(await notifyOverdueInvoices(db, { now })).toBe(0);
    expect(emailMocks.sendInvoiceOverdueOwnerAlert).toHaveBeenCalledTimes(1);
  });

  it("does not fire until the local day has rolled past the due date in the business's own zone", async () => {
    // Same due date, same instant, two zones on opposite sides of the date
    // line: Kiritimati (UTC+14) has already rolled its calendar past the due
    // date; Pago Pago (UTC-11) is still ON the due date, which is not yet
    // overdue.
    const kiritimati = await setupStore({ timeZone: "Pacific/Kiritimati" });
    const pagoPago = await setupStore({ timeZone: "Pacific/Pago_Pago" });
    await createInvoiceSettings(kiritimati.id);
    await createInvoiceSettings(pagoPago.id);

    const dueDate = new Date("2026-09-22T00:00:00Z");
    const kiritimatiInvoice = await seedInvoice(kiritimati.id, { dueDate });
    const pagoPagoInvoice = await seedInvoice(pagoPago.id, { dueDate });

    const now = new Date("2026-09-23T04:00:00Z");
    expect(await notifyOverdueInvoices(db, { now })).toBe(1);
    expect(emailMocks.sendInvoiceOverdueOwnerAlert).toHaveBeenCalledTimes(1);

    const kiritimatiStamped = await db.invoice.findUniqueOrThrow({
      where: { id: kiritimatiInvoice.id },
    });
    expect(kiritimatiStamped.overdueNotifiedAt).not.toBeNull();

    const pagoPagoUnstamped = await db.invoice.findUniqueOrThrow({
      where: { id: pagoPagoInvoice.id },
    });
    expect(pagoPagoUnstamped.overdueNotifiedAt).toBeNull();
  });

  it("skips a business whose invoices flag is off, without stamping", async () => {
    const business = await setupStore({ featureFlags: { invoices: false } });
    await createInvoiceSettings(business.id);
    const invoice = await seedInvoice(business.id, {
      dueDate: new Date("2026-09-01T00:00:00Z"),
    });
    const now = new Date("2026-09-23T12:00:00Z");

    expect(await notifyOverdueInvoices(db, { now })).toBe(0);
    expect(emailMocks.sendInvoiceOverdueOwnerAlert).not.toHaveBeenCalled();

    const unstamped = await db.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
    });
    expect(unstamped.overdueNotifiedAt).toBeNull();
  });

  it("stamps only when the alert email actually succeeds", async () => {
    emailMocks.sendInvoiceOverdueOwnerAlert.mockResolvedValueOnce({
      success: false,
    });
    const business = await setupStore();
    await createInvoiceSettings(business.id);
    const invoice = await seedInvoice(business.id, {
      dueDate: new Date("2026-09-20T00:00:00Z"),
    });
    const now = new Date("2026-09-23T12:00:00Z");

    expect(await notifyOverdueInvoices(db, { now })).toBe(0);
    const stillUnstamped = await db.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
    });
    expect(stillUnstamped.overdueNotifiedAt).toBeNull();
    expect(await eventTypesFor(invoice.id)).toEqual([]);

    // The next tick retries and this time the send succeeds.
    expect(await notifyOverdueInvoices(db, { now })).toBe(1);
    const stamped = await db.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
    });
    expect(stamped.overdueNotifiedAt).not.toBeNull();
  });

  it("stamps silently, without an email, once an invoice is more than 7 days overdue", async () => {
    const business = await setupStore();
    await createInvoiceSettings(business.id);
    // 13 days overdue as of `now` below.
    const invoice = await seedInvoice(business.id, {
      dueDate: new Date("2026-09-10T00:00:00Z"),
    });
    const now = new Date("2026-09-23T12:00:00Z");

    expect(await notifyOverdueInvoices(db, { now })).toBe(0);
    expect(emailMocks.sendInvoiceOverdueOwnerAlert).not.toHaveBeenCalled();

    const stamped = await db.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
    });
    expect(stamped.overdueNotifiedAt).not.toBeNull();
    expect(await eventTypesFor(invoice.id)).toEqual([]);
  });

  it("still alerts at exactly 7 days overdue (the boundary is inclusive of an alert)", async () => {
    const business = await setupStore();
    await createInvoiceSettings(business.id);
    // Exactly 7 days overdue as of `now` below.
    const invoice = await seedInvoice(business.id, {
      dueDate: new Date("2026-09-16T00:00:00Z"),
    });
    const now = new Date("2026-09-23T12:00:00Z");

    expect(await notifyOverdueInvoices(db, { now })).toBe(1);
    expect(emailMocks.sendInvoiceOverdueOwnerAlert).toHaveBeenCalledTimes(1);
    const stamped = await db.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
    });
    expect(stamped.overdueNotifiedAt).not.toBeNull();
  });

  it("stamps silently, without an email, when overdue alerts are disabled in settings", async () => {
    const business = await setupStore();
    await createInvoiceSettings(business.id, { overdueAlertsEnabled: false });
    const invoice = await seedInvoice(business.id, {
      dueDate: new Date("2026-09-20T00:00:00Z"),
    });
    const now = new Date("2026-09-23T12:00:00Z");

    expect(await notifyOverdueInvoices(db, { now })).toBe(0);
    expect(emailMocks.sendInvoiceOverdueOwnerAlert).not.toHaveBeenCalled();

    const stamped = await db.invoice.findUniqueOrThrow({
      where: { id: invoice.id },
    });
    expect(stamped.overdueNotifiedAt).not.toBeNull();
    expect(await eventTypesFor(invoice.id)).toEqual([]);
  });
});

describe("invoice weekly-digest cron", () => {
  beforeEach(async () => {
    await resetDb();
    emailMocks.sendInvoiceWeeklyDigest.mockReset();
    emailMocks.sendInvoiceWeeklyDigest.mockResolvedValue({
      success: true,
      id: "email_test",
    });
  });

  // 2026-09-21 is a Monday.
  const MONDAY_AFTER_8AM = new Date("2026-09-21T09:00:00Z");
  const MONDAY_BEFORE_8AM = new Date("2026-09-21T05:00:00Z");
  const WEEK_KEY = "2026-09-21";

  it("sends the digest once for the week, then sends nothing again for the same week", async () => {
    const business = await setupStore();
    await createInvoiceSettings(business.id);
    await seedInvoice(business.id, {
      status: "SENT",
      totalCents: 20_000,
      dueDate: new Date("2026-09-25T00:00:00Z"),
    });
    await seedInvoice(business.id, {
      status: "PARTIALLY_PAID",
      totalCents: 30_000,
      amountPaidCents: 10_000,
      dueDate: new Date("2026-09-10T00:00:00Z"), // overdue
    });

    expect(await sendInvoiceDigests(db, { now: MONDAY_AFTER_8AM })).toBe(1);
    expect(emailMocks.sendInvoiceWeeklyDigest).toHaveBeenCalledTimes(1);
    expect(emailMocks.sendInvoiceWeeklyDigest).toHaveBeenCalledWith(
      expect.objectContaining({
        outstandingCount: 2,
        outstandingCents: 20_000 + 20_000, // 20,000 open + (30,000 - 10,000) balance
        overdueCount: 1,
        overdueCents: 20_000,
        idempotencyKey: `invoice-digest-${business.id}-${WEEK_KEY}`,
      }),
    );

    const settings = await db.invoiceSettings.findUniqueOrThrow({
      where: { businessId: business.id },
    });
    expect(settings.lastDigestWeekKey).toBe(WEEK_KEY);
    expect(settings.lastDigestSentAt).not.toBeNull();

    // Same week, another tick — already sent.
    expect(await sendInvoiceDigests(db, { now: MONDAY_AFTER_8AM })).toBe(0);
    expect(emailMocks.sendInvoiceWeeklyDigest).toHaveBeenCalledTimes(1);
  });

  it("does not send before Monday 08:00 local", async () => {
    const business = await setupStore();
    await createInvoiceSettings(business.id);
    await seedInvoice(business.id, {
      dueDate: new Date("2026-09-25T00:00:00Z"),
    });

    expect(await sendInvoiceDigests(db, { now: MONDAY_BEFORE_8AM })).toBe(0);
    expect(emailMocks.sendInvoiceWeeklyDigest).not.toHaveBeenCalled();

    const settings = await db.invoiceSettings.findUniqueOrThrow({
      where: { businessId: business.id },
    });
    expect(settings.lastDigestWeekKey).toBeNull();
  });

  it("skips a business with no open invoices and nothing collected, but stamps the week", async () => {
    const business = await setupStore();
    await createInvoiceSettings(business.id);
    // No invoices at all.

    expect(await sendInvoiceDigests(db, { now: MONDAY_AFTER_8AM })).toBe(0);
    expect(emailMocks.sendInvoiceWeeklyDigest).not.toHaveBeenCalled();

    const settings = await db.invoiceSettings.findUniqueOrThrow({
      where: { businessId: business.id },
    });
    expect(settings.lastDigestWeekKey).toBe(WEEK_KEY);
    expect(settings.lastDigestSentAt).toBeNull();
  });

  it("leaves a business whose invoices flag is off untouched", async () => {
    const business = await setupStore({ featureFlags: { invoices: false } });
    await createInvoiceSettings(business.id);
    await seedInvoice(business.id, {
      dueDate: new Date("2026-09-25T00:00:00Z"),
    });

    expect(await sendInvoiceDigests(db, { now: MONDAY_AFTER_8AM })).toBe(0);
    expect(emailMocks.sendInvoiceWeeklyDigest).not.toHaveBeenCalled();

    const settings = await db.invoiceSettings.findUniqueOrThrow({
      where: { businessId: business.id },
    });
    expect(settings.lastDigestWeekKey).toBeNull();
  });

  it("leaves a business with the digest disabled untouched", async () => {
    const business = await setupStore();
    await createInvoiceSettings(business.id, { weeklyDigestEnabled: false });
    await seedInvoice(business.id, {
      dueDate: new Date("2026-09-25T00:00:00Z"),
    });

    expect(await sendInvoiceDigests(db, { now: MONDAY_AFTER_8AM })).toBe(0);
    expect(emailMocks.sendInvoiceWeeklyDigest).not.toHaveBeenCalled();

    const settings = await db.invoiceSettings.findUniqueOrThrow({
      where: { businessId: business.id },
    });
    expect(settings.lastDigestWeekKey).toBeNull();
  });
});
