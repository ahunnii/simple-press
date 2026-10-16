import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as RateLimitModule from "~/lib/rate-limit";
import { createNewsletterConfirmToken } from "~/lib/email/newsletter-confirm-token";
import { applyCheckoutMarketingOptIn } from "~/lib/marketing/checkout-consent";
import {
  accountMarketingOptInWording,
  checkoutMarketingOptInWording,
  NEWSLETTER_CONSENT_WORDING,
} from "~/lib/marketing/consent-wording";
import {
  addToDoNotEmail,
  isOnDoNotEmailList,
} from "~/lib/marketing/do-not-email";
import { applyResendEvent } from "~/lib/marketing/resend-events";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createCustomer,
  createOwnerUser,
} from "../helpers/factories";

/**
 * Every write path that flips a customer's email-marketing state also records
 * a MarketingConsentEvent in the same transaction, and keeps the store's
 * do-not-email list consistent. NOT YET RUN (shared test DB).
 */

const reqHost = vi.hoisted(() => ({
  value: "consent-wiring.simplepress.test",
}));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

vi.mock("~/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof RateLimitModule>();
  return {
    ...actual,
    newsletterConsentActionLimiter: { consume: () => Promise.resolve() },
  };
});

const IP = "198.51.100.7";
const UA = "ConsentWiringTest/1.0";
const HEADERS = { "x-forwarded-for": IP, "user-agent": UA };

const events = (customerId: string) =>
  db.marketingConsentEvent.findMany({
    where: { customerId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

async function store(subdomain: string, name = "Wiring Store") {
  reqHost.value = `${subdomain}.simplepress.test`;
  return createBusiness({
    subdomain,
    name,
    featureFlags: { emailMarketing: true },
  });
}

beforeEach(async () => {
  await resetDb();
});

describe("newsletter.confirm", () => {
  it("logs OPT_IN / NEWSLETTER_FORM with ip, user agent and the form wording", async () => {
    const business = await store("cw-nl");
    const token = createNewsletterConfirmToken({
      businessId: business.id,
      email: "new@test.dev",
    });

    await createTestCaller({ headers: HEADERS }).newsletter.confirm({ token });

    const customer = await db.customer.findFirstOrThrow({
      where: { businessId: business.id, email: "new@test.dev" },
    });
    const rows = await events(customer.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      businessId: business.id,
      type: "OPT_IN",
      source: "NEWSLETTER_FORM",
      ip: IP,
      userAgent: UA,
      wording: NEWSLETTER_CONSENT_WORDING,
    });
  });

  it("logs nothing for a customer who is already a clean subscriber", async () => {
    const business = await store("cw-nl2");
    const c = await createCustomer(business.id, { email: "old@test.dev" });
    await db.customer.update({
      where: { id: c.id },
      data: { acceptsMarketing: true, marketingConsentSource: "CHECKOUT" },
    });
    const token = createNewsletterConfirmToken({
      businessId: business.id,
      email: "old@test.dev",
    });

    await createTestCaller({ headers: HEADERS }).newsletter.confirm({ token });

    expect(await events(c.id)).toHaveLength(0);
  });

  it("a fresh confirm lifts a COMPLAINT do-not-email entry and a customer suppression (UNSUPPRESSED then OPT_IN)", async () => {
    const business = await store("cw-nl3");
    const c = await createCustomer(business.id, { email: "back@test.dev" });
    await db.customer.update({
      where: { id: c.id },
      data: {
        marketingUnsubscribedAt: new Date("2026-01-01"),
        marketingSuppressedAt: new Date("2026-01-01"),
        marketingSuppressionReason: "COMPLAINT",
      },
    });
    await addToDoNotEmail(db, business.id, "back@test.dev", "COMPLAINT");
    const token = createNewsletterConfirmToken({
      businessId: business.id,
      email: "back@test.dev",
    });

    await createTestCaller({ headers: HEADERS }).newsletter.confirm({ token });

    expect(await isOnDoNotEmailList(db, business.id, "back@test.dev")).toBe(
      null,
    );
    const after = await db.customer.findUniqueOrThrow({ where: { id: c.id } });
    expect(after).toMatchObject({
      acceptsMarketing: true,
      marketingSuppressedAt: null,
    });
    const rows = await events(c.id);
    expect(rows.map((r) => [r.type, r.source])).toEqual([
      ["UNSUPPRESSED", "NEWSLETTER_FORM"],
      ["OPT_IN", "NEWSLETTER_FORM"],
    ]);
  });
});

describe("applyCheckoutMarketingOptIn", () => {
  const META = { marketingOptIn: "1", marketingOptInIp: IP };

  it("records OPT_IN / CHECKOUT with the session ip, no user agent, and the checkbox wording", async () => {
    const business = await store("cw-co", "Acme Goods");
    const c = await createCustomer(business.id, { email: "buyer@test.dev" });

    const changed = await applyCheckoutMarketingOptIn(
      db,
      { businessId: business.id, customerId: c.id },
      { metadata: META },
    );

    expect(changed).toBe(true);
    const rows = await events(c.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: "OPT_IN",
      source: "CHECKOUT",
      ip: IP,
      userAgent: null,
      wording: checkoutMarketingOptInWording("Acme Goods"),
    });

    // Stripe redelivery / a later ticked order: nothing more is logged.
    expect(
      await applyCheckoutMarketingOptIn(
        db,
        { businessId: business.id, customerId: c.id },
        { metadata: META },
      ),
    ).toBe(false);
    expect(await events(c.id)).toHaveLength(1);
  });

  it("refuses to opt in an address on the COMPLAINT list", async () => {
    const business = await store("cw-co2");
    const c = await createCustomer(business.id, { email: "angry@test.dev" });
    await addToDoNotEmail(db, business.id, "angry@test.dev", "COMPLAINT");

    const changed = await applyCheckoutMarketingOptIn(
      db,
      { businessId: business.id, customerId: c.id },
      { metadata: META },
    );

    expect(changed).toBe(false);
    expect(
      (await db.customer.findUniqueOrThrow({ where: { id: c.id } }))
        .acceptsMarketing,
    ).toBe(false);
    expect(await events(c.id)).toHaveLength(0);
    expect(await isOnDoNotEmailList(db, business.id, "angry@test.dev")).toEqual(
      { reason: "COMPLAINT" },
    );
  });

  it("lifts an UNSUBSCRIBED entry (UNSUPPRESSED then OPT_IN)", async () => {
    const business = await store("cw-co3");
    const c = await createCustomer(business.id, { email: "again@test.dev" });
    await addToDoNotEmail(db, business.id, "again@test.dev", "UNSUBSCRIBED");

    expect(
      await applyCheckoutMarketingOptIn(
        db,
        { businessId: business.id, email: "again@test.dev" },
        { metadata: META },
      ),
    ).toBe(true);

    expect(await isOnDoNotEmailList(db, business.id, "again@test.dev")).toBe(
      null,
    );
    expect((await events(c.id)).map((r) => [r.type, r.source])).toEqual([
      ["UNSUPPRESSED", "CHECKOUT"],
      ["OPT_IN", "CHECKOUT"],
    ]);
  });

  it("is a no-op for a customer who is already opted in (keeps original consent, no event)", async () => {
    const business = await store("cw-co4", "Fresh Co");
    const c = await createCustomer(business.id, { email: "fresh@test.dev" });
    const earlier = new Date("2026-01-01T00:00:00Z");
    await db.customer.update({
      where: { id: c.id },
      data: {
        acceptsMarketing: true,
        marketingConsentAt: earlier,
        marketingConsentSource: "NEWSLETTER_FORM",
      },
    });

    expect(
      await applyCheckoutMarketingOptIn(
        db,
        { businessId: business.id, customerId: c.id },
        { metadata: META },
      ),
    ).toBe(false);
    expect(
      await db.customer.findUniqueOrThrow({ where: { id: c.id } }),
    ).toMatchObject({
      marketingConsentAt: earlier,
      marketingConsentSource: "NEWSLETTER_FORM",
    });
    expect(await events(c.id)).toHaveLength(0);
  });
});

describe("Resend webhook", () => {
  it("a complaint logs exactly one SUPPRESSED / COMPLAINT event carrying the campaign", async () => {
    const business = await store("cw-rs");
    const c = await createCustomer(business.id, { email: "spam@test.dev" });
    await db.customer.update({
      where: { id: c.id },
      data: { acceptsMarketing: true },
    });
    const campaign = await db.marketingCampaign.create({
      data: {
        businessId: business.id,
        subject: "Fall sale",
        status: "SENT",
        recipientCount: 1,
      },
    });
    await db.marketingCampaignRecipient.create({
      data: {
        campaignId: campaign.id,
        businessId: business.id,
        customerId: c.id,
        email: c.email,
        batchIndex: 0,
        status: "SENT",
        resendId: "re_wiring_1",
      },
    });
    const event = {
      type: "email.complained",
      created_at: new Date().toISOString(),
      data: {
        email_id: "re_wiring_1",
        to: [c.email],
        tags: { category: "marketing_broadcast" },
      },
    };

    await applyResendEvent(db, event);
    await applyResendEvent(db, event);

    const rows = await events(c.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: "SUPPRESSED",
      source: "COMPLAINT",
      campaignId: campaign.id,
    });
  });
});

describe("customer router", () => {
  async function shopper(subdomain: string, name = "Shop Co") {
    const business = await store(subdomain, name);
    const user = await createOwnerUser(business.id, {
      email: `${subdomain}@shopper.dev`,
      role: "OWNER",
    });
    const customer = await createCustomer(business.id, {
      email: `${subdomain}@shopper.dev`,
      userId: user.id,
    });
    const caller = createTestCaller({
      userId: user.id,
      email: user.email,
      headers: HEADERS,
    });
    return { business, user, customer, caller };
  }

  describe("updateMarketingPreference", () => {
    it("opt-in logs OPT_IN / ACCOUNT with the account wording and lifts an UNSUBSCRIBED do-not-email entry", async () => {
      const { business, customer, caller } = await shopper(
        "cw-acct",
        "Acct Co",
      );
      await addToDoNotEmail(db, business.id, customer.email, "UNSUBSCRIBED");

      await caller.customer.updateMarketingPreference({
        acceptsMarketing: true,
      });

      expect(await isOnDoNotEmailList(db, business.id, customer.email)).toBe(
        null,
      );
      const rows = await events(customer.id);
      expect(rows.map((r) => [r.type, r.source])).toEqual([
        ["UNSUPPRESSED", "ACCOUNT"],
        ["OPT_IN", "ACCOUNT"],
      ]);
      expect(rows[1]).toMatchObject({
        ip: IP,
        userAgent: UA,
        wording: accountMarketingOptInWording("Acct Co"),
      });

      // Flipping on again is not a change.
      await caller.customer.updateMarketingPreference({
        acceptsMarketing: true,
      });
      expect(await events(customer.id)).toHaveLength(2);
    });

    it("does not lift a HARD_BOUNCE do-not-email entry", async () => {
      const { business, customer, caller } = await shopper("cw-acct2");
      await addToDoNotEmail(db, business.id, customer.email, "HARD_BOUNCE");

      await caller.customer.updateMarketingPreference({
        acceptsMarketing: true,
      });

      expect(await isOnDoNotEmailList(db, business.id, customer.email)).toEqual(
        { reason: "HARD_BOUNCE" },
      );
    });

    it("opt-out logs OPT_OUT / ACCOUNT (no wording) once and lists the address as UNSUBSCRIBED", async () => {
      const { business, customer, caller } = await shopper("cw-acct3");
      await db.customer.update({
        where: { id: customer.id },
        data: { acceptsMarketing: true },
      });

      await caller.customer.updateMarketingPreference({
        acceptsMarketing: false,
      });
      await caller.customer.updateMarketingPreference({
        acceptsMarketing: false,
      });

      const rows = await events(customer.id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        type: "OPT_OUT",
        source: "ACCOUNT",
        ip: IP,
        wording: null,
      });
      expect(await isOnDoNotEmailList(db, business.id, customer.email)).toEqual(
        { reason: "UNSUBSCRIBED" },
      );
    });
  });

  describe("anonymize", () => {
    it("keeps an unsubscribed customer on the do-not-email list and deletes their consent events", async () => {
      const business = await store("cw-anon");
      const owner = await createOwnerUser(business.id);
      const c = await createCustomer(business.id, { email: "bye@test.dev" });
      await db.customer.update({
        where: { id: c.id },
        data: {
          acceptsMarketing: false,
          marketingUnsubscribedAt: new Date(),
        },
      });
      await db.marketingConsentEvent.createMany({
        data: [
          {
            businessId: business.id,
            customerId: c.id,
            type: "OPT_IN",
            source: "CHECKOUT",
          },
          {
            businessId: business.id,
            customerId: c.id,
            type: "OPT_OUT",
            source: "UNSUBSCRIBE_LINK",
          },
        ],
      });

      await createTestCaller({ userId: owner.id }).customer.anonymize({
        id: c.id,
      });

      expect(await isOnDoNotEmailList(db, business.id, "bye@test.dev")).toEqual(
        { reason: "UNSUBSCRIBED" },
      );
      expect(await events(c.id)).toHaveLength(0);
      expect(
        await db.marketingConsentEvent.count({
          where: { businessId: business.id },
        }),
      ).toBe(0);
    });

    it("maps a complaint suppression to a COMPLAINT entry, and adds nothing for a plain subscriber", async () => {
      const business = await store("cw-anon2");
      const owner = await createOwnerUser(business.id);
      const complained = await createCustomer(business.id, {
        email: "spam@test.dev",
      });
      await db.customer.update({
        where: { id: complained.id },
        data: {
          marketingSuppressedAt: new Date(),
          marketingSuppressionReason: "COMPLAINT",
        },
      });
      const fine = await createCustomer(business.id, {
        email: "fine@test.dev",
      });
      await db.customer.update({
        where: { id: fine.id },
        data: { acceptsMarketing: true },
      });
      const caller = createTestCaller({ userId: owner.id });

      await caller.customer.anonymize({ id: complained.id });
      await caller.customer.anonymize({ id: fine.id });

      expect(
        await isOnDoNotEmailList(db, business.id, "spam@test.dev"),
      ).toEqual({ reason: "COMPLAINT" });
      expect(await isOnDoNotEmailList(db, business.id, "fine@test.dev")).toBe(
        null,
      );
    });
  });

  it("exportMyData includes the customer's own consent events (with ip / user agent)", async () => {
    const { business, customer, caller } = await shopper("cw-exp");
    await db.marketingConsentEvent.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        type: "OPT_IN",
        source: "NEWSLETTER_FORM",
        ip: IP,
        userAgent: UA,
        wording: NEWSLETTER_CONSENT_WORDING,
      },
    });

    const result = await caller.customer.exportMyData();

    expect(result?.marketing.consentEvents).toEqual([
      expect.objectContaining({
        type: "OPT_IN",
        source: "NEWSLETTER_FORM",
        ip: IP,
        userAgent: UA,
        wording: NEWSLETTER_CONSENT_WORDING,
        campaignId: null,
      }),
    ]);
  });

  describe("markUnsubscribed", () => {
    it("opts the customer out, lists the address, logs OPT_OUT / OWNER with no ip, and is idempotent", async () => {
      const business = await store("cw-mu");
      const owner = await createOwnerUser(business.id);
      const c = await createCustomer(business.id, { email: "call@test.dev" });
      await db.customer.update({
        where: { id: c.id },
        data: { acceptsMarketing: true },
      });
      const caller = createTestCaller({ userId: owner.id, headers: HEADERS });

      await caller.customer.markUnsubscribed({ customerId: c.id });
      const first = await db.customer.findUniqueOrThrow({
        where: { id: c.id },
      });
      await caller.customer.markUnsubscribed({ customerId: c.id });
      const second = await db.customer.findUniqueOrThrow({
        where: { id: c.id },
      });

      expect(first.acceptsMarketing).toBe(false);
      expect(first.marketingUnsubscribedAt).toBeInstanceOf(Date);
      expect(second.marketingUnsubscribedAt?.getTime()).toBe(
        first.marketingUnsubscribedAt?.getTime(),
      );
      const rows = await events(c.id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        type: "OPT_OUT",
        source: "OWNER",
        ip: null,
        userAgent: null,
        wording: null,
      });
      expect(
        await isOnDoNotEmailList(db, business.id, "call@test.dev"),
      ).toEqual({ reason: "UNSUBSCRIBED" });
    });

    it("is scoped to the caller's store and closed to STAFF", async () => {
      const business = await store("cw-mu2");
      const other = await createBusiness({ subdomain: "cw-mu2-other" });
      const foreign = await createCustomer(other.id);
      const owner = await createOwnerUser(business.id);
      const staff = await createOwnerUser(business.id, { role: "STAFF" });

      await expect(
        createTestCaller({ userId: owner.id }).customer.markUnsubscribed({
          customerId: foreign.id,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        createTestCaller({ userId: staff.id }).customer.markUnsubscribed({
          customerId: foreign.id,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("listConsentEvents", () => {
    it("returns newest first, capped by limit, with the campaign subject and never ip / user agent", async () => {
      const business = await store("cw-list");
      const owner = await createOwnerUser(business.id);
      const c = await createCustomer(business.id);
      const campaign = await db.marketingCampaign.create({
        data: {
          businessId: business.id,
          subject: "Spring news",
          status: "SENT",
          recipientCount: 1,
        },
      });
      for (let i = 0; i < 3; i++) {
        await db.marketingConsentEvent.create({
          data: {
            businessId: business.id,
            customerId: c.id,
            type: i === 2 ? "OPT_OUT" : "OPT_IN",
            source: i === 2 ? "UNSUBSCRIBE_LINK" : "CHECKOUT",
            ip: IP,
            userAgent: UA,
            campaignId: i === 2 ? campaign.id : null,
            createdAt: new Date(Date.UTC(2026, 0, 1 + i)),
          },
        });
      }
      const caller = createTestCaller({ userId: owner.id });

      const result = await caller.customer.listConsentEvents({
        customerId: c.id,
        limit: 2,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        type: "OPT_OUT",
        source: "UNSUBSCRIBE_LINK",
        campaignId: campaign.id,
        campaignSubject: "Spring news",
      });
      expect(result[0]!.createdAt.getTime()).toBeGreaterThan(
        result[1]!.createdAt.getTime(),
      );
      for (const row of result) {
        expect(row).not.toHaveProperty("ip");
        expect(row).not.toHaveProperty("userAgent");
      }
      expect(JSON.stringify(result)).not.toContain(IP);
      await expect(
        caller.customer.listConsentEvents({ customerId: c.id, limit: 51 }),
      ).rejects.toBeDefined();
    });

    it("does not return another store's events", async () => {
      const business = await store("cw-list2");
      const other = await createBusiness({ subdomain: "cw-list2-other" });
      const foreign = await createCustomer(other.id);
      await db.marketingConsentEvent.create({
        data: {
          businessId: other.id,
          customerId: foreign.id,
          type: "OPT_IN",
          source: "CHECKOUT",
        },
      });
      const owner = await createOwnerUser(business.id);

      expect(
        await createTestCaller({
          userId: owner.id,
        }).customer.listConsentEvents({ customerId: foreign.id }),
      ).toEqual([]);
    });
  });
});
