import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STORAGE_BASE } from "~/lib/s3/url";
import { clearIconCache } from "~/lib/site-icons/cache";
import { fnv1a } from "~/lib/site-icons/source";

import { GET } from "./route";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ host: "demo.localhost:3000" })),
}));

let mockBusiness: {
  siteContent: { faviconUrl: string | null; logoUrl: string | null } | null;
} | null = null;

vi.mock("~/server/db", () => ({
  db: { business: { findFirst: vi.fn(async () => mockBusiness) } },
}));

const favicon = `${STORAGE_BASE}biz/favicon.png?v=1`;
const logo = `${STORAGE_BASE}biz/logo.png`;

function request(file: string, init?: RequestInit) {
  return GET(
    new Request(`http://demo.localhost:3000/site-icon/${file}`, init),
    {
      params: Promise.resolve({ file }),
    },
  );
}

async function pngSize(res: Response) {
  const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
  return [meta.width, meta.height];
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(async () => {
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

describe("GET /site-icon/[file]", () => {
  it("404s an unknown file", async () => {
    expect((await request("icon-64.png")).status).toBe(404);
    expect((await request("..%2Fsecret")).status).toBe(404);
  });

  it("renders PNGs from public/simplepress-icon.png when there is no business", async () => {
    const res = await request("icon-192.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=86400, stale-while-revalidate=604800",
    );
    expect(await pngSize(res)).toEqual([192, 192]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redirects favicon.ico to the static SimplePress icon when there is no business", async () => {
    const res = await request("favicon.ico");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/simplepress-favicon.ico");
  });

  it("answers 304 for a matching If-None-Match", async () => {
    const first = await request("apple-touch-icon.png");
    const etag = first.headers.get("etag");
    expect(etag).toMatch(/^"[0-9a-f]{8}"$/);

    const second = await request("apple-touch-icon.png", {
      headers: { "If-None-Match": `W/${etag}` },
    });
    expect(second.status).toBe(304);
    expect(second.headers.get("etag")).toBe(etag);
  });

  it("answers 304 for a store source without fetching it", async () => {
    mockBusiness = { siteContent: { faviconUrl: favicon, logoUrl: null } };
    const res = await request("icon-48.png", {
      headers: { "If-None-Match": `"${fnv1a(`${favicon}|icon-48.png`)}"` },
    });
    expect(res.status).toBe(304);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls through to the logo when the favicon can't be fetched", async () => {
    mockBusiness = { siteContent: { faviconUrl: favicon, logoUrl: logo } };
    const logoPng = await sharp({
      create: { width: 400, height: 100, channels: 4, background: "#336699" },
    })
      .png()
      .toBuffer();
    fetchMock.mockImplementation(async (url) =>
      url === logo
        ? new Response(new Uint8Array(logoPng))
        : new Response("missing", { status: 404 }),
    );

    const res = await request("favicon.ico");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/x-icon");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Both outcomes are cached: no refetch on the next request.
    await request("favicon.ico");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("ignores sources outside our storage bucket", async () => {
    mockBusiness = {
      siteContent: {
        faviconUrl: "https://evil.example.com/x.png",
        logoUrl: null,
      },
    };
    const res = await request("icon-512.png");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await pngSize(res)).toEqual([512, 512]);
  });
});
