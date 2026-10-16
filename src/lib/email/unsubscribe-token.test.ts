import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";

import { createInvoiceToken } from "~/lib/invoices/token";
import { createOrderStatusToken } from "~/lib/order-status-token";
import { createSubscriptionToken } from "~/lib/subscriptions/token";

import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "./unsubscribe-token";

const SECRET = "test-secret";
const subject = { customerId: "cust_1", businessId: "biz_1" };

function b64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** A token in the pre-domain-separation format: HMAC over the bare payload. */
function legacyToken(payload: unknown, secret = SECRET): string {
  const encoded = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac("sha256", secret).update(encoded).digest());
  return `${encoded}.${sig}`;
}

function tamper(value: string): string {
  return value.slice(0, -1) + (value.endsWith("A") ? "B" : "A");
}

describe("createUnsubscribeToken / verifyUnsubscribeToken", () => {
  it("is URL-safe and round-trips without r", () => {
    const token = createUnsubscribeToken(subject, SECRET);
    expect(token).not.toMatch(/[+/=]/);
    expect(verifyUnsubscribeToken(token, SECRET)).toEqual(subject);
  });

  it("round-trips with a campaign-recipient id", () => {
    const token = createUnsubscribeToken({ ...subject, r: "rcpt_9" }, SECRET);
    expect(verifyUnsubscribeToken(token, SECRET)).toEqual({
      ...subject,
      r: "rcpt_9",
    });
  });

  it("defaults to the SIMPLEPRESS_HASH_SECRET env var", () => {
    const token = createUnsubscribeToken(subject);
    expect(verifyUnsubscribeToken(token)).toEqual(subject);
  });

  it("signs under the unsub context, not the bare legacy scheme", () => {
    const token = createUnsubscribeToken(subject, SECRET);
    expect(token).not.toBe(legacyToken(subject));
  });

  it("still accepts a legacy-format token from already-sent emails", () => {
    expect(verifyUnsubscribeToken(legacyToken(subject), SECRET)).toEqual(
      subject,
    );
  });

  it("rejects a real invoice token", () => {
    const token = createInvoiceToken(
      { invoiceId: "inv_1", businessId: "biz_1" },
      SECRET,
    );
    expect(verifyUnsubscribeToken(token, SECRET)).toBeNull();
  });

  it("rejects a real order-status token", () => {
    const token = createOrderStatusToken("order_1", SECRET);
    expect(verifyUnsubscribeToken(token, SECRET)).toBeNull();
  });

  it("rejects a real subscription token", () => {
    const token = createSubscriptionToken(
      { subscriptionId: "sub_1", businessId: "biz_1" },
      SECRET,
    );
    expect(verifyUnsubscribeToken(token, SECRET)).toBeNull();
  });

  it("rejects a legacy-signed payload missing customerId", () => {
    expect(
      verifyUnsubscribeToken(legacyToken({ businessId: "biz_1" }), SECRET),
    ).toBeNull();
  });

  it("rejects empty-string ids", () => {
    for (const payload of [
      { customerId: "", businessId: "biz_1" },
      { customerId: "cust_1", businessId: "" },
    ]) {
      expect(verifyUnsubscribeToken(legacyToken(payload), SECRET)).toBeNull();
      expect(
        verifyUnsubscribeToken(createUnsubscribeToken(payload, SECRET), SECRET),
      ).toBeNull();
    }
  });

  it("rejects non-object and extra-key legacy payloads", () => {
    for (const payload of [
      null,
      "x",
      [subject],
      { ...subject, exp: Date.now() + 1000 },
      { customerId: 1, businessId: "biz_1" },
    ]) {
      expect(verifyUnsubscribeToken(legacyToken(payload), SECRET)).toBeNull();
    }
  });

  it("rejects a tampered payload or signature", () => {
    const token = createUnsubscribeToken(subject, SECRET);
    const dot = token.lastIndexOf(".");
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    expect(
      verifyUnsubscribeToken(`${tamper(payload)}.${sig}`, SECRET),
    ).toBeNull();
    expect(
      verifyUnsubscribeToken(`${payload}.${tamper(sig)}`, SECRET),
    ).toBeNull();
  });

  it("does not verify under a different secret", () => {
    const token = createUnsubscribeToken(subject, SECRET);
    expect(verifyUnsubscribeToken(token, "other-secret")).toBeNull();
    expect(
      verifyUnsubscribeToken(legacyToken(subject), "other-secret"),
    ).toBeNull();
  });

  it("rejects malformed input without throwing", () => {
    for (const bad of ["", "no-dot", "!!!.???", "a.b.c", "test"]) {
      expect(() => verifyUnsubscribeToken(bad, SECRET)).not.toThrow();
      expect(verifyUnsubscribeToken(bad, SECRET)).toBeNull();
    }
  });
});
