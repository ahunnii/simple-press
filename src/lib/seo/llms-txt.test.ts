import { describe, expect, it } from "vitest";

import type { LlmsTxtInput } from "./llms-txt";

import {
  buildLlmsTxt,
  LLMS_EVENT_CAP,
  LLMS_FAQ_CAP,
  LLMS_PRODUCT_CAP,
} from "./llms-txt";

const BASE = "https://shop.example.com";

function input(overrides: Partial<LlmsTxtInput> = {}): LlmsTxtInput {
  return {
    baseUrl: BASE,
    name: "Sunny Bakes",
    timeZone: "America/Detroit",
    isEnabled: () => true,
    products: [],
    events: [],
    faqs: [],
    ...overrides,
  };
}

describe("buildLlmsTxt", () => {
  it("renders a minimal store: title, Home and the always-on pages only", () => {
    const out = buildLlmsTxt(input());
    expect(out).toBe(
      [
        "# Sunny Bakes",
        "",
        "## Pages",
        `- [Home](${BASE})`,
        `- [About](${BASE}/about)`,
        `- [Contact](${BASE}/contact)`,
        `- [Donate](${BASE}/donate)`,
        "",
      ].join("\n"),
    );
  });

  it("omits the description line, facts and empty sections when blank", () => {
    const out = buildLlmsTxt(
      input({
        description: "   ",
        supportEmail: " ",
        addressCity: "",
        addressState: null,
        areaServed: [],
        socialLinks: {},
        isEnabled: () => false,
      }),
    );
    expect(out).not.toContain(">");
    expect(out).not.toContain("Location:");
    expect(out).not.toContain("Contact:");
    expect(out).not.toContain("Profiles:");
    expect(out).not.toContain("## Products");
    expect(out).not.toContain("## Events");
    expect(out).not.toContain("## FAQ");
    expect(out).not.toContain("/donate");
  });

  it("renders description, location, contact and http(s) profiles", () => {
    const out = buildLlmsTxt(
      input({
        description: "Small-batch\nbread.",
        addressCity: "Ann Arbor",
        addressState: "MI",
        areaServed: ["Ypsilanti", "Saline"],
        supportEmail: "hi@sunny.test",
        socialLinks: {
          instagram: "https://instagram.com/sunny",
          facebook: "http://facebook.com/sunny",
          twitter: "javascript:alert(1)",
          youtube: "mailto:x@y.z",
          tiktok: "",
        },
      }),
    );
    expect(out).toContain("> Small-batch bread.");
    expect(out).toContain(
      "- Location: Ann Arbor, MI (serves Ypsilanti, Saline)",
    );
    expect(out).toContain("- Contact: hi@sunny.test");
    expect(out).toContain(
      "- Profiles: https://instagram.com/sunny, http://facebook.com/sunny",
    );
    expect(out).not.toContain("javascript");
    expect(out).not.toContain("mailto");
  });

  it("falls back to areaServed when there is no city/state", () => {
    const out = buildLlmsTxt(input({ areaServed: ["Detroit", "Flint"] }));
    expect(out).toContain("- Location: Detroit, Flint");
  });

  it("uses pageMeta titles/descriptions and ignores blanks", () => {
    const out = buildLlmsTxt(
      input({
        pageMeta: {
          about: { title: "Our Story", description: "Who we are." },
          contact: { title: "  ", description: "" },
        },
      }),
    );
    expect(out).toContain(`- [Our Story](${BASE}/about): Who we are.`);
    expect(out).toContain(`- [Contact](${BASE}/contact)\n`);
  });

  it("never lists disabled or empty routes", () => {
    const enabled = new Set(["products", "services", "events", "blog"]);
    const out = buildLlmsTxt(
      input({
        isEnabled: (k) => enabled.has(k),
        products: [], // shop on but empty
        counts: { services: 0, blogPosts: 2, collections: 4 },
      }),
    );
    expect(out).not.toContain(`${BASE}/shop`);
    expect(out).not.toContain("/services");
    expect(out).not.toContain("/events");
    // collections flag is off even though rows exist
    expect(out).not.toContain("/collections");
    expect(out).toContain(`[Blog](${BASE}/blog)`);
  });

  it("lists products with USD price and an excerpt-first blurb", () => {
    const out = buildLlmsTxt(
      input({
        products: [
          {
            name: "Sourdough [Large]",
            slug: "sourdough",
            price: 1250,
            excerpt: "Slow-fermented loaf.",
            description: "<p>Ignored when excerpt exists.</p>",
          },
          {
            name: "Rye",
            slug: "rye",
            price: 900,
            excerpt: "  ",
            description: "<p>Dark &amp; dense.</p>",
          },
          { name: "Plain", slug: "plain", price: 500 },
        ],
      }),
    );
    expect(out).toContain("## Products");
    expect(out).toContain(
      `- [Sourdough (Large)](${BASE}/shop/sourdough): $12.50 — Slow-fermented loaf.`,
    );
    expect(out).toContain(`- [Rye](${BASE}/shop/rye): $9.00 — Dark & dense.`);
    expect(out).toContain(`- [Plain](${BASE}/shop/plain): $5.00\n`);
    expect(out).toContain(`- [Shop](${BASE}/shop)`);
  });

  it("caps products, events and FAQ", () => {
    const products = Array.from({ length: 80 }, (_, i) => ({
      name: `P${i}`,
      slug: `p${i}`,
      price: 100,
    }));
    const day = 86_400_000;
    const events = Array.from({ length: 40 }, (_, i) => ({
      name: `E${i}`,
      slug: `e${i}`,
      startAt: new Date(Date.UTC(2030, 0, 1) + i * day),
      allDay: false,
    }));
    const faqs = Array.from({ length: 50 }, (_, i) => ({
      question: `Q${i}?`,
      answer: `A${i}`,
    }));
    const out = buildLlmsTxt(input({ products, events, faqs }));
    expect(out.match(/\/shop\/p\d+\)/g)).toHaveLength(LLMS_PRODUCT_CAP);
    expect(out.match(/\/events\/e\d+\)/g)).toHaveLength(LLMS_EVENT_CAP);
    expect(out.match(/^### /gm)).toHaveLength(LLMS_FAQ_CAP);
  });

  it("formats events in the business time zone with location and blurb", () => {
    const out = buildLlmsTxt(
      input({
        events: [
          {
            name: "Bake Sale",
            slug: "bake-sale",
            // 2030-08-17 23:00 UTC = 7:00 PM in Detroit (EDT)
            startAt: new Date("2030-08-17T23:00:00Z"),
            endAt: null,
            allDay: false,
            location: "Town Hall",
            blurb: "<p>Cookies &amp; bread.</p>",
          },
          {
            name: "No Venue",
            slug: "no-venue",
            startAt: new Date("2030-08-18T23:00:00Z"),
            allDay: false,
          },
        ],
      }),
    );
    expect(out).toContain("## Events");
    expect(out).toContain(
      `- [Bake Sale](${BASE}/events/bake-sale): Sat, Aug 17, 2030 · 7:00 PM, Town Hall — Cookies & bread.`,
    );
    expect(out).toContain(
      `- [No Venue](${BASE}/events/no-venue): Sun, Aug 18, 2030 · 7:00 PM\n`,
    );
    expect(out).toContain(`[Events](${BASE}/events)`);
  });

  it("renders FAQ as headings with plain answers and drops blank rows", () => {
    const out = buildLlmsTxt(
      input({
        faqs: [
          { question: "Do you ship?", answer: "Yes.\n\n\n\nWithin the US." },
          { question: "  ", answer: "orphan" },
          { question: "Empty answer?", answer: "   " },
        ],
      }),
    );
    expect(out).toContain(
      "## FAQ\n\n### Do you ship?\nYes.\n\nWithin the US.\n",
    );
    expect(out).not.toContain("orphan");
    expect(out).not.toContain("Empty answer");
    expect(out).toContain(`[FAQ](${BASE}/faq)`);
  });

  it("ends with a single trailing newline", () => {
    const out = buildLlmsTxt(input());
    expect(out.endsWith("\n")).toBe(true);
    expect(out.endsWith("\n\n")).toBe(false);
  });

  it("renders a full store in section order", () => {
    const out = buildLlmsTxt(
      input({
        description: "Small-batch bread and pastry.",
        addressCity: "Ann Arbor",
        addressState: "MI",
        supportEmail: "hi@sunny.test",
        socialLinks: { instagram: "https://instagram.com/sunny" },
        pageMeta: { about: { description: "Our story and team." } },
        products: [
          {
            name: "Sourdough",
            slug: "sourdough",
            price: 1250,
            excerpt: "Slow-fermented loaf.",
          },
        ],
        events: [
          {
            name: "Bake Sale",
            slug: "bake-sale",
            startAt: new Date("2030-08-17T23:00:00Z"),
            allDay: false,
            location: "Town Hall",
          },
        ],
        faqs: [{ question: "Do you ship?", answer: "Yes, across the US." }],
        counts: { blogPosts: 1 },
      }),
    );
    expect(out.startsWith("# Sunny Bakes\n\n> Small-batch")).toBe(true);
  });
});
