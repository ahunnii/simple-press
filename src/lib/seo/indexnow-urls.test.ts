import { describe, expect, it } from "vitest";

import type { IndexNowChangedRows } from "./indexnow-urls";
import type { SitemapRows } from "./sitemap-entries";

import {
  collectChangedUrls,
  INDEXNOW_MAX_URLS,
  seedUrls,
} from "./indexnow-urls";
import { buildSitemapEntries } from "./sitemap-entries";

const BASE = "https://example.simplepress.co";
const allEnabled = () => true;
const noneEnabled = () => false;

function emptyChanged(): IndexNowChangedRows {
  return {
    products: [],
    collections: [],
    pages: [],
    services: [],
    events: [],
    faqChanged: false,
    testimonialsChanged: false,
    videosAdded: false,
    homeChanged: false,
  };
}

function fullChanged(): IndexNowChangedRows {
  return {
    products: [{ slug: "mug" }],
    collections: [{ slug: "summer" }],
    pages: [
      { slug: "hello-world", type: "blog" },
      { slug: "shipping-policy", type: "policy" },
    ],
    services: [{ slug: "consult" }],
    events: [{ slug: "launch-party" }],
    faqChanged: true,
    testimonialsChanged: true,
    videosAdded: true,
    homeChanged: true,
  };
}

describe("collectChangedUrls", () => {
  it("returns nothing when nothing changed", () => {
    expect(
      collectChangedUrls({
        baseUrl: BASE,
        isEnabled: allEnabled,
        rows: emptyChanged(),
      }),
    ).toEqual([]);
  });

  it("adds detail URLs plus their listing pages, home first", () => {
    const urls = collectChangedUrls({
      baseUrl: BASE,
      isEnabled: allEnabled,
      rows: fullChanged(),
    });

    expect(urls).toEqual([
      BASE,
      `${BASE}/shop`,
      `${BASE}/collections`,
      `${BASE}/blog`,
      `${BASE}/services`,
      `${BASE}/events`,
      `${BASE}/faq`,
      `${BASE}/testimonials`,
      `${BASE}/videos`,
      `${BASE}/shop/mug`,
      `${BASE}/collections/summer`,
      `${BASE}/blog/hello-world`,
      `${BASE}/services/consult`,
      `${BASE}/events/launch-party`,
      `${BASE}/shipping-policy`,
    ]);
  });

  it("drops every flag-gated route when all flags are off", () => {
    const urls = collectChangedUrls({
      baseUrl: BASE,
      isEnabled: noneEnabled,
      rows: fullChanged(),
    });

    // Ungated: home, /faq, and CMS pages at /[slug].
    expect(urls).toEqual([BASE, `${BASE}/faq`, `${BASE}/shipping-policy`]);
  });

  it("gates each section on its own flag", () => {
    const urls = collectChangedUrls({
      baseUrl: BASE,
      isEnabled: (key) => key === "products" || key === "blog",
      rows: fullChanged(),
    });

    expect(urls).toContain(`${BASE}/shop/mug`);
    expect(urls).toContain(`${BASE}/shop`);
    expect(urls).toContain(`${BASE}/blog/hello-world`);
    expect(urls).not.toContain(`${BASE}/collections/summer`);
    expect(urls).not.toContain(`${BASE}/collections`);
    expect(urls).not.toContain(`${BASE}/services/consult`);
    expect(urls).not.toContain(`${BASE}/events/launch-party`);
    expect(urls).not.toContain(`${BASE}/testimonials`);
    expect(urls).not.toContain(`${BASE}/videos`);
  });

  it("adds a listing page only when one of its items changed", () => {
    const urls = collectChangedUrls({
      baseUrl: BASE,
      isEnabled: allEnabled,
      rows: { ...emptyChanged(), products: [{ slug: "mug" }] },
    });

    expect(urls).toEqual([`${BASE}/shop`, `${BASE}/shop/mug`]);
  });

  it("adds the homepage only when home changed", () => {
    const rows = {
      ...emptyChanged(),
      pages: [{ slug: "about-us", type: "page" }],
    };
    expect(
      collectChangedUrls({ baseUrl: BASE, isEnabled: allEnabled, rows }),
    ).toEqual([`${BASE}/about-us`]);
    expect(
      collectChangedUrls({
        baseUrl: BASE,
        isEnabled: allEnabled,
        rows: { ...rows, homeChanged: true },
      }),
    ).toEqual([BASE, `${BASE}/about-us`]);
  });

  it("dedupes repeated slugs", () => {
    const urls = collectChangedUrls({
      baseUrl: BASE,
      isEnabled: allEnabled,
      rows: {
        ...emptyChanged(),
        products: [{ slug: "mug" }, { slug: "mug" }],
        pages: [
          { slug: "terms", type: "policy" },
          { slug: "terms", type: "page" },
        ],
      },
    });

    expect(urls).toEqual([`${BASE}/shop`, `${BASE}/shop/mug`, `${BASE}/terms`]);
  });

  it(`caps the list at ${INDEXNOW_MAX_URLS} URLs, keeping home and listings`, () => {
    const products = Array.from({ length: INDEXNOW_MAX_URLS + 50 }, (_, i) => ({
      slug: `p-${i}`,
    }));
    const urls = collectChangedUrls({
      baseUrl: BASE,
      isEnabled: allEnabled,
      rows: { ...emptyChanged(), products, homeChanged: true },
    });

    expect(urls).toHaveLength(INDEXNOW_MAX_URLS);
    expect(urls[0]).toBe(BASE);
    expect(urls[1]).toBe(`${BASE}/shop`);
    expect(urls[2]).toBe(`${BASE}/shop/p-0`);
  });
});

describe("seedUrls", () => {
  const UPDATED_AT = new Date("2026-01-01T00:00:00.000Z");
  const rows: SitemapRows = {
    products: [{ slug: "mug", updatedAt: UPDATED_AT }],
    collections: [],
    pages: [
      { slug: "hello", type: "blog", updatedAt: UPDATED_AT },
      { slug: "terms", type: "policy", updatedAt: UPDATED_AT },
    ],
    services: [],
    faqCount: 1,
    events: [],
    videoCount: 0,
  };

  it("is exactly the sitemap's URL list", () => {
    const params = { baseUrl: BASE, isEnabled: allEnabled, rows };
    expect(seedUrls(params)).toEqual(
      buildSitemapEntries(params).map((e) => e.url),
    );
    expect(seedUrls(params)).toContain(`${BASE}/shop/mug`);
    expect(seedUrls(params)).toContain(`${BASE}/blog/hello`);
  });

  it("follows the sitemap's flag gating", () => {
    const urls = seedUrls({ baseUrl: BASE, isEnabled: noneEnabled, rows });
    expect(urls).not.toContain(`${BASE}/shop/mug`);
    expect(urls).not.toContain(`${BASE}/blog/hello`);
    expect(urls).toContain(`${BASE}/terms`);
  });

  it("dedupes and caps", () => {
    const many: SitemapRows = {
      ...rows,
      products: Array.from({ length: INDEXNOW_MAX_URLS + 5 }, () => ({
        slug: "same",
        updatedAt: UPDATED_AT,
      })),
    };
    const deduped = seedUrls({
      baseUrl: BASE,
      isEnabled: allEnabled,
      rows: many,
    });
    expect(deduped.filter((u) => u === `${BASE}/shop/same`)).toHaveLength(1);

    const capped = seedUrls({
      baseUrl: BASE,
      isEnabled: allEnabled,
      rows: {
        ...rows,
        products: Array.from({ length: INDEXNOW_MAX_URLS + 5 }, (_, i) => ({
          slug: `p-${i}`,
          updatedAt: UPDATED_AT,
        })),
      },
    });
    expect(capped).toHaveLength(INDEXNOW_MAX_URLS);
    expect(capped[0]).toBe(BASE);
  });
});
