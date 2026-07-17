import { describe, expect, it } from "vitest";

import {
  signPartnerRequest,
  timingSafeCompare,
  verifyPartnerRequest,
} from "./partner-auth";

// ---------------------------------------------------------------------------
// SHARED CROSS-REPO TEST VECTORS — must match artisanal-futures-site
// partner-auth tests. These are deterministic fixtures for
// hmac-sha256(secret, `${timestamp}.${body}`), formatted `v1=<hex>`. Do NOT
// change a value here without updating the identical block in the AF repo, or
// the two implementations will silently diverge.
// ---------------------------------------------------------------------------
export const PARTNER_AUTH_TEST_VECTORS = [
  {
    secret: "test-webhook-secret-1",
    timestamp: 1752537600,
    body: '{"afProvisionCode":"A1B2C3D4","businessName":"Rosa\'s Textiles","email":"rosa@example.com"}',
    expectedSignature:
      "v1=c7fb2f69f12dd3ad4affabb128701857dfec3418a6a3be6099e59eee26f8a5cd",
  },
  {
    // GET request: rawBody is the canonical query string.
    secret: "test-webhook-secret-1",
    timestamp: 1752537600,
    body: "code=A1B2C3D4",
    expectedSignature:
      "v1=28cb70935273a828070170d5734df30d80c8500c1cacb473322ab9d237ffcc91",
  },
  {
    secret: "another-secret",
    timestamp: 1752537661,
    body: "{}",
    expectedSignature:
      "v1=5e87ab3766cf4b4f4609359fa084a7287e5ed97d05e48c18d83d6b47aa43292f",
  },
] as const;

const BEARER = "inbound-partner-bearer-token";

/** Build a correctly-signed Request from a vector-like fixture. */
function makeSignedRequest(args: {
  bearer: string;
  hmacSecret: string;
  rawBody: string;
  timestamp: number;
  // overrides to forge/tamper with the request
  signature?: string;
}): Request {
  const { signature } = signPartnerRequest(
    args.rawBody,
    args.hmacSecret,
    args.timestamp,
  );
  return new Request("https://sp.example/api/partner/provision", {
    method: "POST",
    headers: {
      authorization: `Bearer ${args.bearer}`,
      "x-partner-timestamp": String(args.timestamp),
      "x-partner-signature": args.signature ?? signature,
      "content-type": "application/json",
    },
    body: args.rawBody,
  });
}

describe("signPartnerRequest", () => {
  it.each(PARTNER_AUTH_TEST_VECTORS)(
    "signs vector ($body) to its expected signature",
    ({ secret, timestamp, body, expectedSignature }) => {
      const { signature, timestamp: outTs } = signPartnerRequest(
        body,
        secret,
        timestamp,
      );
      expect(signature).toBe(expectedSignature);
      expect(outTs).toBe(timestamp);
    },
  );

  it("formats the signature as v1=<hex>", () => {
    const { signature } = signPartnerRequest("{}", "s", 1);
    expect(signature).toMatch(/^v1=[0-9a-f]{64}$/);
  });

  it("defaults timestamp to now when omitted", () => {
    const before = Math.floor(Date.now() / 1000);
    const { timestamp } = signPartnerRequest("{}", "s");
    const after = Math.floor(Date.now() / 1000);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });
});

describe("timingSafeCompare", () => {
  it("returns true for equal strings", () => {
    expect(timingSafeCompare("hello world", "hello world")).toBe(true);
  });

  it("returns false for differing strings of equal length", () => {
    expect(timingSafeCompare("hello world", "hello w0rld")).toBe(false);
  });

  it("returns false for differing lengths without throwing", () => {
    expect(timingSafeCompare("short", "a much longer string")).toBe(false);
    expect(timingSafeCompare("", "x")).toBe(false);
  });

  it("returns true for two empty strings", () => {
    expect(timingSafeCompare("", "")).toBe(true);
  });
});

describe("verifyPartnerRequest", () => {
  const rawBody = PARTNER_AUTH_TEST_VECTORS[0].body;
  const hmacSecret = PARTNER_AUTH_TEST_VECTORS[0].secret;
  const now = PARTNER_AUTH_TEST_VECTORS[0].timestamp;

  it("accepts a correctly-signed request", () => {
    const req = makeSignedRequest({ bearer: BEARER, hmacSecret, rawBody, timestamp: now });
    expect(
      verifyPartnerRequest(req, { bearer: BEARER, hmacSecret, rawBody, nowSeconds: now }),
    ).toEqual({ ok: true });
  });

  it("accepts a GET-style request signed over its query string", () => {
    const q = "code=A1B2C3D4";
    const req = makeSignedRequest({ bearer: BEARER, hmacSecret, rawBody: q, timestamp: now });
    expect(
      verifyPartnerRequest(req, { bearer: BEARER, hmacSecret, rawBody: q, nowSeconds: now }),
    ).toEqual({ ok: true });
  });

  it("rejects a wrong bearer", () => {
    const req = makeSignedRequest({ bearer: "wrong-token", hmacSecret, rawBody, timestamp: now });
    expect(
      verifyPartnerRequest(req, { bearer: BEARER, hmacSecret, rawBody, nowSeconds: now }),
    ).toEqual({ ok: false, reason: "bearer" });
  });

  it("rejects a missing Authorization header", () => {
    const req = new Request("https://sp.example/x", {
      method: "POST",
      headers: {
        "x-partner-timestamp": String(now),
        "x-partner-signature": signPartnerRequest(rawBody, hmacSecret, now).signature,
      },
      body: rawBody,
    });
    expect(
      verifyPartnerRequest(req, { bearer: BEARER, hmacSecret, rawBody, nowSeconds: now }),
    ).toEqual({ ok: false, reason: "bearer" });
  });

  it("rejects a stale timestamp (too old, >300s)", () => {
    const req = makeSignedRequest({ bearer: BEARER, hmacSecret, rawBody, timestamp: now });
    expect(
      verifyPartnerRequest(req, {
        bearer: BEARER,
        hmacSecret,
        rawBody,
        nowSeconds: now + 301,
      }),
    ).toEqual({ ok: false, reason: "timestamp" });
  });

  it("rejects a future timestamp (>300s ahead)", () => {
    const req = makeSignedRequest({ bearer: BEARER, hmacSecret, rawBody, timestamp: now });
    expect(
      verifyPartnerRequest(req, {
        bearer: BEARER,
        hmacSecret,
        rawBody,
        nowSeconds: now - 301,
      }),
    ).toEqual({ ok: false, reason: "timestamp" });
  });

  it("accepts a timestamp exactly at the 300s boundary", () => {
    const req = makeSignedRequest({ bearer: BEARER, hmacSecret, rawBody, timestamp: now });
    expect(
      verifyPartnerRequest(req, {
        bearer: BEARER,
        hmacSecret,
        rawBody,
        nowSeconds: now + 300,
      }),
    ).toEqual({ ok: true });
  });

  it("rejects a non-numeric timestamp header", () => {
    const req = new Request("https://sp.example/x", {
      method: "POST",
      headers: {
        authorization: `Bearer ${BEARER}`,
        "x-partner-timestamp": "not-a-number",
        "x-partner-signature": signPartnerRequest(rawBody, hmacSecret, now).signature,
      },
      body: rawBody,
    });
    expect(
      verifyPartnerRequest(req, { bearer: BEARER, hmacSecret, rawBody, nowSeconds: now }),
    ).toEqual({ ok: false, reason: "timestamp" });
  });

  it("rejects a tampered body (signature no longer matches)", () => {
    const req = makeSignedRequest({ bearer: BEARER, hmacSecret, rawBody, timestamp: now });
    // Verify against a different rawBody than what was signed.
    expect(
      verifyPartnerRequest(req, {
        bearer: BEARER,
        hmacSecret,
        rawBody: rawBody.replace("Rosa", "Mallory"),
        nowSeconds: now,
      }),
    ).toEqual({ ok: false, reason: "signature" });
  });

  it("rejects a valid-format signature computed with the wrong key", () => {
    const req = makeSignedRequest({
      bearer: BEARER,
      hmacSecret: "attacker-key",
      rawBody,
      timestamp: now,
    });
    expect(
      verifyPartnerRequest(req, { bearer: BEARER, hmacSecret, rawBody, nowSeconds: now }),
    ).toEqual({ ok: false, reason: "signature" });
  });

  it("rejects a malformed signature header (no v1= prefix)", () => {
    const req = makeSignedRequest({
      bearer: BEARER,
      hmacSecret,
      rawBody,
      timestamp: now,
      signature: "deadbeef",
    });
    expect(
      verifyPartnerRequest(req, { bearer: BEARER, hmacSecret, rawBody, nowSeconds: now }),
    ).toEqual({ ok: false, reason: "malformed" });
  });

  it("rejects a missing signature header as malformed", () => {
    const req = new Request("https://sp.example/x", {
      method: "POST",
      headers: {
        authorization: `Bearer ${BEARER}`,
        "x-partner-timestamp": String(now),
      },
      body: rawBody,
    });
    expect(
      verifyPartnerRequest(req, { bearer: BEARER, hmacSecret, rawBody, nowSeconds: now }),
    ).toEqual({ ok: false, reason: "malformed" });
  });
});
