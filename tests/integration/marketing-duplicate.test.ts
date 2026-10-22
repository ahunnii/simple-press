import type * as NextServer from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import { createDraft, createMarketingStore } from "../helpers/marketing";

/**
 * `marketing.duplicateCampaign` and the scheduled-state wording of the
 * draft edit / delete errors (`src/server/api/routers/marketing.ts`).
 */
const reqHost = vi.hoisted(() => ({ value: "mkt-d.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof NextServer>();
  return { ...actual, after: () => undefined };
});

async function store(opts: { flag?: boolean } = {}) {
  const s = await createMarketingStore("mkt-d", opts);
  reqHost.value = s.host;
  const caller = createTestCaller({
    userId: s.owner.id,
    email: s.owner.email,
  });
  return { ...s, caller };
}

const BODY_JSON = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Hello there" }] },
  ],
};

describe("marketing router — duplicateCampaign", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("copies content, preview text and audience into a fresh draft", async () => {
    const { business, owner, caller } = await store();
    const audience = { type: "lapsed", days: 90 };
    const source = await db.marketingCampaign.create({
      data: {
        businessId: business.id,
        subject: "Spring sale",
        previewText: "Twenty percent off",
        contentFormat: "tiptap",
        bodyJson: BODY_JSON,
        audience,
      },
    });

    const { id } = await caller.marketing.duplicateCampaign({ id: source.id });
    expect(id).not.toBe(source.id);

    const copy = await db.marketingCampaign.findUniqueOrThrow({
      where: { id },
    });
    expect(copy).toMatchObject({
      businessId: business.id,
      createdById: owner.id,
      status: "DRAFT",
      subject: "Copy of Spring sale",
      previewText: "Twenty percent off",
      contentFormat: "tiptap",
      bodyJson: BODY_JSON,
      audience,
      scheduledAt: null,
      queuedAt: null,
      recipientCount: 0,
    });
    // The original is untouched.
    expect(
      (
        await db.marketingCampaign.findUniqueOrThrow({
          where: { id: source.id },
        })
      ).subject,
    ).toBe("Spring sale");
  });

  it("copies plain-text drafts with no audience as nulls", async () => {
    const { business, caller } = await store();
    const source = await createDraft(business.id);

    const { id } = await caller.marketing.duplicateCampaign({ id: source.id });
    const copy = await db.marketingCampaign.findUniqueOrThrow({
      where: { id },
    });
    expect(copy.contentFormat).toBe("text");
    expect(copy.bodyText).toBe(source.bodyText);
    expect(copy.bodyJson).toBeNull();
    expect(copy.audience).toBeNull();
  });

  it("works from a sent campaign and does not carry its results over", async () => {
    const { business, caller } = await store();
    const source = await createDraft(business.id);
    await db.marketingCampaign.update({
      where: { id: source.id },
      data: {
        status: "SENT",
        queuedAt: new Date(),
        completedAt: new Date(),
        recipientCount: 5,
      },
    });

    const { id } = await caller.marketing.duplicateCampaign({ id: source.id });
    const copy = await db.marketingCampaign.findUniqueOrThrow({
      where: { id },
    });
    expect(copy).toMatchObject({
      status: "DRAFT",
      recipientCount: 0,
      queuedAt: null,
      completedAt: null,
    });
  });

  it("keeps the subject as is when the prefix would exceed 200 characters", async () => {
    const { business, caller } = await store();
    const subject = "x".repeat(198);
    const source = await createDraft(business.id, subject);

    const { id } = await caller.marketing.duplicateCampaign({ id: source.id });
    const copy = await db.marketingCampaign.findUniqueOrThrow({
      where: { id },
    });
    expect(copy.subject).toBe(subject);
  });

  it("returns NOT_FOUND for another business's campaign", async () => {
    const a = await createMarketingStore("mkt-a");
    const foreign = await createDraft(a.business.id);

    const other = await createMarketingStore("mkt-b");
    reqHost.value = other.host;
    const caller = createTestCaller({
      userId: other.owner.id,
      email: other.owner.email,
    });

    await expect(
      caller.marketing.duplicateCampaign({ id: foreign.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await db.marketingCampaign.count()).toBe(1);
  });

  it("is blocked while the emailMarketing flag is off", async () => {
    const { business, caller } = await store({ flag: false });
    const source = await createDraft(business.id);

    await expect(
      caller.marketing.duplicateCampaign({ id: source.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await db.marketingCampaign.count()).toBe(1);
  });
});

describe("marketing router — scheduled campaigns are frozen", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("explains that a scheduled campaign must be unscheduled to edit or delete it", async () => {
    const { business, caller } = await store();
    const source = await createDraft(business.id);
    await db.marketingCampaign.update({
      where: { id: source.id },
      data: {
        status: "SCHEDULED",
        scheduledAt: new Date(Date.now() + 60 * 60_000),
      },
    });

    await expect(
      caller.marketing.saveDraft({ id: source.id, subject: "New subject" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "This campaign is scheduled. Unschedule it first to edit it.",
    });
    await expect(
      caller.marketing.deleteDraft({ id: source.id }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "This campaign is scheduled. Unschedule it first to delete it.",
    });
  });
});
