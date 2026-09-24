import { describe, expect, it } from "vitest";

import {
  cancelInvoiceSchema,
  INVOICE_MAX_LINE_ITEMS,
  INVOICE_SETTINGS_DUE_TERMS_VALUES,
  invoiceDraftSchema,
  invoiceLineItemSchema,
  invoiceListParamsSchema,
  invoiceSendSchema,
  invoiceSettingsSchema,
  invoiceUpdateSchema,
  parseIssuerSnapshot,
  paymentMethodSchema,
  recordPaymentSchema,
  sendReminderSchema,
} from "./invoice";

/** Loose on purpose: fixtures are INPUT to `safeParse`, bent per test. */
function baseDraft(): Record<string, unknown> {
  return {
    customer: { name: "Jane Doe", email: "jane@example.com" },
    lineItems: [
      {
        id: "l1",
        description: "Design work",
        quantity: 2,
        unitPriceCents: 5000,
      },
    ],
    dueTerms: "net_30",
  };
}

function issuePaths(result: {
  success: boolean;
  error?: { issues: { path: (string | number)[] }[] };
}) {
  expect(result.success).toBe(false);
  return result.error?.issues.map((issue) => issue.path.join(".")) ?? [];
}

describe("invoiceLineItemSchema", () => {
  const line = {
    id: "l1",
    description: "Thing",
    quantity: 1,
    unitPriceCents: 100,
  };

  it("accepts a valid line", () => {
    expect(invoiceLineItemSchema.safeParse(line).success).toBe(true);
    expect(
      invoiceLineItemSchema.safeParse({
        ...line,
        quantity: 1.125,
        unitPriceCents: 0,
      }).success,
    ).toBe(true);
  });

  it.each([
    ["zero quantity", { quantity: 0 }],
    ["negative quantity", { quantity: -1 }],
    ["4 decimal quantity", { quantity: 1.0001 }],
    ["huge quantity", { quantity: 100_001 }],
    ["fractional cents", { unitPriceCents: 10.5 }],
    ["negative price", { unitPriceCents: -1 }],
    ["price over $1M", { unitPriceCents: 100_000_001 }],
    ["blank description", { description: "   " }],
    ["long description", { description: "x".repeat(501) }],
  ])("rejects %s", (_name, override) => {
    expect(
      invoiceLineItemSchema.safeParse({ ...line, ...override }).success,
    ).toBe(false);
  });
});

describe("invoiceDraftSchema", () => {
  it("accepts a minimal draft and fills defaults", () => {
    const result = invoiceDraftSchema.safeParse(baseDraft());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toMatchObject({
      discountValue: 0,
      taxRateBps: 0,
      paymentMethodIds: [],
    });
  });

  it("accepts a full draft with billing address, discount and tax", () => {
    const result = invoiceDraftSchema.safeParse({
      ...baseDraft(),
      customer: {
        customerId: "c1",
        name: "Jane Doe",
        email: " jane@example.com ",
        phone: "555-0100",
        billingAddress: {
          line1: "1 Main St",
          city: "Detroit",
          state: "mi",
          zip: "48201",
        },
      },
      discountType: "percent",
      discountValue: 1000,
      taxRateBps: 625,
      notes: "Thanks!",
      terms: "Net 30.",
      paymentMethodIds: ["m1", "m2"],
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.customer.email).toBe("jane@example.com");
    expect(result.data.customer.billingAddress?.state).toBe("MI");
  });

  it("requires a custom due date when terms are custom, treating '' as absent", () => {
    expect(
      issuePaths(
        invoiceDraftSchema.safeParse({ ...baseDraft(), dueTerms: "custom" }),
      ),
    ).toContain("customDueDate");
    expect(
      issuePaths(
        invoiceDraftSchema.safeParse({
          ...baseDraft(),
          dueTerms: "custom",
          customDueDate: "",
        }),
      ),
    ).toContain("customDueDate");
    expect(
      invoiceDraftSchema.safeParse({
        ...baseDraft(),
        dueTerms: "custom",
        customDueDate: "2026-12-01",
      }).success,
    ).toBe(true);
  });

  it("rejects an impossible custom due date", () => {
    expect(
      invoiceDraftSchema.safeParse({
        ...baseDraft(),
        dueTerms: "custom",
        customDueDate: "2026-02-30",
      }).success,
    ).toBe(false);
  });

  it("rejects a percent discount over 100%", () => {
    expect(
      issuePaths(
        invoiceDraftSchema.safeParse({
          ...baseDraft(),
          discountType: "percent",
          discountValue: 10_001,
        }),
      ),
    ).toContain("discountValue");
  });

  it("allows a flat discount larger than the subtotal (it is capped, not rejected)", () => {
    expect(
      invoiceDraftSchema.safeParse({
        ...baseDraft(),
        discountType: "flat",
        discountValue: 1_000_000,
      }).success,
    ).toBe(true);
  });

  it("rejects totals over $10M (the Int4 overflow guard)", () => {
    const draft = {
      ...baseDraft(),
      lineItems: Array.from({ length: 11 }, (_, i) => ({
        id: `l${i}`,
        description: "Big",
        quantity: 1,
        unitPriceCents: 100_000_000,
      })),
    };
    expect(issuePaths(invoiceDraftSchema.safeParse(draft))).toContain(
      "lineItems",
    );
  });

  it("rejects a subtotal over $10M even when a discount brings the total under", () => {
    const draft = {
      ...baseDraft(),
      lineItems: [
        {
          id: "l1",
          description: "Big",
          quantity: 100_000,
          unitPriceCents: 100_000_000,
        },
      ],
      discountType: "percent",
      discountValue: 10_000,
    };
    expect(issuePaths(invoiceDraftSchema.safeParse(draft))).toContain(
      "lineItems",
    );
  });

  it("rejects tax pushing the total over $10M", () => {
    const draft = {
      ...baseDraft(),
      lineItems: [
        {
          id: "l1",
          description: "Big",
          quantity: 10,
          unitPriceCents: 100_000_000,
        },
      ],
      taxRateBps: 100,
    };
    expect(issuePaths(invoiceDraftSchema.safeParse(draft))).toContain(
      "lineItems",
    );
  });

  it("requires 1..100 lines", () => {
    expect(
      invoiceDraftSchema.safeParse({ ...baseDraft(), lineItems: [] }).success,
    ).toBe(false);
    const line = { id: "x", description: "d", quantity: 1, unitPriceCents: 1 };
    expect(
      invoiceDraftSchema.safeParse({
        ...baseDraft(),
        lineItems: Array.from(
          { length: INVOICE_MAX_LINE_ITEMS + 1 },
          (_, i) => ({
            ...line,
            id: `l${i}`,
          }),
        ),
      }).success,
    ).toBe(false);
  });

  it("rejects a bad customer email, a duplicate or excess payment method", () => {
    expect(
      invoiceDraftSchema.safeParse({
        ...baseDraft(),
        customer: { name: "J", email: "nope" },
      }).success,
    ).toBe(false);
    expect(
      invoiceDraftSchema.safeParse({
        ...baseDraft(),
        paymentMethodIds: ["a", "a"],
      }).success,
    ).toBe(false);
    expect(
      invoiceDraftSchema.safeParse({
        ...baseDraft(),
        paymentMethodIds: Array.from({ length: 11 }, (_, i) => `m${i}`),
      }).success,
    ).toBe(false);
  });

  it("rejects tax over 100%", () => {
    expect(
      invoiceDraftSchema.safeParse({ ...baseDraft(), taxRateBps: 10_001 })
        .success,
    ).toBe(false);
  });
});

describe("invoiceUpdateSchema", () => {
  it("is the draft plus an id, with the same cross-field rules", () => {
    expect(
      invoiceUpdateSchema.safeParse({ id: "inv1", ...baseDraft() }).success,
    ).toBe(true);
    expect(invoiceUpdateSchema.safeParse(baseDraft()).success).toBe(false);
    expect(
      issuePaths(
        invoiceUpdateSchema.safeParse({
          id: "inv1",
          ...baseDraft(),
          dueTerms: "custom",
        }),
      ),
    ).toContain("customDueDate");
  });
});

describe("paymentMethodSchema", () => {
  it("accepts and normalizes each type", () => {
    const cases: [Record<string, unknown>, Record<string, unknown>][] = [
      [
        {
          id: "b",
          type: "bank_transfer",
          accountName: "Acme",
          bankName: "Chase",
          routingNumber: " 021000021 ",
          accountNumber: "123456789",
          swift: "chasus33",
        },
        { routingNumber: "021000021", swift: "CHASUS33" },
      ],
      [
        { id: "p", type: "paypal", handle: "https://www.paypal.me/acme/" },
        { handle: "acme" },
      ],
      [
        { id: "p2", type: "paypal", email: "pay@acme.test" },
        { email: "pay@acme.test" },
      ],
      [{ id: "v", type: "venmo", handle: "@acme-co" }, { handle: "acme-co" }],
      [{ id: "c", type: "cash_app", cashtag: "$acme" }, { cashtag: "acme" }],
      [
        { id: "z", type: "zelle", emailOrPhone: "555-0100", name: "Acme" },
        { emailOrPhone: "555-0100" },
      ],
      [
        { id: "k", type: "cash_check", payableTo: "Acme" },
        { payableTo: "Acme" },
      ],
      [
        { id: "o", type: "other", title: "Wire", instructions: "Email us" },
        { title: "Wire" },
      ],
    ];
    for (const [input, expected] of cases) {
      const result = paymentMethodSchema.safeParse(input);
      expect(result.success, JSON.stringify(input)).toBe(true);
      if (result.success) expect(result.data).toMatchObject(expected);
    }
  });

  it.each([
    [
      "bank routing not 9 digits",
      {
        id: "b",
        type: "bank_transfer",
        accountName: "A",
        bankName: "B",
        routingNumber: "1234",
        accountNumber: "123456",
      },
    ],
    [
      "bank missing account number",
      {
        id: "b",
        type: "bank_transfer",
        accountName: "A",
        bankName: "B",
        routingNumber: "021000021",
      },
    ],
    [
      "bank bad swift",
      {
        id: "b",
        type: "bank_transfer",
        accountName: "A",
        bankName: "B",
        routingNumber: "021000021",
        accountNumber: "123456",
        swift: "ABC",
      },
    ],
    ["paypal with neither handle nor email", { id: "p", type: "paypal" }],
    [
      "paypal with blank handle and email",
      { id: "p", type: "paypal", handle: " ", email: "" },
    ],
    ["paypal bad email", { id: "p", type: "paypal", email: "nope" }],
    ["venmo empty", { id: "v", type: "venmo", handle: "@" }],
    ["venmo with spaces", { id: "v", type: "venmo", handle: "acme co" }],
    ["cash app empty", { id: "c", type: "cash_app", cashtag: "$" }],
    ["zelle missing name", { id: "z", type: "zelle", emailOrPhone: "a@b.co" }],
    ["other missing instructions", { id: "o", type: "other", title: "X" }],
    ["unknown type", { id: "x", type: "bitcoin" }],
    ["missing id", { type: "venmo", handle: "acme" }],
  ])("rejects %s", (_name, input) => {
    expect(paymentMethodSchema.safeParse(input).success).toBe(false);
  });
});

describe("invoiceSettingsSchema", () => {
  function baseSettings(): Record<string, unknown> {
    return {
      numberPrefix: "INV-",
      numberPadding: 4,
      startingNumber: 1,
      defaultDueTerms: "net_30",
      defaultTaxRateBps: 0,
      paymentMethods: [{ id: "v", type: "venmo", handle: "acme" }],
      overdueAlertsEnabled: true,
      weeklyDigestEnabled: true,
    };
  }

  it("accepts valid settings, including an empty prefix", () => {
    expect(invoiceSettingsSchema.safeParse(baseSettings()).success).toBe(true);
    expect(
      invoiceSettingsSchema.safeParse({ ...baseSettings(), numberPrefix: "" })
        .success,
    ).toBe(true);
  });

  it("offers every due term except custom as a default", () => {
    expect(INVOICE_SETTINGS_DUE_TERMS_VALUES).not.toContain("custom");
    expect(
      invoiceSettingsSchema.safeParse({
        ...baseSettings(),
        defaultDueTerms: "custom",
      }).success,
    ).toBe(false);
  });

  it.each([
    ["prefix with a space", { numberPrefix: "INV 1" }],
    ["prefix with markup", { numberPrefix: "<b>" }],
    ["prefix too long", { numberPrefix: "ABCDEFGHIJKLM" }],
    ["padding 0", { numberPadding: 0 }],
    ["padding 9", { numberPadding: 9 }],
    ["starting number 0", { startingNumber: 0 }],
    ["starting number too big", { startingNumber: 10_000_000 }],
    ["tax over 100%", { defaultTaxRateBps: 10_001 }],
  ])("rejects %s", (_name, override) => {
    expect(
      invoiceSettingsSchema.safeParse({ ...baseSettings(), ...override })
        .success,
    ).toBe(false);
  });

  it("rejects duplicate payment method ids and more than 10 methods", () => {
    const venmo = { id: "v", type: "venmo", handle: "acme" };
    expect(
      issuePaths(
        invoiceSettingsSchema.safeParse({
          ...baseSettings(),
          paymentMethods: [venmo, { ...venmo, handle: "other" }],
        }),
      ),
    ).toContain("paymentMethods.1.id");
    expect(
      invoiceSettingsSchema.safeParse({
        ...baseSettings(),
        paymentMethods: Array.from({ length: 11 }, (_, i) => ({
          ...venmo,
          id: `v${i}`,
        })),
      }).success,
    ).toBe(false);
  });
});

describe("action schemas", () => {
  it("invoiceSendSchema", () => {
    expect(
      invoiceSendSchema.safeParse({ id: "i", deliver: "email" }).success,
    ).toBe(true);
    expect(
      invoiceSendSchema.safeParse({ id: "i", deliver: "manual", message: "Hi" })
        .success,
    ).toBe(true);
    expect(
      invoiceSendSchema.safeParse({ id: "i", deliver: "fax" }).success,
    ).toBe(false);
    expect(
      invoiceSendSchema.safeParse({
        id: "i",
        deliver: "email",
        message: "x".repeat(2001),
      }).success,
    ).toBe(false);
  });

  it("recordPaymentSchema", () => {
    const ok = {
      invoiceId: "i",
      amountCents: 500,
      paidOn: "2026-09-23",
      method: "card",
    };
    const parsed = recordPaymentSchema.safeParse(ok);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.emailReceipt).toBe(false);
    for (const bad of [
      { amountCents: 0 },
      { amountCents: 10.5 },
      { paidOn: "2026-13-01" },
      { method: "bitcoin" },
      { reference: "x".repeat(201) },
    ]) {
      expect(recordPaymentSchema.safeParse({ ...ok, ...bad }).success).toBe(
        false,
      );
    }
  });

  it("cancelInvoiceSchema and sendReminderSchema", () => {
    const cancelled = cancelInvoiceSchema.safeParse({ id: "i" });
    expect(cancelled.success && cancelled.data.notifyCustomer).toBe(false);
    expect(
      cancelInvoiceSchema.safeParse({ id: "i", reason: "x".repeat(1001) })
        .success,
    ).toBe(false);
    expect(
      sendReminderSchema.safeParse({ id: "i", message: "Friendly nudge" })
        .success,
    ).toBe(true);
    expect(sendReminderSchema.safeParse({ id: "" }).success).toBe(false);
  });
});

describe("invoiceListParamsSchema", () => {
  it("fills defaults", () => {
    expect(invoiceListParamsSchema.parse({})).toEqual({
      status: "all",
      source: "all",
      sort: "newest",
      page: 1,
    });
  });

  it("rejects unknown filter values and absurd pages", () => {
    expect(invoiceListParamsSchema.safeParse({ status: "void" }).success).toBe(
      false,
    );
    expect(
      invoiceListParamsSchema.safeParse({ sort: "customer-asc" }).success,
    ).toBe(false);
    expect(invoiceListParamsSchema.safeParse({ page: 1e20 }).success).toBe(
      false,
    );
    expect(invoiceListParamsSchema.safeParse({ page: 0 }).success).toBe(false);
  });
});

describe("parseIssuerSnapshot", () => {
  it("reads a valid snapshot and rejects anything else", () => {
    const snapshot = {
      name: "Acme",
      email: null,
      phone: "555",
      addressLines: ["1 Main St"],
      logoUrl: null,
      accentColor: "#123456",
    };
    expect(parseIssuerSnapshot(snapshot)).toEqual(snapshot);
    expect(parseIssuerSnapshot(null)).toBeNull();
    expect(parseIssuerSnapshot({ name: "Acme" })).toBeNull();
  });
});
