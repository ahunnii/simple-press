import { createHmac, randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as EnvModule from "~/env";
import { POST } from "~/app/api/webhooks/resend/route";

import { db, resetDb } from "../helpers/db";
import { createBusiness, createCustomer } from "../helpers/factories";

/**
 * Drives the real Resend webhook route (`src/app/api/webhooks/resend/route.ts`)
 * end to end: real Svix signature verification through the SDK's
 * `resend.webhooks.verify` (no network — it is a local HMAC check), real
 * `applyResendEvent`, real Postgres.
 *
 * Payloads are signed here exactly as Svix signs them: HMAC-SHA256 over
 * `${svix-id}.${svix-timestamp}.${body}`, keyed with the base64-decoded secret
 * after the `whsec_` prefix, sent as `svix-signature: v1,<base64>`.
 *
 * `env` is captured at import time by @t3-oss/env, so the secret is served
 * through a mutable stand-in to cover the "not configured" branch.
 */

const SECRET = `whsec_${randomBytes(24).toString("base64")}`;

const envState = vi.hoisted(() => ({
  secret: undefined as string | undefined,
}));
vi.mock("~/env", async (importOriginal) => {
  const actual = await importOriginal<typeof EnvModule>();
  return {
    env: new Proxy(actual.env, {
      get(target, key, receiver) {
        if (key === "RESEND_WEBHOOK_SECRET") return envState.secret;
        return Reflect.get(target, key, receiver) as unknown;
      },
    }),
  };
});

function sign(body: string, id: string, timestamp: string, secret = SECRET) {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const sig = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  return `v1,${sig}`;
}

let msgCounter = 0;

async function postEvent(
  event: unknown,
  opts: { signature?: string; secret?: string } = {},
): Promise<Response> {
  const body = JSON.stringify(event);
  const id = `msg_test_${++msgCounter}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const req = new Request("https://simplepress.test/api/webhooks/resend", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature":
        opts.signature ?? sign(body, id, timestamp, opts.secret ?? SECRET),
    },
    body,
  });
  return POST(req);
}

const MARKETING_TAGS = {
  category: "marketing_broadcast",
  campaign: "camp",
  business: "biz",
};

function resendEvent(
  type: string,
  emailId: string,
  extra: Record<string, unknown> = {},
  tags: unknown = MARKETING_TAGS,
) {
  return {
    type,
    created_at: new Date().toISOString(),
    data: {
      created_at: new Date().toISOString(),
      email_id: emailId,
      from: "Store <news@test.dev>",
      to: ["shopper@test.dev"],
      subject: "October news",
      tags,
      ...extra,
    },
  };
}

/**
 * `stored: false` models the window before the worker's `completeBatch`
 * commit: the row is still SENDING with no `resendId`.
 */
async function setupRecipient(
  opts: { status?: string; stored?: boolean } = {},
) {
  const stored = opts.stored ?? true;
  const business = await createBusiness({
    featureFlags: { emailMarketing: true },
  });
  const created = await createCustomer(business.id, {
    email: "shopper@test.dev",
  });
  const customer = await db.customer.update({
    where: { id: created.id },
    data: {
      acceptsMarketing: true,
      marketingConsentAt: new Date("2026-01-01T00:00:00.000Z"),
      marketingConsentSource: "CHECKOUT",
    },
  });
  const campaign = await db.marketingCampaign.create({
    data: {
      businessId: business.id,
      subject: "October news",
      status: "SENT",
      recipientCount: 1,
    },
  });
  const resendId = `re_${randomBytes(8).toString("hex")}`;
  const recipient = await db.marketingCampaignRecipient.create({
    data: {
      campaignId: campaign.id,
      businessId: business.id,
      customerId: customer.id,
      email: customer.email,
      batchIndex: 0,
      status: opts.status ?? (stored ? "SENT" : "SENDING"),
      resendId: stored ? resendId : null,
      sentAt: stored ? new Date() : null,
    },
  });
  return { business, customer, campaign, recipient, resendId };
}

const readRecipient = (id: string) =>
  db.marketingCampaignRecipient.findUniqueOrThrow({ where: { id } });
const readCustomer = (id: string) =>
  db.customer.findUniqueOrThrow({ where: { id } });

describe("POST /api/webhooks/resend", () => {
  beforeEach(async () => {
    await resetDb();
    envState.secret = SECRET;
  });

  it("answers 401 when RESEND_WEBHOOK_SECRET is not set", async () => {
    envState.secret = undefined;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { recipient, resendId } = await setupRecipient();

    const res = await postEvent(resendEvent("email.delivered", resendId));

    expect(res.status).toBe(401);
    expect((await readRecipient(recipient.id)).status).toBe("SENT");
    warn.mockRestore();
  });

  it("answers 400 on a bad signature and changes nothing", async () => {
    const { recipient, resendId } = await setupRecipient();

    const wrongSecret = `whsec_${randomBytes(24).toString("base64")}`;
    const res = await postEvent(resendEvent("email.delivered", resendId), {
      secret: wrongSecret,
    });
    expect(res.status).toBe(400);

    const garbled = await postEvent(resendEvent("email.delivered", resendId), {
      signature: "v1,not-a-signature",
    });
    expect(garbled.status).toBe(400);

    expect((await readRecipient(recipient.id)).status).toBe("SENT");
  });

  it("skips a non-marketing event with 200 and no DB change", async () => {
    const { recipient, customer, resendId } = await setupRecipient();

    const res = await postEvent(
      resendEvent(
        "email.bounced",
        resendId,
        { bounce: { type: "Permanent", subType: "General", message: "gone" } },
        { category: "order_confirmation" },
      ),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const r = await readRecipient(recipient.id);
    expect(r.status).toBe("SENT");
    expect(r.error).toBeNull();
    expect((await readCustomer(customer.id)).marketingSuppressedAt).toBeNull();
  });

  it("answers 200 for an unknown email id", async () => {
    await setupRecipient();
    const res = await postEvent(resendEvent("email.delivered", "re_nope"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("marks a delivered email DELIVERED", async () => {
    const { recipient, resendId } = await setupRecipient();

    const res = await postEvent(resendEvent("email.delivered", resendId));

    expect(res.status).toBe(200);
    const r = await readRecipient(recipient.id);
    expect(r.status).toBe("DELIVERED");
    expect(r.deliveredAt).toBeInstanceOf(Date);
  });

  it("accepts the array form of tags", async () => {
    const { recipient, resendId } = await setupRecipient();

    await postEvent(
      resendEvent("email.delivered", resendId, {}, [
        { name: "category", value: "marketing_broadcast" },
      ]),
    );

    expect((await readRecipient(recipient.id)).status).toBe("DELIVERED");
  });

  it("keeps BOUNCED when a delivered event arrives after the bounce", async () => {
    const { recipient, resendId } = await setupRecipient();

    await postEvent(
      resendEvent("email.bounced", resendId, {
        bounce: {
          type: "Permanent",
          subType: "General",
          message: "No such user",
        },
      }),
    );
    const res = await postEvent(resendEvent("email.delivered", resendId));

    expect(res.status).toBe(200);
    const r = await readRecipient(recipient.id);
    expect(r.status).toBe("BOUNCED");
    expect(r.deliveredAt).toBeNull();
  });

  it("a permanent bounce suppresses the customer", async () => {
    const { recipient, customer, resendId } = await setupRecipient();

    const res = await postEvent(
      resendEvent("email.bounced", resendId, {
        bounce: {
          type: "Permanent",
          subType: "General",
          message: "No such user",
        },
      }),
    );

    expect(res.status).toBe(200);
    const r = await readRecipient(recipient.id);
    expect(r.status).toBe("BOUNCED");
    expect(r.bouncedAt).toBeInstanceOf(Date);
    expect(r.error).toBe("Bounced (Permanent/General): No such user");

    const c = await readCustomer(customer.id);
    expect(c.marketingSuppressedAt).toBeInstanceOf(Date);
    expect(c.marketingSuppressionReason).toBe("HARD_BOUNCE");
    expect(c.acceptsMarketing).toBe(true);
  });

  it("a transient bounce stores the error but does not suppress", async () => {
    const { recipient, customer, resendId } = await setupRecipient();

    const res = await postEvent(
      resendEvent("email.bounced", resendId, {
        bounce: {
          type: "Transient",
          subType: "MailboxFull",
          message: "Mailbox full",
        },
      }),
    );

    expect(res.status).toBe(200);
    const r = await readRecipient(recipient.id);
    expect(r.status).toBe("SENT");
    expect(r.bouncedAt).toBeNull();
    expect(r.error).toBe("Bounced (Transient/MailboxFull): Mailbox full");

    const c = await readCustomer(customer.id);
    expect(c.marketingSuppressedAt).toBeNull();
    expect(c.marketingSuppressionReason).toBeNull();
  });

  it("a complaint opts the customer out and suppresses them", async () => {
    const { recipient, customer, resendId } = await setupRecipient({
      status: "DELIVERED",
    });

    const res = await postEvent(resendEvent("email.complained", resendId));

    expect(res.status).toBe(200);
    const r = await readRecipient(recipient.id);
    expect(r.status).toBe("COMPLAINED");
    expect(r.complainedAt).toBeInstanceOf(Date);

    const c = await readCustomer(customer.id);
    expect(c.acceptsMarketing).toBe(false);
    expect(c.marketingUnsubscribedAt).toBeInstanceOf(Date);
    expect(c.marketingSuppressedAt).toBeInstanceOf(Date);
    expect(c.marketingSuppressionReason).toBe("COMPLAINT");
    // Consent evidence is history, not state — it is left in place.
    expect(c.marketingConsentSource).toBe("CHECKOUT");

    // Re-delivery is harmless.
    const again = await postEvent(resendEvent("email.complained", resendId));
    expect(again.status).toBe(200);
    const c2 = await readCustomer(customer.id);
    expect(c2.marketingUnsubscribedAt).toEqual(c.marketingUnsubscribedAt);
    expect(c2.marketingSuppressedAt).toEqual(c.marketingSuppressedAt);
  });

  it("never touches another business's customer with the same email", async () => {
    const { resendId } = await setupRecipient();
    const other = await createBusiness();
    const otherCustomer = await createCustomer(other.id, {
      email: "shopper@test.dev",
    });
    await db.customer.update({
      where: { id: otherCustomer.id },
      data: { acceptsMarketing: true },
    });

    await postEvent(resendEvent("email.complained", resendId));

    const c = await readCustomer(otherCustomer.id);
    expect(c.acceptsMarketing).toBe(true);
    expect(c.marketingSuppressedAt).toBeNull();
  });

  describe("event arrives before the worker stored resendId", () => {
    const tagsFor = (campaignId: string, businessId: string) => ({
      category: "marketing_broadcast",
      campaign: campaignId,
      business: businessId,
    });

    it("still applies, and backfills the id", async () => {
      const { business, campaign, recipient, customer, resendId } =
        await setupRecipient({ stored: false });

      const res = await postEvent(
        resendEvent(
          "email.bounced",
          resendId,
          {
            to: ["  Shopper@Test.dev "],
            bounce: { type: "Permanent", subType: "General", message: "gone" },
          },
          tagsFor(campaign.id, business.id),
        ),
      );

      expect(res.status).toBe(200);
      const r = await readRecipient(recipient.id);
      expect(r.resendId).toBe(resendId);
      expect(r.status).toBe("BOUNCED");
      expect((await readCustomer(customer.id)).marketingSuppressionReason).toBe(
        "HARD_BOUNCE",
      );

      // The worker's later write (WHERE status = 'SENDING') can't downgrade it,
      // and a follow-up event now resolves by resendId directly.
      await db.marketingCampaignRecipient.updateMany({
        where: { id: recipient.id, status: "SENDING" },
        data: { status: "SENT", resendId },
      });
      await postEvent(
        resendEvent(
          "email.delivered",
          resendId,
          {},
          tagsFor(campaign.id, business.id),
        ),
      );
      expect((await readRecipient(recipient.id)).status).toBe("BOUNCED");
    });

    it("does not match when the business tag is wrong", async () => {
      const { campaign, recipient, resendId } = await setupRecipient({
        stored: false,
      });
      const other = await createBusiness();

      const res = await postEvent(
        resendEvent(
          "email.delivered",
          resendId,
          {},
          tagsFor(campaign.id, other.id),
        ),
      );

      expect(res.status).toBe(200);
      const r = await readRecipient(recipient.id);
      expect(r.resendId).toBeNull();
      expect(r.status).toBe("SENDING");
    });

    it("leaves a same-address recipient in another campaign alone", async () => {
      const { business, customer, campaign, recipient, resendId } =
        await setupRecipient({ stored: false });
      const otherCampaign = await db.marketingCampaign.create({
        data: { businessId: business.id, subject: "Other", status: "SENT" },
      });
      const otherRecipient = await db.marketingCampaignRecipient.create({
        data: {
          campaignId: otherCampaign.id,
          businessId: business.id,
          customerId: customer.id,
          email: customer.email,
          batchIndex: 0,
          status: "SENDING",
        },
      });

      await postEvent(
        resendEvent(
          "email.delivered",
          resendId,
          {},
          tagsFor(campaign.id, business.id),
        ),
      );

      expect(await readRecipient(otherRecipient.id)).toMatchObject({
        resendId: null,
        status: "SENDING",
      });
      expect(await readRecipient(recipient.id)).toMatchObject({
        resendId,
        status: "DELIVERED",
      });
    });

    it("does not overwrite a different id the worker already stored", async () => {
      const { business, campaign, recipient } = await setupRecipient({
        stored: true,
        status: "SENDING",
      });

      await postEvent(
        resendEvent(
          "email.delivered",
          "re_someone_else",
          {},
          tagsFor(campaign.id, business.id),
        ),
      );

      const r = await readRecipient(recipient.id);
      expect(r.resendId).not.toBe("re_someone_else");
      expect(r.status).toBe("SENDING");
    });
  });
});
