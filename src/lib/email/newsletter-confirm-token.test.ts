import { describe, expect, it } from "vitest";

import { createInvoiceToken } from "~/lib/invoices/token";

import {
  createNewsletterConfirmToken,
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
});
