import type * as NextServer from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as ResendModule from "~/lib/email/resend";
import type { ResendBatchEmail } from "~/lib/email/resend";
import type * as RateLimitModule from "~/lib/rate-limit";
import {
  createNewsletterConfirmToken,
  IMPORT_INVITE_TOKEN_TTL_MS,
  verifyNewsletterConfirmToken,
} from "~/lib/email/newsletter-confirm-token";
import { verifyUnsubscribeToken } from "~/lib/email/unsubscribe-token";
import { drainCampaign } from "~/lib/marketing/campaign-worker";
import { REPERMISSION_CONSENT_WORDING } from "~/lib/marketing/consent-wording";
import {
  addToDoNotEmail,
  isOnDoNotEmailList,
} from "~/lib/marketing/do-not-email";
import { CONFIRM_TOKEN_PLACEHOLDER } from "~/lib/marketing/render-campaign";
import {
  queueRepermissionInvite,
  repermissionInviteAudienceCount,
} from "~/lib/marketing/repermission-invite";
import { applyUnsubscribe } from "~/lib/marketing/unsubscribe";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  apiError,
  createDraft,
  createMarketingStore,
  fakeClock,
  fakeSend,
  noWaitThrottle,
} from "../helpers/marketing";

/**
 * A contact import's one-time re-permission invite
 * (`src/lib/marketing/repermission-invite.ts`): who it reaches (queue snapshot
 * + the worker's first-claim re-check, do-not-email included), one invite per
 * import, the postal-address gate, the per-recipient confirm link and its
 * byte-identical retry, `newsletter.confirm` with an `s: "imp"` token (opts
 * in as IMPORT_CONFIRM, never lifts a block), unsubscribing from the invite,
 * and the composer endpoints refusing an invite.
 */
const reqHost = vi.hoisted(() => ({ value: "rp-a.simplepress.test" }));
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

// Nothing here may reach the network.
vi.mock("~/lib/email/resend", async (importOriginal) => {
  const actual = await importOriginal<typeof ResendModule>();
  return {
    ...actual,
    sendResendBatch: () => Promise.reject(new Error("network disabled")),
    sendResendEmail: () => Promise.reject(new Error("network disabled")),
  };
});

vi.mock("~/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof RateLimitModule>();
  return {
    ...actual,
    newsletterConsentActionLimiter: { consume: () => Promise.resolve() },
  };
});

const ATTESTATION =
  "The owner confirmed these people subscribed to their emails on their previous site";

async function setup(opts: { address?: boolean } = {}) {
  const store = await createMarketingStore("rp-a", opts);
  reqHost.value = store.host;
  const imported = await db.customerImport.create({
    data: {
      businessId: store.business.id,
      createdById: store.owner.id,
      fileName: "contacts.csv",
      sourceKind: "WIX",
    },
  });
  return { ...store, importId: imported.id };
}

/**
 * A customer row as a contact import would have created it: by default one
 * the old site marked subscribed (the only kind the invite may reach).
 */
function imported(
  businessId: string,
  importId: string | null,
  email: string,
  data: Record<string, unknown> = {},
) {
  return db.customer.create({
    data: {
      businessId,
      importId,
      importStatus: importId ? "subscribed" : null,
      email,
      acceptsMarketing: false,
      ...data,
    },
  });
}

function invite(
  store: { business: { id: string }; owner: { id: string } },
  importId: string,
  extra: { subject?: string; note?: string; now?: Date } = {},
) {
  return queueRepermissionInvite(db, {
    businessId: store.business.id,
    importId,
    createdById: store.owner.id,
    attestationWording: ATTESTATION,
    ...extra,
  });
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

/** The confirm token in an invite email (asserting html + text agree). */
function confirmTokenOf(email: ResendBatchEmail): string {
  const html = /view=confirm&amp;t=([A-Za-z0-9_.-]+)"/.exec(String(email.html));
  const text = /view=confirm&t=([A-Za-z0-9_.-]+)/.exec(String(email.text));
  expect(html?.[1]).toBeTruthy();
  expect(text?.[1]).toBe(html?.[1]);
  return html![1]!;
}

function unsubscribeTokenOf(email: ResendBatchEmail): string {
  const header = email.headers?.["List-Unsubscribe"] ?? "";
  const t = /[?&]t=([^>&]+)/.exec(header)?.[1];
  expect(t).toBeTruthy();
  return decodeURIComponent(t!);
}

describe("re-permission invite", () => {
  beforeEach(async () => {
    await resetDb();
    afterCallbacks.length = 0;
  });

  it("snapshots only the import's not-opted-in, unblocked rows, and stamps the attestation", async () => {
    const store = await setup();
    const b = store.business.id;
    const keep1 = await imported(b, store.importId, "keep1@test.dev");
    const keep2 = await imported(b, store.importId, "keep2@test.dev");
    await imported(b, store.importId, "optedin@test.dev", {
      acceptsMarketing: true,
    });
    await imported(b, store.importId, "bounced@test.dev", {
      marketingSuppressedAt: new Date(),
      marketingSuppressionReason: "HARD_BOUNCE",
    });
    await imported(b, store.importId, "unsub@test.dev", {
      marketingUnsubscribedAt: new Date(),
    });
    await imported(b, store.importId, "gone@test.dev", {
      anonymizedAt: new Date(),
    });
    await imported(b, store.importId, "listed@test.dev");
    await db.$transaction((tx) =>
      addToDoNotEmail(tx, b, "listed@test.dev", "COMPLAINT"),
    );
    // Imported, but the old site never said they subscribed: never invited.
    await imported(b, store.importId, "unknown@test.dev", {
      importStatus: "unknown",
    });
    // Not created by this import: an existing customer, another import.
    await imported(b, null, "existing@test.dev");
    const otherImport = await db.customerImport.create({
      data: { businessId: b, fileName: "other.csv" },
    });
    await imported(b, otherImport.id, "other-import@test.dev");

    expect(await repermissionInviteAudienceCount(db, b, store.importId)).toBe(
      2,
    );

    const result = await invite(store, store.importId, {
      note: "We missed you!",
    });
    expect(result).toMatchObject({ ok: true, recipientCount: 2 });
    if (!result.ok) return;

    const recipients = await db.marketingCampaignRecipient.findMany({
      where: { campaignId: result.campaignId },
      orderBy: { email: "asc" },
    });
    expect(recipients.map((r) => r.customerId)).toEqual([keep1.id, keep2.id]);

    const campaign = await db.marketingCampaign.findUniqueOrThrow({
      where: { id: result.campaignId },
    });
    expect(campaign).toMatchObject({
      kind: "REPERMISSION",
      importId: store.importId,
      status: "QUEUED",
      subject: "Still want to hear from Bloom & Co?",
      audience: null,
    });
    expect(campaign.renderedHtml).toContain(CONFIRM_TOKEN_PLACEHOLDER);
    expect(campaign.renderedText).toContain(CONFIRM_TOKEN_PLACEHOLDER);
    expect(campaign.renderedHtml).toContain("We missed you!");
    expect(campaign.renderedHtml).toContain("1 Main St");

    const importRow = await db.customerImport.findUniqueOrThrow({
      where: { id: store.importId },
    });
    expect(importRow).toMatchObject({
      attestationWording: ATTESTATION,
      attestedById: store.owner.id,
    });
    expect(importRow.attestedAt).not.toBeNull();
  });

  it("allows one invite per import, ever", async () => {
    const store = await setup();
    await imported(store.business.id, store.importId, "a@test.dev");

    const first = await invite(store, store.importId);
    expect(first.ok).toBe(true);
    expect(await invite(store, store.importId)).toEqual({
      ok: false,
      reason: "already_invited",
    });

    // Canceled still counts as used.
    await db.marketingCampaign.updateMany({
      where: { importId: store.importId },
      data: { status: "CANCELED" },
    });
    expect(await invite(store, store.importId)).toEqual({
      ok: false,
      reason: "already_invited",
    });
    expect(
      await db.marketingCampaign.count({ where: { importId: store.importId } }),
    ).toBe(1);
  });

  it("lets exactly one of two concurrent invites through (unique importId)", async () => {
    const store = await setup();
    await imported(store.business.id, store.importId, "a@test.dev");

    const results = await Promise.all([
      invite(store, store.importId),
      invite(store, store.importId),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({
      reason: "already_invited",
    });
    expect(
      await db.marketingCampaign.count({ where: { importId: store.importId } }),
    ).toBe(1);
  });

  it("replaces a leftover DRAFT invite that never queued", async () => {
    const store = await setup();
    await imported(store.business.id, store.importId, "a@test.dev");
    const orphan = await db.marketingCampaign.create({
      data: {
        businessId: store.business.id,
        kind: "REPERMISSION",
        importId: store.importId,
        subject: "Orphan",
      },
    });

    const result = await invite(store, store.importId);
    expect(result).toMatchObject({ ok: true, recipientCount: 1 });
    expect(
      await db.marketingCampaign.findUnique({ where: { id: orphan.id } }),
    ).toBeNull();
  });

  it("refuses without a postal address, an import of another store, or nobody to invite — writing nothing", async () => {
    const noAddress = await setup({ address: false });
    await imported(noAddress.business.id, noAddress.importId, "a@test.dev");
    expect(await invite(noAddress, noAddress.importId)).toEqual({
      ok: false,
      reason: "no_postal_address",
    });
    expect(await db.marketingCampaign.count()).toBe(0);
    expect(
      (
        await db.customerImport.findUniqueOrThrow({
          where: { id: noAddress.importId },
        })
      ).attestedAt,
    ).toBeNull();

    const flagOff = await createMarketingStore("rp-off", { flag: false });
    const offImport = await db.customerImport.create({
      data: { businessId: flagOff.business.id, fileName: "off.csv" },
    });
    await imported(flagOff.business.id, offImport.id, "b@test.dev");
    expect(await invite(flagOff, offImport.id)).toEqual({
      ok: false,
      reason: "marketing_off",
    });

    const other = await createMarketingStore("rp-other");
    expect(await invite(other, noAddress.importId)).toEqual({
      ok: false,
      reason: "import_not_found",
    });

    const empty = await db.customerImport.create({
      data: { businessId: other.business.id, fileName: "empty.csv" },
    });
    expect(await invite(other, empty.id)).toEqual({
      ok: false,
      reason: "no_recipients",
    });
    expect(await db.marketingCampaign.count()).toBe(0);
  });

  it("skips recipients who unsubscribed, were suppressed or landed on the do-not-email list after queueing", async () => {
    const store = await setup();
    const b = store.business.id;
    const unsub = await imported(b, store.importId, "unsub@test.dev");
    await imported(b, store.importId, "listed@test.dev");
    const bounced = await imported(b, store.importId, "bounced@test.dev");
    const joined = await imported(b, store.importId, "joined@test.dev");
    const keep = await imported(b, store.importId, "keep@test.dev");

    const result = await invite(store, store.importId);
    expect(result).toMatchObject({ ok: true, recipientCount: 5 });
    if (!result.ok) return;

    // Between queue and send.
    await db.customer.update({
      where: { id: unsub.id },
      data: { marketingUnsubscribedAt: new Date() },
    });
    await db.$transaction((tx) =>
      addToDoNotEmail(tx, b, "listed@test.dev", "UNSUBSCRIBED"),
    );
    await db.customer.update({
      where: { id: bounced.id },
      data: {
        marketingSuppressedAt: new Date(),
        marketingSuppressionReason: "HARD_BOUNCE",
      },
    });
    // Joined the list some other way meanwhile: no invite needed.
    await db.customer.update({
      where: { id: joined.id },
      data: { acceptsMarketing: true },
    });

    const send = fakeSend();
    expect(await drain(result.campaignId, send)).toEqual({
      batchesSent: 1,
      stopped: "finished",
    });
    expect(send.calls[0]!.emails.map((e) => e.to)).toEqual([[keep.email]]);

    const rows = await db.marketingCampaignRecipient.findMany({
      where: { campaignId: result.campaignId },
    });
    const byEmail = Object.fromEntries(rows.map((r) => [r.email, r]));
    expect(byEmail["keep@test.dev"]!.status).toBe("SENT");
    for (const email of [
      "unsub@test.dev",
      "listed@test.dev",
      "bounced@test.dev",
      "joined@test.dev",
    ]) {
      expect(byEmail[email]!.status).toBe("SKIPPED");
    }
    expect(byEmail["listed@test.dev"]!.error).toMatch(/do-not-email/);
  });

  it("gives each recipient their own confirm link + unsubscribe headers, identical across a retry", async () => {
    const store = await setup();
    const b = store.business.id;
    await imported(b, store.importId, "pat@test.dev");
    await imported(b, store.importId, "sam@test.dev");
    const queuedAt = new Date("2026-10-26T15:00:00Z");
    const result = await invite(store, store.importId, { now: queuedAt });
    if (!result.ok) throw new Error(result.reason);

    const clock = fakeClock(queuedAt);
    const timedOut = fakeSend(() =>
      apiError("application_error", null, { timedOut: true }),
    );
    await drain(result.campaignId, timedOut, clock);
    clock.advance(5 * 60_000 + 1);
    const retry = fakeSend();
    expect(await drain(result.campaignId, retry, clock)).toEqual({
      batchesSent: 1,
      stopped: "finished",
    });
    expect(retry.calls[0]!.idempotencyKey).toBe(`mkt:${result.campaignId}:0`);
    expect(retry.calls[0]!.emails).toEqual(timedOut.calls[0]!.emails);

    const emails = retry.calls[0]!.emails;
    const tokens = emails.map(confirmTokenOf);
    expect(new Set(tokens).size).toBe(2);
    emails.forEach((email, i) => {
      expect(email.html).not.toContain(CONFIRM_TOKEN_PLACEHOLDER);
      expect(email.text).not.toContain(CONFIRM_TOKEN_PLACEHOLDER);
      expect(email.html).toContain(
        `${store.business.subdomain}.`, // the store's own URL
      );
      expect(email.headers).toMatchObject({
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      });
      const verified = verifyNewsletterConfirmToken(tokens[i]!, queuedAt);
      expect(verified).toMatchObject({
        ok: true,
        payload: {
          b,
          e: email.to[0],
          s: "imp",
          iat: queuedAt.getTime(),
          exp: queuedAt.getTime() + IMPORT_INVITE_TOKEN_TTL_MS,
        },
      });
      expect(verifyUnsubscribeToken(unsubscribeTokenOf(email))).toMatchObject({
        businessId: b,
      });
    });
  });

  describe("confirm with an invite token", () => {
    async function sentInvite(
      emails: string[],
      prepare?: (b: string) => Promise<void>,
    ) {
      const store = await setup();
      const b = store.business.id;
      for (const e of emails) await imported(b, store.importId, e);
      const result = await invite(store, store.importId);
      if (!result.ok) throw new Error(result.reason);
      await prepare?.(b);
      const send = fakeSend();
      await drain(result.campaignId, send);
      const sent = send.calls.flatMap((c) => c.emails);
      return { store, b, campaignId: result.campaignId, sent };
    }

    const confirm = (token: string) =>
      createTestCaller({}).newsletter.confirm({ token });

    it("opts in as IMPORT_CONFIRM and logs OPT_IN with the invite wording", async () => {
      const { b, sent } = await sentInvite(["pat@test.dev"]);
      expect(await confirm(confirmTokenOf(sent[0]!))).toEqual({ ok: true });

      const customer = await db.customer.findFirstOrThrow({
        where: { businessId: b, email: "pat@test.dev" },
      });
      expect(customer).toMatchObject({
        acceptsMarketing: true,
        marketingConsentSource: "IMPORT_CONFIRM",
      });
      expect(customer.marketingConsentAt).not.toBeNull();
      const events = await db.marketingConsentEvent.findMany({
        where: { customerId: customer.id },
      });
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: "OPT_IN",
        source: "IMPORT_CONFIRM",
        wording: REPERMISSION_CONSENT_WORDING,
      });
    });

    it("never lifts a complaint, bounce or provider suppression on the customer", async () => {
      for (const reason of [
        "COMPLAINT",
        "HARD_BOUNCE",
        "PROVIDER_SUPPRESSED",
      ]) {
        await resetDb();
        const { b, sent } = await sentInvite(["pat@test.dev"]);
        const suppressedAt = new Date();
        await db.customer.updateMany({
          where: { businessId: b, email: "pat@test.dev" },
          data: {
            marketingSuppressedAt: suppressedAt,
            marketingSuppressionReason: reason,
          },
        });
        expect(await confirm(confirmTokenOf(sent[0]!))).toEqual({
          ok: false,
          reason: "suppressed",
        });
        const customer = await db.customer.findFirstOrThrow({
          where: { businessId: b, email: "pat@test.dev" },
        });
        expect(customer).toMatchObject({
          acceptsMarketing: false,
          marketingSuppressedAt: suppressedAt,
          marketingSuppressionReason: reason,
          marketingConsentSource: null,
        });
        expect(await db.marketingConsentEvent.count()).toBe(0);
      }
    });

    it("never lifts a do-not-email entry of any reason (complaint included)", async () => {
      for (const reason of [
        "COMPLAINT",
        "HARD_BOUNCE",
        "UNSUBSCRIBED",
      ] as const) {
        await resetDb();
        const { b, sent } = await sentInvite(["pat@test.dev"]);
        await db.$transaction((tx) =>
          addToDoNotEmail(tx, b, "pat@test.dev", reason),
        );
        expect(await confirm(confirmTokenOf(sent[0]!))).toEqual({
          ok: false,
          reason: "suppressed",
        });
        expect(await isOnDoNotEmailList(db, b, "pat@test.dev")).toEqual({
          reason,
        });
        const customer = await db.customer.findFirstOrThrow({
          where: { businessId: b, email: "pat@test.dev" },
        });
        expect(customer.acceptsMarketing).toBe(false);
      }
    });

    it("refuses to create a missing customer whose address is on the do-not-email list, else creates it", async () => {
      const store = await setup();
      const b = store.business.id;
      const mint = (email: string) =>
        createNewsletterConfirmToken({
          businessId: b,
          email,
          source: "imp",
          ttlMs: IMPORT_INVITE_TOKEN_TTL_MS,
        });
      await db.$transaction((tx) =>
        addToDoNotEmail(tx, b, "blocked@test.dev", "COMPLAINT"),
      );
      expect(await confirm(mint("blocked@test.dev"))).toEqual({
        ok: false,
        reason: "suppressed",
      });
      expect(
        await db.customer.count({ where: { email: "blocked@test.dev" } }),
      ).toBe(0);

      expect(await confirm(mint("fresh@test.dev"))).toEqual({ ok: true });
      expect(
        await db.customer.findFirstOrThrow({
          where: { businessId: b, email: "fresh@test.dev" },
        }),
      ).toMatchObject({
        acceptsMarketing: true,
        marketingConsentSource: "IMPORT_CONFIRM",
      });
    });

    it("unsubscribing from the invite blocks the address, drops it from the audience, and makes the confirm link stale", async () => {
      const { b, campaignId, store, sent } = await sentInvite(["pat@test.dev"]);
      const email = sent[0]!;

      const result = await applyUnsubscribe(unsubscribeTokenOf(email), {
        source: "ONE_CLICK",
      });
      expect(result).toMatchObject({ ok: true, changed: true });
      expect(await isOnDoNotEmailList(db, b, "pat@test.dev")).toEqual({
        reason: "UNSUBSCRIBED",
      });
      const customer = await db.customer.findFirstOrThrow({
        where: { businessId: b, email: "pat@test.dev" },
      });
      expect(customer.marketingUnsubscribedAt).not.toBeNull();
      expect(
        await db.marketingConsentEvent.findFirst({
          where: { customerId: customer.id },
        }),
      ).toMatchObject({ type: "OPT_OUT", source: "ONE_CLICK", campaignId });
      expect(
        (
          await db.marketingCampaignRecipient.findFirstOrThrow({
            where: { campaignId },
          })
        ).unsubscribedAt,
      ).not.toBeNull();
      expect(await repermissionInviteAudienceCount(db, b, store.importId)).toBe(
        0,
      );

      // The link in the invite no longer opts them in.
      expect((await confirm(confirmTokenOf(email))).ok).toBe(false);
      expect(
        (await db.customer.findUniqueOrThrow({ where: { id: customer.id } }))
          .acceptsMarketing,
      ).toBe(false);
    });
  });

  describe("composer endpoints refuse an invite", () => {
    it("blocks edit, delete, duplicate, test send, send and schedule; allows cancel; lists the kind", async () => {
      const store = await setup();
      const caller = createTestCaller({
        userId: store.owner.id,
        email: store.owner.email,
      });
      const draftInvite = await db.marketingCampaign.create({
        data: {
          businessId: store.business.id,
          kind: "REPERMISSION",
          importId: store.importId,
          subject: "Still want to hear from us?",
          contentFormat: "text",
          bodyText: "Hello",
        },
      });
      const id = draftInvite.id;
      const refusal = /one-time invite sent to an imported contact list/;

      await expect(
        caller.marketing.saveDraft({ id, subject: "Edited", bodyText: "x" }),
      ).rejects.toThrow(refusal);
      await expect(caller.marketing.deleteDraft({ id })).rejects.toThrow(
        refusal,
      );
      await expect(caller.marketing.duplicateCampaign({ id })).rejects.toThrow(
        refusal,
      );
      await expect(caller.marketing.sendTest({ id })).rejects.toThrow(refusal);
      await expect(caller.marketing.sendCampaign({ id })).rejects.toThrow(
        refusal,
      );
      await expect(
        caller.marketing.scheduleCampaign({
          id,
          scheduledAt: new Date(Date.now() + 60 * 60_000),
        }),
      ).rejects.toThrow(refusal);

      const unchanged = await db.marketingCampaign.findUniqueOrThrow({
        where: { id },
      });
      expect(unchanged).toMatchObject({
        status: "DRAFT",
        subject: draftInvite.subject,
      });
      expect(await db.marketingCampaign.count()).toBe(1);

      // A standard draft is unaffected by the new guards.
      const standard = await createDraft(store.business.id);
      await expect(
        caller.marketing.saveDraft({
          id: standard.id,
          subject: "Edited",
          bodyText: "x",
        }),
      ).resolves.toEqual({ id: standard.id });

      const listed = await caller.marketing.listCampaigns({});
      expect(
        Object.fromEntries(listed.campaigns.map((c) => [c.id, c.kind])),
      ).toEqual({ [id]: "REPERMISSION", [standard.id]: "STANDARD" });

      // A queued invite can still be stopped.
      await db.marketingCampaign.update({
        where: { id },
        data: { status: "QUEUED" },
      });
      await expect(caller.marketing.cancelCampaign({ id })).resolves.toEqual({
        id,
      });
    });
  });
});
