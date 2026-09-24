import { describe, expect, it } from "vitest";

import {
  deriveInvoiceStatus,
  invoiceCapabilities,
  isInvoiceOverdue,
  REMINDER_COOLDOWN_MS,
  resolveDueDateYmd,
  todayUtcMidnight,
  toInvoiceStatus,
  utcMidnightToYmd,
  ymdToUtcMidnight,
} from "./status";

describe("deriveInvoiceStatus", () => {
  it("keeps DRAFT and CANCELLED sticky regardless of money", () => {
    expect(
      deriveInvoiceStatus({
        status: "DRAFT",
        totalCents: 1000,
        amountPaidCents: 1000,
      }),
    ).toBe("DRAFT");
    expect(
      deriveInvoiceStatus({
        status: "CANCELLED",
        totalCents: 1000,
        amountPaidCents: 500,
      }),
    ).toBe("CANCELLED");
  });

  it("follows the money for open invoices", () => {
    const base = { totalCents: 1000 };
    expect(
      deriveInvoiceStatus({ ...base, status: "SENT", amountPaidCents: 0 }),
    ).toBe("SENT");
    expect(
      deriveInvoiceStatus({ ...base, status: "SENT", amountPaidCents: 1 }),
    ).toBe("PARTIALLY_PAID");
    expect(
      deriveInvoiceStatus({
        ...base,
        status: "PARTIALLY_PAID",
        amountPaidCents: 1000,
      }),
    ).toBe("PAID");
  });

  it("walks a PAID invoice back when payments are deleted", () => {
    expect(
      deriveInvoiceStatus({
        status: "PAID",
        totalCents: 1000,
        amountPaidCents: 400,
      }),
    ).toBe("PARTIALLY_PAID");
    expect(
      deriveInvoiceStatus({
        status: "PAID",
        totalCents: 1000,
        amountPaidCents: 0,
      }),
    ).toBe("SENT");
  });
});

describe("toInvoiceStatus", () => {
  it("passes known statuses and maps unknown ones to SENT", () => {
    expect(toInvoiceStatus("PAID")).toBe("PAID");
    expect(toInvoiceStatus("paid")).toBe("SENT");
    expect(toInvoiceStatus("")).toBe("SENT");
  });
});

describe("calendar-date helpers", () => {
  it("round-trips YYYY-MM-DD through UTC midnight", () => {
    const d = ymdToUtcMidnight("2026-09-30");
    expect(d.toISOString()).toBe("2026-09-30T00:00:00.000Z");
    expect(utcMidnightToYmd(d)).toBe("2026-09-30");
  });

  it("todayUtcMidnight uses the business's local date", () => {
    // 03:30Z on Oct 1 is still Sep 30 in Detroit (UTC−4).
    expect(
      todayUtcMidnight(
        new Date("2026-10-01T03:30:00Z"),
        "America/Detroit",
      ).toISOString(),
    ).toBe("2026-09-30T00:00:00.000Z");
  });

  it("todayUtcMidnight falls back to UTC for an invalid zone", () => {
    expect(
      todayUtcMidnight(
        new Date("2026-10-01T03:30:00Z"),
        "Not/AZone",
      ).toISOString(),
    ).toBe("2026-10-01T00:00:00.000Z");
  });
});

describe("isInvoiceOverdue", () => {
  const due = ymdToUtcMidnight("2026-09-30");
  const sent = { status: "SENT", dueDate: due };

  // For each zone: the last instant of Sep 30 local (still due today) and the
  // first instant of Oct 1 local (overdue).
  const boundaries: [
    zone: string,
    lastMomentDue: string,
    firstOverdue: string,
  ][] = [
    // UTC−4 (EDT): local midnight is 04:00Z the next UTC day.
    ["America/Detroit", "2026-10-01T03:59:59.999Z", "2026-10-01T04:00:00.000Z"],
    // UTC+14: local Oct 1 starts while it is still Sep 30 in UTC.
    [
      "Pacific/Kiritimati",
      "2026-09-30T09:59:59.999Z",
      "2026-09-30T10:00:00.000Z",
    ],
    // UTC−11: UTC has been on Oct 1 for 11 hours before local catches up.
    [
      "Pacific/Pago_Pago",
      "2026-10-01T10:59:59.999Z",
      "2026-10-01T11:00:00.000Z",
    ],
  ];

  it.each(boundaries)(
    "%s: not overdue through the local due date, overdue from local midnight after",
    (zone, lastMomentDue, firstOverdue) => {
      expect(isInvoiceOverdue(sent, new Date(lastMomentDue), zone)).toBe(false);
      expect(isInvoiceOverdue(sent, new Date(firstOverdue), zone)).toBe(true);
    },
  );

  it("counts PARTIALLY_PAID as able to go overdue", () => {
    expect(
      isInvoiceOverdue(
        { status: "PARTIALLY_PAID", dueDate: due },
        new Date("2026-10-05T12:00:00Z"),
        "UTC",
      ),
    ).toBe(true);
  });

  it("is never overdue for drafts, paid, cancelled, or no due date", () => {
    const later = new Date("2027-01-01T12:00:00Z");
    for (const status of ["DRAFT", "PAID", "CANCELLED"]) {
      expect(isInvoiceOverdue({ status, dueDate: due }, later, "UTC")).toBe(
        false,
      );
    }
    expect(
      isInvoiceOverdue({ status: "SENT", dueDate: null }, later, "UTC"),
    ).toBe(false);
  });
});

describe("resolveDueDateYmd", () => {
  it.each([
    ["receipt", "2026-09-23"],
    ["net_7", "2026-09-30"],
    ["net_15", "2026-10-08"],
    ["net_30", "2026-10-23"],
    ["net_60", "2026-11-22"],
  ] as const)("%s from 2026-09-23 → %s", (terms, expected) => {
    expect(resolveDueDateYmd(terms, "2026-09-23")).toBe(expected);
  });

  it("counts calendar days across a DST change and month/year ends", () => {
    expect(resolveDueDateYmd("net_7", "2026-10-29")).toBe("2026-11-05");
    expect(resolveDueDateYmd("net_30", "2026-12-15")).toBe("2027-01-14");
    expect(resolveDueDateYmd("net_30", "2028-02-15")).toBe("2028-03-16");
  });

  it("returns the custom date as-is, or null when missing", () => {
    expect(resolveDueDateYmd("custom", "2026-09-23", "2026-12-01")).toBe(
      "2026-12-01",
    );
    expect(resolveDueDateYmd("custom", "2026-09-23")).toBeNull();
    expect(resolveDueDateYmd("custom", "2026-09-23", null)).toBeNull();
  });
});

describe("invoiceCapabilities", () => {
  const now = new Date("2026-09-23T12:00:00Z");
  const base = {
    totalCents: 1000,
    amountPaidCents: 0,
    lastReminderSentAt: null,
  };

  it("drafts can be edited, deleted and sent (non-zero total), nothing else", () => {
    expect(invoiceCapabilities({ ...base, status: "DRAFT" }, now)).toEqual({
      canEdit: true,
      canSend: true,
      canRecordPayment: false,
      canCancel: false,
      canDelete: true,
      canRemind: false,
      remindAvailableAt: null,
    });
  });

  it("a $0 draft can't be sent", () => {
    expect(
      invoiceCapabilities({ ...base, status: "DRAFT", totalCents: 0 }, now)
        .canSend,
    ).toBe(false);
  });

  it("open invoices can be paid, cancelled and reminded", () => {
    for (const status of ["SENT", "PARTIALLY_PAID"]) {
      expect(
        invoiceCapabilities({ ...base, status, amountPaidCents: 400 }, now),
      ).toEqual({
        canEdit: false,
        canSend: false,
        canRecordPayment: true,
        canCancel: true,
        canDelete: false,
        canRemind: true,
        remindAvailableAt: null,
      });
    }
  });

  it("paid and cancelled invoices allow nothing", () => {
    for (const status of ["PAID", "CANCELLED"]) {
      const caps = invoiceCapabilities(
        { ...base, status, amountPaidCents: 1000 },
        now,
      );
      expect(Object.values(caps).filter((v) => v === true)).toEqual([]);
      expect(caps.remindAvailableAt).toBeNull();
    }
  });

  it("holds reminders for 24h after the last one", () => {
    const last = new Date(now.getTime() - REMINDER_COOLDOWN_MS + 60_000);
    const caps = invoiceCapabilities(
      { ...base, status: "SENT", lastReminderSentAt: last },
      now,
    );
    expect(caps.canRemind).toBe(false);
    expect(caps.remindAvailableAt?.toISOString()).toBe(
      new Date(last.getTime() + REMINDER_COOLDOWN_MS).toISOString(),
    );

    const exactlyDue = invoiceCapabilities(
      {
        ...base,
        status: "SENT",
        lastReminderSentAt: new Date(now.getTime() - REMINDER_COOLDOWN_MS),
      },
      now,
    );
    expect(exactlyDue.canRemind).toBe(true);
    expect(exactlyDue.remindAvailableAt).toBeNull();
  });
});
