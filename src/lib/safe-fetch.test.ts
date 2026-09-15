import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { safeFetch, SafeFetchError } from "./safe-fetch";

const lookupMock = vi.fn();

vi.mock("node:dns/promises", () => ({
  default: {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    lookup: (...args: unknown[]) => lookupMock(...args),
  },
}));

/** Resolve any hostname to a public IP so DNS-lookup tests don't need real network access. */
function mockPublicDns() {
  lookupMock.mockResolvedValue([{ address: "93.184.216.34" }]);
}

function mockFetchResponse(init: {
  status?: number;
  headers?: Record<string, string>;
  body?: Uint8Array<ArrayBuffer>;
}) {
  const status = init.status ?? 200;
  const headers = new Headers(init.headers ?? {});
  const body = init.body ?? new Uint8Array([1, 2, 3]);

  return vi.fn().mockResolvedValue(
    new Response(new Blob([body]), {
      status,
      headers,
    }),
  );
}

beforeEach(() => {
  lookupMock.mockReset();
  lookupMock.mockRejectedValue(new Error("ENOTFOUND (unmocked lookup)"));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("safeFetch", () => {
  it("rejects http:// URLs", async () => {
    await expect(safeFetch("http://example.com/logo.png")).rejects.toThrow(
      SafeFetchError,
    );
    await expect(safeFetch("http://example.com/logo.png")).rejects.toThrow(
      /https/i,
    );
  });

  it.each([
    "https://169.254.169.254/latest/meta-data/",
    "https://10.0.0.1/logo.png",
    "https://127.0.0.1/logo.png",
    "https://192.168.1.1/logo.png",
    "https://[::1]/logo.png",
  ])("rejects literal private/metadata IP %s", async (url) => {
    await expect(safeFetch(url)).rejects.toThrow(SafeFetchError);
    await expect(safeFetch(url)).rejects.toThrow(/private|reserved/i);
  });

  it("rejects a hostname that resolves to a private address (DNS rebinding)", async () => {
    lookupMock.mockResolvedValue([{ address: "169.254.169.254" }]);
    await expect(
      safeFetch("https://sneaky.example.com/logo.png"),
    ).rejects.toThrow(SafeFetchError);
  });

  it("rejects redirect responses", async () => {
    mockPublicDns();
    vi.stubGlobal(
      "fetch",
      mockFetchResponse({
        status: 302,
        headers: { location: "https://169.254.169.254/" },
      }),
    );

    await expect(safeFetch("https://example.com/logo.png")).rejects.toThrow(
      /redirect/i,
    );
  });

  it("rejects non-2xx responses", async () => {
    mockPublicDns();
    vi.stubGlobal("fetch", mockFetchResponse({ status: 404 }));

    await expect(safeFetch("https://example.com/missing.png")).rejects.toThrow(
      SafeFetchError,
    );
  });

  it("rejects a response over the size cap", async () => {
    mockPublicDns();
    vi.stubGlobal(
      "fetch",
      mockFetchResponse({
        headers: { "content-length": String(6 * 1024 * 1024) },
      }),
    );

    await expect(
      safeFetch("https://example.com/huge.png", { maxBytes: 5 * 1024 * 1024 }),
    ).rejects.toThrow(/too large/i);
  });

  it("accepts a mocked normal https response under the size cap", async () => {
    mockPublicDns();
    const body = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    vi.stubGlobal(
      "fetch",
      mockFetchResponse({
        headers: { "content-type": "image/jpeg" },
        body,
      }),
    );

    const result = await safeFetch("https://example.com/logo.jpg", {
      maxBytes: 5 * 1024 * 1024,
    });

    expect(result.contentType).toBe("image/jpeg");
    expect(Buffer.from(result.bytes)).toEqual(Buffer.from(body));
  });

  it("rejects non-standard ports", async () => {
    await expect(
      safeFetch("https://example.com:8080/logo.png"),
    ).rejects.toThrow(/standard web ports/i);
  });

  it("rejects URLs with embedded credentials", async () => {
    await expect(
      safeFetch("https://user:pass@example.com/logo.png"),
    ).rejects.toThrow(/credentials/i);
  });

  describe("allowHttp option", () => {
    it("rejects http:// URLs by default", async () => {
      await expect(safeFetch("http://example.com/logo.png")).rejects.toThrow(
        SafeFetchError,
      );
      await expect(safeFetch("http://example.com/logo.png")).rejects.toThrow(
        /https/i,
      );
    });

    it("accepts http:// URLs with allowHttp: true", async () => {
      mockPublicDns();
      const body = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
      vi.stubGlobal(
        "fetch",
        mockFetchResponse({
          headers: { "content-type": "image/jpeg" },
          body,
        }),
      );

      const result = await safeFetch("http://example.com/logo.png", {
        allowHttp: true,
      });

      expect(result.contentType).toBe("image/jpeg");
      expect(Buffer.from(result.bytes)).toEqual(Buffer.from(body));
    });

    it("rejects http with non-default port even with allowHttp: true", async () => {
      await expect(
        safeFetch("http://example.com:8080/logo.png", { allowHttp: true }),
      ).rejects.toThrow(/standard web ports/i);
    });

    it("rejects http to private IPv4 with allowHttp: true", async () => {
      await expect(
        safeFetch("http://10.0.0.5/logo.png", { allowHttp: true }),
      ).rejects.toThrow(/private|reserved/i);
    });

    it("rejects http to cloud metadata endpoint with allowHttp: true", async () => {
      await expect(
        safeFetch("http://169.254.169.254/latest/meta-data/", {
          allowHttp: true,
        }),
      ).rejects.toThrow(/private|reserved/i);
    });

    it("rejects http with embedded credentials even with allowHttp: true", async () => {
      await expect(
        safeFetch("http://user:pw@example.com/logo.png", { allowHttp: true }),
      ).rejects.toThrow(/credentials/i);
    });

    it("accepts http with default port 80 explicitly specified", async () => {
      mockPublicDns();
      const body = new Uint8Array([1, 2, 3]);
      vi.stubGlobal(
        "fetch",
        mockFetchResponse({
          headers: { "content-type": "image/png" },
          body,
        }),
      );

      const result = await safeFetch("http://example.com:80/logo.png", {
        allowHttp: true,
      });

      expect(result.contentType).toBe("image/png");
      expect(Buffer.from(result.bytes)).toEqual(Buffer.from(body));
    });
  });
});
