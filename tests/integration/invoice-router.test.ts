import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as EmailTemplates from "~/lib/email/templates";
import type {
  InvoiceDraftInput,
  InvoicePaymentMethodInput,
  InvoiceSettingsFormInput,
} from "~/lib/validators/invoice";
import { createInvoiceToken } from "~/lib/invoices/token";
import { recordInvoiceView } from "~/lib/invoices/views";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createCustomer,
  createOwnerUser,
  createUser,
} from "../helpers/factories";

/**
 * Coverage for `src/server/api/routers/invoice.ts` — native invoices:
 * numbering, the draft-only edit rules, send snapshots, payments (partial →
 * paid, overpayment incl. a concurrent race, delete recompute), cancel,
 * reminders (cooldown + failed-send-doesn't-consume), the three gating tiers,
 * role + tenant isolation, the customer-facing reads, encryption at rest and
 * the anonymize scrub.
 *
 * Tenant resolution (`ownerAdminProcedure`, `featureGate`, `checkBusiness`)
 * reads the request host through `next/headers` — mocked with a mutable host,
 * same idiom as `loyalty-router.test.ts`. The invoice email helpers are
 * replaced with spies (everything else in the templates module stays real).
 */
const reqHost = vi.hoisted(() => ({ value: "invoice-biz.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

const emailMocks = vi.hoisted(() => ({
  sendInvoiceEmail: vi.fn(),
  sendInvoiceReminderEmail: vi.fn(),
  sendInvoiceCancelledEmail: vi.fn(),
  sendInvoicePaymentReceiptEmail: vi.fn(),
}));
vi.mock("~/lib/email/templates", async (importOriginal) => {
  const actual = await importOriginal<typeof EmailTemplates>();
  return {
    ...actual,
    sendInvoiceEmail: (...args: unknown[]): unknown =>
      emailMocks.sendInvoiceEmail(...args),
    sendInvoiceReminderEmail: (...args: unknown[]): unknown =>
      emailMocks.sendInvoiceReminderEmail(...args),
    sendInvoiceCancelledEmail: (...args: unknown[]): unknown =>
      emailMocks.sendInvoiceCancelledEmail(...args),
    sendInvoicePaymentReceiptEmail: (...args: unknown[]): unknown =>
      emailMocks.sendInvoicePaymentReceiptEmail(...args),
  };
});

const BANK_METHOD: InvoicePaymentMethodInput = {
  id: "m-bank",
  type: "bank_transfer",
  accountName: "Test Store LLC",
  bankName: "First Test Bank",
  routingNumber: "123456789",
  accountNumber: "000111222333",
};

function settingsInput(
  overrides: Partial<InvoiceSettingsFormInput> = {},
): InvoiceSettingsFormInput {
  return {
    numberPrefix: "INV-",
    numberPadding: 4,
    startingNumber: 1,
    defaultDueTerms: "net_30",
    defaultTaxRateBps: 0,
    paymentMethods: [],
    overdueAlertsEnabled: true,
    weeklyDigestEnabled: true,
    ...overrides,
  };
}

let draftSeq = 0;
function draftInput(
  overrides: Partial<InvoiceDraftInput> & { unitPriceCents?: number } = {},
): InvoiceDraftInput {
  const { unitPriceCents = 10_000, ...rest } = overrides;
  draftSeq += 1;
  return {
    customer: {
      name: "Grace Hopper",
      email: `grace-${draftSeq}@customer.test`,
    },
    lineItems: [
      {
        id: "l1",
        description: "Consulting — secret project",
        quantity: 1,
        unitPriceCents,
      },
    ],
    dueTerms: "net_30",
    ...rest,
  };
}

/** A fresh business (unique subdomain) with the request host pointed at it. */
async function setup(opts: { featureFlags?: Record<string, boolean> } = {}) {
  const business = await createBusiness({
    featureFlags: opts.featureFlags ?? { invoices: true },
  });
  reqHost.value = `${business.subdomain}.simplepress.test`;
  const owner = await createOwnerUser(business.id);
  const caller = createTestCaller({ userId: owner.id, email: owner.email });
  return { business, owner, caller };
}

type Caller = Awaited<ReturnType<typeof setup>>["caller"];

/** Create + manually send a $100 invoice; returns its id. */
async function createSentInvoice(
  caller: Caller,
  overrides: Parameters<typeof draftInput>[0] = {},
) {
  const created = await caller.invoice.create(draftInput(overrides));
  await caller.invoice.send({ id: created.id, deliver: "manual" });
  return created.id;
}

let seedNumber = 5000;
/** Write an invoice row directly (for flag-off tests, where `create` is gated). */
function seedInvoice(
  businessId: string,
  opts: {
    status?: string;
    totalCents?: number;
    customerId?: string | null;
    customerEmail?: string;
  } = {},
) {
  const status = opts.status ?? "SENT";
  const total = opts.totalCents ?? 10_000;
  return db.invoice.create({
    data: {
      businessId,
      invoiceNumber: seedNumber++,
      status,
      customerId: opts.customerId ?? null,
      customerName: "Seeded Customer",
      customerEmail: opts.customerEmail ?? "seeded@customer.test",
      lineItems: JSON.stringify([
        {
          id: "l1",
          description: "Seeded work",
          quantity: 1,
          unitPriceCents: total,
        },
      ]),
      subtotalCents: total,
      totalCents: total,
      issueDate: status === "DRAFT" ? null : new Date("2026-09-01T00:00:00Z"),
      dueDate: status === "DRAFT" ? null : new Date("2026-10-01T00:00:00Z"),
      sentAt: status === "DRAFT" ? null : new Date(),
      sentVia: status === "DRAFT" ? null : "manual",
    },
  });
}

function firstCallArg(mock: ReturnType<typeof vi.fn>) {
  return mock.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
}

describe("invoice router", () => {
  beforeEach(async () => {
    await resetDb();
    for (const mock of Object.values(emailMocks)) {
      mock.mockReset();
      mock.mockResolvedValue({ success: true, id: "email_test" });
    }
  });

  // ─── Numbering ───────────────────────────────────────────────────────────

  describe("numbering", () => {
    it("numbers sequentially, honors the starting-number floor, and snapshots the prefix", async () => {
      const { business, caller } = await setup();

      const before = await caller.invoice.getSettings();
      expect(before.exists).toBe(false);
      expect(before.nextInvoiceNumber).toBe(1);

      const a = await caller.invoice.create(draftInput());
      const b = await caller.invoice.create(draftInput());
      expect([a.invoiceNumber, b.invoiceNumber]).toEqual([1, 2]);
      expect(a.displayNumber).toBe("INV-0001");

      // The first create upserted the settings row.
      expect(
        await db.invoiceSettings.count({ where: { businessId: business.id } }),
      ).toBe(1);

      await caller.invoice.updateSettings(
        settingsInput({ startingNumber: 100, numberPrefix: "B-" }),
      );
      const c = await caller.invoice.create(draftInput());
      expect(c.invoiceNumber).toBe(100);
      expect(c.displayNumber).toBe("B-0100");

      // A floor below the max has no effect; nothing is renumbered.
      await caller.invoice.updateSettings(
        settingsInput({ startingNumber: 50, numberPrefix: "B-" }),
      );
      const d = await caller.invoice.create(draftInput());
      expect(d.invoiceNumber).toBe(101);

      const first = await db.invoice.findUniqueOrThrow({ where: { id: a.id } });
      expect(first.invoiceNumber).toBe(1);
      expect(first.numberPrefix).toBe("INV-");
      expect((await caller.invoice.getById({ id: a.id })).displayNumber).toBe(
        "INV-0001",
      );
    });

    it("assigns distinct numbers to concurrent creates (P2002 retry)", async () => {
      const { caller } = await setup();

      const results = await Promise.all(
        Array.from({ length: 4 }, () => caller.invoice.create(draftInput())),
      );
      const numbers = results.map((r) => r.invoiceNumber).sort((x, y) => x - y);
      expect(numbers).toEqual([1, 2, 3, 4]);
    });
  });

  // ─── Draft rules ─────────────────────────────────────────────────────────

  describe("drafts", () => {
    it("only drafts can be edited or deleted", async () => {
      const { caller } = await setup();

      const created = await caller.invoice.create(draftInput());
      await caller.invoice.update({
        id: created.id,
        ...draftInput({ unitPriceCents: 2_500, taxRateBps: 1_000 }),
      });
      const edited = await caller.invoice.getById({ id: created.id });
      expect(edited.subtotalCents).toBe(2_500);
      expect(edited.taxCents).toBe(250);
      expect(edited.totalCents).toBe(2_750);
      expect(edited.capabilities.canEdit).toBe(true);
      expect(edited.viewUrl).toBeNull();

      await caller.invoice.send({ id: created.id, deliver: "manual" });

      await expect(
        caller.invoice.update({ id: created.id, ...draftInput() }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        caller.invoice.deleteDraft({ id: created.id }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      const other = await caller.invoice.create(draftInput());
      await expect(
        caller.invoice.deleteDraft({ id: other.id }),
      ).resolves.toEqual({ success: true });
      await expect(
        caller.invoice.getById({ id: other.id }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("rejects sending a $0 invoice", async () => {
      const { caller } = await setup();
      const created = await caller.invoice.create(
        draftInput({ unitPriceCents: 0 }),
      );
      await expect(
        caller.invoice.send({ id: created.id, deliver: "manual" }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  // ─── Send ────────────────────────────────────────────────────────────────

  describe("send", () => {
    it("snapshots instructions + issuer; later settings/business edits don't change a sent invoice; the email lists method names only", async () => {
      const { business, caller } = await setup();
      await caller.invoice.updateSettings(
        settingsInput({ paymentMethods: [BANK_METHOD] }),
      );

      const created = await caller.invoice.create(
        draftInput({ paymentMethodIds: ["m-bank"] }),
      );
      const result = await caller.invoice.send({
        id: created.id,
        deliver: "email",
        message: "Thanks!",
      });
      expect(result.emailed).toBe(true);
      expect(result.viewUrl).toContain("/invoice/");

      expect(emailMocks.sendInvoiceEmail).toHaveBeenCalledTimes(1);
      const emailArgs = firstCallArg(emailMocks.sendInvoiceEmail)!;
      expect(emailArgs.idempotencyKey).toBe(`invoice-sent-${created.id}`);
      expect(emailArgs.paymentMethodLabels).toEqual(["Bank transfer"]);
      expect(JSON.stringify(emailArgs)).not.toContain("000111222333");
      expect(JSON.stringify(emailArgs)).not.toContain("123456789");

      const sent = await caller.invoice.getById({ id: created.id });
      expect(sent.status).toBe("SENT");
      expect(sent.sentVia).toBe("email");
      expect(sent.issueDateYmd).not.toBeNull();
      expect(sent.dueDateYmd).not.toBeNull();
      expect(sent.issuerSnapshot?.name).toBe("Test Store");
      const accountLine = sent.paymentInstructions[0]?.lines.find(
        (line) => line.label === "Account number",
      );
      expect(accountLine?.value).toBe("000111222333");
      expect(sent.events.map((e) => e.type)).toEqual(
        expect.arrayContaining(["CREATED", "SENT"]),
      );

      // Change the bank account and the business name after sending.
      await caller.invoice.updateSettings(
        settingsInput({
          paymentMethods: [{ ...BANK_METHOD, accountNumber: "999888777" }],
        }),
      );
      await db.business.update({
        where: { id: business.id },
        data: { name: "Renamed Store" },
      });

      const after = await caller.invoice.getById({ id: created.id });
      expect(
        after.paymentInstructions[0]?.lines.find(
          (line) => line.label === "Account number",
        )?.value,
      ).toBe("000111222333");
      expect(after.issuerSnapshot?.name).toBe("Test Store");

      // Sending twice is refused.
      await expect(
        caller.invoice.send({ id: created.id, deliver: "manual" }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("a failed email leaves the invoice sent and logs EMAIL_FAILED", async () => {
      const { caller } = await setup();
      emailMocks.sendInvoiceEmail.mockResolvedValueOnce({ success: false });

      const created = await caller.invoice.create(draftInput());
      const result = await caller.invoice.send({
        id: created.id,
        deliver: "email",
      });
      expect(result.emailed).toBe(false);

      const detail = await caller.invoice.getById({ id: created.id });
      expect(detail.status).toBe("SENT");
      expect(detail.events.map((e) => e.type)).toContain("EMAIL_FAILED");
      expect(detail.events.map((e) => e.type)).not.toContain("SENT");
    });
  });

  // ─── Payments ────────────────────────────────────────────────────────────

  describe("payments", () => {
    it("partial → full → PAID; overpayment rejected; deleting a payment recomputes", async () => {
      const { caller } = await setup();
      const id = await createSentInvoice(caller);

      const partial = await caller.invoice.recordPayment({
        invoiceId: id,
        amountCents: 4_000,
        paidOn: "2026-09-20",
        method: "zelle",
      });
      expect(partial.invoice.status).toBe("PARTIALLY_PAID");
      expect(partial.invoice.balanceCents).toBe(6_000);

      await expect(
        caller.invoice.recordPayment({
          invoiceId: id,
          amountCents: 6_001,
          paidOn: "2026-09-21",
          method: "zelle",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      const full = await caller.invoice.recordPayment({
        invoiceId: id,
        amountCents: 6_000,
        paidOn: "2026-09-21",
        method: "cash_check",
      });
      expect(full.invoice.status).toBe("PAID");
      expect(full.invoice.paidAt).not.toBeNull();

      await expect(
        caller.invoice.recordPayment({
          invoiceId: id,
          amountCents: 1,
          paidOn: "2026-09-22",
          method: "cash_check",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      const back = await caller.invoice.deletePayment({
        paymentId: full.payment.id,
      });
      expect(back.invoice.status).toBe("PARTIALLY_PAID");
      expect(back.invoice.amountPaidCents).toBe(4_000);
      expect(back.invoice.paidAt).toBeNull();

      const detail = await caller.invoice.getById({ id });
      expect(detail.payments).toHaveLength(1);
      expect(detail.events.map((e) => e.type)).toEqual(
        expect.arrayContaining(["PAYMENT_RECORDED", "PAYMENT_DELETED"]),
      );
    });

    it("two concurrent payments that together overpay: exactly one commits", async () => {
      const { caller } = await setup();
      const id = await createSentInvoice(caller);

      const results = await Promise.allSettled([
        caller.invoice.recordPayment({
          invoiceId: id,
          amountCents: 6_000,
          paidOn: "2026-09-20",
          method: "venmo",
        }),
        caller.invoice.recordPayment({
          invoiceId: id,
          amountCents: 6_000,
          paidOn: "2026-09-20",
          method: "venmo",
        }),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      // CONFLICT when the two raced through the compare-and-swap; BAD_REQUEST
      // (over the balance) when the second started after the first committed.
      const rejected = results.find(
        (r): r is PromiseRejectedResult => r.status === "rejected",
      );
      expect(["CONFLICT", "BAD_REQUEST"]).toContain(
        (rejected?.reason as { code?: string } | undefined)?.code,
      );

      const row = await db.invoice.findUniqueOrThrow({ where: { id } });
      expect(row.amountPaidCents).toBe(6_000);
      expect(await db.invoicePayment.count({ where: { invoiceId: id } })).toBe(
        1,
      );
    });

    it("emails a receipt after commit and stamps receiptSentAt only on success", async () => {
      const { caller } = await setup();
      const id = await createSentInvoice(caller);

      const ok = await caller.invoice.recordPayment({
        invoiceId: id,
        amountCents: 1_000,
        paidOn: "2026-09-20",
        method: "paypal",
        emailReceipt: true,
      });
      expect(ok.receiptEmailed).toBe(true);
      expect(
        firstCallArg(emailMocks.sendInvoicePaymentReceiptEmail),
      ).toMatchObject({
        idempotencyKey: `invoice-receipt-${ok.payment.id}`,
        methodLabel: "PayPal",
        balanceCents: 9_000,
      });
      const stamped = await db.invoicePayment.findUniqueOrThrow({
        where: { id: ok.payment.id },
      });
      expect(stamped.receiptSentAt).not.toBeNull();

      emailMocks.sendInvoicePaymentReceiptEmail.mockResolvedValueOnce({
        success: false,
      });
      const failed = await caller.invoice.recordPayment({
        invoiceId: id,
        amountCents: 1_000,
        paidOn: "2026-09-21",
        method: "paypal",
        emailReceipt: true,
      });
      expect(failed.receiptEmailed).toBe(false);
      // The payment itself still committed.
      expect(failed.invoice.amountPaidCents).toBe(2_000);
      const unstamped = await db.invoicePayment.findUniqueOrThrow({
        where: { id: failed.payment.id },
      });
      expect(unstamped.receiptSentAt).toBeNull();
    });

    it("refuses payments on drafts", async () => {
      const { caller } = await setup();
      const created = await caller.invoice.create(draftInput());
      await expect(
        caller.invoice.recordPayment({
          invoiceId: created.id,
          amountCents: 100,
          paidOn: "2026-09-20",
          method: "cash_check",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  // ─── Cancel ──────────────────────────────────────────────────────────────

  describe("cancel", () => {
    it("cancels SENT/PARTIALLY_PAID only, keeps payments, optionally notifies", async () => {
      const { caller } = await setup();

      const draft = await caller.invoice.create(draftInput());
      await expect(
        caller.invoice.cancel({ id: draft.id }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      const id = await createSentInvoice(caller);
      await caller.invoice.recordPayment({
        invoiceId: id,
        amountCents: 2_500,
        paidOn: "2026-09-20",
        method: "cash_check",
      });

      const cancelled = await caller.invoice.cancel({
        id,
        reason: "Wrong amount — reissuing",
        notifyCustomer: true,
      });
      expect(cancelled.customerNotified).toBe(true);
      expect(firstCallArg(emailMocks.sendInvoiceCancelledEmail)).toMatchObject({
        idempotencyKey: `invoice-cancelled-${id}`,
        reason: "Wrong amount — reissuing",
        amountPaidCents: 2_500,
      });

      const detail = await caller.invoice.getById({ id });
      expect(detail.status).toBe("CANCELLED");
      expect(detail.cancelReason).toBe("Wrong amount — reissuing");
      expect(detail.payments).toHaveLength(1);
      expect(detail.balanceCents).toBe(0);

      await expect(caller.invoice.cancel({ id })).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
      await expect(
        caller.invoice.recordPayment({
          invoiceId: id,
          amountCents: 100,
          paidOn: "2026-09-21",
          method: "cash_check",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      // A mistaken payment on a cancelled invoice can still be removed; it stays cancelled.
      const removed = await caller.invoice.deletePayment({
        paymentId: detail.payments[0]!.id,
      });
      expect(removed.invoice.status).toBe("CANCELLED");
      expect(removed.invoice.amountPaidCents).toBe(0);
    });

    it("a fully paid invoice can't be cancelled", async () => {
      const { caller } = await setup();
      const id = await createSentInvoice(caller);
      await caller.invoice.recordPayment({
        invoiceId: id,
        amountCents: 10_000,
        paidOn: "2026-09-20",
        method: "card",
      });
      await expect(caller.invoice.cancel({ id })).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });
  });

  // ─── Reminders ───────────────────────────────────────────────────────────

  describe("sendReminder", () => {
    it("a failed send doesn't consume the cooldown; a success does", async () => {
      const { caller } = await setup();
      const id = await createSentInvoice(caller);

      emailMocks.sendInvoiceReminderEmail.mockResolvedValueOnce({
        success: false,
      });
      await expect(caller.invoice.sendReminder({ id })).rejects.toMatchObject({
        code: "BAD_GATEWAY",
      });
      let row = await db.invoice.findUniqueOrThrow({ where: { id } });
      expect(row.lastReminderSentAt).toBeNull();
      expect(row.reminderCount).toBe(0);

      const ok = await caller.invoice.sendReminder({
        id,
        message: "Friendly nudge",
      });
      expect(ok.remindAvailableAt).toBeInstanceOf(Date);
      const calls = emailMocks.sendInvoiceReminderEmail.mock.calls.map(
        (call) => (call[0] as { idempotencyKey: string }).idempotencyKey,
      );
      // Same key for the failed attempt and the retry — the count only moves on success.
      expect(calls).toEqual([
        `invoice-reminder-${id}-1`,
        `invoice-reminder-${id}-1`,
      ]);

      row = await db.invoice.findUniqueOrThrow({ where: { id } });
      expect(row.reminderCount).toBe(1);
      expect(row.lastReminderSentAt).not.toBeNull();

      await expect(caller.invoice.sendReminder({ id })).rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
      });

      const detail = await caller.invoice.getById({ id });
      expect(detail.capabilities.canRemind).toBe(false);
      expect(detail.capabilities.remindAvailableAt).not.toBeNull();

      // Once the window has passed, another reminder goes out.
      await db.invoice.update({
        where: { id },
        data: { lastReminderSentAt: new Date(Date.now() - 25 * 3600 * 1000) },
      });
      await caller.invoice.sendReminder({ id });
      row = await db.invoice.findUniqueOrThrow({ where: { id } });
      expect(row.reminderCount).toBe(2);
    });

    it("refuses drafts", async () => {
      const { caller } = await setup();
      const draft = await caller.invoice.create(draftInput());
      await expect(
        caller.invoice.sendReminder({ id: draft.id }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  // ─── Gating tiers ────────────────────────────────────────────────────────

  describe("feature flag off", () => {
    it("blocks new invoicing activity but never reads or bookkeeping", async () => {
      const { business, caller } = await setup({
        featureFlags: { invoices: false },
      });
      const sent = await seedInvoice(business.id);
      const draft = await seedInvoice(business.id, { status: "DRAFT" });

      // Gated tier.
      await expect(caller.invoice.create(draftInput())).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(
        caller.invoice.update({ id: draft.id, ...draftInput() }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller.invoice.deleteDraft({ id: draft.id }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller.invoice.send({ id: draft.id, deliver: "manual" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller.invoice.sendReminder({ id: sent.id }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        caller.invoice.updateSettings(settingsInput()),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.invoice.catalogOptions({})).rejects.toMatchObject({
        code: "FORBIDDEN",
      });

      // Reads.
      const list = await caller.invoice.listUnified({});
      expect(list.invoicesEnabled).toBe(false);
      expect(list.totalCount).toBe(2);
      await expect(caller.invoice.summary()).resolves.toMatchObject({
        outstandingCount: 1,
        outstandingCents: 10_000,
      });
      await expect(caller.invoice.getSettings()).resolves.toMatchObject({
        invoicesEnabled: false,
      });
      const detail = await caller.invoice.getById({ id: sent.id });
      expect(detail.capabilities).toMatchObject({
        canRemind: false,
        canRecordPayment: true,
        canCancel: true,
      });
      const draftDetail = await caller.invoice.getById({ id: draft.id });
      expect(draftDetail.capabilities).toMatchObject({
        canEdit: false,
        canSend: false,
        canDelete: false,
      });

      // Bookkeeping.
      const paid = await caller.invoice.recordPayment({
        invoiceId: sent.id,
        amountCents: 1_000,
        paidOn: "2026-09-20",
        method: "cash_check",
      });
      await caller.invoice.deletePayment({ paymentId: paid.payment.id });
      await expect(
        caller.invoice.cancel({ id: sent.id }),
      ).resolves.toMatchObject({ status: "CANCELLED" });
    });
  });

  describe("roles and tenants", () => {
    it("STAFF is forbidden from every tier", async () => {
      const { business } = await setup();
      const sent = await seedInvoice(business.id);
      const staff = await createOwnerUser(business.id, { role: "STAFF" });
      const staffCaller = createTestCaller({
        userId: staff.id,
        email: staff.email,
      });

      await expect(staffCaller.invoice.listUnified({})).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(
        staffCaller.invoice.getById({ id: sent.id }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        staffCaller.invoice.recordPayment({
          invoiceId: sent.id,
          amountCents: 100,
          paidOn: "2026-09-20",
          method: "cash_check",
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        staffCaller.invoice.create(draftInput()),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("another tenant's invoice id or token is NOT_FOUND", async () => {
      const a = await setup();
      const aInvoice = await createSentInvoice(a.caller);
      const aDraft = await a.caller.invoice.create(draftInput());
      const aPayment = await a.caller.invoice.recordPayment({
        invoiceId: aInvoice,
        amountCents: 500,
        paidOn: "2026-09-20",
        method: "bank_transfer",
        reference: "CHK-SECRET-REF",
        note: "internal note",
      });

      const b = await setup();
      await expect(
        b.caller.invoice.getById({ id: aInvoice }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        b.caller.invoice.recordPayment({
          invoiceId: aInvoice,
          amountCents: 100,
          paidOn: "2026-09-20",
          method: "cash_check",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        b.caller.invoice.deletePayment({ paymentId: aPayment.payment.id }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        b.caller.invoice.cancel({ id: aInvoice }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        b.caller.invoice.update({ id: aDraft.id, ...draftInput() }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        b.caller.invoice.deleteDraft({ id: aDraft.id }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        b.caller.invoice.send({ id: aDraft.id, deliver: "manual" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect((await b.caller.invoice.listUnified({})).totalCount).toBe(0);

      const anon = createTestCaller({});
      const aToken = createInvoiceToken({
        invoiceId: aInvoice,
        businessId: a.business.id,
      });

      // On B's host, A's token 404s.
      await expect(
        anon.invoice.getByToken({ token: aToken }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      // A token claiming B but naming A's invoice id also 404s (row scoped by business).
      await expect(
        anon.invoice.getByToken({
          token: createInvoiceToken({
            invoiceId: aInvoice,
            businessId: b.business.id,
          }),
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      // On A's host it resolves — with customer-safe fields only.
      reqHost.value = `${a.business.subdomain}.simplepress.test`;
      const view = await anon.invoice.getByToken({ token: aToken });
      expect(view.state).toBe("ok");
      if (view.state === "ok") {
        expect(view.invoice.id).toBe(aInvoice);
        expect(view.invoice.payments).toEqual([
          {
            amountCents: 500,
            paidOn: "2026-09-20",
            methodLabel: "Bank transfer",
          },
        ]);
        expect(view.invoice.balanceCents).toBe(9_500);
      }
      const serialized = JSON.stringify(view);
      expect(serialized).not.toContain("CHK-SECRET-REF");
      expect(serialized).not.toContain("internal note");
      expect(serialized).not.toContain(a.business.id);

      // Drafts, garbage and expired tokens.
      await expect(
        anon.invoice.getByToken({
          token: createInvoiceToken({
            invoiceId: aDraft.id,
            businessId: a.business.id,
          }),
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        anon.invoice.getByToken({ token: "not.a-token" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        anon.invoice.getByToken({
          token: createInvoiceToken({
            invoiceId: aInvoice,
            businessId: a.business.id,
            now: new Date(Date.now() - 400 * 24 * 3600 * 1000),
          }),
        }),
      ).resolves.toEqual({ state: "expired" });
    }, 15_000);
  });

  // ─── Customer-facing ─────────────────────────────────────────────────────

  describe("getMine", () => {
    it("returns only the signed-in customer's non-draft invoices on this store, self-healing the user link", async () => {
      const { business, caller } = await setup();
      const email = "shopper@customer.test";

      const mineSent = await createSentInvoice(caller, {
        customer: { name: "Shopper One", email },
      });
      await caller.invoice.create(
        draftInput({ customer: { name: "Shopper One", email } }),
      );
      await createSentInvoice(caller); // someone else's

      // Same email on another store.
      const other = await setup();
      await createSentInvoice(other.caller, {
        customer: { name: "Shopper One", email },
      });

      reqHost.value = `${business.subdomain}.simplepress.test`;
      const user = await createUser({ email });
      const customerCaller = createTestCaller({ userId: user.id, email });

      const mine = await customerCaller.invoice.getMine();
      expect(mine.map((row) => row.id)).toEqual([mineSent]);
      expect(mine[0]?.viewPath).toMatch(/^\/invoice\//);
      expect(mine[0]?.displayNumber).toBe("INV-0001");

      const linked = await db.customer.findUniqueOrThrow({
        where: { businessId_email: { businessId: business.id, email } },
      });
      expect(linked.userId).toBe(user.id);
      expect(linked.firstName).toBe("Shopper");
      expect(linked.lastName).toBe("One");

      await expect(
        createTestCaller({}).invoice.getMine(),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("getForCustomer lists that customer's invoices and 404s a foreign customer", async () => {
      const { business, caller } = await setup();
      const customer = await createCustomer(business.id, {
        email: "picked@customer.test",
      });
      const id = await createSentInvoice(caller, {
        customer: {
          customerId: customer.id,
          name: "Picked Person",
          email: "typed@customer.test",
        },
      });

      const result = await caller.invoice.getForCustomer({
        customerId: customer.id,
      });
      expect(result.rows.map((row) => row.id)).toEqual([id]);

      const other = await setup();
      const foreign = await createCustomer(other.business.id);
      reqHost.value = `${business.subdomain}.simplepress.test`;
      await expect(
        caller.invoice.getForCustomer({ customerId: foreign.id }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      // Linking a foreign customer on create is refused too.
      await expect(
        caller.invoice.create(
          draftInput({
            customer: { customerId: foreign.id, name: "X", email: "x@y.test" },
          }),
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("views", () => {
    it("records customer views (once per 24h in the timeline) and skips the business's own team", async () => {
      const { business, owner, caller } = await setup();
      const id = await createSentInvoice(caller);

      await recordInvoiceView(db, {
        invoiceId: id,
        businessId: business.id,
        viewerUserId: owner.id,
      });
      let row = await db.invoice.findUniqueOrThrow({ where: { id } });
      expect(row.firstViewedAt).toBeNull();

      await recordInvoiceView(db, { invoiceId: id, businessId: business.id });
      await recordInvoiceView(db, { invoiceId: id, businessId: business.id });
      row = await db.invoice.findUniqueOrThrow({ where: { id } });
      expect(row.firstViewedAt).not.toBeNull();
      expect(row.lastViewedAt).not.toBeNull();
      expect(
        await db.invoiceEvent.count({
          where: { invoiceId: id, type: "VIEWED" },
        }),
      ).toBe(1);
    });
  });

  // ─── Encryption + GDPR ───────────────────────────────────────────────────

  describe("data at rest", () => {
    it("stores sensitive columns encrypted", async () => {
      const { business, caller } = await setup();
      await caller.invoice.updateSettings(
        settingsInput({
          paymentMethods: [BANK_METHOD],
          defaultNotes: "Default secret note",
        }),
      );
      const id = await createSentInvoice(caller, {
        customer: {
          name: "Ada Lovelace",
          email: "ada@customer.test",
          phone: "555-0199",
          billingAddress: {
            line1: "12 Secret Lane",
            city: "Detroit",
            state: "MI",
            zip: "48201",
          },
        },
        notes: "Private note text",
        terms: "Private terms text",
        paymentMethodIds: ["m-bank"],
      });
      const payment = await caller.invoice.recordPayment({
        invoiceId: id,
        amountCents: 100,
        paidOn: "2026-09-20",
        method: "bank_transfer",
        reference: "WIRE-REF-42",
        note: "payment note text",
      });
      await caller.invoice.cancel({ id, reason: "Cancel reason text" });

      const [invoiceRaw] = await db.$queryRaw<
        {
          lineItems: string;
          customerPhone: string;
          billingAddress: string;
          notes: string;
          terms: string;
          paymentInstructions: string;
          cancelReason: string;
          customerName: string;
        }[]
      >`SELECT "lineItems", "customerPhone", "billingAddress", "notes", "terms", "paymentInstructions", "cancelReason", "customerName" FROM "Invoice" WHERE "id" = ${id}`;
      expect(invoiceRaw).toBeDefined();
      const encrypted = [
        invoiceRaw!.lineItems,
        invoiceRaw!.customerPhone,
        invoiceRaw!.billingAddress,
        invoiceRaw!.notes,
        invoiceRaw!.terms,
        invoiceRaw!.paymentInstructions,
        invoiceRaw!.cancelReason,
      ];
      for (const value of encrypted) {
        expect(value.startsWith("v1.")).toBe(true);
      }
      const joined = encrypted.join(" ");
      for (const plain of [
        "secret project",
        "555-0199",
        "Secret Lane",
        "Private note text",
        "Private terms text",
        "000111222333",
        "Cancel reason text",
      ]) {
        expect(joined).not.toContain(plain);
      }
      // Name/email stay plaintext by design (search + list).
      expect(invoiceRaw!.customerName).toBe("Ada Lovelace");

      const [paymentRaw] = await db.$queryRaw<
        { reference: string; note: string }[]
      >`SELECT "reference", "note" FROM "InvoicePayment" WHERE "id" = ${payment.payment.id}`;
      expect(paymentRaw!.reference).not.toContain("WIRE-REF-42");
      expect(paymentRaw!.note).not.toContain("payment note text");

      const [settingsRaw] = await db.$queryRaw<
        { paymentMethods: string; defaultNotes: string }[]
      >`SELECT "paymentMethods", "defaultNotes" FROM "InvoiceSettings" WHERE "businessId" = ${business.id}`;
      expect(settingsRaw!.paymentMethods).not.toContain("000111222333");
      expect(settingsRaw!.defaultNotes).not.toContain("Default secret note");

      // And the timeline metadata carries nothing sensitive.
      const events = await db.invoiceEvent.findMany({
        where: { invoiceId: id },
      });
      const metadata = JSON.stringify(events.map((e) => e.metadata));
      expect(metadata).not.toContain("WIRE-REF-42");
      expect(metadata).not.toContain("Cancel reason text");
      expect(metadata).not.toContain("000111222333");
    });

    it("customer.anonymize scrubs the customer's invoice copies but keeps the money", async () => {
      const { caller } = await setup();
      const id = await createSentInvoice(caller, {
        customer: {
          name: "Erase Me",
          email: "erase@customer.test",
          phone: "555-0101",
          billingAddress: {
            line1: "1 Gone Rd",
            city: "Detroit",
            state: "MI",
            zip: "48201",
          },
        },
      });
      const invoice = await db.invoice.findUniqueOrThrow({ where: { id } });
      expect(invoice.customerId).not.toBeNull();

      await caller.customer.anonymize({ id: invoice.customerId! });

      const scrubbed = await db.invoice.findUniqueOrThrow({ where: { id } });
      expect(scrubbed.customerName).toBe("Anonymized");
      expect(scrubbed.customerEmail).toBe(
        `anonymized-${invoice.customerId}@anonymized.invalid`,
      );
      expect(scrubbed.customerPhone).toBeNull();
      expect(scrubbed.billingAddress).toBeNull();
      expect(scrubbed.totalCents).toBe(10_000);
      expect(scrubbed.status).toBe("SENT");
    });
  });

  // ─── Unified list ────────────────────────────────────────────────────────

  describe("listUnified", () => {
    it("merges QuickBooks rows with native rows and pages across both", async () => {
      const { business, caller } = await setup();
      for (let i = 0; i < 3; i++) await createSentInvoice(caller);
      // One create per row (not createMany) so the encryption extension
      // handles the encrypted customer columns exactly as the app does.
      for (let i = 0; i < 2; i++) {
        await db.quickBooksInvoice.create({
          data: {
            businessId: business.id,
            kind: "custom",
            amountCents: 50_000 + i,
            customerName: `QBO Customer ${i}`,
            customerEmail: `qbo${i}@customer.test`,
            status: "sent",
            realmId: "realm-test",
            qboDocNumber: `10${i}`,
          },
        });
      }

      const all = await caller.invoice.listUnified({ sort: "amount-desc" });
      expect(all.totalCount).toBe(5);
      expect(all.hasQboRows).toBe(true);
      expect(all.rows.map((row) => row.source)).toEqual([
        "quickbooks",
        "quickbooks",
        "native",
        "native",
        "native",
      ]);

      const qboOnly = await caller.invoice.listUnified({
        source: "quickbooks",
        search: "#101",
      });
      expect(qboOnly.rows.map((row) => row.displayNumber)).toEqual(["101"]);

      const summary = await caller.invoice.summary();
      expect(summary.outstandingCount).toBe(5);
      expect(summary.outstandingCents).toBe(3 * 10_000 + 50_000 + 50_001);
    });
  });
});
