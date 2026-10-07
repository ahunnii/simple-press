import { beforeEach, describe, expect, it, vi } from "vitest";

import manifest from "./manifest";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => {
    const headerMap = new Map([["host", "demo.localhost:3000"]]);
    return {
      get: (key: string) => headerMap.get(key) ?? null,
    } as unknown as Headers;
  }),
}));

type MockBusiness = {
  name: string;
  siteContent: {
    seoBrandName: string | null;
    faviconUrl: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
  } | null;
} | null;

let mockBusiness: MockBusiness = null;

vi.mock("~/server/db", () => ({
  db: {
    business: {
      findFirst: vi.fn(async () => mockBusiness),
    },
  },
}));

vi.mock("~/lib/domain-utils", () => ({
  businessHostFilter: vi.fn(() => ({ subdomain: "demo" })),
}));

function business(
  siteContent: Partial<NonNullable<MockBusiness>["siteContent"]> = {},
  name = "Bloom Apothecary",
): MockBusiness {
  return {
    name,
    siteContent: {
      seoBrandName: null,
      faviconUrl: null,
      logoUrl: null,
      primaryColor: null,
      ...siteContent,
    },
  };
}

describe("manifest", () => {
  beforeEach(() => {
    mockBusiness = null;
  });

  it("describes the business: name, short_name, theme_color and icons", async () => {
    mockBusiness = business({
      seoBrandName: "Bloom",
      primaryColor: "#1a2b3c",
    });

    const result = await manifest();

    expect(result.name).toBe("Bloom Apothecary");
    expect(result.short_name).toBe("Bloom");
    expect(result.theme_color).toBe("#1a2b3c");
    expect(result.background_color).toBe("#ffffff");
    expect(result.start_url).toBe("/");
    expect(result.display).toBe("browser");

    expect(result.icons).toEqual([
      expect.objectContaining({
        src: expect.stringMatching(
          /^\/site-icon\/icon-192\.png\?v=.+/,
        ) as string,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      }),
      expect.objectContaining({
        src: expect.stringMatching(
          /^\/site-icon\/icon-512\.png\?v=.+/,
        ) as string,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      }),
      expect.objectContaining({
        src: expect.stringMatching(
          /^\/site-icon\/icon-maskable-512\.png\?v=.+/,
        ) as string,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      }),
    ]);
  });

  it("falls back to the business name for short_name and truncates to 12 chars", async () => {
    mockBusiness = business({}, "Detroit Pollinator Company");

    const result = await manifest();

    expect(result.short_name).toBe("Detroit Poll");
    expect(result.short_name?.length).toBeLessThanOrEqual(12);
  });

  it("returns the SimplePress manifest when no business matches the host", async () => {
    mockBusiness = null;

    const result = await manifest();

    expect(result.name).toBe("SimplePress");
    expect(result.short_name).toBe("SimplePress");
    expect(result.theme_color).toBe("#ffffff");
    expect(result.icons).toHaveLength(3);
    expect(result.icons?.[0]?.src).toMatch(/^\/site-icon\/icon-192\.png\?v=/);
  });

  it.each([
    ["null", null],
    ["blank", ""],
    ["whitespace", "   "],
    ["not a hex colour", "red"],
    ["malformed hex", "#12345"],
  ])("uses white theme_color for %s primaryColor", async (_label, value) => {
    mockBusiness = business({ primaryColor: value });

    const result = await manifest();

    expect(result.theme_color).toBe("#ffffff");
  });

  it("trims a valid primaryColor", async () => {
    mockBusiness = business({ primaryColor: " #ABC " });

    const result = await manifest();

    expect(result.theme_color).toBe("#ABC");
  });
});
