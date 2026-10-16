import type * as NextServer from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as RateLimitModule from "~/lib/rate-limit";
import { RECAPTCHA_TEST_BYPASS_TOKEN } from "~/lib/captcha/verify-recaptcha";
import { createNewsletterConfirmToken } from "~/lib/email/newsletter-confirm-token";
import { createUnsubscribeToken } from "~/lib/email/unsubscribe-token";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import { createBusiness, createCustomer } from "../helpers/factories";

/**
 * Integration coverage for `newsletterRouter` (double opt-in sign-up,
 * confirm, resubscribe). NOT YET RUN: needs the test database (Docker) and
 * the email-marketing schema columns pushed.
 */

const reqHost = vi.hoisted(() => ({ value: "nl-biz.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

// `after()` is captured so tests can assert nothing was sent before the
// response, then flush it.
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
async function flushAfter() {
  const pending = afterCallbacks.splice(0);
  await Promise.all(pending.map((fn) => fn()));
}

const emailMocks = vi.hoisted(() => ({
  sendNewsletterConfirmEmail: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("~/lib/email/templates", () => ({
  sendNewsletterConfirmEmail: (...args: unknown[]): unknown =>
    emailMocks.sendNewsletterConfirmEmail(...args),
}));

const rateLimitMocks = vi.hoisted(() => ({
  ipConsume: vi.fn().mockResolvedValue(undefined),
  emailConsume: vi.fn().mockResolvedValue(undefined),
  globalEmailConsume: vi.fn().mockResolvedValue(undefined),
  actionConsume: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("~/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof RateLimitModule>();
  return {
    ...actual,
    newsletterSubscribeIpLimiter: {
      consume: (...a: unknown[]): unknown => rateLimitMocks.ipConsume(...a),
    },
    newsletterSubscribeEmailLimiter: {
      consume: (...a: unknown[]): unknown => rateLimitMocks.emailConsume(...a),
    },
    newsletterSubscribeGlobalEmailLimiter: {
      consume: (...a: unknown[]): unknown =>
        rateLimitMocks.globalEmailConsume(...a),
    },
    newsletterConsentActionLimiter: {
      consume: (...a: unknown[]): unknown => rateLimitMocks.actionConsume(...a),
    },
  };
});

const ON = { emailMarketing: true };

function subscribeInput(email: string, extra: Record<string, unknown> = {}) {
  return {
    email,
    captchaToken: RECAPTCHA_TEST_BYPASS_TOKEN,
    website: "",
    ...extra,
  };
}

describe("newsletter router", () => {
  beforeEach(async () => {
    await resetDb();
    reqHost.value = "nl-biz.simplepress.test";
    afterCallbacks.length = 0;
    emailMocks.sendNewsletterConfirmEmail.mockClear();
    rateLimitMocks.ipConsume.mockReset().mockResolvedValue(undefined);
    rateLimitMocks.emailConsume.mockReset().mockResolvedValue(undefined);
    rateLimitMocks.globalEmailConsume.mockReset().mockResolvedValue(undefined);
    rateLimitMocks.actionConsume.mockReset().mockResolvedValue(undefined);
  });

  describe("subscribe", () => {
    it("returns the same generic result for a new and an already-subscribed email", async () => {
      const business = await createBusiness({
        subdomain: "nl-biz",
        featureFlags: ON,
      });
      const existing = await createCustomer(business.id, {
        email: "have@test.dev",
      });
      await db.customer.update({
        where: { id: existing.id },
        data: { acceptsMarketing: true },
      });
      const caller = createTestCaller({});

      const fresh = await caller.newsletter.subscribe(
        subscribeInput("new@test.dev"),
      );
      const subscribed = await caller.newsletter.subscribe(
        subscribeInput("have@test.dev"),
      );

      expect(fresh).toEqual({ ok: true });
      expect(subscribed).toEqual(fresh);
    });

    it("emails a confirm link for a new address and creates no customer yet", async () => {
      await createBusiness({ subdomain: "nl-biz", featureFlags: ON });
      const caller = createTestCaller({});

      await caller.newsletter.subscribe(
        subscribeInput("New@Test.dev", { firstName: "Nia" }),
      );

      // Sent after the response (never awaited), like the already-subscribed
      // path, so timing can't tell the two apart.
      expect(emailMocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
      expect(afterCallbacks).toHaveLength(1);
      await flushAfter();
      expect(emailMocks.sendNewsletterConfirmEmail).toHaveBeenCalledTimes(1);
      const args = emailMocks.sendNewsletterConfirmEmail.mock.calls[0]?.[0] as {
        to: string;
        confirmUrl: string;
      };
      expect(args.to).toBe("new@test.dev");
      expect(args.confirmUrl).toContain("/email-preferences?view=confirm&t=");
      expect(await db.customer.count()).toBe(0);
    });

    it("sends no email when the address is already subscribed", async () => {
      const business = await createBusiness({
        subdomain: "nl-biz",
        featureFlags: ON,
      });
      const c = await createCustomer(business.id, { email: "have@test.dev" });
      await db.customer.update({
        where: { id: c.id },
        data: { acceptsMarketing: true },
      });

      await createTestCaller({}).newsletter.subscribe(
        subscribeInput("have@test.dev"),
      );

      expect(afterCallbacks).toHaveLength(0);
      expect(emailMocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
    });

    it("silently ignores a filled honeypot", async () => {
      await createBusiness({ subdomain: "nl-biz", featureFlags: ON });

      const result = await createTestCaller({}).newsletter.subscribe(
        subscribeInput("bot@test.dev", { website: "http://spam.example" }),
      );

      expect(result).toEqual({ ok: true });
      expect(emailMocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
      expect(rateLimitMocks.ipConsume).not.toHaveBeenCalled();
    });

    it("rejects when the email-marketing flag is off", async () => {
      await createBusiness({ subdomain: "nl-biz" });

      await expect(
        createTestCaller({}).newsletter.subscribe(subscribeInput("a@test.dev")),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(emailMocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
    });

    it("rejects a bad captcha token", async () => {
      await createBusiness({ subdomain: "nl-biz", featureFlags: ON });

      await expect(
        createTestCaller({}).newsletter.subscribe(
          subscribeInput("a@test.dev", { captchaToken: "" }),
        ),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("surfaces the per-IP and per-email limiters as TOO_MANY_REQUESTS", async () => {
      await createBusiness({ subdomain: "nl-biz", featureFlags: ON });
      const caller = createTestCaller({});

      rateLimitMocks.ipConsume.mockRejectedValueOnce(new Error("limit"));
      await expect(
        caller.newsletter.subscribe(subscribeInput("a@test.dev")),
      ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });

      rateLimitMocks.emailConsume.mockRejectedValueOnce(new Error("limit"));
      await expect(
        caller.newsletter.subscribe(subscribeInput("a@test.dev")),
      ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });

      rateLimitMocks.globalEmailConsume.mockRejectedValueOnce(
        new Error("limit"),
      );
      await expect(
        caller.newsletter.subscribe(subscribeInput("a@test.dev")),
      ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
      expect(emailMocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
    });

    it("keys the per-IP limiter on the resolved business, and per-email limits only after the captcha", async () => {
      const business = await createBusiness({
        subdomain: "nl-biz",
        featureFlags: ON,
      });
      // Another spelling of the same store's host.
      reqHost.value = "nl-biz.simplepress.test:8443";
      const caller = createTestCaller({});

      await expect(
        caller.newsletter.subscribe(
          subscribeInput("Victim@Test.dev", { captchaToken: "" }),
        ),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(rateLimitMocks.ipConsume).toHaveBeenCalledTimes(1);
      const ipKey = rateLimitMocks.ipConsume.mock.calls[0]?.[0] as string;
      expect(ipKey.endsWith(`:${business.id}`)).toBe(true);
      expect(ipKey).not.toContain("simplepress.test");
      // A failed captcha spends none of the address's budget.
      expect(rateLimitMocks.emailConsume).not.toHaveBeenCalled();
      expect(rateLimitMocks.globalEmailConsume).not.toHaveBeenCalled();

      await caller.newsletter.subscribe(subscribeInput("Victim@Test.dev"));
      expect(rateLimitMocks.emailConsume).toHaveBeenCalledWith(
        `${business.id}:victim@test.dev`,
      );
      // Global: the address alone, across every store.
      expect(rateLimitMocks.globalEmailConsume).toHaveBeenCalledWith(
        "victim@test.dev",
      );
    });
  });

  describe("confirm", () => {
    it("creates the customer with source NEWSLETTER_FORM and names", async () => {
      const business = await createBusiness({
        subdomain: "nl-biz",
        featureFlags: ON,
      });
      const token = createNewsletterConfirmToken({
        businessId: business.id,
        email: "Nia@Test.dev",
        firstName: "Nia",
        lastName: "Park",
      });

      const result = await createTestCaller({}).newsletter.confirm({ token });

      expect(result).toEqual({ ok: true });
      const customer = await db.customer.findFirstOrThrow({
        where: { businessId: business.id, email: "nia@test.dev" },
      });
      expect(customer).toMatchObject({
        acceptsMarketing: true,
        marketingConsentSource: "NEWSLETTER_FORM",
        firstName: "Nia",
        lastName: "Park",
        marketingUnsubscribedAt: null,
        marketingSuppressedAt: null,
      });
      expect(customer.marketingConsentAt).toBeInstanceOf(Date);
    });

    it("re-opts-in an unsubscribed, suppressed customer and keeps existing names", async () => {
      const business = await createBusiness({
        subdomain: "nl-biz",
        featureFlags: ON,
      });
      const c = await createCustomer(business.id, { email: "back@test.dev" });
      await db.customer.update({
        where: { id: c.id },
        data: {
          firstName: "Keep",
          marketingUnsubscribedAt: new Date(),
          marketingSuppressedAt: new Date(),
          marketingSuppressionReason: "COMPLAINT",
        },
      });
      const token = createNewsletterConfirmToken({
        businessId: business.id,
        email: "back@test.dev",
        firstName: "Ignored",
      });

      await createTestCaller({}).newsletter.confirm({ token });

      const after = await db.customer.findUniqueOrThrow({
        where: { id: c.id },
      });
      expect(after).toMatchObject({
        acceptsMarketing: true,
        marketingConsentSource: "NEWSLETTER_FORM",
        firstName: "Keep",
        marketingUnsubscribedAt: null,
        marketingSuppressedAt: null,
        marketingSuppressionReason: null,
      });
    });

    it("does not overwrite the consent record of a clean subscriber", async () => {
      const business = await createBusiness({
        subdomain: "nl-biz",
        featureFlags: ON,
      });
      const c = await createCustomer(business.id, { email: "old@test.dev" });
      const earlier = new Date("2026-01-01T00:00:00Z");
      await db.customer.update({
        where: { id: c.id },
        data: {
          acceptsMarketing: true,
          marketingConsentAt: earlier,
          marketingConsentSource: "CHECKOUT",
        },
      });
      const token = createNewsletterConfirmToken({
        businessId: business.id,
        email: "old@test.dev",
      });

      await createTestCaller({}).newsletter.confirm({ token });

      const after = await db.customer.findUniqueOrThrow({
        where: { id: c.id },
      });
      expect(after.marketingConsentSource).toBe("CHECKOUT");
      expect(after.marketingConsentAt?.getTime()).toBe(earlier.getTime());
    });

    it("rejects expired, tampered and other-business tokens without writing", async () => {
      const business = await createBusiness({
        subdomain: "nl-biz",
        featureFlags: ON,
      });
      const other = await createBusiness({
        subdomain: "nl-other",
        featureFlags: ON,
      });
      const caller = createTestCaller({});

      const expired = createNewsletterConfirmToken({
        businessId: business.id,
        email: "x@test.dev",
        now: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      });
      expect(await caller.newsletter.confirm({ token: expired })).toEqual({
        ok: false,
        reason: "expired",
      });

      const valid = createNewsletterConfirmToken({
        businessId: business.id,
        email: "x@test.dev",
      });
      expect(
        await caller.newsletter.confirm({ token: `${valid}tampered` }),
      ).toEqual({ ok: false, reason: "invalid" });

      const foreign = createNewsletterConfirmToken({
        businessId: other.id,
        email: "x@test.dev",
      });
      expect(await caller.newsletter.confirm({ token: foreign })).toEqual({
        ok: false,
        reason: "invalid",
      });

      expect(await db.customer.count()).toBe(0);
    });

    it("rejects an unsubscribe token", async () => {
      const business = await createBusiness({
        subdomain: "nl-biz",
        featureFlags: ON,
      });
      const c = await createCustomer(business.id);
      const token = createUnsubscribeToken({
        customerId: c.id,
        businessId: business.id,
      });

      expect(await createTestCaller({}).newsletter.confirm({ token })).toEqual({
        ok: false,
        reason: "invalid",
      });
    });

    it("refuses a confirm link minted before a later unsubscribe (replay)", async () => {
      const business = await createBusiness({
        subdomain: "nl-biz",
        featureFlags: ON,
      });
      const minted = new Date(Date.now() - 60 * 60_000);
      const token = createNewsletterConfirmToken({
        businessId: business.id,
        email: "replay@test.dev",
        now: minted,
      });
      const c = await createCustomer(business.id, { email: "replay@test.dev" });
      await db.customer.update({
        where: { id: c.id },
        data: {
          acceptsMarketing: false,
          marketingUnsubscribedAt: new Date(minted.getTime() + 60_000),
        },
      });

      expect(await createTestCaller({}).newsletter.confirm({ token })).toEqual({
        ok: false,
        reason: "expired",
      });
      const after = await db.customer.findUniqueOrThrow({
        where: { id: c.id },
      });
      expect(after.acceptsMarketing).toBe(false);
      expect(after.marketingUnsubscribedAt).not.toBeNull();

      // A link minted after the unsubscribe (a fresh sign-up) still works.
      const fresh = createNewsletterConfirmToken({
        businessId: business.id,
        email: "replay@test.dev",
      });
      expect(
        await createTestCaller({}).newsletter.confirm({ token: fresh }),
      ).toEqual({ ok: true });
      expect(
        (await db.customer.findUniqueOrThrow({ where: { id: c.id } }))
          .acceptsMarketing,
      ).toBe(true);
    });
  });

  describe("resubscribe", () => {
    it("opts the customer back in with source RESUBSCRIBE_LINK", async () => {
      const business = await createBusiness({
        subdomain: "nl-biz",
        featureFlags: ON,
      });
      const c = await createCustomer(business.id, { email: "u@test.dev" });
      await db.customer.update({
        where: { id: c.id },
        data: { marketingUnsubscribedAt: new Date() },
      });
      const token = createUnsubscribeToken({
        customerId: c.id,
        businessId: business.id,
      });

      const result = await createTestCaller({}).newsletter.resubscribe({
        token,
      });

      expect(result).toEqual({ ok: true });
      const after = await db.customer.findUniqueOrThrow({
        where: { id: c.id },
      });
      expect(after).toMatchObject({
        acceptsMarketing: true,
        marketingConsentSource: "RESUBSCRIBE_LINK",
        marketingUnsubscribedAt: null,
      });
    });

    it("refuses a suppressed customer and leaves the suppression in place", async () => {
      const business = await createBusiness({
        subdomain: "nl-biz",
        featureFlags: ON,
      });
      for (const reason of [
        "COMPLAINT",
        "HARD_BOUNCE",
        "PROVIDER_SUPPRESSED",
      ] as const) {
        const c = await createCustomer(business.id, {
          email: `${reason.toLowerCase()}@test.dev`,
        });
        const suppressedAt = new Date("2026-10-01T00:00:00Z");
        await db.customer.update({
          where: { id: c.id },
          data: {
            acceptsMarketing: false,
            marketingUnsubscribedAt: suppressedAt,
            marketingSuppressedAt: suppressedAt,
            marketingSuppressionReason: reason,
          },
        });
        const token = createUnsubscribeToken({
          customerId: c.id,
          businessId: business.id,
        });

        expect(
          await createTestCaller({}).newsletter.resubscribe({ token }),
        ).toEqual({ ok: false, reason: "suppressed" });
        const after = await db.customer.findUniqueOrThrow({
          where: { id: c.id },
        });
        expect(after).toMatchObject({
          acceptsMarketing: false,
          marketingSuppressionReason: reason,
        });
        expect(after.marketingSuppressedAt?.getTime()).toBe(
          suppressedAt.getTime(),
        );
      }
    });

    it("rejects a token minted for another business and changes nothing", async () => {
      const business = await createBusiness({
        subdomain: "nl-biz",
        featureFlags: ON,
      });
      const other = await createBusiness({
        subdomain: "nl-other",
        featureFlags: ON,
      });
      const c = await createCustomer(other.id);
      const token = createUnsubscribeToken({
        customerId: c.id,
        businessId: other.id,
      });

      const result = await createTestCaller({}).newsletter.resubscribe({
        token,
      });

      expect(result).toEqual({ ok: false, reason: "invalid" });
      const after = await db.customer.findUniqueOrThrow({
        where: { id: c.id },
      });
      expect(after.acceptsMarketing).toBe(false);
      expect(business.id).not.toBe(other.id);
    });

    it("rejects a newsletter confirm token", async () => {
      const business = await createBusiness({
        subdomain: "nl-biz",
        featureFlags: ON,
      });
      const token = createNewsletterConfirmToken({
        businessId: business.id,
        email: "z@test.dev",
      });

      expect(
        await createTestCaller({}).newsletter.resubscribe({ token }),
      ).toEqual({ ok: false, reason: "invalid" });
    });
  });
});
