import type * as NextServer from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as ResendModule from "~/lib/email/resend";
import type { Audience } from "~/lib/marketing/segments";
import { marketingAudienceWhere } from "~/lib/marketing/audience";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createOrder,
  createProduct,
} from "../helpers/factories";
import { createDraft, createMarketingStore } from "../helpers/marketing";

/**
 * Audience segments (`src/lib/marketing/segments.ts`) against a real
 * Postgres: each segment's membership via `marketingAudienceWhere`, plus the
 * router surface (saveDraft persistence + product ownership, countAudience,
 * getCampaign, and the sendCampaign snapshot).
 */
const reqHost = vi.hoisted(() => ({ value: "seg-a.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

const afterCallbacks = vi.hoisted(() => [] as Array<() => unknown>);
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof NextServer>();
  return {
    ...actual,
    after: (fn: () => unknown) => {
      afterCallbacks.push(fn);
    },
  };
});

vi.mock("~/lib/email/resend", async (importOriginal) => {
  const actual = await importOriginal<typeof ResendModule>();
  return {
    ...actual,
    sendResendBatch: vi.fn(),
    sendResendEmail: vi.fn(),
  };
});

// Real "now": the router procedures take their own `new Date()`.
const NOW = new Date();
const ago = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

type CustomerOpts = {
  orderCount?: number;
  consentAt?: Date | null;
  acceptsMarketing?: boolean;
  suppressed?: boolean;
};

async function customer(
  businessId: string,
  name: string,
  opts: CustomerOpts = {},
) {
  return db.customer.create({
    data: {
      businessId,
      email: `${name}@test.dev`,
      acceptsMarketing: opts.acceptsMarketing ?? true,
      marketingConsentAt: opts.consentAt ?? null,
      marketingSuppressedAt: opts.suppressed ? ago(1) : null,
      orderCount: opts.orderCount ?? 0,
    },
  });
}

async function order(
  businessId: string,
  customerId: string,
  daysAgo: number,
  paymentStatus: string,
  productIds: string[] = [],
) {
  return createOrder(businessId, {
    customerId,
    paymentStatus,
    createdAt: ago(daysAgo),
    items: productIds.map((productId) => ({ productId })),
  });
}

/**
 * Store A's customers (eligible unless noted) and one store-B customer who
 * looks like a match for every segment.
 */
async function seed() {
  const { business, owner, host } = await createMarketingStore("seg-a");
  const bid = business.id;
  const candle = await createProduct(bid, { name: "Lavender Candle" });
  const soap = await createProduct(bid, { name: "Rose Soap" });

  const never = await customer(bid, "never", { consentAt: ago(100) });
  const signup = await customer(bid, "signup", { consentAt: ago(3) });
  // Paid 10 days ago (candle); consented 20 days ago.
  const recentBuyer = await customer(bid, "recent-buyer", {
    orderCount: 1,
    consentAt: ago(20),
  });
  await order(bid, recentBuyer.id, 10, "paid", [candle.id]);
  // Last paid order 120 days ago (soap), an older one 200 days ago.
  const lapsed = await customer(bid, "lapsed", { orderCount: 2 });
  await order(bid, lapsed.id, 120, "paid", [soap.id]);
  await order(bid, lapsed.id, 200, "paid");
  // Only an unpaid order (with the candle): neither a buyer nor lapsed.
  const unpaidOnly = await customer(bid, "unpaid-only");
  await order(bid, unpaidOnly.id, 5, "pending", [candle.id]);
  // Paid 100 days ago (candle) + an unpaid order 5 days ago.
  const paidThenPending = await customer(bid, "paid-then-pending", {
    orderCount: 1,
  });
  await order(bid, paidThenPending.id, 100, "paid", [candle.id]);
  await order(bid, paidThenPending.id, 5, "pending", [candle.id]);
  // Paid a year ago; a refunded order 10 days ago doesn't count as recent.
  const longGone = await customer(bid, "long-gone", { orderCount: 1 });
  await order(bid, longGone.id, 365, "paid");
  await order(bid, longGone.id, 10, "refunded", [candle.id]);
  // A $0 checkout (Stripe "no_payment_required") 15 days ago (soap): a real
  // purchase for every order-based segment.
  const zeroDollar = await customer(bid, "zero-dollar", { orderCount: 1 });
  await order(bid, zeroDollar.id, 15, "no_payment_required", [soap.id]);
  // Only a refunded order (candle). `orderCount` was bumped at checkout and
  // never decremented — they must still count as never having ordered.
  const refundedOnly = await customer(bid, "refunded-only", { orderCount: 1 });
  await order(bid, refundedOnly.id, 40, "refunded", [candle.id]);
  // Only a paid order that was later cancelled (soap): not a purchase.
  const cancelledOnly = await customer(bid, "cancelled-only", {
    orderCount: 1,
  });
  await createOrder(bid, {
    customerId: cancelledOnly.id,
    paymentStatus: "paid",
    status: "cancelled",
    createdAt: ago(40),
    items: [{ productId: soap.id }],
  });

  // Never eligible: suppressed / not opted in, though they "match" segments.
  const suppressed = await customer(bid, "suppressed", {
    suppressed: true,
    orderCount: 1,
    consentAt: ago(2),
  });
  await order(bid, suppressed.id, 200, "paid", [candle.id, soap.id]);
  const optedOut = await customer(bid, "opted-out", {
    acceptsMarketing: false,
    orderCount: 1,
    consentAt: ago(2),
  });
  await order(bid, optedOut.id, 200, "paid", [candle.id]);

  // Another store's opted-in customer with a matching order history.
  const other = await createBusiness({ subdomain: "seg-b" });
  const foreign = await customer(other.id, "foreign", {
    orderCount: 1,
    consentAt: ago(2),
  });
  await order(other.id, foreign.id, 200, "paid", [candle.id]);

  return {
    business,
    owner,
    host,
    candle,
    soap,
    otherBusiness: other,
    ids: {
      never: never.id,
      signup: signup.id,
      recentBuyer: recentBuyer.id,
      lapsed: lapsed.id,
      unpaidOnly: unpaidOnly.id,
      paidThenPending: paidThenPending.id,
      longGone: longGone.id,
      zeroDollar: zeroDollar.id,
      refundedOnly: refundedOnly.id,
      cancelledOnly: cancelledOnly.id,
    },
    excluded: [suppressed.id, optedOut.id, foreign.id],
  };
}

type Seed = Awaited<ReturnType<typeof seed>>;
type Key = keyof Seed["ids"];

async function members(bid: string, audience: Audience) {
  const rows = await db.customer.findMany({
    where: marketingAudienceWhere(bid, audience, NOW),
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

describe("marketing segments — membership", () => {
  let s: Seed;
  beforeEach(async () => {
    await resetDb();
    s = await seed();
  });

  const cases: Array<[string, (s: Seed) => Audience, Key[]]> = [
    [
      "all",
      () => ({ type: "all" }),
      [
        "never",
        "signup",
        "recentBuyer",
        "lapsed",
        "unpaidOnly",
        "paidThenPending",
        "longGone",
        "zeroDollar",
        "refundedOnly",
        "cancelledOnly",
      ],
    ],
    [
      "customers",
      () => ({ type: "customers" }),
      ["recentBuyer", "lapsed", "paidThenPending", "longGone", "zeroDollar"],
    ],
    [
      "never-ordered",
      () => ({ type: "never-ordered" }),
      ["never", "signup", "unpaidOnly", "refundedOnly", "cancelledOnly"],
    ],
    [
      "bought candle",
      (s) => ({ type: "bought", productIds: [s.candle.id] }),
      ["recentBuyer", "paidThenPending"],
    ],
    [
      "bought soap",
      (s) => ({ type: "bought", productIds: [s.soap.id] }),
      ["lapsed", "zeroDollar"],
    ],
    [
      "bought candle or soap",
      (s) => ({ type: "bought", productIds: [s.candle.id, s.soap.id] }),
      ["recentBuyer", "lapsed", "paidThenPending", "zeroDollar"],
    ],
    [
      "lapsed 30",
      () => ({ type: "lapsed", days: 30 }),
      ["lapsed", "paidThenPending", "longGone"],
    ],
    [
      "lapsed 90",
      () => ({ type: "lapsed", days: 90 }),
      ["lapsed", "paidThenPending", "longGone"],
    ],
    ["lapsed 180", () => ({ type: "lapsed", days: 180 }), ["longGone"]],
    ["recent-signup 7", () => ({ type: "recent-signup", days: 7 }), ["signup"]],
    [
      "recent-signup 30",
      () => ({ type: "recent-signup", days: 30 }),
      ["signup", "recentBuyer"],
    ],
    [
      "recent-signup 90",
      () => ({ type: "recent-signup", days: 90 }),
      ["signup", "recentBuyer"],
    ],
  ];

  it.each(cases)("%s", async (_label, build, expected) => {
    const audience = build(s);
    const bid = s.business.id;
    const ids = await members(bid, audience);
    expect(ids.sort()).toEqual(expected.map((k) => s.ids[k]).sort());
    for (const id of s.excluded) expect(ids).not.toContain(id);
    expect(
      await db.customer.count({
        where: marketingAudienceWhere(bid, audience, NOW),
      }),
    ).toBe(expected.length);
  });

  it("never reaches the other store's customers, even with its own segment", async () => {
    const ids = await members(s.otherBusiness.id, {
      type: "bought",
      productIds: [s.candle.id],
    });
    expect(ids).toEqual([s.excluded[2]]);
  });
});

describe("marketing segments — router", () => {
  let s: Seed;
  let caller: ReturnType<typeof createTestCaller>;
  beforeEach(async () => {
    await resetDb();
    afterCallbacks.length = 0;
    s = await seed();
    reqHost.value = s.host;
    caller = createTestCaller({ userId: s.owner.id, email: s.owner.email });
  });

  it("countAudience counts a segment", async () => {
    expect(
      await caller.marketing.countAudience({ audience: { type: "all" } }),
    ).toEqual({ count: 10 });
    expect(
      await caller.marketing.countAudience({
        audience: { type: "bought", productIds: [s.candle.id] },
      }),
    ).toEqual({ count: 2 });
  });

  it("saveDraft persists the audience, keeps it when omitted, clears it for all", async () => {
    const audience = { type: "bought" as const, productIds: [s.candle.id] };
    const { id } = await caller.marketing.saveDraft({
      subject: "Candle lovers",
      bodyText: "Hi",
      audience,
    });
    const stored = async () =>
      (await db.marketingCampaign.findUniqueOrThrow({ where: { id } }))
        .audience;
    expect(await stored()).toEqual(audience);
    expect((await caller.marketing.getCampaign({ id })).audience).toEqual(
      audience,
    );

    // The current composer doesn't send `audience`: an edit leaves it alone.
    await caller.marketing.saveDraft({ id, subject: "Edited", bodyText: "Hi" });
    expect(await stored()).toEqual(audience);

    await caller.marketing.saveDraft({
      id,
      subject: "Edited",
      bodyText: "Hi",
      audience: { type: "all" },
    });
    expect(await stored()).toBeNull();
    expect((await caller.marketing.getCampaign({ id })).audience).toEqual({
      type: "all",
    });
  });

  it("saveDraft rejects products from another store", async () => {
    const foreignProduct = await createProduct(s.otherBusiness.id);
    await expect(
      caller.marketing.saveDraft({
        subject: "Nope",
        bodyText: "Hi",
        audience: {
          type: "bought",
          productIds: [s.candle.id, foreignProduct.id],
        },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await db.marketingCampaign.count()).toBe(0);
  });

  it("getCampaign falls back to all for a malformed stored audience", async () => {
    const draft = await createDraft(s.business.id);
    await db.marketingCampaign.update({
      where: { id: draft.id },
      data: { audience: { type: "removed-segment" } },
    });
    expect(
      (await caller.marketing.getCampaign({ id: draft.id })).audience,
    ).toEqual({ type: "all" });
  });

  it("sendCampaign snapshots only the segment", async () => {
    const draft = await createDraft(s.business.id);
    await db.marketingCampaign.update({
      where: { id: draft.id },
      data: { audience: { type: "never-ordered" } },
    });
    const result = await caller.marketing.sendCampaign({ id: draft.id });
    expect(result.recipientCount).toBe(5);
    const recipients = await db.marketingCampaignRecipient.findMany({
      where: { campaignId: draft.id },
      select: { customerId: true },
    });
    expect(recipients.map((r) => r.customerId).sort()).toEqual(
      [
        s.ids.never,
        s.ids.signup,
        s.ids.unpaidOnly,
        s.ids.refundedOnly,
        s.ids.cancelledOnly,
      ].sort(),
    );
  });

  it("an empty segment completes the campaign like an empty list", async () => {
    const draft = await createDraft(s.business.id);
    const unsold = await createProduct(s.business.id, { name: "Unsold" });
    await db.marketingCampaign.update({
      where: { id: draft.id },
      data: { audience: { type: "bought", productIds: [unsold.id] } },
    });
    expect(await caller.marketing.sendCampaign({ id: draft.id })).toEqual({
      id: draft.id,
      recipientCount: 0,
    });
    const campaign = await db.marketingCampaign.findUniqueOrThrow({
      where: { id: draft.id },
    });
    expect(campaign.status).toBe("SENT");
    expect(afterCallbacks).toHaveLength(0);
  });

  it("exportRecipients exports just the segment when given one", async () => {
    const all = await caller.marketing.exportRecipients();
    expect(all.count).toBe(10);
    const segment = await caller.marketing.exportRecipients({
      audience: { type: "lapsed", days: 180 },
    });
    expect(segment.count).toBe(1);
    expect(segment.csv).toContain("long-gone@test.dev");
  });
});
