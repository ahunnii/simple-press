import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  EventTargetStatus,
  RecipientStatus,
  ResendEventsDb,
  ResendWebhookEvent,
} from "./resend-events";

import {
  ALLOWED_FROM,
  applyResendEvent,
  canTransition,
  isMarketingEvent,
  readTag,
} from "./resend-events";

type Row = {
  id: string;
  businessId: string;
  campaignId: string;
  customerId: string | null;
  email: string;
  status: RecipientStatus;
  resendId: string | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  bouncedAt: Date | null;
  complainedAt: Date | null;
  error: string | null;
};

type CustomerRow = {
  id: string;
  businessId: string;
  acceptsMarketing: boolean;
  marketingUnsubscribedAt: Date | null;
  marketingSuppressedAt: Date | null;
  marketingSuppressionReason: string | null;
};

type Where = Record<string, unknown>;

/** Tiny in-memory stand-in for the two Prisma delegates the module uses. */
function makeFakeDb(rows: Row[], customers: CustomerRow[]) {
  const matches = (row: Record<string, unknown>, where: Where) =>
    Object.entries(where).every(([key, cond]) => {
      if (cond && typeof cond === "object" && "in" in cond) {
        return (cond as { in: unknown[] }).in.includes(row[key]);
      }
      if (cond && typeof cond === "object" && "equals" in cond) {
        const { equals, mode } = cond as { equals: string; mode?: string };
        return mode === "insensitive"
          ? String(row[key]).toLowerCase() === equals.toLowerCase()
          : row[key] === equals;
      }
      return row[key] === cond;
    });

  const recipient = {
    findUnique: vi.fn(({ where }: { where: Where }) =>
      Promise.resolve(rows.find((r) => matches(r, where)) ?? null),
    ),
    findMany: vi.fn(({ where }: { where: Where }) =>
      Promise.resolve(rows.filter((r) => matches(r, where))),
    ),
    updateMany: vi.fn(
      ({ where, data }: { where: Where; data: Partial<Row> }) => {
        const hit = rows.filter((r) => matches(r, where));
        for (const r of hit) Object.assign(r, data);
        return Promise.resolve({ count: hit.length });
      },
    ),
  };
  const customer = {
    updateMany: vi.fn(
      ({ where, data }: { where: Where; data: Partial<CustomerRow> }) => {
        const hit = customers.filter((c) => matches(c, where));
        for (const c of hit) Object.assign(c, data);
        return Promise.resolve({ count: hit.length });
      },
    ),
  };
  const db = {
    marketingCampaignRecipient: recipient,
    customer,
  } as unknown as ResendEventsDb;
  return { db, recipient, customer };
}

const MARKETING_TAGS = {
  category: "marketing_broadcast",
  campaign: "camp_1",
  business: "biz_1",
};

function event(
  type: string,
  extra: Partial<NonNullable<ResendWebhookEvent["data"]>> = {},
  tags: unknown = MARKETING_TAGS,
): ResendWebhookEvent {
  return {
    type,
    created_at: "2026-10-16T12:00:00.000Z",
    data: { email_id: "re_1", to: ["Shopper@Test.dev"], tags, ...extra },
  };
}

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: "rcp_1",
    businessId: "biz_1",
    campaignId: "camp_1",
    customerId: "cus_1",
    email: "shopper@test.dev",
    status: "SENT",
    resendId: "re_1",
    sentAt: null,
    deliveredAt: null,
    bouncedAt: null,
    complainedAt: null,
    error: null,
    ...overrides,
  };
}

function customerRow(overrides: Partial<CustomerRow> = {}): CustomerRow {
  return {
    id: "cus_1",
    businessId: "biz_1",
    acceptsMarketing: true,
    marketingUnsubscribedAt: null,
    marketingSuppressedAt: null,
    marketingSuppressionReason: null,
    ...overrides,
  };
}

const NOW = new Date("2026-10-16T12:05:00.000Z");

describe("readTag / isMarketingEvent", () => {
  it("reads the object-map form", () => {
    expect(readTag({ category: "marketing_broadcast" }, "category")).toBe(
      "marketing_broadcast",
    );
  });

  it("reads the array form", () => {
    expect(
      readTag(
        [
          { name: "business", value: "b" },
          { name: "category", value: "marketing_broadcast" },
        ],
        "category",
      ),
    ).toBe("marketing_broadcast");
  });

  it.each([undefined, null, "x", 3, {}, [], [{ name: "category" }]])(
    "tolerates junk tags (%j)",
    (tags) => {
      expect(readTag(tags, "category")).toBeUndefined();
    },
  );

  it("only matches the marketing category", () => {
    expect(isMarketingEvent(event("email.delivered"))).toBe(true);
    expect(
      isMarketingEvent(event("email.delivered", {}, { category: "order" })),
    ).toBe(false);
    expect(isMarketingEvent({ type: "domain.updated" })).toBe(false);
  });
});

describe("status precedence table", () => {
  const ALL: RecipientStatus[] = [
    "PENDING",
    "SENDING",
    "SENT",
    "DELIVERED",
    "BOUNCED",
    "COMPLAINED",
    "FAILED",
    "SKIPPED",
    "CANCELED",
  ];

  // [from, to, allowed]: the full matrix, spelled out so a change to the
  // rules has to be made here deliberately.
  const EXPECTED: Record<EventTargetStatus, RecipientStatus[]> = {
    DELIVERED: ["PENDING", "SENDING", "SENT", "FAILED"],
    BOUNCED: ["PENDING", "SENDING", "SENT", "DELIVERED", "FAILED"],
    COMPLAINED: [
      "PENDING",
      "SENDING",
      "SENT",
      "DELIVERED",
      "BOUNCED",
      "FAILED",
    ],
    FAILED: ["PENDING", "SENDING", "SENT"],
  };

  const cases = (Object.keys(EXPECTED) as EventTargetStatus[]).flatMap((to) =>
    ALL.map((from) => [from, to, EXPECTED[to].includes(from)] as const),
  );

  it.each(cases)("%s → %s allowed: %s", (from, to, allowed) => {
    expect(canTransition(from, to)).toBe(allowed);
  });

  it("never allows a self-transition (re-delivery is a no-op)", () => {
    for (const to of Object.keys(ALLOWED_FROM) as EventTargetStatus[]) {
      expect(canTransition(to, to)).toBe(false);
    }
  });

  it("never moves SKIPPED or CANCELED rows", () => {
    for (const to of Object.keys(ALLOWED_FROM) as EventTargetStatus[]) {
      expect(canTransition("SKIPPED", to)).toBe(false);
      expect(canTransition("CANCELED", to)).toBe(false);
    }
  });
});

describe("applyResendEvent", () => {
  let rows: Row[];
  let customers: CustomerRow[];
  let fake: ReturnType<typeof makeFakeDb>;

  beforeEach(() => {
    rows = [row()];
    customers = [customerRow()];
    fake = makeFakeDb(rows, customers);
  });

  it.each([
    [
      "no tags",
      {
        type: "email.bounced",
        data: { email_id: "re_1" },
      } as ResendWebhookEvent,
    ],
    ["transactional tag", event("email.bounced", {}, { category: "order" })],
    [
      "array, other category",
      event("email.bounced", {}, [{ name: "category", value: "invoice" }]),
    ],
    [
      "non-email event",
      { type: "contact.created", data: {} } as ResendWebhookEvent,
    ],
  ])("skips %s without touching the db", async (_label, e) => {
    const result = await applyResendEvent(fake.db, e, { now: NOW });
    expect(result).toEqual({ applied: false, reason: "not-marketing" });
    expect(fake.recipient.findUnique).not.toHaveBeenCalled();
    expect(fake.recipient.updateMany).not.toHaveBeenCalled();
    expect(fake.customer.updateMany).not.toHaveBeenCalled();
  });

  it.each(["email.opened", "email.clicked", "email.delivery_delayed"])(
    "ignores %s without touching the db",
    async (type) => {
      const result = await applyResendEvent(fake.db, event(type), { now: NOW });
      expect(result).toEqual({ applied: false, reason: "ignored-type" });
      expect(fake.recipient.findUnique).not.toHaveBeenCalled();
    },
  );

  it("is a no-op for an unknown email id", async () => {
    const result = await applyResendEvent(
      fake.db,
      event("email.delivered", { email_id: "re_unknown" }),
      { now: NOW },
    );
    expect(result).toEqual({
      applied: false,
      reason: "unknown-recipient",
      emailId: "re_unknown",
    });
    expect(fake.recipient.updateMany).not.toHaveBeenCalled();
  });

  it("scopes every write by id + businessId", async () => {
    await applyResendEvent(fake.db, event("email.complained"), { now: NOW });
    for (const call of fake.recipient.updateMany.mock.calls) {
      expect(call[0].where).toMatchObject({ id: "rcp_1", businessId: "biz_1" });
    }
    expect(fake.customer.updateMany).toHaveBeenCalled();
    for (const call of fake.customer.updateMany.mock.calls) {
      expect(call[0].where).toMatchObject({ id: "cus_1", businessId: "biz_1" });
    }
  });

  it("delivered → DELIVERED with the event time", async () => {
    await applyResendEvent(fake.db, event("email.delivered"), { now: NOW });
    expect(rows[0]!.status).toBe("DELIVERED");
    expect(rows[0]!.deliveredAt).toEqual(new Date("2026-10-16T12:00:00.000Z"));
  });

  it("delivered after a bounce keeps BOUNCED", async () => {
    rows[0]!.status = "BOUNCED";
    const result = await applyResendEvent(fake.db, event("email.delivered"), {
      now: NOW,
    });
    expect(rows[0]!.status).toBe("BOUNCED");
    expect(rows[0]!.deliveredAt).toBeNull();
    expect(result).toMatchObject({ applied: true, recipientUpdated: false });
  });

  it("permanent bounce → BOUNCED + suppression (HARD_BOUNCE)", async () => {
    await applyResendEvent(
      fake.db,
      event("email.bounced", {
        bounce: {
          type: "Permanent",
          subType: "General",
          message: "No such user",
        },
      }),
      { now: NOW },
    );
    expect(rows[0]!.status).toBe("BOUNCED");
    expect(rows[0]!.error).toBe("Bounced (Permanent/General): No such user");
    expect(customers[0]!.marketingSuppressedAt).toEqual(NOW);
    expect(customers[0]!.marketingSuppressionReason).toBe("HARD_BOUNCE");
    // A bounce is not an opt-out.
    expect(customers[0]!.acceptsMarketing).toBe(true);
  });

  it("permanent bounce does not overwrite an existing suppression", async () => {
    const earlier = new Date("2026-01-01T00:00:00.000Z");
    customers[0]!.marketingSuppressedAt = earlier;
    customers[0]!.marketingSuppressionReason = "COMPLAINT";
    const result = await applyResendEvent(
      fake.db,
      event("email.bounced", {
        bounce: { type: "Permanent", subType: "General", message: "x" },
      }),
      { now: NOW },
    );
    expect(customers[0]!.marketingSuppressedAt).toEqual(earlier);
    expect(customers[0]!.marketingSuppressionReason).toBe("COMPLAINT");
    expect(result).toMatchObject({ customerSuppressed: false });
  });

  it.each(["Transient", "Undetermined"])(
    "%s bounce stores the error only",
    async (type) => {
      await applyResendEvent(
        fake.db,
        event("email.bounced", {
          bounce: { type, subType: "MailboxFull", message: "Mailbox full" },
        }),
        { now: NOW },
      );
      expect(rows[0]!.status).toBe("SENT");
      expect(rows[0]!.error).toBe(
        `Bounced (${type}/MailboxFull): Mailbox full`,
      );
      expect(rows[0]!.bouncedAt).toBeNull();
      expect(fake.customer.updateMany).not.toHaveBeenCalled();
      expect(customers[0]!.marketingSuppressedAt).toBeNull();
    },
  );

  it("a transient bounce never overwrites a hard bounce's error", async () => {
    rows[0]!.status = "BOUNCED";
    rows[0]!.error = "Bounced (Permanent/General): gone";
    await applyResendEvent(
      fake.db,
      event("email.bounced", {
        bounce: { type: "Transient", subType: "x", message: "y" },
      }),
      { now: NOW },
    );
    expect(rows[0]!.error).toBe("Bounced (Permanent/General): gone");
  });

  it("complaint → COMPLAINED, opted out, suppressed (COMPLAINT)", async () => {
    rows[0]!.status = "DELIVERED";
    await applyResendEvent(fake.db, event("email.complained"), { now: NOW });
    expect(rows[0]!.status).toBe("COMPLAINED");
    expect(rows[0]!.complainedAt).toEqual(new Date("2026-10-16T12:00:00.000Z"));
    expect(customers[0]).toMatchObject({
      acceptsMarketing: false,
      marketingUnsubscribedAt: NOW,
      marketingSuppressedAt: NOW,
      marketingSuppressionReason: "COMPLAINT",
    });
  });

  it("complaint keeps an earlier unsubscribe timestamp", async () => {
    const earlier = new Date("2026-05-01T00:00:00.000Z");
    customers[0]!.marketingUnsubscribedAt = earlier;
    await applyResendEvent(fake.db, event("email.complained"), { now: NOW });
    expect(customers[0]!.marketingUnsubscribedAt).toEqual(earlier);
    expect(customers[0]!.acceptsMarketing).toBe(false);
  });

  it("a hard bounce after a complaint still suppresses but stays COMPLAINED", async () => {
    rows[0]!.status = "COMPLAINED";
    await applyResendEvent(
      fake.db,
      event("email.bounced", {
        bounce: { type: "Permanent", subType: "General", message: "x" },
      }),
      { now: NOW },
    );
    expect(rows[0]!.status).toBe("COMPLAINED");
    expect(customers[0]!.marketingSuppressionReason).toBe("HARD_BOUNCE");
  });

  it("provider-suppressed → BOUNCED + PROVIDER_SUPPRESSED", async () => {
    await applyResendEvent(
      fake.db,
      event("email.suppressed", {
        suppressed: { type: "OnAccountSuppressionList", message: "On list" },
      }),
      { now: NOW },
    );
    expect(rows[0]!.status).toBe("BOUNCED");
    expect(rows[0]!.error).toBe("Suppressed by email provider: On list");
    expect(customers[0]!.marketingSuppressionReason).toBe(
      "PROVIDER_SUPPRESSED",
    );
  });

  it.each<[RecipientStatus, RecipientStatus]>([
    ["SENT", "FAILED"],
    ["SENDING", "FAILED"],
    ["DELIVERED", "DELIVERED"],
    ["BOUNCED", "BOUNCED"],
    ["COMPLAINED", "COMPLAINED"],
  ])("failed from %s → %s", async (from, expected) => {
    rows[0]!.status = from;
    await applyResendEvent(
      fake.db,
      event("email.failed", { failed: { reason: "reached_daily_quota" } }),
      { now: NOW },
    );
    expect(rows[0]!.status).toBe(expected);
    if (expected === "FAILED") {
      expect(rows[0]!.error).toBe("Send failed: reached_daily_quota");
    }
  });

  it("sent only fills sentAt when it is empty", async () => {
    await applyResendEvent(fake.db, event("email.sent"), { now: NOW });
    expect(rows[0]!.sentAt).toEqual(new Date("2026-10-16T12:00:00.000Z"));
    expect(rows[0]!.status).toBe("SENT");

    const earlier = new Date("2026-10-16T11:00:00.000Z");
    rows[0]!.sentAt = earlier;
    await applyResendEvent(fake.db, event("email.sent"), { now: NOW });
    expect(rows[0]!.sentAt).toEqual(earlier);
  });

  it("re-delivering the same event changes nothing the second time", async () => {
    const e = event("email.complained");
    const first = await applyResendEvent(fake.db, e, { now: NOW });
    const snapshot = structuredClone({ rows, customers });
    const later = new Date("2026-10-17T00:00:00.000Z");
    const second = await applyResendEvent(fake.db, e, { now: later });
    expect(first).toMatchObject({
      recipientUpdated: true,
      customerSuppressed: true,
    });
    expect(second).toMatchObject({
      recipientUpdated: false,
      customerSuppressed: false,
    });
    expect({ rows, customers }).toEqual(snapshot);
  });

  it("skips customer writes when the customer was deleted (customerId null)", async () => {
    rows[0]!.customerId = null;
    await applyResendEvent(fake.db, event("email.complained"), { now: NOW });
    expect(rows[0]!.status).toBe("COMPLAINED");
    expect(fake.customer.updateMany).not.toHaveBeenCalled();
  });

  it("falls back to now when the event time is missing or invalid", async () => {
    await applyResendEvent(
      fake.db,
      { ...event("email.delivered"), created_at: "not-a-date" },
      { now: NOW },
    );
    expect(rows[0]!.deliveredAt).toEqual(NOW);
  });

  describe("fallback before the worker stored resendId", () => {
    beforeEach(() => {
      rows[0]!.resendId = null;
      rows[0]!.status = "SENDING";
    });

    it("matches by campaign + business + address and backfills the id", async () => {
      const result = await applyResendEvent(fake.db, event("email.delivered"), {
        now: NOW,
      });
      expect(result).toMatchObject({
        applied: true,
        recipientId: "rcp_1",
        recipientUpdated: true,
        backfilledResendId: true,
      });
      expect(rows[0]!.resendId).toBe("re_1");
      expect(rows[0]!.status).toBe("DELIVERED");
      // The backfill itself is conditional on resendId still being null.
      expect(fake.recipient.updateMany.mock.calls[0]![0]).toEqual({
        where: { id: "rcp_1", businessId: "biz_1", resendId: null },
        data: { resendId: "re_1" },
      });
    });

    it("compares the address trimmed and case-insensitively", async () => {
      await applyResendEvent(
        fake.db,
        event("email.delivered", { to: ["  SHOPPER@test.DEV "] }),
        { now: NOW },
      );
      expect(rows[0]!.resendId).toBe("re_1");
    });

    it.each([
      [
        "campaign tag missing",
        { category: "marketing_broadcast", business: "biz_1" },
      ],
      [
        "business tag missing",
        { category: "marketing_broadcast", campaign: "camp_1" },
      ],
      ["business tag mismatched", { ...MARKETING_TAGS, business: "biz_other" }],
      [
        "campaign tag mismatched",
        { ...MARKETING_TAGS, campaign: "camp_other" },
      ],
    ])("does not match when the %s", async (_label, tags) => {
      const result = await applyResendEvent(
        fake.db,
        event("email.delivered", {}, tags),
        { now: NOW },
      );
      expect(result).toMatchObject({
        applied: false,
        reason: "unknown-recipient",
      });
      expect(rows[0]!.resendId).toBeNull();
      expect(rows[0]!.status).toBe("SENDING");
      expect(fake.recipient.updateMany).not.toHaveBeenCalled();
    });

    it("never touches a same-address row in another campaign", async () => {
      rows.push(
        row({
          id: "rcp_other",
          campaignId: "camp_2",
          resendId: null,
          status: "SENDING",
        }),
      );
      rows.splice(0, 1); // only the other campaign's row remains
      const result = await applyResendEvent(
        fake.db,
        event("email.complained"),
        {
          now: NOW,
        },
      );
      expect(result).toMatchObject({
        applied: false,
        reason: "unknown-recipient",
      });
      expect(rows[0]).toMatchObject({ resendId: null, status: "SENDING" });
      expect(customers[0]!.acceptsMarketing).toBe(true);
    });

    it("never overwrites a different id the worker already stored", async () => {
      rows[0]!.resendId = "re_other";
      const result = await applyResendEvent(fake.db, event("email.delivered"), {
        now: NOW,
      });
      expect(result).toMatchObject({
        applied: false,
        reason: "unknown-recipient",
      });
      expect(rows[0]).toMatchObject({
        resendId: "re_other",
        status: "SENDING",
      });
    });

    it("skips an ambiguous case-variant match", async () => {
      rows.push(
        row({
          id: "rcp_2",
          customerId: "cus_2",
          email: "SHOPPER@test.dev",
          resendId: null,
        }),
      );
      const result = await applyResendEvent(
        fake.db,
        event("email.delivered", { to: ["shopper@TEST.dev"] }),
        { now: NOW },
      );
      expect(result).toMatchObject({
        applied: false,
        reason: "unknown-recipient",
      });
    });

    it("prefers the exact-case row among case variants", async () => {
      rows.push(
        row({
          id: "rcp_2",
          customerId: "cus_2",
          email: "Shopper@Test.dev",
          resendId: null,
        }),
      );
      const result = await applyResendEvent(fake.db, event("email.delivered"), {
        now: NOW,
      });
      expect(result).toMatchObject({ applied: true, recipientId: "rcp_2" });
      expect(rows[0]!.resendId).toBeNull();
    });

    it("proceeds when the worker stored the same id first", async () => {
      fake.recipient.updateMany.mockImplementationOnce(() => {
        rows[0]!.resendId = "re_1"; // worker commit lands between read and claim
        rows[0]!.status = "SENT";
        return Promise.resolve({ count: 0 });
      });
      const result = await applyResendEvent(fake.db, event("email.delivered"), {
        now: NOW,
      });
      expect(result).toMatchObject({
        applied: true,
        recipientUpdated: true,
        backfilledResendId: false,
      });
      expect(rows[0]!.status).toBe("DELIVERED");
    });

    it("uses the owning row when the claim hits the unique index", async () => {
      rows.push(row({ id: "rcp_owner", campaignId: "camp_9", resendId: null }));
      fake.recipient.updateMany.mockImplementationOnce(() => {
        rows[1]!.resendId = "re_1";
        return Promise.reject(
          Object.assign(new Error("unique"), { code: "P2002" }),
        );
      });
      const result = await applyResendEvent(fake.db, event("email.delivered"), {
        now: NOW,
      });
      expect(result).toMatchObject({ applied: true, recipientId: "rcp_owner" });
      expect(rows[0]!.resendId).toBeNull();
    });
  });
});
