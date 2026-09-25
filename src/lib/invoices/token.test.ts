import { describe, expect, it } from "vitest";

import { createOrderStatusToken } from "~/lib/order-status-token";
import { createSubscriptionToken } from "~/lib/subscriptions/token";

import {
  createInvoiceToken,
  invoiceViewPath,
  verifyInvoiceToken,
} from "./token";

const SECRET = "test-secret";
const DAY_MS = 24 * 60 * 60 * 1000;
const subject = { invoiceId: "inv_row_1", businessId: "biz_1" };

function tamper(value: string): string {
  return value.slice(0, -1) + (value.endsWith("A") ? "B" : "A");
}

describe("createInvoiceToken / verifyInvoiceToken", () => {
  it("is URL-safe and round-trips", () => {
    const token = createInvoiceToken(subject, SECRET);
    expect(token).not.toMatch(/[+/=]/);
    expect(verifyInvoiceToken(token, new Date(), SECRET)).toEqual({
      ok: true,
      invoiceId: "inv_row_1",
      businessId: "biz_1",
    });
  });

  it("defaults to the SIMPLEPRESS_HASH_SECRET env var", () => {
    const token = createInvoiceToken(subject);
    expect(verifyInvoiceToken(token)).toMatchObject({ ok: true });
    expect(verifyInvoiceToken(token, new Date(), "other-secret")).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("rejects a tampered payload or signature as invalid", () => {
    const token = createInvoiceToken(subject, SECRET);
    const dot = token.lastIndexOf(".");
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    for (const bad of [
      `${tamper(payload)}.${sig}`,
      `${payload}.${tamper(sig)}`,
    ]) {
      expect(verifyInvoiceToken(bad, new Date(), SECRET)).toEqual({
        ok: false,
        reason: "invalid",
      });
    }
  });

  it("rejects malformed input without throwing", () => {
    for (const bad of ["", "no-dot", "!!!.???", "a.b.c"]) {
      expect(() => verifyInvoiceToken(bad, new Date(), SECRET)).not.toThrow();
      expect(verifyInvoiceToken(bad, new Date(), SECRET)).toEqual({
        ok: false,
        reason: "invalid",
      });
    }
  });

  it("expires after 365 days, relative to the injected clock", () => {
    const issued = new Date("2026-01-01T00:00:00Z");
    const token = createInvoiceToken({ ...subject, now: issued }, SECRET);

    expect(
      verifyInvoiceToken(
        token,
        new Date(issued.getTime() + 364 * DAY_MS),
        SECRET,
      ),
    ).toMatchObject({ ok: true });
    expect(
      verifyInvoiceToken(
        token,
        new Date(issued.getTime() + 366 * DAY_MS),
        SECRET,
      ),
    ).toEqual({ ok: false, reason: "expired" });
  });

  it("reports a forged expired token as invalid, not expired", () => {
    const issued = new Date("2020-01-01T00:00:00Z");
    const token = createInvoiceToken({ ...subject, now: issued }, "attacker");
    expect(verifyInvoiceToken(token, new Date(), SECRET)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("rejects a subscription token signed with the same secret", () => {
    const subToken = createSubscriptionToken(
      { subscriptionId: "inv_row_1", businessId: "biz_1" },
      SECRET,
    );
    expect(verifyInvoiceToken(subToken, new Date(), SECRET)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("rejects an order-status token signed with the same secret", () => {
    const orderToken = createOrderStatusToken("inv_row_1", SECRET);
    expect(verifyInvoiceToken(orderToken, new Date(), SECRET)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });
});

describe("invoiceViewPath", () => {
  it("builds the hosted page path", () => {
    expect(invoiceViewPath("abc.def")).toBe("/invoice/abc.def");
  });
});
