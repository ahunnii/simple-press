import { describe, expect, it } from "vitest";

import { isCheckoutOverdue, lineOutstanding } from "./rentals";

const utc = (ymd: string) => new Date(`${ymd}T00:00:00Z`);

describe("lineOutstanding", () => {
  it("subtracts returned, damaged and lost from qtyOut", () => {
    expect(
      lineOutstanding({
        qtyOut: 10,
        qtyReturned: 4,
        qtyDamaged: 1,
        qtyLost: 2,
      }),
    ).toBe(3);
    expect(
      lineOutstanding({ qtyOut: 2, qtyReturned: 2, qtyDamaged: 0, qtyLost: 0 }),
    ).toBe(0);
  });
});

describe("isCheckoutOverdue", () => {
  it("the due date itself is not overdue; the day after is", () => {
    const due = { status: "open", dueBackOn: utc("2026-09-30") };
    expect(
      isCheckoutOverdue(due, new Date("2026-09-30T15:00:00Z"), "UTC"),
    ).toBe(false);
    expect(
      isCheckoutOverdue(due, new Date("2026-10-01T00:00:01Z"), "UTC"),
    ).toBe(true);
  });

  it("11pm in America/Los_Angeles is still the due date locally, even though it is already tomorrow in UTC", () => {
    // 2026-09-30 23:00 PDT == 2026-10-01 06:00 UTC.
    const now = new Date("2026-10-01T06:00:00Z");
    const due = { status: "open", dueBackOn: utc("2026-09-30") };
    expect(isCheckoutOverdue(due, now, "America/Los_Angeles")).toBe(false);
    // The same instant judged in UTC is already the next day → overdue.
    expect(isCheckoutOverdue(due, now, "UTC")).toBe(true);
    // Due the day before → overdue in LA too.
    expect(
      isCheckoutOverdue(
        { status: "open", dueBackOn: utc("2026-09-29") },
        now,
        "America/Los_Angeles",
      ),
    ).toBe(true);
  });

  it("closed check-outs and ones without a due date are never overdue", () => {
    const now = new Date("2027-01-01T12:00:00Z");
    expect(
      isCheckoutOverdue(
        { status: "closed", dueBackOn: utc("2026-01-01") },
        now,
        "UTC",
      ),
    ).toBe(false);
    expect(
      isCheckoutOverdue({ status: "open", dueBackOn: null }, now, "UTC"),
    ).toBe(false);
  });
});
