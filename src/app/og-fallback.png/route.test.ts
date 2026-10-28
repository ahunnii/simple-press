import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STORAGE_BASE } from "~/lib/s3/url";
import { clearIconCache } from "~/lib/site-icons/cache";
import { fnv1a } from "~/lib/site-icons/source";

import { GET } from "./route";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ host: "demo.localhost:3000" })),
}));

let mockBusiness: { siteContent: { logoUrl: string | null } | null } | null =
  null;

vi.mock("~/server/db", () => ({
  db: { business: { findFirst: vi.fn(async () => mockBusiness) } },
}));

const logo = `${STORAGE_BASE}biz/logo.avif?v=3`;
const fetchMock = vi.fn<typeof fetch>();

function request(init?: RequestInit) {
  return GET(new Request("http://demo.localhost:3000/og-fallback.png", init));
}

beforeEach(() => {
  clearIconCache();
  mockBusiness = null;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /og-fallback.png", () => {
  it("404s with no business, no logo or a logo outside our storage", async () => {
    expect((await request()).status).toBe(404);
    mockBusiness = { siteContent: { logoUrl: null } };
    expect((await request()).status).toBe(404);
    mockBusiness = { siteContent: { logoUrl: "https://evil.example/x.png" } };
    expect((await request()).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders an AVIF logo as a 1200x630 PNG, then serves it from cache", async () => {
    mockBusiness = { siteContent: { logoUrl: logo } };
    const avif = await sharp({
      create: { width: 300, height: 300, channels: 4, background: "#aa3355" },
    })
      .avif()
      .toBuffer();
    fetchMock.mockResolvedValue(new Response(new Uint8Array(avif)));

    const res = await request();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=86400, stale-while-revalidate=604800",
    );
    const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["png", 1200, 630]);

    await request();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("answers 304 for a matching ETag without fetching the logo", async () => {
    mockBusiness = { siteContent: { logoUrl: logo } };
    const res = await request({
      headers: { "If-None-Match": `"${fnv1a(`${logo}|og-fallback`)}"` },
    });
    expect(res.status).toBe(304);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("404s (not 500) when the logo can't be fetched or decoded", async () => {
    mockBusiness = { siteContent: { logoUrl: logo } };
    fetchMock.mockResolvedValue(new Response("nope", { status: 404 }));
    expect((await request()).status).toBe(404);
    fetchMock.mockResolvedValue(new Response("not an image"));
    expect((await request()).status).toBe(404);
  });
});
