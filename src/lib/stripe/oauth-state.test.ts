import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSignedOAuthState, verifySignedOAuthState } from "./oauth-state";

const SECRET = "test-hash-secret";

/**
 * Standalone re-implementation of the module's private base64url-encode +
 * HMAC-sign steps. Needed to hand-craft adversarial states that
 * `createSignedOAuthState` itself would never produce (an encoded payload
 * containing a literal ".", or a payload whose decoded bytes aren't valid
 * JSON) while still presenting a signature that verifies under SECRET.
 */
function base64url(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

describe("createSignedOAuthState / verifySignedOAuthState", () => {
  it("round-trips: create then verify returns the exact businessId and returnUrl", () => {
    const state = createSignedOAuthState(
      { businessId: "biz_123", returnUrl: "https://mystore.example.com/admin/settings/stripe" },
      SECRET,
    );
    expect(verifySignedOAuthState(state, SECRET)).toEqual({
      businessId: "biz_123",
      returnUrl: "https://mystore.example.com/admin/settings/stripe",
    });
  });

  it("rejects a state with a tampered payload (businessId changed, signature kept)", () => {
    const state = createSignedOAuthState(
      { businessId: "biz_123", returnUrl: "https://example.com/return" },
      SECRET,
    );
    const dotIndex = state.lastIndexOf(".");
    const payload = state.slice(0, dotIndex);
    const sig = state.slice(dotIndex + 1);
    // Flip a character in the encoded payload but keep the original signature —
    // this is exactly the "attacker rewrites businessId, keeps the old sig" attack.
    const tamperedPayload =
      payload.slice(0, -1) + (payload.endsWith("A") ? "B" : "A");
    const tamperedState = `${tamperedPayload}.${sig}`;
    expect(verifySignedOAuthState(tamperedState, SECRET)).toBeNull();
  });

  it("rejects a state with a tampered signature of the same length (content compare, not just length)", () => {
    const state = createSignedOAuthState(
      { businessId: "biz_123", returnUrl: "https://example.com/return" },
      SECRET,
    );
    const dotIndex = state.lastIndexOf(".");
    const payload = state.slice(0, dotIndex);
    const sig = state.slice(dotIndex + 1);
    // Same length as the real signature, single character flipped — the early
    // `receivedSig.length !== expectedSig.length` check cannot short-circuit
    // this, so it must be the byte-by-byte compare that rejects it.
    const tamperedSig = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
    expect(tamperedSig.length).toBe(sig.length);
    const tamperedState = `${payload}.${tamperedSig}`;
    expect(verifySignedOAuthState(tamperedState, SECRET)).toBeNull();
  });

  it("rejects a truncated (wrong-length) signature without throwing", () => {
    const state = createSignedOAuthState(
      { businessId: "biz_123", returnUrl: "https://example.com/return" },
      SECRET,
    );
    const dotIndex = state.lastIndexOf(".");
    const payload = state.slice(0, dotIndex);
    const sig = state.slice(dotIndex + 1);
    const truncatedState = `${payload}.${sig.slice(0, -4)}`;
    expect(() => verifySignedOAuthState(truncatedState, SECRET)).not.toThrow();
    expect(verifySignedOAuthState(truncatedState, SECRET)).toBeNull();
  });

  it("rejects a state signed with a different secret", () => {
    const state = createSignedOAuthState(
      { businessId: "biz_123", returnUrl: "https://example.com/return" },
      "some-other-secret",
    );
    expect(verifySignedOAuthState(state, SECRET)).toBeNull();
  });

  describe("malformed input", () => {
    it("rejects an empty string", () => {
      expect(verifySignedOAuthState("", SECRET)).toBeNull();
    });

    it("rejects a string with no '.' separator", () => {
      expect(verifySignedOAuthState("not-a-valid-state", SECRET)).toBeNull();
    });

    it("rejects non-base64 garbage (payload and signature both bogus) without throwing", () => {
      const garbage = "!!!totally-not-base64!!!.also-garbage-#$%";
      expect(() => verifySignedOAuthState(garbage, SECRET)).not.toThrow();
      expect(verifySignedOAuthState(garbage, SECRET)).toBeNull();
    });

    it("rejects a payload that decodes to invalid JSON even under a genuinely valid signature", () => {
      // Sign a payload segment that is NOT base64url-encoded JSON — the HMAC
      // check will pass (it's computed over the raw string, whatever it is),
      // but decoding + JSON.parse must fail closed via the try/catch.
      const bogusPayload = "!!!not-base64-json-garbage!!!";
      const validSig = signPayload(bogusPayload, SECRET);
      const state = `${bogusPayload}.${validSig}`;
      expect(verifySignedOAuthState(state, SECRET)).toBeNull();
    });

    it("uses lastIndexOf('.') so an encoded payload containing an embedded dot still verifies", () => {
      // The wire format is `<payload>.<sig>`, split via `lastIndexOf(".")`.
      // Construct a state whose payload segment itself contains a literal "."
      // (Node's base64 decoder silently ignores characters outside the
      // alphabet, so the "." is dropped and the original JSON is recovered
      // intact) with a signature computed over that exact dotted string, and
      // confirm the last dot — not the first — is treated as the real
      // separator.
      const payload = { businessId: "biz_dot", returnUrl: "https://example.com/x" };
      const encodedPayload = base64url(JSON.stringify(payload));
      const mid = Math.floor(encodedPayload.length / 2);
      const withEmbeddedDot =
        encodedPayload.slice(0, mid) + "." + encodedPayload.slice(mid);
      const sig = signPayload(withEmbeddedDot, SECRET);
      const state = `${withEmbeddedDot}.${sig}`;

      // Sanity check: this state does contain more than one ".".
      expect(state.split(".").length).toBeGreaterThan(2);

      expect(verifySignedOAuthState(state, SECRET)).toEqual({
        businessId: "biz_dot",
        returnUrl: "https://example.com/x",
      });
    });
  });

  describe("expiry", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // The module's TTL is a fixed 15 minutes (STATE_TTL_MS) added to
    // Date.now() at creation time, and the check is a strict
    // `Date.now() > payload.exp`. That means the comparison is inclusive at
    // the boundary: a state is still valid at the exact millisecond of
    // `exp`, and only rejected the millisecond after.
    const STATE_TTL_MS = 15 * 60 * 1000;

    it("still verifies a state at the exact expiry millisecond (boundary is inclusive)", () => {
      const start = new Date("2026-01-01T00:00:00.000Z");
      vi.setSystemTime(start);
      const state = createSignedOAuthState(
        { businessId: "biz_123", returnUrl: "https://example.com/return" },
        SECRET,
      );

      vi.setSystemTime(new Date(start.getTime() + STATE_TTL_MS));

      expect(verifySignedOAuthState(state, SECRET)).toEqual({
        businessId: "biz_123",
        returnUrl: "https://example.com/return",
      });
    });

    it("rejects a state one millisecond past expiry", () => {
      const start = new Date("2026-01-01T00:00:00.000Z");
      vi.setSystemTime(start);
      const state = createSignedOAuthState(
        { businessId: "biz_123", returnUrl: "https://example.com/return" },
        SECRET,
      );

      vi.setSystemTime(new Date(start.getTime() + STATE_TTL_MS + 1));

      expect(verifySignedOAuthState(state, SECRET)).toBeNull();
    });
  });

  // The module hand-rolls its own constant-time-ish comparison rather than
  // using node:crypto's timingSafeEqual (contrast with
  // src/lib/order-status-token.ts, which uses the built-in). It is not
  // exported, so it is exercised only indirectly here: the round-trip test
  // above proves it returns true for two identical, equal-length strings; the
  // "tampered signature" test proves it returns false for two different,
  // equal-length strings (rather than relying on the separate length
  // short-circuit, which is covered on its own by the truncated-signature
  // test).
});
