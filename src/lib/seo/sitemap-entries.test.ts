import { describe, expect, it } from "vitest";

import type { SitemapRows } from "./sitemap-entries";

import { buildSitemapEntries } from "./sitemap-entries";

const BASE_URL = "https://example.simplepress.co";

function allEnabled(): (key: string) => boolean {
  return () => true;
}

function noneEnabled(): (key: string) => boolean {
  return () => false;
}

function emptyRows(): SitemapRows {
  return {
    products: [],
    collections: [],
    pages: [],
    services: [],
    faqCount: 0,
    events: [],
    videoCount: 0,
  };
}

const UPDATED_AT = new Date("2026-01-01T00:00:00.000Z");

function fixtureRows(): SitemapRows {
  return {
    products: [{ slug: "widget", updatedAt: UPDATED_AT }],
    collections: [{ slug: "new-arrivals", updatedAt: UPDATED_AT }],
    pages: [
      { slug: "first-post", updatedAt: UPDATED_AT, type: "blog" },
      { slug: "second-post", updatedAt: UPDATED_AT, type: "blog" },
      { slug: "custom-page", updatedAt: UPDATED_AT, type: "cms" },
    ],
    services: [{ slug: "consulting", updatedAt: UPDATED_AT }],
    faqCount: 3,
    events: [
      { slug: "upcoming-gala", updatedAt: UPDATED_AT, isArchived: false },
      { slug: "past-gala", updatedAt: UPDATED_AT, isArchived: true },
    ],
    videoCount: 2,
  };
}

function urls(entries: ReturnType<typeof buildSitemapEntries>): string[] {
  return entries.map((e) => e.url);
}

describe("buildSitemapEntries", () => {
  it("blog flag off drops /blog and every /blog/* URL even with rows present", () => {
    const isEnabled = (key: string) => key !== "blog";
    const result = buildSitemapEntries({
      baseUrl: BASE_URL,
      isEnabled,
      rows: fixtureRows(),
    });

    const all = urls(result);
    expect(all).not.toContain(`${BASE_URL}/blog`);
    expect(all.some((u) => u.startsWith(`${BASE_URL}/blog/`))).toBe(false);

    // The blog-typed rows themselves are dropped, but the CMS page under the
    // same `pages` array is unaffected — it isn't gated by the blog flag.
    expect(all).toContain(`${BASE_URL}/custom-page`);
  });

  it("all flags on produces the same URL set as today for a fixture", () => {
    const result = buildSitemapEntries({
      baseUrl: BASE_URL,
      isEnabled: allEnabled(),
      rows: fixtureRows(),
    });

    const all = urls(result);
    expect(all).toEqual([
      BASE_URL,
      `${BASE_URL}/shop`,
      `${BASE_URL}/collections`,
      `${BASE_URL}/blog`,
      `${BASE_URL}/about`,
      `${BASE_URL}/contact`,
      `${BASE_URL}/testimonials`,
      `${BASE_URL}/services`,
      `${BASE_URL}/faq`,
      `${BASE_URL}/events`,
      `${BASE_URL}/videos`,
      `${BASE_URL}/donate`,
      `${BASE_URL}/shop/widget`,
      `${BASE_URL}/collections/new-arrivals`,
      `${BASE_URL}/blog/first-post`,
      `${BASE_URL}/blog/second-post`,
      `${BASE_URL}/custom-page`,
      `${BASE_URL}/services/consulting`,
      `${BASE_URL}/events/upcoming-gala`,
      `${BASE_URL}/events/past-gala`,
    ]);
  });

  it("events index appears only when a non-archived event exists, but archived event detail URLs are still present", () => {
    const archivedOnlyRows: SitemapRows = {
      ...emptyRows(),
      events: [{ slug: "past-gala", updatedAt: UPDATED_AT, isArchived: true }],
    };

    const result = buildSitemapEntries({
      baseUrl: BASE_URL,
      isEnabled: allEnabled(),
      rows: archivedOnlyRows,
    });

    const all = urls(result);
    expect(all).not.toContain(`${BASE_URL}/events`);
    expect(all).toContain(`${BASE_URL}/events/past-gala`);
  });

  it("events flag off drops both the index and every event detail URL", () => {
    const isEnabled = (key: string) => key !== "events";
    const result = buildSitemapEntries({
      baseUrl: BASE_URL,
      isEnabled,
      rows: fixtureRows(),
    });

    const all = urls(result);
    expect(all).not.toContain(`${BASE_URL}/events`);
    expect(all).not.toContain(`${BASE_URL}/events/upcoming-gala`);
    expect(all).not.toContain(`${BASE_URL}/events/past-gala`);
  });

  it("donate is included only when the donations flag is on", () => {
    const rows = emptyRows();

    const off = buildSitemapEntries({
      baseUrl: BASE_URL,
      isEnabled: noneEnabled(),
      rows,
    });
    expect(urls(off)).not.toContain(`${BASE_URL}/donate`);

    const on = buildSitemapEntries({
      baseUrl: BASE_URL,
      isEnabled: (key) => key === "donations",
      rows,
    });
    expect(urls(on)).toContain(`${BASE_URL}/donate`);
  });

  it("about, contact, and CMS pages stay unconditional regardless of flags", () => {
    const result = buildSitemapEntries({
      baseUrl: BASE_URL,
      isEnabled: noneEnabled(),
      rows: fixtureRows(),
    });

    const all = urls(result);
    expect(all).toContain(`${BASE_URL}/about`);
    expect(all).toContain(`${BASE_URL}/contact`);
    expect(all).toContain(`${BASE_URL}/custom-page`);
  });

  it("faq keeps its published-row-count gate (no feature flag governs it)", () => {
    const withCount = buildSitemapEntries({
      baseUrl: BASE_URL,
      isEnabled: noneEnabled(),
      rows: { ...emptyRows(), faqCount: 1 },
    });
    expect(urls(withCount)).toContain(`${BASE_URL}/faq`);

    const withoutCount = buildSitemapEntries({
      baseUrl: BASE_URL,
      isEnabled: allEnabled(),
      rows: { ...emptyRows(), faqCount: 0 },
    });
    expect(urls(withoutCount)).not.toContain(`${BASE_URL}/faq`);
  });

  it("services index requires both the flag on and at least one published service", () => {
    const flagOffRows = fixtureRows();
    const flagOff = buildSitemapEntries({
      baseUrl: BASE_URL,
      isEnabled: (key) => key !== "services",
      rows: flagOffRows,
    });
    expect(urls(flagOff)).not.toContain(`${BASE_URL}/services`);
    expect(urls(flagOff)).not.toContain(`${BASE_URL}/services/consulting`);

    const noRows = buildSitemapEntries({
      baseUrl: BASE_URL,
      isEnabled: allEnabled(),
      rows: { ...emptyRows() },
    });
    expect(urls(noRows)).not.toContain(`${BASE_URL}/services`);
  });

  it("videos index requires both the flag on and a positive video count", () => {
    const flagOff = buildSitemapEntries({
      baseUrl: BASE_URL,
      isEnabled: (key) => key !== "videos",
      rows: { ...emptyRows(), videoCount: 5 },
    });
    expect(urls(flagOff)).not.toContain(`${BASE_URL}/videos`);

    const noCount = buildSitemapEntries({
      baseUrl: BASE_URL,
      isEnabled: allEnabled(),
      rows: { ...emptyRows(), videoCount: 0 },
    });
    expect(urls(noCount)).not.toContain(`${BASE_URL}/videos`);
  });

  it("shop/collections flags off drop both the index and child product/collection URLs", () => {
    const result = buildSitemapEntries({
      baseUrl: BASE_URL,
      isEnabled: (key) => key !== "products" && key !== "collections",
      rows: fixtureRows(),
    });

    const all = urls(result);
    expect(all).not.toContain(`${BASE_URL}/shop`);
    expect(all).not.toContain(`${BASE_URL}/shop/widget`);
    expect(all).not.toContain(`${BASE_URL}/collections`);
    expect(all).not.toContain(`${BASE_URL}/collections/new-arrivals`);
  });
});
