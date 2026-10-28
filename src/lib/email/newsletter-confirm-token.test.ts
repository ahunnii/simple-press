import { describe, expect, it } from "vitest";

import { createInvoiceToken } from "~/lib/invoices/token";

import {
  buildNewsletterConfirmUrl,
  createNewsletterConfirmToken,
  IMPORT_INVITE_TOKEN_TTL_MS,
  verifyNewsletterConfirmToken,
} from "./newsletter-confirm-token";
import { createSignedToken } from "./signed-token";
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "./unsubscribe-token";

const SECRET = "test-secret";
const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-16T12:00:00Z");

function tamper(value: string): string {
  return value.slice(0, -1) + (value.endsWith("A") ? "B" : "A");
}

describe("createNewsletterConfirmToken / verifyNewsletterConfirmToken", () => {
  it("is URL-safe and round-trips with a normalized email", () => {
    const token = createNewsletterConfirmToken(
      {
        businessId: "biz_1",
        email: "  Jane@Example.COM ",
        firstName: "Jane",
        lastName: "Doe",
        now: NOW,
      },
      SECRET,
    );
    expect(token).not.toMatch(/[+/=]/);
    expect(verifyNewsletterConfirmToken(token, NOW, SECRET)).toEqual({
      ok: true,
      payload: {
        k: "nlc",
        b: "biz_1",
        e: "jane@example.com",
        f: "Jane",
        l: "Doe",
        iat: NOW.getTime(),
        exp: NOW.getTime() + 7 * DAY_MS,
      },
    });
  });

  it("omits names that are not provided", () => {
    const token = createNewsletterConfirmToken(
      { businessId: "biz_1", email: "a@b.co", firstName: "  ", now: NOW },
      SECRET,
    );
    const result = verifyNewsletterConfirmToken(token, NOW, SECRET);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload).not.toHaveProperty("f");
      expect(result.payload).not.toHaveProperty("l");
    }
  });

  it("defaults to the SIMPLEPRESS_HASH_SECRET env var", () => {
    const token = createNewsletterConfirmToken({
      businessId: "biz_1",
      email: "a@b.co",
    });
    expect(verifyNewsletterConfirmToken(token)).toMatchObject({ ok: true });
    expect(
      verifyNewsletterConfirmToken(token, new Date(), "other-secret"),
    ).toEqual({ ok: false, reason: "invalid" });
  });

  it("reports expired after 7 days", () => {
    const token = createNewsletterConfirmToken(
      { businessId: "biz_1", email: "a@b.co", now: NOW },
      SECRET,
    );
    expect(
      verifyNewsletterConfirmToken(
        token,
        new Date(NOW.getTime() + 7 * DAY_MS - 1),
        SECRET,
      ),
    ).toMatchObject({ ok: true });
    expect(
      verifyNewsletterConfirmToken(
        token,
        new Date(NOW.getTime() + 7 * DAY_MS + 1),
        SECRET,
      ),
    ).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a tampered payload or signature as invalid", () => {
    const token = createNewsletterConfirmToken(
      { businessId: "biz_1", email: "a@b.co", now: NOW },
      SECRET,
    );
    const dot = token.lastIndexOf(".");
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    for (const bad of [
      `${tamper(payload)}.${sig}`,
      `${payload}.${tamper(sig)}`,
    ]) {
      expect(verifyNewsletterConfirmToken(bad, NOW, SECRET)).toEqual({
        ok: false,
        reason: "invalid",
      });
    }
  });

  it("reports a correctly-signed but malformed payload as invalid, even when past exp", () => {
    const token = createSignedToken(
      { k: "nlc", b: "biz_1", e: "not-an-email", iat: 0, exp: 1 },
      SECRET,
      "nl-confirm:v1",
    );
    expect(verifyNewsletterConfirmToken(token, NOW, SECRET)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("rejects an unsubscribe token", () => {
    const token = createUnsubscribeToken(
      { customerId: "cust_1", businessId: "biz_1" },
      SECRET,
    );
    expect(verifyNewsletterConfirmToken(token, NOW, SECRET)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("is rejected by verifyUnsubscribeToken", () => {
    const token = createNewsletterConfirmToken(
      { businessId: "biz_1", email: "a@b.co", now: NOW },
      SECRET,
    );
    expect(verifyUnsubscribeToken(token, SECRET)).toBeNull();
  });

  it("rejects an invoice token", () => {
    const token = createInvoiceToken(
      { invoiceId: "inv_1", businessId: "biz_1", now: NOW },
      SECRET,
    );
    expect(verifyNewsletterConfirmToken(token, NOW, SECRET)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("rejects malformed input without throwing", () => {
    for (const bad of ["", "no-dot", "!!!.???", "a.b.c"]) {
      expect(() =>
        verifyNewsletterConfirmToken(bad, NOW, SECRET),
      ).not.toThrow();
      expect(verifyNewsletterConfirmToken(bad, NOW, SECRET)).toEqual({
        ok: false,
        reason: "invalid",
      });
    }
  });

  describe("re-permission invite tokens (s: imp)", () => {
    it("round-trips s and a 30-day TTL", () => {
      const token = createNewsletterConfirmToken(
        {
          businessId: "biz_1",
          email: "a@b.co",
          source: "imp",
          ttlMs: IMPORT_INVITE_TOKEN_TTL_MS,
          now: NOW,
        },
        SECRET,
      );
      expect(IMPORT_INVITE_TOKEN_TTL_MS).toBe(30 * DAY_MS);
      expect(verifyNewsletterConfirmToken(token, NOW, SECRET)).toEqual({
        ok: true,
        payload: {
          k: "nlc",
          b: "biz_1",
          e: "a@b.co",
          s: "imp",
          iat: NOW.getTime(),
          exp: NOW.getTime() + 30 * DAY_MS,
        },
      });
      expect(
        verifyNewsletterConfirmToken(
          token,
          new Date(NOW.getTime() + 30 * DAY_MS - 1),
          SECRET,
        ),
      ).toMatchObject({ ok: true });
      expect(
        verifyNewsletterConfirmToken(
          token,
          new Date(NOW.getTime() + 30 * DAY_MS + 1),
          SECRET,
        ),
      ).toEqual({ ok: false, reason: "expired" });
    });

    it("leaves sign-up tokens without s and on the 7-day default", () => {
      const token = createNewsletterConfirmToken(
        { businessId: "biz_1", email: "a@b.co", now: NOW },
        SECRET,
      );
      const result = verifyNewsletterConfirmToken(token, NOW, SECRET);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.payload).not.toHaveProperty("s");
        expect(result.payload.exp - result.payload.iat).toBe(7 * DAY_MS);
      }
    });

    it("mints byte-identical tokens for the same inputs and fixed now", () => {
      const mint = () =>
        createNewsletterConfirmToken(
          {
            businessId: "biz_1",
            email: "A@B.co",
            source: "imp",
            ttlMs: IMPORT_INVITE_TOKEN_TTL_MS,
            now: NOW,
          },
          SECRET,
        );
      expect(mint()).toBe(mint());
      expect(
        createNewsletterConfirmToken(
          {
            businessId: "biz_1",
            email: "a@b.co",
            source: "imp",
            ttlMs: IMPORT_INVITE_TOKEN_TTL_MS,
            now: new Date(NOW.getTime() + 1),
          },
          SECRET,
        ),
      ).not.toBe(mint());
    });

    it("rejects an unknown s value and unknown keys, even when correctly signed", () => {
      const base = {
        k: "nlc",
        b: "biz_1",
        e: "a@b.co",
        iat: NOW.getTime(),
        exp: NOW.getTime() + DAY_MS,
      };
      for (const payload of [
        { ...base, s: "form" },
        { ...base, s: "imp", admin: true },
        { ...base, src: "imp" },
      ]) {
        const token = createSignedToken(payload, SECRET, "nl-confirm:v1");
        expect(verifyNewsletterConfirmToken(token, NOW, SECRET)).toEqual({
          ok: false,
          reason: "invalid",
        });
      }
    });

    it("can't be forged by adding s to a signed sign-up token", () => {
      const token = createNewsletterConfirmToken(
        { businessId: "biz_1", email: "a@b.co", now: NOW },
        SECRET,
      );
      const dot = token.lastIndexOf(".");
      const payload = JSON.parse(
        Buffer.from(token.slice(0, dot), "base64url").toString("utf-8"),
      ) as Record<string, unknown>;
      const forged = `${Buffer.from(
        JSON.stringify({
          ...payload,
          s: "imp",
          exp: NOW.getTime() + 30 * DAY_MS,
        }),
      ).toString("base64url")}.${token.slice(dot + 1)}`;
      expect(verifyNewsletterConfirmToken(forged, NOW, SECRET)).toEqual({
        ok: false,
        reason: "invalid",
      });
    });
  });

  it("buildNewsletterConfirmUrl matches the confirm page's query shape", () => {
    expect(buildNewsletterConfirmUrl("https://shop.test", "abc.def")).toBe(
      "https://shop.test/email-preferences?view=confirm&t=abc.def",
    );
  });
});
