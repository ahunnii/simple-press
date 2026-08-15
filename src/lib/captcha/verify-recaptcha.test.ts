/**
 * `verifyRecaptcha` is the fail-closed replacement for the old hCaptcha
 * verifier. Every rejection path here matters: this suite exists to prove
 * the old fail-open bug (blank secret → `true`) cannot recur, and that the
 * action/hostname binding actually blocks cross-form and cross-tenant token
 * replay. `fetch` is mocked throughout — nothing here talks to Google.
 *
 * ── Why every test goes through `loadVerifyRecaptcha()` instead of a single
 * top-level import ──
 *
 * `~/env` (`@t3-oss/env-nextjs`, `skipValidation: true` under
 * `SKIP_ENV_VALIDATION=1` in tests) returns the raw `runtimeEnv` object
 * as-is (see the library source) — it is a PLAIN OBJECT SNAPSHOTTED ONCE,
 * built from `process.env` at the moment `env.js` first evaluates in this
 * module's realm, not a live view. Mutating `process.env.RECAPTCHA_SECRET_KEY`
 * after that first import has no effect on `env.RECAPTCHA_SECRET_KEY`.
 *
 * Since this suite needs many different `RECAPTCHA_SECRET_KEY` /
 * `RECAPTCHA_MIN_SCORE` / `NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS` combinations,
 * each test resets the module registry and re-imports `verify-recaptcha.ts`
 * (and therefore a fresh `~/env`) after setting `process.env` for that case.
 * `NODE_ENV` is the one exception that doesn't need this: `verify-recaptcha.ts`
 * reads `process.env.NODE_ENV` directly (not through `~/env`) inside the
 * function body, so it's live and only needs `vi.stubEnv` right before the call.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/lib/captcha/known-hosts", () => ({
  isKnownCaptchaHost: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const ENV_KEYS = [
  "RECAPTCHA_SECRET_KEY",
  "RECAPTCHA_MIN_SCORE",
  "NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS",
] as const;

type EnvOverrides = Partial<Record<(typeof ENV_KEYS)[number], string>>;

async function loadVerifyRecaptcha(overrides: EnvOverrides = {}) {
  vi.resetModules();
  for (const key of ENV_KEYS) {
    const value = overrides[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  const knownHosts = await import("~/lib/captcha/known-hosts");
  const { verifyRecaptcha, RECAPTCHA_TEST_BYPASS_TOKEN } =
    await import("./verify-recaptcha");

  return {
    verifyRecaptcha,
    RECAPTCHA_TEST_BYPASS_TOKEN,
    isKnownCaptchaHost: vi.mocked(knownHosts.isKnownCaptchaHost),
  };
}

function mockFetchResponse(
  body: Record<string, unknown>,
  opts: { ok?: boolean; status?: number } = {},
) {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    json: () => Promise.resolve(body),
  } as unknown as Response);
}

let originalEnv: Record<string, string | undefined>;

beforeEach(() => {
  originalEnv = {};
  for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

const REQUEST_HOST = "tenant.simplepress.test";
const ACTION = "auth";

describe("verifyRecaptcha — missing token", () => {
  it("rejects an empty string with missing-token", async () => {
    const { verifyRecaptcha } = await loadVerifyRecaptcha();
    const result = await verifyRecaptcha("", {
      action: ACTION,
      requestHost: REQUEST_HOST,
    });
    expect(result).toEqual({ ok: false, reason: "missing-token" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only token with missing-token", async () => {
    const { verifyRecaptcha } = await loadVerifyRecaptcha();
    const result = await verifyRecaptcha("   ", {
      action: ACTION,
      requestHost: REQUEST_HOST,
    });
    expect(result).toEqual({ ok: false, reason: "missing-token" });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("verifyRecaptcha — fail-closed on missing secret", () => {
  it("returns provider-error (never ok: true) when RECAPTCHA_SECRET_KEY is unset", async () => {
    // This is the exact bug the migration exists to kill: the old
    // verify-hcaptcha.ts returned `true` when its secret was blank, silently
    // disabling captcha platform-wide. Assert both the reason AND that ok is
    // strictly false — a loose `.ok` check could pass on a typo'd reason.
    const { verifyRecaptcha } = await loadVerifyRecaptcha({
      RECAPTCHA_SECRET_KEY: undefined,
    });

    const result = await verifyRecaptcha("some-real-token", {
      action: ACTION,
      requestHost: REQUEST_HOST,
    });

    expect(result.ok).toBe(false);
    expect(result).toEqual({ ok: false, reason: "provider-error" });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("verifyRecaptcha — siteverify says success:false", () => {
  it("returns failed", async () => {
    const { verifyRecaptcha } = await loadVerifyRecaptcha({
      RECAPTCHA_SECRET_KEY: "secret",
    });
    mockFetchResponse({
      success: false,
      "error-codes": ["invalid-input-response"],
    });

    const result = await verifyRecaptcha("token", {
      action: ACTION,
      requestHost: REQUEST_HOST,
    });

    expect(result).toEqual({ ok: false, reason: "failed" });
  });
});

describe("verifyRecaptcha — score below threshold", () => {
  it("returns low-score when score < RECAPTCHA_MIN_SCORE", async () => {
    const { verifyRecaptcha } = await loadVerifyRecaptcha({
      RECAPTCHA_SECRET_KEY: "secret",
      RECAPTCHA_MIN_SCORE: "0.5",
    });
    mockFetchResponse({
      success: true,
      score: 0.3,
      action: ACTION,
      hostname: REQUEST_HOST,
    });

    const result = await verifyRecaptcha("token", {
      action: ACTION,
      requestHost: REQUEST_HOST,
    });

    expect(result).toEqual({ ok: false, reason: "low-score" });
  });

  it("returns low-score when siteverify omits score entirely", async () => {
    // v3 always returns a score; its absence means we're not talking to a v3
    // key at all — treat it as untrustworthy, not as "score 0".
    const { verifyRecaptcha } = await loadVerifyRecaptcha({
      RECAPTCHA_SECRET_KEY: "secret",
      RECAPTCHA_MIN_SCORE: "0.5",
    });
    mockFetchResponse({
      success: true,
      action: ACTION,
      hostname: REQUEST_HOST,
    });

    const result = await verifyRecaptcha("token", {
      action: ACTION,
      requestHost: REQUEST_HOST,
    });

    expect(result).toEqual({ ok: false, reason: "low-score" });
  });
});

describe("verifyRecaptcha — action binding", () => {
  it("returns bad-action when the action doesn't match (prevents cross-form replay)", async () => {
    const { verifyRecaptcha } = await loadVerifyRecaptcha({
      RECAPTCHA_SECRET_KEY: "secret",
      RECAPTCHA_MIN_SCORE: "0.5",
    });
    mockFetchResponse({
      success: true,
      score: 0.9,
      action: "contact",
      hostname: REQUEST_HOST,
    });

    const result = await verifyRecaptcha("token", {
      action: "auth",
      requestHost: REQUEST_HOST,
    });

    expect(result).toEqual({ ok: false, reason: "bad-action" });
  });
});

describe("verifyRecaptcha — hostname binding (tenant isolation)", () => {
  it("returns host-mismatch when siteverify's hostname differs from the request host", async () => {
    const { verifyRecaptcha, isKnownCaptchaHost } = await loadVerifyRecaptcha({
      RECAPTCHA_SECRET_KEY: "secret",
      RECAPTCHA_MIN_SCORE: "0.5",
    });
    mockFetchResponse({
      success: true,
      score: 0.9,
      action: ACTION,
      hostname: "attacker-tenant.simplepress.test",
    });

    const result = await verifyRecaptcha("token", {
      action: ACTION,
      requestHost: REQUEST_HOST,
    });

    expect(result).toEqual({ ok: false, reason: "host-mismatch" });
    // Must fail before ever consulting the known-hosts allowlist.
    expect(isKnownCaptchaHost).not.toHaveBeenCalled();
  });

  it("compares hostnames port- and case-insensitively", async () => {
    const { verifyRecaptcha, isKnownCaptchaHost } = await loadVerifyRecaptcha({
      RECAPTCHA_SECRET_KEY: "secret",
      RECAPTCHA_MIN_SCORE: "0.5",
    });
    isKnownCaptchaHost.mockResolvedValue(true);
    mockFetchResponse({
      success: true,
      score: 0.9,
      action: ACTION,
      hostname: "Tenant.Simplepress.Test",
    });

    const result = await verifyRecaptcha("token", {
      action: ACTION,
      requestHost: `${REQUEST_HOST}:3000`,
    });

    expect(result.ok).toBe(true);
  });

  it("returns unknown-host when the hostname matches but resolves no live tenant", async () => {
    const { verifyRecaptcha, isKnownCaptchaHost } = await loadVerifyRecaptcha({
      RECAPTCHA_SECRET_KEY: "secret",
      RECAPTCHA_MIN_SCORE: "0.5",
    });
    isKnownCaptchaHost.mockResolvedValue(false);
    mockFetchResponse({
      success: true,
      score: 0.9,
      action: ACTION,
      hostname: REQUEST_HOST,
    });

    const result = await verifyRecaptcha("token", {
      action: ACTION,
      requestHost: REQUEST_HOST,
    });

    expect(result).toEqual({ ok: false, reason: "unknown-host" });
    expect(isKnownCaptchaHost).toHaveBeenCalledWith(REQUEST_HOST);
  });
});

describe("verifyRecaptcha — provider failures fail closed", () => {
  it("returns provider-error when fetch rejects (network failure / timeout)", async () => {
    const { verifyRecaptcha } = await loadVerifyRecaptcha({
      RECAPTCHA_SECRET_KEY: "secret",
    });
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"));

    const result = await verifyRecaptcha("token", {
      action: ACTION,
      requestHost: REQUEST_HOST,
    });

    expect(result).toEqual({ ok: false, reason: "provider-error" });
  });

  it("returns provider-error on a non-2xx siteverify response", async () => {
    const { verifyRecaptcha } = await loadVerifyRecaptcha({
      RECAPTCHA_SECRET_KEY: "secret",
    });
    mockFetchResponse({}, { ok: false, status: 503 });

    const result = await verifyRecaptcha("token", {
      action: ACTION,
      requestHost: REQUEST_HOST,
    });

    expect(result).toEqual({ ok: false, reason: "provider-error" });
  });

  it("returns provider-error when the response body is unparseable JSON", async () => {
    const { verifyRecaptcha } = await loadVerifyRecaptcha({
      RECAPTCHA_SECRET_KEY: "secret",
    });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError("Unexpected token")),
    } as unknown as Response);

    const result = await verifyRecaptcha("token", {
      action: ACTION,
      requestHost: REQUEST_HOST,
    });

    expect(result).toEqual({ ok: false, reason: "provider-error" });
  });
  it("returns provider-error on invalid-input-secret (misconfigured keypair)", async () => {
    const sentry = await import("@sentry/nextjs");
    const { verifyRecaptcha } = await loadVerifyRecaptcha({
      RECAPTCHA_SECRET_KEY: "wrong-secret",
    });
    mockFetchResponse({
      success: false,
      "error-codes": ["invalid-input-secret"],
    });

    const result = await verifyRecaptcha("token", {
      action: ACTION,
      requestHost: REQUEST_HOST,
    });

    expect(result).toEqual({ ok: false, reason: "provider-error" });
    expect(sentry.captureMessage).toHaveBeenCalled();
  });
});

describe("verifyRecaptcha — happy path", () => {
  it("returns ok:true with hostname and score when every check passes", async () => {
    const { verifyRecaptcha, isKnownCaptchaHost } = await loadVerifyRecaptcha({
      RECAPTCHA_SECRET_KEY: "secret",
      RECAPTCHA_MIN_SCORE: "0.5",
    });
    isKnownCaptchaHost.mockResolvedValue(true);
    mockFetchResponse({
      success: true,
      score: 0.87,
      action: ACTION,
      hostname: REQUEST_HOST,
    });

    const result = await verifyRecaptcha("token", {
      action: ACTION,
      requestHost: REQUEST_HOST,
      remoteIp: "203.0.113.5",
    });

    expect(result).toEqual({ ok: true, hostname: REQUEST_HOST, score: 0.87 });
    expect(isKnownCaptchaHost).toHaveBeenCalledWith(REQUEST_HOST);

    // remoteip is forwarded to Google when provided.
    const call = vi.mocked(fetch).mock.calls[0];
    const body = call?.[1]?.body;
    expect(body).toBeInstanceOf(URLSearchParams);
    expect((body as URLSearchParams).toString()).toContain(
      "remoteip=203.0.113.5",
    );
  });
});

describe("verifyRecaptcha — test-bypass sentinel", () => {
  it("is accepted when NODE_ENV !== production AND NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS=1", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { verifyRecaptcha, RECAPTCHA_TEST_BYPASS_TOKEN } =
      await loadVerifyRecaptcha({
        NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS: "1",
      });

    const result = await verifyRecaptcha(RECAPTCHA_TEST_BYPASS_TOKEN, {
      action: ACTION,
      requestHost: REQUEST_HOST,
    });

    expect(result).toEqual({ ok: true, hostname: REQUEST_HOST, score: 1 });
    // Bypass must short-circuit before ever calling out to Google.
    expect(fetch).not.toHaveBeenCalled();
  });

  it("is rejected when NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS is unset, even in dev", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { verifyRecaptcha, RECAPTCHA_TEST_BYPASS_TOKEN } =
      await loadVerifyRecaptcha({
        NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS: undefined,
        RECAPTCHA_SECRET_KEY: undefined,
      });

    const result = await verifyRecaptcha(RECAPTCHA_TEST_BYPASS_TOKEN, {
      action: ACTION,
      requestHost: REQUEST_HOST,
    });

    // Falls through to the normal (fail-closed) path instead of bypassing —
    // proven by landing on provider-error (missing secret) rather than ok:true.
    expect(result).toEqual({ ok: false, reason: "provider-error" });
  });

  it("is rejected when NODE_ENV === production, even with the bypass flag set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { verifyRecaptcha, RECAPTCHA_TEST_BYPASS_TOKEN } =
      await loadVerifyRecaptcha({
        NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS: "1",
        RECAPTCHA_SECRET_KEY: undefined,
      });

    const result = await verifyRecaptcha(RECAPTCHA_TEST_BYPASS_TOKEN, {
      action: ACTION,
      requestHost: REQUEST_HOST,
    });

    expect(result).toEqual({ ok: false, reason: "provider-error" });
  });
});
