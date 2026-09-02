import { describe, expect, it } from "vitest";

import type { QboQueryResponse } from "~/lib/quickbooks/types";
import { parseQboFault } from "~/lib/quickbooks/errors";
import {
  buildCustomerPayload,
  buildInvoicePayload,
  centsToQboAmount,
  chunk,
  computeDepositCents,
  computeDepositPresets,
  computeFinalPrefillCents,
  deriveInvoiceStatus,
  dueDateString,
  escapeQboQueryValue,
  pickEntity,
  pickQueryRows,
  presetForRule,
  qboAmountToCents,
  summarizeLeadBilling,
  toQboBillAddr,
  truncateError,
} from "~/lib/quickbooks/mapping";

/**
 * Pure QBO mapping logic. Every case here is a promise made to an owner's
 * invoicing data: the same rule, applied the same way, every time — deposit
 * math, final-balance prefill, and status derivation all get read back
 * (and re-derived on the next sync poll) long after the invoice was created.
 */

describe("computeDepositCents", () => {
  it("percent mode rounds to the nearest cent", () => {
    expect(
      computeDepositCents(
        { depositMode: "percent", depositPercent: 33, depositFixedCents: 0 },
        10001,
      ),
    ).toBe(3300);
  });

  it("percent mode is null when there is no quote amount", () => {
    expect(
      computeDepositCents(
        { depositMode: "percent", depositPercent: 33, depositFixedCents: 0 },
        null,
      ),
    ).toBeNull();
  });

  it("fixed mode clamps down to the quote amount", () => {
    expect(
      computeDepositCents(
        { depositMode: "fixed", depositPercent: 0, depositFixedCents: 5000 },
        3000,
      ),
    ).toBe(3000);
  });

  it("fixed mode returns the fixed amount as-is when there is no quote to clamp against", () => {
    expect(
      computeDepositCents(
        { depositMode: "fixed", depositPercent: 0, depositFixedCents: 5000 },
        null,
      ),
    ).toBe(5000);
  });

  it("is 0 against a $0 quote, in either mode", () => {
    expect(
      computeDepositCents(
        { depositMode: "percent", depositPercent: 50, depositFixedCents: 0 },
        0,
      ),
    ).toBe(0);
    expect(
      computeDepositCents(
        { depositMode: "fixed", depositPercent: 0, depositFixedCents: 5000 },
        0,
      ),
    ).toBe(0);
  });
});

describe("computeFinalPrefillCents", () => {
  it("subtracts only deposits that count, and ignores non-deposit invoices entirely", () => {
    expect(
      computeFinalPrefillCents(10000, [
        { kind: "deposit", status: "paid", amountCents: 3000 },
        { kind: "deposit", status: "error", amountCents: 2000 },
        { kind: "deposit", status: "voided", amountCents: 1000 },
        { kind: "deposit", status: "pending", amountCents: 500 },
        { kind: "final", status: "paid", amountCents: 999 },
      ]),
    ).toBe(7000); // 10000 - 3000 (only the "paid" deposit counts)
  });

  it("floors at 0 when prior deposits exceed the final quote", () => {
    expect(
      computeFinalPrefillCents(2000, [
        { kind: "deposit", status: "sent", amountCents: 5000 },
      ]),
    ).toBe(0);
  });

  it("is null when there is no final quote amount", () => {
    expect(computeFinalPrefillCents(null, [])).toBeNull();
  });
});

describe("computeDepositPresets", () => {
  /**
   * Odd bases are where a naive `basis * pct / 100` leaks a fraction of a
   * cent. Both facts asserted here are promises to the owner: the amount is
   * whole cents that leave an exact remainder against the quote, and it is
   * bit-for-bit the amount the deposit RULE would have produced at that
   * percentage — so switching the pre-selected chip to the value it already
   * shows can never change the invoice by a cent.
   */
  it.each([10001, 123457])(
    "prices each preset off %d in whole cents that reconcile to the basis",
    (basis) => {
      const presets = computeDepositPresets(basis);
      expect(presets.map((preset) => preset.percent)).toEqual([25, 50, 75]);

      for (const preset of presets) {
        expect(Number.isInteger(preset.amountCents)).toBe(true);
        const remainder = basis - preset.amountCents;
        expect(remainder).toBeGreaterThanOrEqual(0);
        expect(preset.amountCents + remainder).toBe(basis);
        expect(preset.amountCents).toBe(
          computeDepositCents(
            {
              depositMode: "percent",
              depositPercent: preset.percent,
              depositFixedCents: 0,
            },
            basis,
          ),
        );
      }
    },
  );

  it("offers nothing when there is no basis to take a percentage of", () => {
    expect(computeDepositPresets(null)).toEqual([]);
  });

  it("still offers all three presets against a $0 quote, all worth 0", () => {
    expect(computeDepositPresets(0)).toEqual([
      { percent: 25, amountCents: 0 },
      { percent: 50, amountCents: 0 },
      { percent: 75, amountCents: 0 },
    ]);
  });
});

describe("presetForRule", () => {
  it.each([25, 50, 75] as const)(
    "pre-selects the matching chip for a %d%% rule",
    (percent) => {
      expect(
        presetForRule({
          depositMode: "percent",
          depositPercent: percent,
          depositFixedCents: 0,
        }),
      ).toBe(percent);
    },
  );

  it.each([30, 100])(
    "falls back to custom for a %d%% rule that is not one of the chips",
    (percent) => {
      expect(
        presetForRule({
          depositMode: "percent",
          depositPercent: percent,
          depositFixedCents: 0,
        }),
      ).toBe("custom");
    },
  );

  it("is custom for a fixed rule, whatever the amount", () => {
    // Even $50 of a $100 quote — a fixed rule is a percentage of nothing, and
    // labelling it 50% would re-anchor it on the next, differently-sized lead.
    for (const depositFixedCents of [0, 5000, 999_999]) {
      expect(
        presetForRule({
          depositMode: "fixed",
          depositPercent: 50,
          depositFixedCents,
        }),
      ).toBe("custom");
    }
  });
});

describe("summarizeLeadBilling", () => {
  it("counts only live deposits, split paid vs unpaid, ignoring finals and customs", () => {
    const invoices = [
      { kind: "deposit", status: "paid", amountCents: 3000 },
      { kind: "deposit", status: "sent", amountCents: 2000 },
      { kind: "deposit", status: "overdue", amountCents: 1000 },
      { kind: "deposit", status: "error", amountCents: 400 },
      { kind: "deposit", status: "voided", amountCents: 300 },
      { kind: "deposit", status: "pending", amountCents: 200 },
      { kind: "custom", status: "paid", amountCents: 7777 },
      { kind: "final", status: "voided", amountCents: 8888 },
    ];

    expect(summarizeLeadBilling({ quoteCents: 20000, invoices })).toEqual({
      quoteCents: 20000,
      invoicedDepositCents: 6000, // 3000 + 2000 + 1000
      paidDepositCents: 3000,
      unpaidDepositCents: 3000,
      remainingAfterDepositsCents: 14000,
      liveFinalCents: null, // the only final is voided
    });
  });

  it("reports the live final's amount when one exists", () => {
    expect(
      summarizeLeadBilling({
        quoteCents: 20000,
        invoices: [
          { kind: "final", status: "sent", amountCents: 14000 },
          { kind: "deposit", status: "paid", amountCents: 6000 },
        ],
      }).liveFinalCents,
    ).toBe(14000);
  });

  it.each(["error", "voided", "pending"])(
    "reports no live final when the only final is %s",
    (status) => {
      expect(
        summarizeLeadBilling({
          quoteCents: 20000,
          invoices: [{ kind: "final", status, amountCents: 14000 }],
        }).liveFinalCents,
      ).toBeNull();
    },
  );

  /**
   * The summary the owner reads and the amount prefilled into the invoice
   * dialog must be the same number — including the floor at 0, which is the
   * case most likely to drift if either side ever re-derives the subtraction.
   */
  it.each([
    {
      label: "ordinary remainder",
      quoteCents: 20000,
      invoices: [{ kind: "deposit", status: "sent", amountCents: 5000 }],
    },
    {
      label: "deposits exceeding the quote (floors at 0)",
      quoteCents: 2000,
      invoices: [{ kind: "deposit", status: "sent", amountCents: 5000 }],
    },
    {
      label: "no deposits at all",
      quoteCents: 2000,
      invoices: [] as Array<{
        kind: string;
        status: string;
        amountCents: number;
      }>,
    },
  ])(
    "remainingAfterDepositsCents matches computeFinalPrefillCents — $label",
    ({ quoteCents, invoices }) => {
      expect(
        summarizeLeadBilling({ quoteCents, invoices })
          .remainingAfterDepositsCents,
      ).toBe(computeFinalPrefillCents(quoteCents, invoices));
    },
  );

  it("floors the remaining balance at 0 rather than going negative", () => {
    expect(
      summarizeLeadBilling({
        quoteCents: 2000,
        invoices: [{ kind: "deposit", status: "sent", amountCents: 5000 }],
      }),
    ).toMatchObject({
      invoicedDepositCents: 5000,
      unpaidDepositCents: 5000,
      remainingAfterDepositsCents: 0,
    });
  });

  it("has no remaining balance to report when the lead has no priced quote", () => {
    expect(
      summarizeLeadBilling({
        quoteCents: null,
        invoices: [{ kind: "deposit", status: "paid", amountCents: 5000 }],
      }),
    ).toEqual({
      quoteCents: null,
      invoicedDepositCents: 5000,
      paidDepositCents: 5000,
      unpaidDepositCents: 0,
      remainingAfterDepositsCents: null,
      liveFinalCents: null,
    });
  });
});

describe("deriveInvoiceStatus", () => {
  const now = new Date("2026-08-24T12:00:00Z");
  const UTC = { timeZone: "UTC", expectedTotalCents: 10000 } as const;

  it("reports voided when TotalAmt drops to 0 against a non-zero expectation", () => {
    expect(
      deriveInvoiceStatus(
        { TotalAmt: 0, Balance: 0 },
        { now, previous: "created", ...UTC },
      ),
    ).toBe("voided");
  });

  it("reports paid once Balance reaches 0, even if TotalAmt stayed non-zero", () => {
    expect(
      deriveInvoiceStatus(
        { TotalAmt: 100, Balance: 0 },
        { now, previous: "sent", ...UTC },
      ),
    ).toBe("paid");
  });

  it("reports overdue once DueDate is strictly in the past", () => {
    expect(
      deriveInvoiceStatus(
        { TotalAmt: 100, Balance: 100, DueDate: "2026-08-23" },
        { now, previous: "sent", ...UTC },
      ),
    ).toBe("overdue");
  });

  it("does not report overdue when DueDate is today", () => {
    expect(
      deriveInvoiceStatus(
        { TotalAmt: 100, Balance: 100, DueDate: "2026-08-24" },
        { now, previous: "sent", ...UTC },
      ),
    ).toBe("sent"); // unchanged from `previous` — not bumped to "overdue"
  });

  it("advances created -> sent once QBO reports the invoice email as sent", () => {
    expect(
      deriveInvoiceStatus(
        {
          TotalAmt: 100,
          Balance: 100,
          DueDate: "2026-09-01",
          EmailStatus: "EmailSent",
        },
        { now, previous: "created", ...UTC },
      ),
    ).toBe("sent");
  });

  it("advances overdue -> sent once the due date is pushed back out (no longer overdue)", () => {
    expect(
      deriveInvoiceStatus(
        { TotalAmt: 100, Balance: 100, DueDate: "2026-09-01" },
        { now, previous: "overdue", ...UTC },
      ),
    ).toBe("sent");
  });

  it("stays created when the invoice email hasn't gone out yet", () => {
    expect(
      deriveInvoiceStatus(
        { TotalAmt: 100, Balance: 100, DueDate: "2026-09-01" },
        { now, previous: "created", ...UTC },
      ),
    ).toBe("created");
  });

  /**
   * The overdue boundary is the whole reason `timeZone` is on the ctx. QBO's
   * `DueDate` is a bare calendar date with no zone attached, so "is it late?"
   * is only answerable against a specific wall calendar — and the sync cron
   * re-derives this every 15 minutes, so getting the calendar wrong doesn't
   * misfire once, it misfires for hours. Detroit is UTC-4 in August, which
   * makes the entire evening (8pm–midnight local) already "tomorrow" in UTC:
   * the old UTC-date comparison turned every same-day invoice red four hours
   * early, every single day, for every store west of Greenwich.
   */
  it("is NOT overdue at 23:30 on the due date in the business's own zone", () => {
    // 2026-08-25T03:30Z is 2026-08-24 23:30 in Detroit (EDT, UTC-4) — the
    // UTC calendar has already rolled over to the 25th, the owner's has not.
    const lateEvening = new Date("2026-08-25T03:30:00Z");

    expect(
      deriveInvoiceStatus(
        { TotalAmt: 100, Balance: 100, DueDate: "2026-08-24" },
        {
          now: lateEvening,
          previous: "sent",
          expectedTotalCents: 10000,
          timeZone: "America/Detroit",
        },
      ),
    ).toBe("sent");

    // Same instant, same invoice — a UTC business IS past its due date.
    expect(
      deriveInvoiceStatus(
        { TotalAmt: 100, Balance: 100, DueDate: "2026-08-24" },
        {
          now: lateEvening,
          previous: "sent",
          expectedTotalCents: 10000,
          timeZone: "UTC",
        },
      ),
    ).toBe("overdue");
  });

  it("becomes overdue at 00:30 the next day in the business's own zone", () => {
    // 2026-08-25T04:30Z is 2026-08-25 00:30 in Detroit — the local calendar
    // has now rolled over too, so a due date of the 24th is genuinely late.
    const justAfterMidnight = new Date("2026-08-25T04:30:00Z");

    expect(
      deriveInvoiceStatus(
        { TotalAmt: 100, Balance: 100, DueDate: "2026-08-24" },
        {
          now: justAfterMidnight,
          previous: "sent",
          expectedTotalCents: 10000,
          timeZone: "America/Detroit",
        },
      ),
    ).toBe("overdue");
  });

  it("still reports paid, never overdue, past the due date in any zone", () => {
    // Rule 2 outranks rule 3 — zoning the comparison must not have reordered
    // them. A paid invoice going red is a support ticket, not a nuance.
    expect(
      deriveInvoiceStatus(
        { TotalAmt: 100, Balance: 0, DueDate: "2026-01-01" },
        {
          now,
          previous: "sent",
          expectedTotalCents: 10000,
          timeZone: "America/Detroit",
        },
      ),
    ).toBe("paid");
  });
});

describe("centsToQboAmount / qboAmountToCents", () => {
  it("round-trip cents <-> QBO decimal amount", () => {
    expect(centsToQboAmount(1999)).toBe(19.99);
    expect(qboAmountToCents(19.99)).toBe(1999);
  });

  it("qboAmountToCents passes null/undefined through as null", () => {
    expect(qboAmountToCents(null)).toBeNull();
    expect(qboAmountToCents(undefined)).toBeNull();
  });
});

describe("escapeQboQueryValue", () => {
  it("escapes backslashes before quotes, so a trailing backslash can't consume the closing quote", () => {
    expect(escapeQboQueryValue("O'Brien \\ Co")).toBe("O\\'Brien \\\\ Co");
  });
});

describe("toQboBillAddr", () => {
  it("maps state -> CountrySubDivisionCode and zip -> PostalCode, stamping Country", () => {
    expect(
      toQboBillAddr({
        line1: "1200 Woodward Ave",
        line2: "Suite 400",
        city: "Detroit",
        state: "MI",
        zip: "48226",
      }),
    ).toEqual({
      Line1: "1200 Woodward Ave",
      Line2: "Suite 400",
      City: "Detroit",
      CountrySubDivisionCode: "MI",
      PostalCode: "48226",
      Country: "USA",
    });
  });

  it("omits Line2 entirely rather than sending an empty one", () => {
    // QBO echoes back what it's given, so an empty Line2 prints as a blank
    // line on the invoice the customer actually receives.
    const addr = toQboBillAddr({
      line1: "1200 Woodward Ave",
      city: "Detroit",
      state: "MI",
      zip: "48226-1234",
    });

    expect(addr).not.toHaveProperty("Line2");
    expect(addr.PostalCode).toBe("48226-1234");
  });
});

describe("buildCustomerPayload", () => {
  const BASE = { name: "Acme Co", email: "billing@acme.example" };

  it("includes BillAddr when an address is given", () => {
    expect(
      buildCustomerPayload({
        ...BASE,
        phone: "555-0100",
        billAddr: toQboBillAddr({
          line1: "1200 Woodward Ave",
          city: "Detroit",
          state: "MI",
          zip: "48226",
        }),
      }),
    ).toEqual({
      DisplayName: "Acme Co",
      PrimaryEmailAddr: { Address: "billing@acme.example" },
      PrimaryPhone: { FreeFormNumber: "555-0100" },
      BillAddr: {
        Line1: "1200 Woodward Ave",
        City: "Detroit",
        CountrySubDivisionCode: "MI",
        PostalCode: "48226",
        Country: "USA",
      },
    });
  });

  it("omits BillAddr when the address is absent or null", () => {
    // Two spellings of "no address" — an older lead that never captured one
    // (undefined) and a row whose nullable column read back NULL.
    expect(buildCustomerPayload(BASE)).not.toHaveProperty("BillAddr");
    expect(
      buildCustomerPayload({ ...BASE, billAddr: null }),
    ).not.toHaveProperty("BillAddr");
  });
});

describe("buildInvoicePayload", () => {
  it("includes CustomerMemo and online-payment flags when requested", () => {
    const payload = buildInvoicePayload({
      customerId: "42",
      itemId: "7",
      amountCents: 12345,
      description: "Deposit — Acme Co",
      dueDate: "2026-09-01",
      email: "owner@example.com",
      memo: "Thanks for your business",
      allowOnlinePayment: true,
    });

    expect(payload).toEqual({
      CustomerRef: { value: "42" },
      Line: [
        {
          Amount: 123.45,
          DetailType: "SalesItemLineDetail",
          Description: "Deposit — Acme Co",
          SalesItemLineDetail: {
            ItemRef: { value: "7" },
            Qty: 1,
            UnitPrice: 123.45,
          },
        },
      ],
      DueDate: "2026-09-01",
      BillEmail: { Address: "owner@example.com" },
      CustomerMemo: { value: "Thanks for your business" },
      AllowOnlineCreditCardPayment: true,
      AllowOnlineACHPayment: true,
    });
  });

  it("omits CustomerMemo and online-payment flags when not requested", () => {
    const payload = buildInvoicePayload({
      customerId: "42",
      itemId: "7",
      amountCents: 5000,
      description: "Final balance — Acme Co",
      dueDate: "2026-09-01",
      email: "owner@example.com",
      allowOnlinePayment: false,
    });

    expect(payload).toEqual({
      CustomerRef: { value: "42" },
      Line: [
        {
          Amount: 50,
          DetailType: "SalesItemLineDetail",
          Description: "Final balance — Acme Co",
          SalesItemLineDetail: {
            ItemRef: { value: "7" },
            Qty: 1,
            UnitPrice: 50,
          },
        },
      ],
      DueDate: "2026-09-01",
      BillEmail: { Address: "owner@example.com" },
    });
    expect(payload).not.toHaveProperty("CustomerMemo");
    expect(payload).not.toHaveProperty("AllowOnlineCreditCardPayment");
    expect(payload).not.toHaveProperty("AllowOnlineACHPayment");
    expect(payload).not.toHaveProperty("BillAddr");
  });

  it("includes BillAddr when an address is given, and omits it when null", () => {
    // Per-invoice rather than per-customer: the customer record is written
    // once at create time and never updated, so a lead that moved between
    // the deposit and the final invoice is only accurate because of this.
    const base = {
      customerId: "42",
      itemId: "7",
      amountCents: 5000,
      description: "Final balance — Acme Co",
      dueDate: "2026-09-01",
      email: "owner@example.com",
      allowOnlinePayment: false,
    };
    const billAddr = toQboBillAddr({
      line1: "1200 Woodward Ave",
      line2: "Suite 400",
      city: "Detroit",
      state: "MI",
      zip: "48226",
    });

    expect(buildInvoicePayload({ ...base, billAddr })).toMatchObject({
      BillAddr: {
        Line1: "1200 Woodward Ave",
        Line2: "Suite 400",
        City: "Detroit",
        CountrySubDivisionCode: "MI",
        PostalCode: "48226",
        Country: "USA",
      },
    });

    expect(buildInvoicePayload({ ...base, billAddr: null })).not.toHaveProperty(
      "BillAddr",
    );
  });
});

describe("dueDateString", () => {
  it("adds exactly one calendar day across a DST spring-forward — never shifted by the transition", () => {
    // The second Sunday of March 2026 is March 8 — DST begins at 2:00am
    // local time that day (clocks spring forward to 3:00am EDT). This `now`
    // sits just before that instant, still on EST (-05:00), on calendar date
    // March 7 in Detroit. Regression test for a previous bug: computing this
    // as `now.getTime() + 1 * 86_400_000` before formatting landed on
    // 2026-03-09 (one day late) because the transition eats an hour of
    // instant-domain arithmetic. Calendar-domain arithmetic (add 1 to the
    // Detroit-local day-of-month) is immune to that — the answer is always
    // exactly the next calendar day, DST or not.
    const now = new Date("2026-03-07T23:30:00-05:00");
    expect(dueDateString(now, 1, "America/Detroit")).toBe("2026-03-08");
  });

  it("returns today's zoned calendar date when dueDays is 0, not UTC's", () => {
    // 2026-06-15T02:30:00Z is already June 15 in UTC, but only
    // 2026-06-14T22:30 in America/Detroit (EDT, UTC-4) — a late-UTC edge
    // where the two calendar dates disagree.
    const now = new Date("2026-06-15T02:30:00Z");
    expect(dueDateString(now, 0, "America/Detroit")).toBe("2026-06-14");
    expect(dueDateString(now, 0, "UTC")).toBe("2026-06-15");
  });

  it("adds calendar days from the zone-local date across a late-UTC edge, including month rollover", () => {
    // 2026-06-01T03:30:00Z is already June 1 in UTC, but still 2026-05-31,
    // 23:30 in America/Detroit (EDT, UTC-4). +7 calendar days from the
    // Detroit-local date (May 31) is June 7 — verifying both the late-UTC
    // edge and that day-overflow correctly rolls into the next month.
    const now = new Date("2026-06-01T03:30:00Z");
    expect(dueDateString(now, 7, "America/Detroit")).toBe("2026-06-07");
  });

  it("throws RangeError for an invalid IANA time zone", () => {
    expect(() => dueDateString(new Date(), 1, "Not/AZone")).toThrow(RangeError);
  });
});

describe("truncateError", () => {
  it("returns the message unchanged when within the limit", () => {
    expect(truncateError("short", 10)).toBe("short");
  });

  it("truncates and appends an ellipsis without exceeding max length", () => {
    const result = truncateError("a".repeat(20), 10);
    expect(result).toHaveLength(10);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("chunk", () => {
  it("splits into fixed-size groups, with a smaller final chunk", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns [] for an empty input", () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it("throws RangeError for a non-positive size", () => {
    expect(() => chunk([1, 2], 0)).toThrow(RangeError);
  });
});

describe("pickQueryRows", () => {
  it("extracts rows for the named entity", () => {
    const body: QboQueryResponse<{ Id: string }> = {
      QueryResponse: { Invoice: [{ Id: "1" }, { Id: "2" }], maxResults: 2 },
    };
    expect(pickQueryRows(body, "Invoice")).toEqual([{ Id: "1" }, { Id: "2" }]);
  });

  it("returns [] when the entity key is absent (a query that matched nothing)", () => {
    const body: QboQueryResponse<{ Id: string }> = {
      QueryResponse: { maxResults: 0, totalCount: 0 },
    };
    expect(pickQueryRows(body, "Invoice")).toEqual([]);
  });

  it("returns [] when QueryResponse itself is absent", () => {
    expect(pickQueryRows<{ Id: string }>({}, "Invoice")).toEqual([]);
  });

  it("returns [] when body is undefined", () => {
    expect(pickQueryRows<{ Id: string }>(undefined, "Invoice")).toEqual([]);
  });
});

describe("pickEntity", () => {
  it("extracts the named entity", () => {
    expect(
      pickEntity<{ Id: string }>(
        { Invoice: { Id: "9" }, time: "x" },
        "Invoice",
      ),
    ).toEqual({ Id: "9" });
  });

  it("returns null when the key is absent", () => {
    expect(pickEntity({ time: "x" }, "Invoice")).toBeNull();
  });

  it("returns null for a non-object body", () => {
    expect(pickEntity("not an object", "Invoice")).toBeNull();
    expect(pickEntity(null, "Invoice")).toBeNull();
  });
});

describe("parseQboFault (errors.ts)", () => {
  it("parses a realistic Intuit Fault body", () => {
    const body = {
      Fault: {
        Error: [
          {
            Message: "Duplicate Document Number Error",
            Detail:
              "Duplicate Document Number Error : You must specify a different number.",
            code: "6240",
          },
        ],
        type: "ValidationFault",
      },
      time: "2026-08-24T12:00:00.000-07:00",
    };

    expect(parseQboFault(body)).toEqual({
      message: "Duplicate Document Number Error",
      code: "6240",
      detail:
        "Duplicate Document Number Error : You must specify a different number.",
      type: "ValidationFault",
    });
  });

  it("returns null for a body with no recognizable Fault", () => {
    expect(parseQboFault({ some: "thing" })).toBeNull();
    expect(parseQboFault(null)).toBeNull();
    expect(parseQboFault("oops")).toBeNull();
  });
});
