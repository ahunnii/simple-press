import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createOrderStatusToken,
  verifyOrderStatusToken,
} from "./order-status-token";

const SECRET = "test-secret";

describe("createOrderStatusToken / verifyOrderStatusToken", () => {
  it("round-trips: create then verify returns the orderId", () => {
    const token = createOrderStatusToken("order_123", SECRET);
    expect(verifyOrderStatusToken(token, SECRET)).toEqual({
      orderId: "order_123",
    });
  });

  it("rejects a token with a tampered payload", () => {
    const token = createOrderStatusToken("order_123", SECRET);
    const dotIndex = token.lastIndexOf(".");
    const payload = token.slice(0, dotIndex);
    const sig = token.slice(dotIndex + 1);
    // Flip the payload but keep the original signature.
    const tamperedPayload =
      payload.slice(0, -1) + (payload.endsWith("A") ? "B" : "A");
    const tamperedToken = `${tamperedPayload}.${sig}`;
    expect(verifyOrderStatusToken(tamperedToken, SECRET)).toBeNull();
  });

  it("rejects a token with a tampered signature", () => {
    const token = createOrderStatusToken("order_123", SECRET);
    const dotIndex = token.lastIndexOf(".");
    const payload = token.slice(0, dotIndex);
    const sig = token.slice(dotIndex + 1);
    const tamperedSig = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
    const tamperedToken = `${payload}.${tamperedSig}`;
    expect(verifyOrderStatusToken(tamperedToken, SECRET)).toBeNull();
  });

  it("rejects a signature of the wrong length without throwing", () => {
    const token = createOrderStatusToken("order_123", SECRET);
    expect(() => verifyOrderStatusToken(token + "x", SECRET)).not.toThrow();
    expect(verifyOrderStatusToken(token + "x", SECRET)).toBeNull();
  });

  it("rejects a malformed token with no '.' separator", () => {
    expect(verifyOrderStatusToken("not-a-valid-token", SECRET)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = createOrderStatusToken("order_123", SECRET);
    expect(verifyOrderStatusToken(token, "other-secret")).toBeNull();
  });

  describe("expiry", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("rejects an expired token", () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      const token = createOrderStatusToken("order_123", SECRET);

      // TTL is 90 days — advance 91 days.
      vi.setSystemTime(
        new Date("2026-01-01T00:00:00Z").getTime() +
          91 * 24 * 60 * 60 * 1000,
      );

      expect(verifyOrderStatusToken(token, SECRET)).toBeNull();
    });

    it("still verifies a token just before expiry", () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      const token = createOrderStatusToken("order_123", SECRET);

      vi.setSystemTime(
        new Date("2026-01-01T00:00:00Z").getTime() +
          89 * 24 * 60 * 60 * 1000,
      );

      expect(verifyOrderStatusToken(token, SECRET)).toEqual({
        orderId: "order_123",
      });
    });
  });
});
