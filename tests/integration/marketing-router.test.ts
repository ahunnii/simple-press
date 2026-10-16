import type * as NextServer from "next/server";
import type { ReactElement } from "react";
import { render } from "@react-email/components";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as ResendModule from "~/lib/email/resend";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import { createMembership, createUser } from "../helpers/factories";
import {
  createDraft,
  createMarketingStore,
  seedSubscribers,
} from "../helpers/marketing";

/**
 * Coverage for the campaign procedures in `src/server/api/routers/marketing.ts`:
 * draft lifecycle, the send CAS (double send, concurrent double send),
 * the postal-address requirement, zero-recipient campaigns, cancel, counts,
 * tenant isolation, roles, and the emailMarketing feature gate.
 *
 * Tenant resolution reads the request host via `next/headers` (mutable
 * mock, same idiom as `invoice-router.test.ts`). `after()` is captured and
 * never run, and Resend is mocked so nothing reaches the network.
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

async function storeA(opts: { flag?: boolean; address?: boolean } = {}) {
  const store = await createMarketingStore("mkt-a", opts);
  reqHost.value = store.host;
  const caller = createTestCaller({
    userId: store.owner.id,
    email: store.owner.email,
  });
  return { ...store, caller };
}

describe("marketing router — campaigns", () => {
  beforeEach(async () => {
    await resetDb();
    afterCallbacks.length = 0;
    resendMocks.sendResendBatch.mockReset();
    resendMocks.sendResendEmail.mockReset();
    resendMocks.sendResendEmail.mockResolvedValue({
      data: { id: "email_test" },
      error: null,
    });
  });

  it("saves, updates and deletes a draft", async () => {
    const { business, owner, caller } = await storeA();
    const { id } = await caller.marketing.saveDraft({
      subject: "Hello",
      bodyText: "First version",
    });
    await caller.marketing.saveDraft({
      id,
      subject: "Hello again",
      previewText: "",
      bodyText: "Second version",
    });
    const saved = await db.marketingCampaign.findUniqueOrThrow({
      where: { id },
    });
    expect(saved).toMatchObject({
      businessId: business.id,
      createdById: owner.id,
      status: "DRAFT",
      subject: "Hello again",
      previewText: null,
      contentFormat: "text",
      bodyText: "Second version",
    });

    await caller.marketing.deleteDraft({ id });
    expect(await db.marketingCampaign.count()).toBe(0);
  });

  it("queues a campaign once: a second sendCampaign is rejected and edits are frozen", async () => {
    const { business, caller } = await storeA();
    await seedSubscribers(business.id, 5);
    const draft = await createDraft(business.id);

    const result = await caller.marketing.sendCampaign({ id: draft.id });
    expect(result).toEqual({ id: draft.id, recipientCount: 5 });
    expect(afterCallbacks).toHaveLength(1);

    const queued = await db.marketingCampaign.findUniqueOrThrow({
      where: { id: draft.id },
    });
    expect(queued).toMatchObject({
      status: "QUEUED",
      recipientCount: 5,
      fromAddress: `"Bloom & Co via SimplePress" <noreply@test.dev>`,
      replyTo: business.ownerEmail,
      baseUrl: "https://mkt-a.simplepress.test",
    });
    expect(queued.renderedHtml).toContain("__SP_UNSUBSCRIBE_URL__");
    expect(queued.renderedHtml).toContain("1 Main St");
    expect(queued.queuedAt).not.toBeNull();

    await expect(
      caller.marketing.sendCampaign({ id: draft.id }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.marketing.saveDraft({ id: draft.id, subject: "Edited" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.marketing.deleteDraft({ id: draft.id }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(
      await db.marketingCampaignRecipient.count({
        where: { campaignId: draft.id },
      }),
    ).toBe(5);
  });

  it("lets only one of two concurrent sendCampaign calls through", async () => {
    const { business, caller } = await storeA();
    await seedSubscribers(business.id, 150);
    const draft = await createDraft(business.id);

    const results = await Promise.allSettled([
      caller.marketing.sendCampaign({ id: draft.id }),
      caller.marketing.sendCampaign({ id: draft.id }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      await db.marketingCampaignRecipient.count({
        where: { campaignId: draft.id },
      }),
    ).toBe(150);
    expect(
      await db.marketingCampaignBatch.count({
        where: { campaignId: draft.id },
      }),
    ).toBe(2);
  });

  it("rejects sending without a business postal address", async () => {
    const { business, caller } = await storeA({ address: false });
    await seedSubscribers(business.id, 2);
    const draft = await createDraft(business.id);

    await expect(
      caller.marketing.sendCampaign({ id: draft.id }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("business address") as unknown,
    });
    expect(
      (
        await db.marketingCampaign.findUniqueOrThrow({
          where: { id: draft.id },
        })
      ).status,
    ).toBe("DRAFT");
  });

  it("marks a campaign with no audience SENT immediately, without a drain", async () => {
    const { business, caller } = await storeA();
    const draft = await createDraft(business.id);

    expect(await caller.marketing.sendCampaign({ id: draft.id })).toEqual({
      id: draft.id,
      recipientCount: 0,
    });
    const campaign = await db.marketingCampaign.findUniqueOrThrow({
      where: { id: draft.id },
    });
    expect(campaign.status).toBe("SENT");
    expect(campaign.completedAt).not.toBeNull();
    expect(afterCallbacks).toHaveLength(0);
  });

  it("cancels a queued campaign and everything not yet sent", async () => {
    const { business, caller } = await storeA();
    await seedSubscribers(business.id, 120);
    const draft = await createDraft(business.id);
    await caller.marketing.sendCampaign({ id: draft.id });

    await caller.marketing.cancelCampaign({ id: draft.id });

    const campaign = await db.marketingCampaign.findUniqueOrThrow({
      where: { id: draft.id },
    });
    expect(campaign.status).toBe("CANCELED");
    expect(campaign.canceledAt).not.toBeNull();
    const batches = await db.marketingCampaignBatch.findMany({
      where: { campaignId: draft.id },
    });
    expect(batches.every((b) => b.status === "CANCELED")).toBe(true);
    expect(
      await db.marketingCampaignRecipient.count({
        where: { campaignId: draft.id, status: { not: "CANCELED" } },
      }),
    ).toBe(0);

    // Canceling twice (or canceling a draft) is a state error.
    await expect(
      caller.marketing.cancelCampaign({ id: draft.id }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("lists campaigns with per-status counts and reports batch progress", async () => {
    const { business, caller } = await storeA();
    await seedSubscribers(business.id, 3);
    const draft = await createDraft(business.id, "Counted");
    await caller.marketing.sendCampaign({ id: draft.id });
    const rows = await db.marketingCampaignRecipient.findMany({
      where: { campaignId: draft.id },
      orderBy: { id: "asc" },
    });
    await db.marketingCampaignRecipient.update({
      where: { id: rows[0]!.id },
      data: { status: "DELIVERED", unsubscribedAt: new Date() },
    });
    await db.marketingCampaignRecipient.update({
      where: { id: rows[1]!.id },
      data: { status: "BOUNCED" },
    });
    await db.marketingCampaignBatch.updateMany({
      where: { campaignId: draft.id },
      data: { status: "SENT" },
    });
    await createDraft(business.id, "Still a draft");

    const list = await caller.marketing.listCampaigns({ limit: 1 });
    expect(list.campaigns).toHaveLength(1);
    expect(list.nextCursor).not.toBeNull();
    const page2 = await caller.marketing.listCampaigns({
      limit: 1,
      cursor: list.nextCursor!,
    });
    expect(page2.nextCursor).toBeNull();
    const counted = [...list.campaigns, ...page2.campaigns].find(
      (c) => c.id === draft.id,
    )!;
    expect(counted.createdByName).toBeNull(); // seeded without a creator
    expect(counted.counts.byStatus).toMatchObject({
      DELIVERED: 1,
      BOUNCED: 1,
      PENDING: 1,
    });
    expect(counted.counts.accepted).toBe(2);
    expect(counted.counts.unsubscribed).toBe(1);

    const detail = await caller.marketing.getCampaign({ id: draft.id });
    expect(detail.batches).toEqual({
      total: 1,
      sent: 1,
      failed: 0,
      canceled: 0,
    });
    const bounced = await caller.marketing.listCampaignRecipients({
      id: draft.id,
      status: "BOUNCED",
    });
    expect(bounced.recipients.map((r) => r.id)).toEqual([rows[1]!.id]);
  });

  it("sends a [TEST] copy to the signed-in user with a placeholder unsubscribe link", async () => {
    const { business, owner, caller } = await storeA();
    const draft = await createDraft(business.id);

    const result = await caller.marketing.sendTest({ id: draft.id });

    expect(result).toEqual({ sent: true, to: owner.email });
    expect(resendMocks.sendResendEmail).toHaveBeenCalledTimes(1);
    const [payload] = resendMocks.sendResendEmail.mock.calls[0] as [
      {
        to: string[];
        subject: string;
        from: string;
        headers: Record<string, string>;
        tags: Array<{ name: string; value: string }>;
      },
    ];
    expect(payload.to).toEqual([owner.email]);
    expect(payload.subject).toBe("[TEST] Spring sale");
    expect(payload.from).toBe(
      `"Bloom & Co via SimplePress" <noreply@test.dev>`,
    );
    expect(payload.headers["List-Unsubscribe"]).toBe(
      "<https://mkt-a.simplepress.test/api/unsubscribe?t=test>",
    );
    expect(payload.tags).toContainEqual({
      name: "category",
      value: "marketing_test",
    });
    // A test send never touches campaign state.
    expect(
      (
        await db.marketingCampaign.findUniqueOrThrow({
          where: { id: draft.id },
        })
      ).status,
    ).toBe("DRAFT");
  });

  describe("rich-text (tiptap) campaigns", () => {
    const richDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Rich hello <b>friends</b>" }],
        },
      ],
    };

    it("saves a tiptap draft, keeping only the document", async () => {
      const { caller } = await storeA();
      const { id } = await caller.marketing.saveDraft({
        subject: "Rich",
        contentFormat: "tiptap",
        bodyText: "ignored",
        bodyJson: richDoc,
      });
      const saved = await db.marketingCampaign.findUniqueOrThrow({
        where: { id },
      });
      expect(saved.contentFormat).toBe("tiptap");
      expect(saved.bodyText).toBeNull();
      expect(saved.bodyJson).toEqual(richDoc);
    });

    it("rejects a body that isn't a doc or is too large", async () => {
      const { caller } = await storeA();
      await expect(
        caller.marketing.saveDraft({
          subject: "Bad",
          contentFormat: "tiptap",
          bodyJson: { type: "paragraph" },
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        caller.marketing.saveDraft({
          subject: "Huge",
          contentFormat: "tiptap",
          bodyJson: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "x".repeat(210_000) }],
              },
            ],
          },
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("sends a [TEST] email with the rendered, escaped body and no placeholder", async () => {
      const { caller } = await storeA();
      const { id } = await caller.marketing.saveDraft({
        subject: "Rich",
        contentFormat: "tiptap",
        bodyJson: richDoc,
      });

      const result = await caller.marketing.sendTest({ id });
      expect(result.sent).toBe(true);
      const [payload] = resendMocks.sendResendEmail.mock.calls[0] as [
        { react: ReactElement },
      ];
      // The Resend SDK renders `react`; do the same to inspect the bytes.
      const html = await render(payload.react);
      const text = await render(payload.react, { plainText: true });
      expect(html).toContain("Rich hello &lt;b&gt;friends&lt;/b&gt;");
      expect(html).not.toContain("<b>friends</b>");
      expect(html).not.toContain("__SP_UNSUBSCRIBE_URL__");
      expect(html).toContain("/api/unsubscribe?t=test");
      expect(text).not.toContain("__SP_UNSUBSCRIBE_URL__");
    });

    it("freezes the rendered tiptap body when queued", async () => {
      const { business, caller } = await storeA();
      await seedSubscribers(business.id, 2);
      const { id } = await caller.marketing.saveDraft({
        subject: "Rich",
        contentFormat: "tiptap",
        bodyJson: richDoc,
      });

      await caller.marketing.sendCampaign({ id });
      const queued = await db.marketingCampaign.findUniqueOrThrow({
        where: { id },
      });
      expect(queued.status).toBe("QUEUED");
      expect(queued.renderedHtml).toContain(
        "Rich hello &lt;b&gt;friends&lt;/b&gt;",
      );
      expect(queued.renderedHtml?.split("__SP_UNSUBSCRIBE_URL__")).toHaveLength(
        2,
      );
      expect(queued.renderedText).toContain("Rich hello <b>friends</b>");
      expect(queued.renderedText).not.toContain("__SP_BODY_TEXT__");
    });

    it("refuses to send an empty tiptap campaign", async () => {
      const { business, caller } = await storeA();
      await seedSubscribers(business.id, 2);
      const { id } = await caller.marketing.saveDraft({
        subject: "Empty",
        contentFormat: "tiptap",
        bodyJson: {
          type: "doc",
          content: [{ type: "paragraph", content: [] }],
        },
      });
      await expect(caller.marketing.sendCampaign({ id })).rejects.toMatchObject(
        {
          code: "BAD_REQUEST",
          message: expect.stringContaining("Write a message") as unknown,
        },
      );
      expect(
        (await db.marketingCampaign.findUniqueOrThrow({ where: { id } }))
          .status,
      ).toBe("DRAFT");
    });
  });

  it("returns NOT_FOUND for another business's campaign", async () => {
    const a = await createMarketingStore("mkt-a");
    await seedSubscribers(a.business.id, 2);
    const foreign = await createDraft(a.business.id);

    const other = await createMarketingStore("mkt-b");
    reqHost.value = other.host;
    const caller = createTestCaller({
      userId: other.owner.id,
      email: other.owner.email,
    });

    const id = foreign.id;
    for (const call of [
      () => caller.marketing.getCampaign({ id }),
      () => caller.marketing.listCampaignRecipients({ id }),
      () => caller.marketing.saveDraft({ id, subject: "Hijack" }),
      () => caller.marketing.deleteDraft({ id }),
      () => caller.marketing.sendTest({ id }),
      () => caller.marketing.sendCampaign({ id }),
      () => caller.marketing.cancelCampaign({ id }),
    ]) {
      await expect(call()).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
    expect((await caller.marketing.listCampaigns({})).campaigns).toEqual([]);
    expect(
      (await db.marketingCampaign.findUniqueOrThrow({ where: { id } })).status,
    ).toBe("DRAFT");
  });

  it("forbids STAFF from every campaign procedure", async () => {
    const { business } = await storeA();
    const draft = await createDraft(business.id);
    const staff = await createUser();
    await createMembership(business.id, staff.id, "STAFF");
    const caller = createTestCaller({ userId: staff.id, email: staff.email });

    const id = draft.id;
    for (const call of [
      () => caller.marketing.listCampaigns({}),
      () => caller.marketing.getCampaign({ id }),
      () => caller.marketing.saveDraft({ subject: "Nope" }),
      () => caller.marketing.sendCampaign({ id }),
      () => caller.marketing.cancelCampaign({ id }),
    ]) {
      await expect(call()).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("gates mutations on the emailMarketing flag but keeps history readable", async () => {
    const { business, caller } = await storeA({ flag: false });
    const draft = await createDraft(business.id);

    for (const call of [
      () => caller.marketing.saveDraft({ subject: "Off" }),
      () => caller.marketing.sendTest({ id: draft.id }),
      () => caller.marketing.sendCampaign({ id: draft.id }),
      () => caller.marketing.deleteDraft({ id: draft.id }),
    ]) {
      await expect(call()).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect((await caller.marketing.listCampaigns({})).campaigns).toHaveLength(
      1,
    );
  });

  it("lets the owner cancel a queued campaign while the flag is off", async () => {
    const { business, caller } = await storeA();
    await seedSubscribers(business.id, 3);
    const draft = await createDraft(business.id);
    await caller.marketing.sendCampaign({ id: draft.id });
    await db.business.update({
      where: { id: business.id },
      data: { featureFlags: { emailMarketing: false } },
    });

    await caller.marketing.cancelCampaign({ id: draft.id });

    const campaign = await db.marketingCampaign.findUniqueOrThrow({
      where: { id: draft.id },
    });
    expect(campaign.status).toBe("CANCELED");
    expect(
      (
        await db.marketingCampaignBatch.findMany({
          where: { campaignId: draft.id },
        })
      ).every((b) => b.status === "CANCELED"),
    ).toBe(true);
  });

  it("rejects control characters in the subject and preview text", async () => {
    const { caller } = await storeA();
    for (const input of [
      { subject: "Hello\r\nBcc: victim@test.dev" },
      { subject: "Bell\u0007" },
      { subject: "Fine", previewText: "Line\nbreak" },
      { subject: "Fine", previewText: "Del\u007f" },
    ]) {
      await expect(
        caller.marketing.saveDraft({ ...input, bodyText: "x" }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: expect.stringContaining("control characters") as unknown,
      });
    }
    expect(await db.marketingCampaign.count()).toBe(0);
    // Leading / trailing whitespace is still just trimmed.
    await expect(
      caller.marketing.saveDraft({ subject: "  Tabs ok\t ", bodyText: "x" }),
    ).resolves.toMatchObject({ id: expect.any(String) as unknown });
  });
});
