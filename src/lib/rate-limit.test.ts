import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = ["TRUSTED_PROXY_IPS"] as const;

async function loadRateLimit(trustedProxyIps?: string) {
  vi.resetModules();
  if (trustedProxyIps === undefined) {
    delete process.env.TRUSTED_PROXY_IPS;
  } else {
    process.env.TRUSTED_PROXY_IPS = trustedProxyIps;
  }
  return import("./rate-limit");
}

let original: string | undefined;

beforeEach(() => {
  original = process.env.TRUSTED_PROXY_IPS;
});

afterEach(() => {
  if (original === undefined) delete process.env.TRUSTED_PROXY_IPS;
  else process.env.TRUSTED_PROXY_IPS = original;
  vi.restoreAllMocks();
});

describe("getClientIp / getClientIpFromHeaders", () => {
  it("falls back to unknown with no headers", async () => {
    const { getClientIpFromHeaders } = await loadRateLimit();
    expect(getClientIpFromHeaders(new Headers())).toBe("unknown");
  });

  it("uses leftmost XFF when trusted proxies are not configured", async () => {
    const { getClientIpFromHeaders } = await loadRateLimit("");
    const headers = new Headers({
      "x-forwarded-for": "9.9.9.9, 10.0.0.1",
    });
    expect(getClientIpFromHeaders(headers)).toBe("9.9.9.9");
  });

  it("ignores a forged leftmost XFF when trusted proxies are configured", async () => {
    const { getClientIpFromHeaders } = await loadRateLimit("10.0.0.1");
    const headers = new Headers({
      "x-forwarded-for": "9.9.9.9, 203.0.113.50, 10.0.0.1",
    });
    // Rightmost untrusted hop is the real client.
    expect(getClientIpFromHeaders(headers)).toBe("203.0.113.50");
  });

  it("walks past multiple trusted proxies", async () => {
    const { getClientIp } = await loadRateLimit("10.0.0.1,10.0.0.2");
    const req = new Request("https://example.com", {
      headers: {
        "x-forwarded-for": "198.51.100.7, 10.0.0.2, 10.0.0.1",
      },
    });
    expect(getClientIp(req)).toBe("198.51.100.7");
  });

  it("returns unknown when the entire chain is trusted", async () => {
    const { getClientIpFromHeaders } = await loadRateLimit("10.0.0.1");
    const headers = new Headers({ "x-forwarded-for": "10.0.0.1" });
    expect(getClientIpFromHeaders(headers)).toBe("unknown");
  });
});

// Silence unused ENV_KEYS lint if the suite grows.
void ENV_KEYS;
