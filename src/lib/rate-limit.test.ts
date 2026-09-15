import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  it("uses the rightmost XFF entry when trusted proxies are not configured", async () => {
    const { getClientIpFromHeaders } = await loadRateLimit("");
    const headers = new Headers({
      "x-forwarded-for": "9.9.9.9, 10.0.0.1",
    });
    // NOT "9.9.9.9" — the leftmost entry is whatever the client sent.
    expect(getClientIpFromHeaders(headers)).toBe("10.0.0.1");
  });

  it("does not trust a spoofed leftmost XFF with no trusted proxies configured", async () => {
    const { getClientIpFromHeaders } = await loadRateLimit();
    const spoofed = new Headers({
      "x-forwarded-for": "1.1.1.1, 198.51.100.7",
    });
    const rotated = new Headers({
      "x-forwarded-for": "2.2.2.2, 198.51.100.7",
    });
    // Rotating the client-supplied portion must not change the limiter key.
    expect(getClientIpFromHeaders(spoofed)).toBe("198.51.100.7");
    expect(getClientIpFromHeaders(rotated)).toBe("198.51.100.7");
  });

  it("uses the single XFF entry when there is only one", async () => {
    const { getClientIpFromHeaders } = await loadRateLimit();
    const headers = new Headers({ "x-forwarded-for": "203.0.113.9" });
    expect(getClientIpFromHeaders(headers)).toBe("203.0.113.9");
  });

  it("trims whitespace around XFF entries", async () => {
    const { getClientIpFromHeaders } = await loadRateLimit();
    const headers = new Headers({
      "x-forwarded-for": "  9.9.9.9 ,   198.51.100.7   ",
    });
    expect(getClientIpFromHeaders(headers)).toBe("198.51.100.7");
  });

  it("skips empty XFF entries", async () => {
    const { getClientIpFromHeaders } = await loadRateLimit();
    const headers = new Headers({
      "x-forwarded-for": "9.9.9.9, , ",
    });
    expect(getClientIpFromHeaders(headers)).toBe("9.9.9.9");
  });

  it("falls back to x-real-ip when XFF is absent", async () => {
    const { getClientIpFromHeaders } = await loadRateLimit();
    const headers = new Headers({ "x-real-ip": "  198.51.100.22  " });
    expect(getClientIpFromHeaders(headers)).toBe("198.51.100.22");
  });

  it("prefers XFF over x-real-ip", async () => {
    const { getClientIpFromHeaders } = await loadRateLimit();
    const headers = new Headers({
      "x-forwarded-for": "9.9.9.9, 198.51.100.7",
      "x-real-ip": "203.0.113.5",
    });
    expect(getClientIpFromHeaders(headers)).toBe("198.51.100.7");
  });

  it("returns unknown for a blank x-real-ip", async () => {
    const { getClientIpFromHeaders } = await loadRateLimit();
    const headers = new Headers({ "x-real-ip": "   " });
    expect(getClientIpFromHeaders(headers)).toBe("unknown");
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

  it("tolerates whitespace in the trusted proxy list", async () => {
    const { getClientIpFromHeaders } = await loadRateLimit(
      " 10.0.0.1 , 10.0.0.2 ",
    );
    const headers = new Headers({
      "x-forwarded-for": "9.9.9.9, 198.51.100.7, 10.0.0.2, 10.0.0.1",
    });
    expect(getClientIpFromHeaders(headers)).toBe("198.51.100.7");
  });

  it("returns unknown when the entire chain is trusted", async () => {
    const { getClientIpFromHeaders } = await loadRateLimit("10.0.0.1");
    const headers = new Headers({ "x-forwarded-for": "10.0.0.1" });
    expect(getClientIpFromHeaders(headers)).toBe("unknown");
  });

  it("falls back to x-real-ip when trusted proxies are set but XFF is absent", async () => {
    const { getClientIpFromHeaders } = await loadRateLimit("10.0.0.1");
    const headers = new Headers({ "x-real-ip": "198.51.100.30" });
    expect(getClientIpFromHeaders(headers)).toBe("198.51.100.30");
  });
});
