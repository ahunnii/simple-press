import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: (key: string) => (key === "host" ? "demo.localhost:3000" : null),
  })),
}));

type BusinessRow = Record<string, unknown> | null;
let mockBusiness: BusinessRow = null;

const findFirst = vi.fn(async () => mockBusiness);
const emptyList = vi.fn(async () => []);
let mockServices: unknown[] = [];
let mockPages: unknown[] = [];
const zero = vi.fn(async () => 0);

vi.mock("~/server/db", () => ({
  db: {
    business: {
      findFirst: (...a: unknown[]) =>
        (findFirst as never as (...x: unknown[]) => unknown)(...a),
    },
    product: { findMany: (...a: unknown[]) => emptyList(...(a as [])) },
    event: { findMany: (...a: unknown[]) => emptyList(...(a as [])) },
    faqItem: {
      findMany: vi.fn(async () => [
        { question: "Do you ship?", answer: "Yes." },
      ]),
    },
    collection: { count: () => zero() },
    page: { count: () => zero(), findMany: async () => mockPages },
    testimonial: { count: () => zero() },
    service: { findMany: async () => mockServices },
    video: { count: () => zero() },
  },
}));

vi.mock("~/lib/canonical", () => ({
  getCanonicalBaseUrl: (b: { subdomain: string }) =>
    `https://${b.subdomain}.example.com`,
}));

vi.mock("~/lib/domain-utils", () => ({
  businessHostFilter: vi.fn(() => ({ subdomain: "demo" })),
}));

function business(overrides: Record<string, unknown> = {}) {
  return {
    id: "b1",
    name: "Demo Store",
    subdomain: "demo",
    customDomain: null,
    domainStatus: "active",
    featureFlags: null,
    timeZone: "America/Detroit",
    maintenanceMode: false,
    allowAiCrawlers: true,
    addressCity: "Ann Arbor",
    addressState: "MI",
    areaServed: [],
    supportEmail: "hi@demo.test",
    siteContent: {
      metaDescription: "A demo store.",
      pageMeta: null,
      socialLinks: null,
    },
    ...overrides,
  };
}

beforeEach(() => {
  mockBusiness = business();
  mockServices = [];
  mockPages = [];
});

describe("GET /llms.txt", () => {
  it("serves markdown text for an active, AI-friendly store", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=3600");

    const body = await res.text();
    expect(body).toContain("# Demo Store");
    expect(body).toContain("> A demo store.");
    expect(body).toContain("- Location: Ann Arbor, MI");
    expect(body).toContain("https://demo.example.com/about");
    expect(body).toContain("### Do you ship?");
  });

  it("lists published services and custom pages, dropping slugs a built-in route shadows", async () => {
    mockBusiness = business({ featureFlags: { services: true } });
    mockServices = [
      {
        name: "Balloons",
        slug: "balloons",
        metaDescription: "Garlands and arches.",
        description: null,
      },
    ];
    mockPages = [
      {
        title: "Gallery",
        slug: "gallery",
        type: "page",
        metaDescription: null,
        excerpt: "Our recent work.",
      },
      // Shadowed by the built-in /shop route, so unreachable.
      { title: "Shop", slug: "shop", type: "page" },
    ];
    const body = await (await GET()).text();
    expect(body).toContain(
      "- [Balloons](https://demo.example.com/services/balloons): Garlands and arches.",
    );
    expect(body).toContain(
      "- [Gallery](https://demo.example.com/gallery): Our recent work.",
    );
    expect(body).not.toContain("[Shop](");
  });

  it("404s when no business matches the host", async () => {
    mockBusiness = null;
    const res = await GET();
    expect(res.status).toBe(404);
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  });

  it("404s when the store has turned AI crawlers off", async () => {
    mockBusiness = business({ allowAiCrawlers: false });
    expect((await GET()).status).toBe(404);
  });

  it("404s while the store is in maintenance mode", async () => {
    mockBusiness = business({ maintenanceMode: true });
    expect((await GET()).status).toBe(404);
  });

  it("only looks up active businesses", async () => {
    await GET();
    const arg = (
      findFirst.mock.calls.at(-1) as unknown as [{ where: { status: string } }]
    )[0];
    expect(arg.where.status).toBe("active");
  });
});
