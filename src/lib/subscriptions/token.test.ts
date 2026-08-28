import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSubscriptionToken, verifySubscriptionToken } from "./token";

const SECRET = "test-secret";

describe("createSubscriptionToken / verifySubscriptionToken", () => {
  it("returns a URL-safe string (no '+', '/', or '=')", () => {
    const token = createSubscriptionToken(
      { subscriptionId: "sub_row_123", businessId: "biz_1" },
      SECRET,
    );
    expect(token).not.toMatch(/[+/=]/);
  });

  it("round-trips: create then verify returns the subscriptionId and businessId", () => {
    const token = createSubscriptionToken(
      { subscriptionId: "sub_row_123", businessId: "biz_1" },
      SECRET,
    );
    expect(verifySubscriptionToken(token, SECRET)).toEqual({
      subscriptionId: "sub_row_123",
      businessId: "biz_1",
    });
  });

  it("embeds the businessId the token was minted for — different businesses round-trip to different ids", () => {
    const tokenA = createSubscriptionToken(
      { subscriptionId: "sub_row_1", businessId: "biz_A" },
      SECRET,
    );
    const tokenB = createSubscriptionToken(
      { subscriptionId: "sub_row_1", businessId: "biz_B" },
      SECRET,
    );

    const payloadA = verifySubscriptionToken(tokenA, SECRET);
    const payloadB = verifySubscriptionToken(tokenB, SECRET);

    expect(payloadA?.businessId).toBe("biz_A");
    expect(payloadB?.businessId).toBe("biz_B");
    expect(payloadA?.businessId).not.toBe(payloadB?.businessId);
  });

  it("rejects a token with a tampered payload", () => {
    const token = createSubscriptionToken(
      { subscriptionId: "sub_row_123", businessId: "biz_1" },
      SECRET,
    );
    const dotIndex = token.lastIndexOf(".");
    const payload = token.slice(0, dotIndex);
    const sig = token.slice(dotIndex + 1);
    const tamperedPayload =
      payload.slice(0, -1) + (payload.endsWith("A") ? "B" : "A");
    const tamperedToken = `${tamperedPayload}.${sig}`;
    expect(verifySubscriptionToken(tamperedToken, SECRET)).toBeNull();
  });

  it("rejects a token with a tampered signature", () => {
    const token = createSubscriptionToken(
      { subscriptionId: "sub_row_123", businessId: "biz_1" },
      SECRET,
    );
    const dotIndex = token.lastIndexOf(".");
    const payload = token.slice(0, dotIndex);
    const sig = token.slice(dotIndex + 1);
    const tamperedSig = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
    const tamperedToken = `${payload}.${tamperedSig}`;
    expect(verifySubscriptionToken(tamperedToken, SECRET)).toBeNull();
  });

  it("rejects a signature of the wrong length without throwing", () => {
    const token = createSubscriptionToken(
      { subscriptionId: "sub_row_123", businessId: "biz_1" },
      SECRET,
    );
    expect(() => verifySubscriptionToken(token + "x", SECRET)).not.toThrow();
    expect(verifySubscriptionToken(token + "x", SECRET)).toBeNull();
  });

  it("rejects a malformed token with no '.' separator", () => {
    expect(verifySubscriptionToken("not-a-valid-token", SECRET)).toBeNull();
  });

  it("rejects an empty string without throwing", () => {
    expect(() => verifySubscriptionToken("", SECRET)).not.toThrow();
    expect(verifySubscriptionToken("", SECRET)).toBeNull();
  });

  it("rejects garbage input without throwing", () => {
    expect(() =>
      verifySubscriptionToken("!!!not.base64url!!!", SECRET),
    ).not.toThrow();
    expect(verifySubscriptionToken("!!!not.base64url!!!", SECRET)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = createSubscriptionToken(
      { subscriptionId: "sub_row_123", businessId: "biz_1" },
      SECRET,
    );
    expect(verifySubscriptionToken(token, "other-secret")).toBeNull();
  });

  it("defaults to the SIMPLEPRESS_HASH_SECRET env var when no secret is passed", () => {
    // tests/helpers/test-env.ts sets SIMPLEPRESS_HASH_SECRET to a fixed test
    // value, so create/verify without an explicit secret must still agree
    // with each other (and disagree with an unrelated secret).
    const token = createSubscriptionToken({
      subscriptionId: "sub_row_123",
      businessId: "biz_1",
    });
    expect(verifySubscriptionToken(token)).toEqual({
      subscriptionId: "sub_row_123",
      businessId: "biz_1",
    });
    expect(
      verifySubscriptionToken(token, "definitely-not-the-env-secret"),
    ).toBeNull();
  });

  describe("expiry (180-day TTL)", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("rejects a token past 180 days", () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      const token = createSubscriptionToken(
        { subscriptionId: "sub_row_123", businessId: "biz_1" },
        SECRET,
      );

      vi.setSystemTime(
        new Date("2026-01-01T00:00:00Z").getTime() + 181 * 24 * 60 * 60 * 1000,
      );

      expect(verifySubscriptionToken(token, SECRET)).toBeNull();
    });

    it("still verifies a token at 179 days", () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      const token = createSubscriptionToken(
        { subscriptionId: "sub_row_123", businessId: "biz_1" },
        SECRET,
      );

      vi.setSystemTime(
        new Date("2026-01-01T00:00:00Z").getTime() + 179 * 24 * 60 * 60 * 1000,
      );

      expect(verifySubscriptionToken(token, SECRET)).toEqual({
        subscriptionId: "sub_row_123",
        businessId: "biz_1",
      });
    });
  });
});
