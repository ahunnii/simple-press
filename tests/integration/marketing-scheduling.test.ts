import type * as NextServer from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as ResendModule from "~/lib/email/resend";
import type * as RenderCampaignModule from "~/lib/marketing/render-campaign";
import { resumeMarketingCampaigns } from "~/lib/marketing/campaign-worker";
import {
  EMAIL_MARKETING_OFF_SCHEDULE_ERROR,
  NO_RECIPIENTS_SCHEDULE_ERROR,
  PAUSED_STORE_SCHEDULE_ERROR,
  queueCampaign,
  queueDueScheduledCampaigns,
  SCHEDULED_SEND_BLOCKED_ERRORS,
  SCHEDULED_SEND_GAVE_UP_ERROR,
  SCHEDULED_SEND_RETRY_ERROR,
} from "~/lib/marketing/queue-campaign";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import { createOrder, createProduct } from "../helpers/factories";
import {
  createDraft,
  createMarketingStore,
  fakeSend,
  noWaitThrottle,
  seedSubscribers,
} from "../helpers/marketing";

/**
 * Scheduled sends: `scheduleCampaign` / `unscheduleCampaign` in the marketing
 * router and the cron sweep `queueDueScheduledCampaigns`
 * (`src/lib/marketing/queue-campaign.ts`), incl. the CAS race between the
 * sweep and an unschedule.
 */
const reqHost = vi.hoisted(() => ({ value: "mkt-s.simplepress.test" }));
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

/**
 * A hook run before every `renderCampaign` (the slow step between the send
 * checks and the queue CAS): throw from it to make queueing throw, or change
 * the campaign behind the sweep's back to exercise the CAS.
 */
const renderHook = vi.hoisted(() => ({
  before: null as null | (() => Promise<void> | void),
}));
vi.mock("~/lib/marketing/render-campaign", async (importOriginal) => {
  const actual = await importOriginal<typeof RenderCampaignModule>();
  return {
    ...actual,
    renderCampaign: async (
      ...args: Parameters<typeof actual.renderCampaign>
    ) => {
      await renderHook.before?.();
      return actual.renderCampaign(...args);
    },
  };
});

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

async function store(opts: { flag?: boolean; address?: boolean } = {}) {
  const s = await createMarketingStore("mkt-s", opts);
  reqHost.value = s.host;
  const caller = createTestCaller({
    userId: s.owner.id,
    email: s.owner.email,
  });
  return { ...s, caller };
}

const inMinutes = (m: number) => new Date(Date.now() + m * MINUTE);

const campaignOf = (id: string) =>
  db.marketingCampaign.findUniqueOrThrow({ where: { id } });

/** Moves a scheduled campaign's time into the past (as if it came due). */
async function makeDue(id: string, agoMs = MINUTE) {
  await db.marketingCampaign.update({
    where: { id },
    data: { scheduledAt: new Date(Date.now() - agoMs) },
  });
}

describe("marketing scheduling — schedule / unschedule", () => {
  beforeEach(async () => {
    await resetDb();
    afterCallbacks.length = 0;
    renderHook.before = null;
  });

  it("schedules a draft, freezes it, and unschedules it back to a draft", async () => {
    const { business, caller } = await store();
    await seedSubscribers(business.id, 3);
    const draft = await createDraft(business.id);
    const at = inMinutes(60);

    const result = await caller.marketing.scheduleCampaign({
      id: draft.id,
      scheduledAt: at,
    });
    expect(result).toMatchObject({ id: draft.id, audienceCount: 3 });

    const scheduled = await campaignOf(draft.id);
    expect(scheduled.status).toBe("SCHEDULED");
    expect(scheduled.scheduledAt?.getTime()).toBe(at.getTime());
    // Nothing rendered or snapshotted yet.
    expect(scheduled.renderedHtml).toBeNull();
    expect(await db.marketingCampaignRecipient.count()).toBe(0);
    expect(afterCallbacks).toHaveLength(0);

    // Listed with its time.
    const list = await caller.marketing.listCampaigns({});
    expect(list.campaigns[0]).toMatchObject({
      status: "SCHEDULED",
      scheduledAt: at,
    });
    const detail = await caller.marketing.getCampaign({ id: draft.id });
    expect(detail.scheduledAt).toEqual(at);

    // Frozen while scheduled: no edits, no send, no second schedule.
    await expect(
      caller.marketing.saveDraft({ id: draft.id, subject: "Edited" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.marketing.sendCampaign({ id: draft.id }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("scheduled") as string,
    });
    await expect(
      caller.marketing.scheduleCampaign({
        id: draft.id,
        scheduledAt: inMinutes(120),
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    await caller.marketing.unscheduleCampaign({ id: draft.id });
    const back = await campaignOf(draft.id);
    expect(back.status).toBe("DRAFT");
    expect(back.scheduledAt).toBeNull();

    // A second unschedule conflicts; an unknown id is NOT_FOUND.
    await expect(
      caller.marketing.unscheduleCampaign({ id: draft.id }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      caller.marketing.unscheduleCampaign({ id: "nope" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a time too soon or too far out", async () => {
    const { business, caller } = await store();
    await seedSubscribers(business.id, 1);
    const draft = await createDraft(business.id);

    await expect(
      caller.marketing.scheduleCampaign({
        id: draft.id,
        scheduledAt: inMinutes(5),
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Pick a time at least 10 minutes from now.",
    });
    await expect(
      caller.marketing.scheduleCampaign({
        id: draft.id,
        scheduledAt: new Date(Date.now() - HOUR),
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.marketing.scheduleCampaign({
        id: draft.id,
        scheduledAt: new Date(Date.now() + 91 * DAY),
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Pick a time within the next 90 days.",
    });
    expect((await campaignOf(draft.id)).status).toBe("DRAFT");
  });

  it("only schedules drafts", async () => {
    const { business, caller } = await store();
    await seedSubscribers(business.id, 1);
    const draft = await createDraft(business.id);
    await caller.marketing.sendCampaign({ id: draft.id });

    await expect(
      caller.marketing.scheduleCampaign({
        id: draft.id,
        scheduledAt: inMinutes(60),
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Only drafts can be scheduled.",
    });
    await expect(
      caller.marketing.unscheduleCampaign({ id: draft.id }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("refuses without a postal address, with an empty body, or with an empty audience", async () => {
    const noAddress = await store({ address: false });
    await seedSubscribers(noAddress.business.id, 1);
    const d1 = await createDraft(noAddress.business.id);
    await expect(
      noAddress.caller.marketing.scheduleCampaign({
        id: d1.id,
        scheduledAt: inMinutes(60),
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("business address") as string,
    });

    await resetDb();
    const { business, caller } = await store();
    const empty = await db.marketingCampaign.create({
      data: { businessId: business.id, subject: "Empty", bodyText: "  " },
    });
    await seedSubscribers(business.id, 1);
    await expect(
      caller.marketing.scheduleCampaign({
        id: empty.id,
        scheduledAt: inMinutes(60),
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Write a message before sending.",
    });

    // Nobody in the segment.
    const draft = await createDraft(business.id);
    await db.marketingCampaign.update({
      where: { id: draft.id },
      data: { audience: { type: "customers" } },
    });
    await expect(
      caller.marketing.scheduleCampaign({
        id: draft.id,
        scheduledAt: inMinutes(60),
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "No one matches this audience yet.",
    });
    expect((await campaignOf(draft.id)).status).toBe("DRAFT");
  });

  it("refuses a stored audience that no longer parses (never widens to everyone)", async () => {
    const { business, caller } = await store();
    await seedSubscribers(business.id, 3);
    const draft = await createDraft(business.id);
    await db.marketingCampaign.update({
      where: { id: draft.id },
      data: { audience: { type: "removed-segment" } },
    });
    await expect(
      caller.marketing.scheduleCampaign({
        id: draft.id,
        scheduledAt: inMinutes(60),
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message:
        "This campaign's audience is no longer valid. Pick the audience again and save.",
    });
    await expect(
      caller.marketing.sendCampaign({ id: draft.id }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("audience is no longer valid") as string,
    });
    expect((await campaignOf(draft.id)).status).toBe("DRAFT");
    expect(await db.marketingCampaignRecipient.count()).toBe(0);
  });

  it("checks the body after product blocks are rebuilt", async () => {
    const { business, caller } = await store();
    await seedSubscribers(business.id, 1);
    const product = await createProduct(business.id, { name: "Real Tote" });
    // Only a product block whose snapshot is bare (no name/price): empty as
    // stored, but real content once hydrated from the store.
    const draft = await db.marketingCampaign.create({
      data: {
        businessId: business.id,
        subject: "Products",
        contentFormat: "tiptap",
        bodyJson: {
          type: "doc",
          content: [
            {
              type: "emailProducts",
              attrs: { items: [{ productId: product.id }] },
            },
          ],
        },
      },
    });
    await caller.marketing.scheduleCampaign({
      id: draft.id,
      scheduledAt: inMinutes(60),
    });
    expect((await campaignOf(draft.id)).status).toBe("SCHEDULED");
    await caller.marketing.unscheduleCampaign({ id: draft.id });

    // Shop turned off: the block hydrates empty → empty_product_block wins
    // over empty_body.
    await db.business.update({
      where: { id: business.id },
      data: { featureFlags: { emailMarketing: true, products: false } },
    });
    await expect(
      caller.marketing.scheduleCampaign({
        id: draft.id,
        scheduledAt: inMinutes(60),
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("product block") as string,
    });
  });

  it("is feature-gated (schedule) but unschedule works with the flag off", async () => {
    const { business, caller } = await store();
    await seedSubscribers(business.id, 1);
    const draft = await createDraft(business.id);
    await caller.marketing.scheduleCampaign({
      id: draft.id,
      scheduledAt: inMinutes(60),
    });
    await db.business.update({
      where: { id: business.id },
      data: { featureFlags: { emailMarketing: false } },
    });
    const other = await createDraft(business.id, "Other");
    await expect(
      caller.marketing.scheduleCampaign({
        id: other.id,
        scheduledAt: inMinutes(60),
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await caller.marketing.unscheduleCampaign({ id: draft.id });
    expect((await campaignOf(draft.id)).status).toBe("DRAFT");
  });
});

describe("marketing scheduling — cron sweep", () => {
  beforeEach(async () => {
    await resetDb();
    afterCallbacks.length = 0;
    renderHook.before = null;
  });

  async function scheduled(
    caller: Awaited<ReturnType<typeof store>>["caller"],
    businessId: string,
    subject = "Spring sale",
  ) {
    const draft = await createDraft(businessId, subject);
    await caller.marketing.scheduleCampaign({
      id: draft.id,
      scheduledAt: inMinutes(60),
    });
    return draft.id;
  }

  it("queues a due campaign and leaves one that isn't due yet", async () => {
    const { business, caller } = await store();
    await seedSubscribers(business.id, 150);
    const due = await scheduled(caller, business.id, "Due");
    const later = await scheduled(caller, business.id, "Later");
    await makeDue(due);

    const result = await queueDueScheduledCampaigns(db);
    expect(result).toEqual({ queued: [due], failed: [] });

    const queued = await campaignOf(due);
    expect(queued).toMatchObject({
      status: "QUEUED",
      scheduledAt: null,
      recipientCount: 150,
      baseUrl: "https://mkt-s.simplepress.test",
    });
    expect(queued.renderedHtml).toContain("__SP_UNSUBSCRIBE_URL__");
    expect(queued.queuedAt).not.toBeNull();
    expect(
      await db.marketingCampaignRecipient.count({ where: { campaignId: due } }),
    ).toBe(150);
    expect(
      await db.marketingCampaignBatch.count({ where: { campaignId: due } }),
    ).toBe(2);

    const notDue = await campaignOf(later);
    expect(notDue.status).toBe("SCHEDULED");
    expect(notDue.scheduledAt).not.toBeNull();
    expect(
      await db.marketingCampaignRecipient.count({
        where: { campaignId: later },
      }),
    ).toBe(0);

    // Running again does nothing new.
    expect(await queueDueScheduledCampaigns(db)).toEqual({
      queued: [],
      failed: [],
    });
  });

  it("resumeMarketingCampaigns queues and drains a due campaign in the same run", async () => {
    const { business, caller } = await store();
    await seedSubscribers(business.id, 2);
    const id = await scheduled(caller, business.id);
    await makeDue(id);

    const send = fakeSend();
    const sent = await resumeMarketingCampaigns(db, {
      budgetMs: 30_000,
      throttle: noWaitThrottle,
      send: send.fn,
    });
    expect(sent).toBe(1);
    expect(send.calls).toHaveLength(1);
    expect((await campaignOf(id)).status).toBe("SENT");
  });

  it("applies the segment at sweep time", async () => {
    const { business, caller } = await store();
    const early = await db.customer.create({
      data: {
        businessId: business.id,
        email: "early@test.dev",
        acceptsMarketing: true,
        orderCount: 1,
      },
    });
    await createOrder(business.id, {
      customerId: early.id,
      paymentStatus: "paid",
    });
    const draft = await createDraft(business.id);
    await db.marketingCampaign.update({
      where: { id: draft.id },
      data: { audience: { type: "customers" } },
    });
    await caller.marketing.scheduleCampaign({
      id: draft.id,
      scheduledAt: inMinutes(60),
    });

    // After scheduling: one more customer joins the segment, one opts in
    // without ordering (not in the segment).
    const late = await db.customer.create({
      data: {
        businessId: business.id,
        email: "late@test.dev",
        acceptsMarketing: true,
        orderCount: 2,
      },
    });
    await createOrder(business.id, {
      customerId: late.id,
      paymentStatus: "paid",
    });
    await db.customer.create({
      data: {
        businessId: business.id,
        email: "browser@test.dev",
        acceptsMarketing: true,
        orderCount: 0,
      },
    });
    await makeDue(draft.id);
    await queueDueScheduledCampaigns(db);

    const recipients = await db.marketingCampaignRecipient.findMany({
      where: { campaignId: draft.id },
      select: { email: true },
      orderBy: { email: "asc" },
    });
    expect(recipients.map((r) => r.email)).toEqual([
      "early@test.dev",
      "late@test.dev",
    ]);
    expect((await campaignOf(draft.id)).recipientCount).toBe(2);
  });

  it("leaves a paused or switched-off store's campaign scheduled for up to 24h, then fails it", async () => {
    const { business, caller } = await store();
    await seedSubscribers(business.id, 2);
    const recent = await scheduled(caller, business.id, "Recent");
    const stale = await scheduled(caller, business.id, "Stale");
    const stale2 = await scheduled(caller, business.id, "Stale 2");
    await makeDue(stale2, 2 * HOUR);
    await makeDue(recent, 2 * HOUR);
    await makeDue(stale, 25 * HOUR);
    await db.business.update({
      where: { id: business.id },
      data: { featureFlags: { emailMarketing: false } },
    });

    const result = await queueDueScheduledCampaigns(db);
    expect(result).toEqual({ queued: [], failed: [stale] });

    expect((await campaignOf(recent)).status).toBe("SCHEDULED");
    const failed = await campaignOf(stale);
    expect(failed.status).toBe("FAILED");
    // The flag being off is not the store being paused: its own message.
    expect(failed.lastError).toBe(EMAIL_MARKETING_OFF_SCHEDULE_ERROR);
    expect(failed.completedAt).not.toBeNull();
    expect(await db.marketingCampaignRecipient.count()).toBe(0);

    // A suspended store is paused too.
    await db.business.update({
      where: { id: business.id },
      data: {
        featureFlags: { emailMarketing: true },
        status: "suspended",
      },
    });
    expect(await queueDueScheduledCampaigns(db)).toEqual({
      queued: [],
      failed: [],
    });
    expect((await campaignOf(recent)).status).toBe("SCHEDULED");

    // Once it is also 24h overdue, a suspended store gets the paused message
    // (status wins when the flag is off as well).
    await makeDue(stale2, 25 * HOUR);
    expect(await queueDueScheduledCampaigns(db)).toEqual({
      queued: [],
      failed: [stale2],
    });
    expect((await campaignOf(stale2)).lastError).toBe(
      PAUSED_STORE_SCHEDULE_ERROR,
    );

    // Store back: the late campaign goes out.
    await db.business.update({
      where: { id: business.id },
      data: { status: "active" },
    });
    expect(await queueDueScheduledCampaigns(db)).toEqual({
      queued: [recent],
      failed: [],
    });
  });

  it("fails (not sends to 0) a due campaign nobody matches, creating nothing", async () => {
    const { business, caller } = await store();
    await seedSubscribers(business.id, 1);
    const id = await scheduled(caller, business.id);
    await makeDue(id);
    // The only subscriber opted out after scheduling.
    await db.customer.updateMany({
      where: { businessId: business.id },
      data: { acceptsMarketing: false },
    });

    expect(await queueDueScheduledCampaigns(db)).toEqual({
      queued: [],
      failed: [id],
    });
    const failed = await campaignOf(id);
    expect(failed.status).toBe("FAILED");
    expect(failed.lastError).toBe(NO_RECIPIENTS_SCHEDULE_ERROR);
    expect(failed.completedAt).not.toBeNull();
    expect(failed.recipientCount).toBe(0);
    expect(failed.renderedHtml).toBeNull();
    expect(await db.marketingCampaignRecipient.count()).toBe(0);
    expect(await db.marketingCampaignBatch.count()).toBe(0);

    // Terminal: a second queue attempt finds it already moved on.
    const again = await queueCampaign(db, {
      campaignId: id,
      businessId: business.id,
      expectStatus: "SCHEDULED",
    });
    expect(again).toMatchObject({ ok: false, reason: "status_changed" });
  });

  it("fails a due campaign whose business address was removed after scheduling", async () => {
    const { business, caller } = await store();
    await seedSubscribers(business.id, 2);
    const id = await scheduled(caller, business.id);
    await makeDue(id);
    await db.business.update({
      where: { id: business.id },
      data: {
        addressStreet: null,
        addressCity: null,
        addressState: null,
        addressPostalCode: null,
        businessAddress: null,
      },
    });

    expect(await queueDueScheduledCampaigns(db)).toEqual({
      queued: [],
      failed: [id],
    });
    const failed = await campaignOf(id);
    expect(failed.status).toBe("FAILED");
    expect(failed.lastError).toBe(
      SCHEDULED_SEND_BLOCKED_ERRORS.no_postal_address,
    );
    expect(failed.renderedHtml).toBeNull();
    expect(await db.marketingCampaignRecipient.count()).toBe(0);
    expect(await db.marketingCampaignBatch.count()).toBe(0);
  });

  it("one bad campaign doesn't stop the rest", async () => {
    const { business, caller } = await store();
    await seedSubscribers(business.id, 1);
    const good = await scheduled(caller, business.id, "Good");
    const bad = await scheduled(caller, business.id, "Bad");
    await makeDue(bad, 2 * MINUTE); // swept first
    await makeDue(good, MINUTE);
    // Body emptied behind the router's back.
    await db.marketingCampaign.update({
      where: { id: bad },
      data: { bodyText: "" },
    });

    expect(await queueDueScheduledCampaigns(db)).toEqual({
      queued: [good],
      failed: [bad],
    });
    expect((await campaignOf(bad)).lastError).toBe(
      SCHEDULED_SEND_BLOCKED_ERRORS.empty_body,
    );
  });

  it("sweep vs unschedule race: exactly one wins and rows stay consistent", async () => {
    const { business, caller } = await store();
    await seedSubscribers(business.id, 250);

    for (let round = 0; round < 5; round++) {
      const id = await scheduled(caller, business.id, `Race ${round}`);
      await makeDue(id);

      const [sweep, unschedule] = await Promise.allSettled([
        queueDueScheduledCampaigns(db),
        caller.marketing.unscheduleCampaign({ id }),
      ]);
      expect(sweep.status).toBe("fulfilled");
      const swept =
        sweep.status === "fulfilled" && sweep.value.queued.includes(id);
      const unscheduled = unschedule.status === "fulfilled";
      // Exactly one outcome.
      expect(swept !== unscheduled).toBe(true);

      const campaign = await campaignOf(id);
      const recipients = await db.marketingCampaignRecipient.count({
        where: { campaignId: id },
      });
      const batches = await db.marketingCampaignBatch.count({
        where: { campaignId: id },
      });
      if (unscheduled) {
        expect(campaign.status).toBe("DRAFT");
        expect(campaign.scheduledAt).toBeNull();
        expect(campaign.renderedHtml).toBeNull();
        expect(campaign.queuedAt).toBeNull();
        expect(recipients).toBe(0);
        expect(batches).toBe(0);
      } else {
        expect(unschedule).toMatchObject({
          status: "rejected",
          reason: { code: "CONFLICT" },
        });
        expect(campaign.status).toBe("QUEUED");
        expect(campaign.scheduledAt).toBeNull();
        expect(recipients).toBe(250);
        expect(batches).toBe(3);
      }
    }
  });

  it("fails a due campaign whose stored audience no longer parses", async () => {
    const { business, caller } = await store();
    await seedSubscribers(business.id, 3);
    const id = await scheduled(caller, business.id);
    await makeDue(id);
    await db.marketingCampaign.update({
      where: { id },
      data: { audience: { type: "removed-segment" } },
    });

    expect(await queueDueScheduledCampaigns(db)).toEqual({
      queued: [],
      failed: [id],
    });
    const failed = await campaignOf(id);
    expect(failed.status).toBe("FAILED");
    expect(failed.lastError).toBe(
      SCHEDULED_SEND_BLOCKED_ERRORS.invalid_audience,
    );
    expect(await db.marketingCampaignRecipient.count()).toBe(0);
  });

  it("a throw records a retry note, then fails once it throws again >1h overdue", async () => {
    const { business, caller } = await store();
    await seedSubscribers(business.id, 2);
    const id = await scheduled(caller, business.id);
    await makeDue(id, 30 * MINUTE);
    renderHook.before = () => {
      throw new Error("render blew up");
    };

    // First throw: still scheduled, with the retry note.
    expect(await queueDueScheduledCampaigns(db)).toEqual({
      queued: [],
      failed: [],
    });
    let campaign = await campaignOf(id);
    expect(campaign.status).toBe("SCHEDULED");
    expect(campaign.lastError).toBe(SCHEDULED_SEND_RETRY_ERROR);

    // Throws again but < 1h overdue: still retried.
    expect(await queueDueScheduledCampaigns(db)).toEqual({
      queued: [],
      failed: [],
    });
    expect((await campaignOf(id)).status).toBe("SCHEDULED");

    // Throws again > 1h overdue after an earlier throw: given up.
    await makeDue(id, 2 * HOUR);
    expect(await queueDueScheduledCampaigns(db)).toEqual({
      queued: [],
      failed: [id],
    });
    campaign = await campaignOf(id);
    expect(campaign.status).toBe("FAILED");
    expect(campaign.lastError).toBe(SCHEDULED_SEND_GAVE_UP_ERROR);
    expect(campaign.completedAt).not.toBeNull();
    expect(await db.marketingCampaignRecipient.count()).toBe(0);
  });

  it("a first throw more than 24h overdue fails it straight away", async () => {
    const { business, caller } = await store();
    await seedSubscribers(business.id, 1);
    const id = await scheduled(caller, business.id);
    await makeDue(id, 25 * HOUR);
    renderHook.before = () => {
      throw new Error("render blew up");
    };
    expect(await queueDueScheduledCampaigns(db)).toEqual({
      queued: [],
      failed: [id],
    });
    expect(await campaignOf(id)).toMatchObject({
      status: "FAILED",
      lastError: SCHEDULED_SEND_GAVE_UP_ERROR,
    });
  });

  it("a later successful queue clears the retry note; rescheduling starts clean", async () => {
    const { business, caller } = await store();
    await seedSubscribers(business.id, 1);
    const id = await scheduled(caller, business.id);
    await makeDue(id);
    renderHook.before = () => {
      throw new Error("transient");
    };
    await queueDueScheduledCampaigns(db);
    expect((await campaignOf(id)).lastError).toBe(SCHEDULED_SEND_RETRY_ERROR);

    // Unschedule + schedule again: the note is gone, so a single later throw
    // can't count as a repeat.
    await caller.marketing.unscheduleCampaign({ id });
    await caller.marketing.scheduleCampaign({
      id,
      scheduledAt: inMinutes(60),
    });
    expect((await campaignOf(id)).lastError).toBeNull();

    // A throw, then a success: queued with no stale note.
    await makeDue(id);
    await queueDueScheduledCampaigns(db);
    expect((await campaignOf(id)).lastError).toBe(SCHEDULED_SEND_RETRY_ERROR);
    renderHook.before = null;
    expect(await queueDueScheduledCampaigns(db)).toEqual({
      queued: [id],
      failed: [],
    });
    expect(await campaignOf(id)).toMatchObject({
      status: "QUEUED",
      lastError: null,
    });
  });

  it("stops starting campaigns once its budget is spent", async () => {
    const { business, caller } = await store();
    await seedSubscribers(business.id, 1);
    const first = await scheduled(caller, business.id, "First");
    const second = await scheduled(caller, business.id, "Second");
    await makeDue(first, 2 * MINUTE);
    await makeDue(second, MINUTE);

    // No budget: nothing is started.
    expect(await queueDueScheduledCampaigns(db, { budgetMs: 0 })).toEqual({
      queued: [],
      failed: [],
    });
    expect((await campaignOf(first)).status).toBe("SCHEDULED");

    // The first campaign spends the whole budget: the second waits.
    renderHook.before = () => new Promise((r) => setTimeout(r, 150));
    expect(await queueDueScheduledCampaigns(db, { budgetMs: 100 })).toEqual({
      queued: [first],
      failed: [],
    });
    expect((await campaignOf(second)).status).toBe("SCHEDULED");

    // resumeMarketingCampaigns passes its budget to the sweep.
    renderHook.before = null;
    const send = fakeSend();
    expect(
      await resumeMarketingCampaigns(db, {
        budgetMs: 0,
        throttle: noWaitThrottle,
        send: send.fn,
      }),
    ).toBe(0);
    expect((await campaignOf(second)).status).toBe("SCHEDULED");
    expect(send.calls).toHaveLength(0);
  });

  it("CAS: a campaign rescheduled for later during the render isn't queued early", async () => {
    const { business, caller } = await store();
    await seedSubscribers(business.id, 2);
    const id = await scheduled(caller, business.id);
    await makeDue(id);
    const later = inMinutes(120);
    // While the sweep renders: unschedule, edit, reschedule for later.
    renderHook.before = async () => {
      renderHook.before = null;
      await caller.marketing.unscheduleCampaign({ id });
      await db.marketingCampaign.update({
        where: { id },
        data: { subject: "Edited" },
      });
      await caller.marketing.scheduleCampaign({ id, scheduledAt: later });
    };

    expect(
      await queueCampaign(db, {
        campaignId: id,
        businessId: business.id,
        expectStatus: "SCHEDULED",
      }),
    ).toEqual({ ok: false, reason: "status_changed", status: "SCHEDULED" });

    const campaign = await campaignOf(id);
    expect(campaign.status).toBe("SCHEDULED");
    expect(campaign.scheduledAt?.getTime()).toBe(later.getTime());
    expect(campaign.subject).toBe("Edited");
    expect(campaign.renderedHtml).toBeNull();
    expect(await db.marketingCampaignRecipient.count()).toBe(0);
  });
});
