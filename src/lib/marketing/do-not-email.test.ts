import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";

import { hashEmailForDoNotEmail } from "./do-not-email";

const SECRET = "test-secret";

function hmacHex(message: string, secret = SECRET): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}

describe("hashEmailForDoNotEmail", () => {
  it("is deterministic hex SHA-256 output", () => {
    const a = hashEmailForDoNotEmail("foo@example.com", SECRET);
    expect(a).toBe(hashEmailForDoNotEmail("foo@example.com", SECRET));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("normalizes case and surrounding whitespace", () => {
    expect(hashEmailForDoNotEmail("  Foo@X.com ", SECRET)).toBe(
      hashEmailForDoNotEmail("foo@x.com", SECRET),
    );
  });

  it("distinguishes different addresses and secrets", () => {
    const base = hashEmailForDoNotEmail("foo@x.com", SECRET);
    expect(hashEmailForDoNotEmail("bar@x.com", SECRET)).not.toBe(base);
    expect(hashEmailForDoNotEmail("foo@x.com", "other-secret")).not.toBe(base);
  });

  it("is the dne:v1 context-prefixed HMAC, not a bare or other-context MAC", () => {
    const hash = hashEmailForDoNotEmail("foo@x.com", SECRET);
    expect(hash).toBe(hmacHex("dne:v1:foo@x.com"));
    expect(hash).not.toBe(hmacHex("foo@x.com"));
    for (const context of [
      "unsub:v1",
      "nl-confirm:v1",
      "pending_session:v1",
      "pending_subscription_session:v1",
    ]) {
      expect(hash).not.toBe(hmacHex(`${context}:foo@x.com`));
    }
  });

  it("defaults to the SIMPLEPRESS_HASH_SECRET env var", () => {
    expect(hashEmailForDoNotEmail("foo@x.com")).toBe(
      hashEmailForDoNotEmail("foo@x.com", process.env.SIMPLEPRESS_HASH_SECRET),
    );
  });
});
