import type * as NextServer from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as ResendModule from "~/lib/email/resend";
import { verifyUnsubscribeToken } from "~/lib/email/unsubscribe-token";
import {
  drainCampaign,
  MAX_ATTEMPTS,
  resumeMarketingCampaigns,
} from "~/lib/marketing/campaign-worker";
import { UNSUBSCRIBE_PLACEHOLDER } from "~/lib/marketing/render-campaign";
import { applyResendEvent } from "~/lib/marketing/resend-events";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import { createCustomer } from "../helpers/factories";
import {
  accepted,
  apiError,
  createDraft,
  createMarketingStore,
  fakeClock,
  fakeSend,
  noWaitThrottle,
  seedSubscribers,
} from "../helpers/marketing";

/**
 * Coverage for the campaign sender (`src/lib/marketing/campaign-worker.ts`):
 * batching + idempotency keys, SKIP LOCKED claims under concurrent drains,
 * lease reclaim with an identical payload, backoff, per-email rejections,
 * first-claim membership freeze, cancel, the 23h guard, and the flag pause.
 *
 * Campaigns are queued through the real `marketing.sendCampaign` procedure (so
 * the audience snapshot is the production one); its `after()` drain is
 * captured, never run. The worker is driven directly with an injected fake
 * send, a no-wait throttle and a fake clock. `~/lib/email/resend` is mocked so
 * nothing here can reach the network.
 */
const reqHost = vi.hoisted(() => ({ value: "mkt-a.simplepress.test" }));
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

const resendMocks = vi.hoisted(() => ({
  sendResendBatch: vi.fn(),
  sendResendEmail: vi.fn(),
}));
vi.mock("~/lib/email/resend", async (importOriginal) => {
  const actual = await importOriginal<typeof ResendModule>();
  return {
    ...actual,
    sendResendBatch: (...args: unknown[]): unknown =>
      resendMocks.sendResendBatch(...args),
    sendResendEmail: (...args: unknown[]): unknown =>
      resendMocks.sendResendEmail(...args),
  };
});

async function setup(opts: { subscribers?: number } = {}) {
  const store = await createMarketingStore("mkt-a");
  reqHost.value = store.host;
  if (opts.subscribers)
    await seedSubscribers(store.business.id, opts.subscribers);
  const caller = createTestCaller({
    userId: store.owner.id,
    email: store.owner.email,
  });
  return { ...store, caller };
}

/** Creates + queues a campaign through the router. */
async function queue(
  caller: ReturnType<typeof createTestCaller>,
  businessId: string,
) {
  const draft = await createDraft(businessId);
  const result = await caller.marketing.sendCampaign({ id: draft.id });
  return { id: draft.id, recipientCount: result.recipientCount };
}

function drain(
  campaignId: string,
  send: ReturnType<typeof fakeSend>,
  clock = fakeClock(),
) {
  return drainCampaign(db, campaignId, {
    deadlineMs: 60_000,
    throttle: noWaitThrottle,
    send: send.fn,
    now: clock.now,
    sleep: clock.sleep,
  });
}

const recipientsOf = (campaignId: string) =>
  db.marketingCampaignRecipient.findMany({
    where: { campaignId },
    orderBy: { id: "asc" },
  });

const batchesOf = (campaignId: string) =>
  db.marketingCampaignBatch.findMany({
    where: { campaignId },
    orderBy: { batchIndex: "asc" },
  });

const campaignOf = (id: string) =>
  db.marketingCampaign.findUniqueOrThrow({ where: { id } });

describe("marketing campaign worker", () => {
  beforeEach(async () => {
    await resetDb();
    afterCallbacks.length = 0;
    resendMocks.sendResendBatch.mockReset();
    resendMocks.sendResendEmail.mockReset();
    resendMocks.sendResendBatch.mockRejectedValue(
      new Error("network disabled in tests"),
    );
  });

  it("snapshots only this business's eligible audience", async () => {
    const { business, caller } = await setup();
    const keep1 = await createCustomer(business.id, {
      email: "keep1@test.dev",
    });
    const keep2 = await createCustomer(business.id, {
      email: "keep2@test.dev",
    });
    const optedOut = await createCustomer(business.id);
    const suppressed = await createCustomer(business.id);
    const anonymized = await createCustomer(business.id);
    await db.customer.updateMany({
      where: { id: { in: [keep1.id, keep2.id, suppressed.id, anonymized.id] } },
      data: { acceptsMarketing: true },
    });
    await db.customer.update({
      where: { id: optedOut.id },
      data: { acceptsMarketing: false, marketingUnsubscribedAt: new Date() },
    });
    await db.customer.update({
      where: { id: suppressed.id },
      data: {
        marketingSuppressedAt: new Date(),
        marketingSuppressionReason: "HARD_BOUNCE",
      },
    });
    await db.customer.update({
      where: { id: anonymized.id },
      data: { anonymizedAt: new Date() },
    });
    const other = await createMarketingStore("mkt-other");
    await seedSubscribers(other.business.id, 3, "other");

    const { id, recipientCount } = await queue(caller, business.id);

    expect(recipientCount).toBe(2);
    const rows = await recipientsOf(id);
    expect(rows.map((r) => r.email).sort()).toEqual([
      "keep1@test.dev",
      "keep2@test.dev",
    ]);
    expect(rows.every((r) => r.businessId === business.id)).toBe(true);
    expect(afterCallbacks).toHaveLength(1);
  });

  it("sends 250 recipients as 3 batches keyed mkt:<id>:0..2 and finalizes SENT", async () => {
    const { business, caller } = await setup({ subscribers: 250 });
    const { id } = await queue(caller, business.id);
    expect(await batchesOf(id)).toHaveLength(3);

    const send = fakeSend();
    const result = await drain(id, send);

    expect(result).toEqual({ batchesSent: 3, stopped: "finished" });
    expect(send.calls.map((c) => c.idempotencyKey)).toEqual([
      `mkt:${id}:0`,
      `mkt:${id}:1`,
      `mkt:${id}:2`,
    ]);
    expect(send.calls.map((c) => c.emails.length)).toEqual([100, 100, 50]);

    const rows = await recipientsOf(id);
    expect(rows.every((r) => r.status === "SENT" && r.resendId)).toBe(true);
    expect((await batchesOf(id)).every((b) => b.status === "SENT")).toBe(true);
    const campaign = await campaignOf(id);
    expect(campaign.status).toBe("SENT");
    expect(campaign.startedAt).not.toBeNull();
    expect(campaign.completedAt).not.toBeNull();

    // Payload shape: per-recipient unsubscribe link, one-click headers, tags.
    const first = send.calls[0]!.emails[0]!;
    const row = rows.find((r) => r.email === (first.to as string[])[0])!;
    expect(first.from).toBe(`"Bloom & Co via SimplePress" <noreply@test.dev>`);
    expect(first.replyTo).toBe(business.ownerEmail);
    expect(first.subject).toBe("Spring sale");
    expect(first.html).not.toContain(UNSUBSCRIBE_PLACEHOLDER);
    expect(first.text).not.toContain(UNSUBSCRIBE_PLACEHOLDER);
    const unsubUrl = first.headers!["List-Unsubscribe"]!.slice(1, -1);
    const url = new URL(unsubUrl);
    expect(url.pathname).toBe("/api/unsubscribe");
    expect(first.html).toContain(unsubUrl);
    expect(first.text).toContain(unsubUrl);
    expect(verifyUnsubscribeToken(url.searchParams.get("t")!)).toEqual({
      customerId: row.customerId,
      businessId: business.id,
      r: row.id,
    });
    expect(first.headers!["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    );
    expect(first.tags).toEqual([
      { name: "category", value: "marketing_broadcast" },
      { name: "campaign", value: id },
      { name: "business", value: business.id },
    ]);
    for (const tag of first.tags!)
      expect(tag.value).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("concurrent drains send each batch exactly once", async () => {
    const { business, caller } = await setup({ subscribers: 250 });
    const { id } = await queue(caller, business.id);

    // A shared recorder with a little latency so the drains interleave.
    const send = fakeSend(async (call) => {
      await new Promise((r) => setTimeout(r, 25));
      return accepted(call);
    });
    // Several drains start at the same instant so their first claims race
    // (the after() drain overlapping a cron tick, or two containers).
    const results = await Promise.all(
      Array.from({ length: 6 }, () => drain(id, send)),
    );

    expect(results.reduce((n, r) => n + r.batchesSent, 0)).toBe(3);
    const keys = send.calls.map((c) => c.idempotencyKey).sort();
    expect(keys).toEqual([`mkt:${id}:0`, `mkt:${id}:1`, `mkt:${id}:2`]);
    expect((await campaignOf(id)).status).toBe("SENT");
  });

  it("reclaims an expired lease and resends a deep-equal payload under the same key", async () => {
    const { business, caller } = await setup({ subscribers: 3 });
    const { id } = await queue(caller, business.id);
    const clock = fakeClock();

    const timedOut = fakeSend(() =>
      apiError("application_error", null, { timedOut: true }),
    );
    expect(await drain(id, timedOut, clock)).toEqual({
      batchesSent: 0,
      stopped: "idle",
    });
    const [leased] = await batchesOf(id);
    expect(leased).toMatchObject({ status: "SENDING", attempts: 1 });

    // Still within the lease: nothing is claimable.
    const early = fakeSend();
    expect((await drain(id, early, clock)).stopped).toBe("idle");
    expect(early.calls).toHaveLength(0);

    // A customer unsubscribing AFTER the first attempt must not change the
    // retry's payload (membership was frozen on the first claim).
    const rows = await recipientsOf(id);
    await db.customer.update({
      where: { id: rows[0]!.customerId! },
      data: { acceptsMarketing: false },
    });

    clock.advance(5 * 60_000 + 1);
    const retry = fakeSend();
    expect(await drain(id, retry, clock)).toEqual({
      batchesSent: 1,
      stopped: "finished",
    });
    expect(retry.calls).toHaveLength(1);
    expect(retry.calls[0]!.idempotencyKey).toBe(
      timedOut.calls[0]!.idempotencyKey,
    );
    expect(retry.calls[0]!.emails).toEqual(timedOut.calls[0]!.emails);
    expect((await batchesOf(id))[0]).toMatchObject({
      status: "SENT",
      attempts: 2,
    });
  });

  it(`backs off on 429 and fails the batch after ${MAX_ATTEMPTS} attempts`, async () => {
    const { business, caller } = await setup({ subscribers: 2 });
    const { id } = await queue(caller, business.id);
    const clock = fakeClock();

    const send = fakeSend(() => apiError("rate_limit_exceeded", 429));
    const result = await drain(id, send, clock);

    expect(result).toEqual({ batchesSent: 0, stopped: "finished" });
    expect(send.calls).toHaveLength(MAX_ATTEMPTS);
    expect(new Set(send.calls.map((c) => c.idempotencyKey)).size).toBe(1);
    // Exponential backoff between attempts, capped at 60s.
    expect(clock.sleeps).toEqual([2_000, 4_000, 8_000, 16_000, 32_000]);

    const [batch] = await batchesOf(id);
    expect(batch).toMatchObject({ status: "FAILED", attempts: MAX_ATTEMPTS });
    expect(batch!.lastError).toContain("Gave up after 6 attempts");
    expect((await recipientsOf(id)).every((r) => r.status === "FAILED")).toBe(
      true,
    );
    const campaign = await campaignOf(id);
    expect(campaign.status).toBe("FAILED");
    expect(campaign.lastError).toContain("rate_limit_exceeded");
  });

  it("re-checks a daily quota hourly without spending attempts; fails a monthly quota", async () => {
    const { business, caller } = await setup({ subscribers: 2 });
    const daily = await queue(caller, business.id);
    const clock = fakeClock();

    const send = fakeSend(() => apiError("daily_quota_exceeded", 429));
    expect((await drain(daily.id, send, clock)).stopped).toBe("idle");
    const [batch] = await batchesOf(daily.id);
    expect(batch).toMatchObject({ status: "PENDING", attempts: 0 });
    expect(batch!.notBefore!.getTime()).toBe(clock.now().getTime() + 3_600_000);

    await db.marketingCampaign.update({
      where: { id: daily.id },
      data: { status: "CANCELED" },
    });
    const monthly = await queue(caller, business.id);
    const send2 = fakeSend(() => apiError("monthly_quota_exceeded", 429));
    expect((await drain(monthly.id, send2, clock)).stopped).toBe("finished");
    expect(send2.calls).toHaveLength(1);
    const campaign = await campaignOf(monthly.id);
    expect(campaign.status).toBe("FAILED");
    expect(campaign.lastError).toContain("monthly email quota");
  });

  it("fails only the rows Resend rejected individually, storing no ids for the rest", async () => {
    const { business, caller } = await setup({ subscribers: 3 });
    const { id } = await queue(caller, business.id);

    const send = fakeSend(() => ({
      data: [{ id: "re_a" }, null, { id: "re_c" }],
      errors: [{ index: 1, message: "Invalid `to` field" }],
      error: null,
    }));
    expect((await drain(id, send)).stopped).toBe("finished");

    const rows = await recipientsOf(id);
    const toOrder = send.calls[0]!.emails.map((e) => (e.to as string[])[0]);
    // Payload order is the rows' id order.
    expect(toOrder).toEqual(rows.map((r) => r.email));
    // The realigned ids can't be trusted once anything was rejected: the
    // accepted rows are SENT with no id, for the webhook to backfill.
    expect(rows.map((r) => [r.status, r.resendId, r.error])).toEqual([
      ["SENT", null, null],
      ["FAILED", null, "Invalid `to` field"],
      ["SENT", null, null],
    ]);
    expect(rows[0]!.sentAt).not.toBeNull();
    expect((await campaignOf(id)).status).toBe("SENT");

    // A webhook event for an accepted row backfills its id by campaign +
    // business + address.
    const applied = await applyResendEvent(db, {
      type: "email.delivered",
      created_at: new Date().toISOString(),
      data: {
        email_id: "re_real_c",
        to: [rows[2]!.email],
        tags: {
          category: "marketing_broadcast",
          campaign: id,
          business: business.id,
        },
      },
    });
    expect(applied).toMatchObject({ applied: true });
    const after = await recipientsOf(id);
    expect(after.map((r) => [r.status, r.resendId])).toEqual([
      ["SENT", null],
      ["FAILED", null],
      ["DELIVERED", "re_real_c"],
    ]);
  });

  it("anonymizing a customer also clears the error on their recipient rows", async () => {
    const { business, caller } = await setup({ subscribers: 2 });
    const { id } = await queue(caller, business.id);
    const [first] = await recipientsOf(id);
    const send = fakeSend(() => ({
      data: [null, { id: "re_b" }],
      errors: [{ index: 0, message: `Invalid \`to\` field: ${first!.email}` }],
      error: null,
    }));
    await drain(id, send);
    expect((await recipientsOf(id))[0]!.error).toContain(first!.email);

    await caller.customer.anonymize({ id: first!.customerId! });

    const row = (await recipientsOf(id))[0]!;
    expect(row).toMatchObject({ email: "", error: null, status: "FAILED" });
  });

  it("skips a recipient who unsubscribed before the batch was first claimed", async () => {
    const { business, caller } = await setup({ subscribers: 3 });
    const { id } = await queue(caller, business.id);
    const rows = await recipientsOf(id);
    await db.customer.update({
      where: { id: rows[1]!.customerId! },
      data: { acceptsMarketing: false, marketingUnsubscribedAt: new Date() },
    });

    const send = fakeSend();
    await drain(id, send);

    expect(send.calls[0]!.emails.map((e) => (e.to as string[])[0])).toEqual([
      rows[0]!.email,
      rows[2]!.email,
    ]);
    const after = await recipientsOf(id);
    expect(after.map((r) => r.status)).toEqual(["SENT", "SKIPPED", "SENT"]);
  });

  it("stops at the next batch when the owner cancels mid-drain", async () => {
    const { business, caller } = await setup({ subscribers: 250 });
    const { id } = await queue(caller, business.id);

    const send = fakeSend(async (call, n) => {
      if (n === 1) await caller.marketing.cancelCampaign({ id });
      return accepted(call);
    });
    const result = await drain(id, send);

    expect(result).toEqual({ batchesSent: 1, stopped: "canceled" });
    expect(send.calls).toHaveLength(1);
    expect((await batchesOf(id)).map((b) => b.status)).toEqual([
      "SENT",
      "CANCELED",
      "CANCELED",
    ]);
    const rows = await recipientsOf(id);
    const byBatch = (i: number) =>
      new Set(rows.filter((r) => r.batchIndex === i).map((r) => r.status));
    expect(byBatch(0)).toEqual(new Set(["SENT"]));
    expect(byBatch(1)).toEqual(new Set(["CANCELED"]));
    expect(byBatch(2)).toEqual(new Set(["CANCELED"]));
    const campaign = await campaignOf(id);
    expect(campaign.status).toBe("CANCELED");
    expect(campaign.canceledAt).not.toBeNull();
  });

  it("cancels a batch claimed just before the owner canceled, without sending it", async () => {
    const { business, caller } = await setup({ subscribers: 150 });
    const { id } = await queue(caller, business.id);

    // The cancel lands after the claim (inside the throttle wait), so
    // cancelPendingWork leaves the leased batch alone.
    let canceled = false;
    const send = fakeSend();
    const result = await drainCampaign(db, id, {
      deadlineMs: 60_000,
      throttle: {
        acquire: async () => {
          if (!canceled) {
            canceled = true;
            await caller.marketing.cancelCampaign({ id });
          }
        },
      },
      send: send.fn,
    });

    expect(result).toEqual({ batchesSent: 0, stopped: "canceled" });
    expect(send.calls).toHaveLength(0);
    expect((await batchesOf(id)).map((b) => b.status)).toEqual([
      "CANCELED",
      "CANCELED",
    ]);
    expect(new Set((await recipientsOf(id)).map((r) => r.status))).toEqual(
      new Set(["CANCELED"]),
    );
  });

  it("fails (outcome unknown) a reclaimed batch when a cancel lands before its resend", async () => {
    const { business, caller } = await setup({ subscribers: 2 });
    const { id } = await queue(caller, business.id);
    const clock = fakeClock();
    await drain(
      id,
      fakeSend(() => apiError("application_error", null, { timedOut: true })),
      clock,
    );
    clock.advance(5 * 60_000 + 1);

    const send = fakeSend();
    const result = await drainCampaign(db, id, {
      deadlineMs: 60_000,
      throttle: {
        acquire: async () => {
          await db.marketingCampaign.update({
            where: { id },
            data: { status: "CANCELED", canceledAt: clock.now() },
          });
        },
      },
      send: send.fn,
      now: clock.now,
      sleep: clock.sleep,
    });

    expect(result.stopped).toBe("canceled");
    expect(send.calls).toHaveLength(0);
    const [batch] = await batchesOf(id);
    expect(batch!.status).toBe("FAILED");
    expect(batch!.lastError).toContain("may have gone out");
    expect((await recipientsOf(id)).every((r) => r.status === "FAILED")).toBe(
      true,
    );
  });

  it("fails a campaign whose frozen render is missing and cancels its batches", async () => {
    const { business, caller } = await setup({ subscribers: 2 });
    const { id } = await queue(caller, business.id);
    await db.marketingCampaign.update({
      where: { id },
      data: { renderedHtml: null },
    });

    const send = fakeSend();
    expect((await drain(id, send)).stopped).toBe("not_active");
    expect(send.calls).toHaveLength(0);
    const campaign = await campaignOf(id);
    expect(campaign.status).toBe("FAILED");
    expect(campaign.lastError).toContain("content was missing");
    expect(campaign.completedAt).not.toBeNull();
    expect((await batchesOf(id)).map((b) => b.status)).toEqual(["CANCELED"]);
    expect((await recipientsOf(id)).every((r) => r.status === "CANCELED")).toBe(
      true,
    );
    // No longer active, so the cron never picks it up again.
    expect(
      await resumeMarketingCampaigns(db, {
        budgetMs: 30_000,
        throttle: noWaitThrottle,
        send: send.fn,
      }),
    ).toBe(0);
    expect(send.calls).toHaveLength(0);
  });

  it("fails a batch first attempted over 23h ago instead of retrying it", async () => {
    const { business, caller } = await setup({ subscribers: 2 });
    const { id } = await queue(caller, business.id);
    const clock = fakeClock();

    await drain(
      id,
      fakeSend(() => apiError("application_error", null, { timedOut: true })),
      clock,
    );
    clock.advance(24 * 60 * 60_000);
    const late = fakeSend();
    expect((await drain(id, late, clock)).stopped).toBe("finished");

    expect(late.calls).toHaveLength(0);
    const [batch] = await batchesOf(id);
    expect(batch!.status).toBe("FAILED");
    expect(batch!.lastError).toContain("Outcome unknown");
    expect((await recipientsOf(id)).every((r) => r.status === "FAILED")).toBe(
      true,
    );
    expect((await campaignOf(id)).status).toBe("FAILED");
  });

  it("pauses while the flag is off and the cron resumes it once it's back on", async () => {
    const { business, caller } = await setup({ subscribers: 120 });
    const { id } = await queue(caller, business.id);
    await db.business.update({
      where: { id: business.id },
      data: { featureFlags: { emailMarketing: false } },
    });

    const paused = fakeSend();
    expect(await drain(id, paused)).toEqual({
      batchesSent: 0,
      stopped: "paused",
    });
    expect(paused.calls).toHaveLength(0);
    expect((await campaignOf(id)).status).toBe("QUEUED");

    await db.business.update({
      where: { id: business.id },
      data: { featureFlags: { emailMarketing: true } },
    });
    const resumed = fakeSend();
    const sent = await resumeMarketingCampaigns(db, {
      budgetMs: 30_000,
      throttle: noWaitThrottle,
      send: resumed.fn,
    });
    expect(sent).toBe(2);
    expect((await campaignOf(id)).status).toBe("SENT");
  });

  it("pauses while the store is suspended, and the cron skips it", async () => {
    const { business, caller } = await setup({ subscribers: 2 });
    const { id } = await queue(caller, business.id);
    await db.business.update({
      where: { id: business.id },
      data: { status: "suspended" },
    });

    const paused = fakeSend();
    expect(await drain(id, paused)).toEqual({
      batchesSent: 0,
      stopped: "paused",
    });
    expect(
      await resumeMarketingCampaigns(db, {
        budgetMs: 30_000,
        throttle: noWaitThrottle,
        send: paused.fn,
      }),
    ).toBe(0);
    expect(paused.calls).toHaveLength(0);
    expect((await campaignOf(id)).status).toBe("QUEUED");
  });

  it("cron: paused stores' campaigns don't starve a sendable one out of the window", async () => {
    const { business, caller } = await setup({ subscribers: 2 });
    const { id } = await queue(caller, business.id);

    // 50 older active campaigns from a suspended store and 50 from a store
    // with the flag off: without the business filter they'd fill take: 50.
    const suspended = await createMarketingStore("mkt-suspended");
    await db.business.update({
      where: { id: suspended.business.id },
      data: { status: "suspended" },
    });
    const flagOff = await createMarketingStore("mkt-flag-off", { flag: false });
    const old = new Date(Date.now() - 60 * 60_000);
    for (const b of [suspended.business, flagOff.business]) {
      await db.marketingCampaign.createMany({
        data: Array.from({ length: 50 }, () => ({
          businessId: b.id,
          subject: "Blocked",
          status: "QUEUED",
          queuedAt: old,
        })),
      });
    }

    const send = fakeSend();
    const sent = await resumeMarketingCampaigns(db, {
      budgetMs: 30_000,
      throttle: noWaitThrottle,
      send: send.fn,
    });
    expect(sent).toBe(1);
    expect(send.calls.map((c) => c.idempotencyKey)).toEqual([`mkt:${id}:0`]);
    expect((await campaignOf(id)).status).toBe("SENT");
  });
});
