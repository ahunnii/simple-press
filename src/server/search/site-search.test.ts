/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- asserting on mock call args */
import { describe, expect, it, vi } from "vitest";

import type { DbClient } from "~/server/db";

import {
  finishGroup,
  groupOrderForBusinessType,
  makeSnippet,
  normalizeSiteSearchQuery,
  rankTitle,
  searchSite,
  stripHtml,
  trimPlural,
} from "./site-search";

// `site-search.ts` imports the shared Prisma client as its default; the tests
// always inject a fake `db`, so keep the real one (env + engine) out of it.
vi.mock("~/server/db", () => ({ db: {} }));

// ─── Fake db ──────────────────────────────────────────────────────────────────

type Rows = Partial<{
  product: unknown[];
  collection: unknown[];
  service: unknown[];
  event: unknown[];
  faqItem: unknown[];
  page: unknown[];
}>;

function makeDb(rows: Rows = {}) {
  const model = (key: keyof Rows) => ({
    findMany: vi.fn().mockResolvedValue(rows[key] ?? []),
  });
  const fake = {
    product: model("product"),
    collection: model("collection"),
    service: model("service"),
    event: model("event"),
    faqItem: model("faqItem"),
    page: model("page"),
    business: {
      findUnique: vi.fn().mockResolvedValue({ timeZone: "America/Detroit" }),
    },
  };
  return { fake, db: fake as unknown as DbClient };
}

const allOn = () => true;
const except =
  (...off: string[]) =>
  (key: string) =>
    !off.includes(key);

const product = (over: Record<string, unknown>) => ({
  id: "p1",
  name: "Linen Dress",
  slug: "linen-dress",
  excerpt: null,
  description: null,
  sku: null,
  price: 6800,
  images: [],
  variants: [],
  ...over,
});

// ─── Normalization ────────────────────────────────────────────────────────────

describe("normalizeSiteSearchQuery", () => {
  it("trims, collapses whitespace and lower-cases the match words", () => {
    expect(normalizeSiteSearchQuery("  Linen   DRESS  ")).toEqual({
      q: "Linen DRESS",
      words: ["linen", "dress"],
    });
  });

  it("returns an empty query when shorter than the minimum", () => {
    expect(normalizeSiteSearchQuery("a")).toEqual({ q: "", words: [] });
    expect(normalizeSiteSearchQuery("   ")).toEqual({ q: "", words: [] });
  });

  it("clamps to the max length and 5 words", () => {
    const long = "x".repeat(200);
    expect(normalizeSiteSearchQuery(long).q).toHaveLength(80);
    expect(normalizeSiteSearchQuery("a1 b2 c3 d4 e5 f6 g7").words).toHaveLength(
      5,
    );
  });
});

describe("trimPlural", () => {
  it.each([
    ["dresses", "dress"],
    ["boxes", "box"],
    ["watches", "watch"],
    ["dishes", "dish"],
    ["candles", "candle"],
    ["glass", "glass"],
    ["bus", "bus"],
    ["dress", "dress"],
  ])("%s -> %s", (input, expected) => {
    expect(trimPlural(input)).toBe(expected);
  });
});

// ─── Ranking + snippets ───────────────────────────────────────────────────────

describe("rankTitle", () => {
  const norm = normalizeSiteSearchQuery("linen dress");
  it("orders exact > startsWith > contains-all > body-only", () => {
    expect(rankTitle("Linen Dress", norm)).toBe(0);
    expect(rankTitle("Linen Dress Midi", norm)).toBe(1);
    expect(rankTitle("Dress, linen blend", norm)).toBe(2);
    expect(rankTitle("Summer sale", norm)).toBe(3);
  });

  it("treats a plural query as an exact hit on the singular title", () => {
    expect(rankTitle("Dress", normalizeSiteSearchQuery("dresses"))).toBe(0);
  });
});

describe("finishGroup", () => {
  const cand = (id: string, title: string, body = "") => ({
    item: { id, type: "products" as const, title, href: `/shop/${id}` },
    searchText: `${title}\n${body}`,
    bodyText: body,
  });

  it("ranks by title relevance, keeps fetch order on ties, counts before limiting", () => {
    const norm = normalizeSiteSearchQuery("dress");
    const group = finishGroup(
      "products",
      [
        cand("body", "Gift card", "A lovely dress for any occasion"),
        cand("contains", "Summer dress sale"),
        cand("starts-b", "Dress shirt"),
        cand("exact", "Dress"),
        cand("starts-a", "Dress pants"),
        cand("nomatch", "Sandals"),
      ],
      norm,
      3,
    );
    expect(group?.count).toBe(5);
    expect(group?.items.map((i) => i.id)).toEqual([
      "exact",
      "starts-b",
      "starts-a",
    ]);
    expect(group?.label).toBe("Products");
  });

  it("returns null when nothing matches and AND-matches every word", () => {
    const norm = normalizeSiteSearchQuery("red dress");
    expect(
      finishGroup("products", [cand("a", "Blue dress")], norm, 3),
    ).toBeNull();
  });

  it("only snippets body matches, not title matches", () => {
    const norm = normalizeSiteSearchQuery("silk");
    const group = finishGroup(
      "products",
      [
        cand("t", "Silk scarf", "Soft and light."),
        cand("b", "Scarf", "Made of pure silk."),
      ],
      norm,
      5,
    );
    const byId = Object.fromEntries(group!.items.map((i) => [i.id, i]));
    expect(byId.t!.snippet).toBeUndefined();
    expect(byId.b!.snippet).toBe("Made of pure silk.");
  });
});

describe("makeSnippet / stripHtml", () => {
  it("strips tags and entities, never returns HTML", () => {
    const html =
      "<p>Hand&nbsp;made <strong>linen</strong> &amp; cotton</p><script>alert(1)</script>";
    expect(stripHtml(html)).toBe("Hand made linen & cotton");
  });

  it("cuts ~140 chars around the first hit with ellipses", () => {
    const text = `${"lorem ipsum ".repeat(30)}needle ${"dolor sit ".repeat(30)}`;
    const snippet = makeSnippet(text, ["needle"])!;
    expect(snippet.startsWith("…")).toBe(true);
    expect(snippet.endsWith("…")).toBe(true);
    expect(snippet).toContain("needle");
    expect(snippet.length).toBeLessThanOrEqual(144);
    expect(snippet).not.toMatch(/<|>/);
  });

  it("returns undefined without a hit, and the text start when asked", () => {
    expect(makeSnippet("nothing here", ["zzz"])).toBeUndefined();
    expect(
      makeSnippet("nothing here", ["zzz"], { fallbackToStart: true }),
    ).toBe("nothing here");
  });
});

// ─── searchSite ───────────────────────────────────────────────────────────────

describe("searchSite", () => {
  it("returns empty and touches nothing when siteSearch is off", async () => {
    const { fake, db } = makeDb({ product: [product({})] });
    const res = await searchSite({
      businessId: "b1",
      q: "dress",
      isEnabled: except("siteSearch"),
      limitPerGroup: 3,
      db,
    });
    expect(res).toEqual({ q: "", total: 0, groups: [] });
    expect(fake.product.findMany).not.toHaveBeenCalled();
  });

  it("returns empty for a too-short query without querying", async () => {
    const { fake, db } = makeDb();
    const res = await searchSite({
      businessId: "b1",
      q: " a ",
      isEnabled: allOn,
      limitPerGroup: 3,
      db,
    });
    expect(res).toEqual({ q: "", total: 0, groups: [] });
    expect(fake.product.findMany).not.toHaveBeenCalled();
  });

  it("scopes every query by businessId and published, with plural-trimmed AND words", async () => {
    const { fake, db } = makeDb();
    await searchSite({
      businessId: "biz_1",
      q: "Linen Dresses",
      isEnabled: allOn,
      limitPerGroup: 3,
      db,
    });
    const where = fake.product.findMany.mock.calls[0]![0].where;
    expect(where.businessId).toBe("biz_1");
    expect(where.published).toBe(true);
    expect(where.AND).toHaveLength(2);
    expect(where.AND[1].OR[0]).toEqual({
      name: { contains: "dress", mode: "insensitive" },
    });
    for (const m of [
      fake.collection,
      fake.service,
      fake.event,
      fake.faqItem,
      fake.page,
    ]) {
      expect(m.findMany.mock.calls[0]![0].where.businessId).toBe("biz_1");
    }
    expect(fake.event.findMany.mock.calls[0]![0].where.isArchived).toBe(false);
    expect(fake.faqItem.findMany.mock.calls[0]![0].where.published).toBe(true);
  });

  it("formats product price, image and href", async () => {
    const { db } = makeDb({
      product: [
        product({
          images: [{ url: "https://cdn/x.jpg" }],
          variants: [{ price: 6800 }, { price: 9000 }],
          description: "<p>Soft <b>linen</b></p>",
        }),
      ],
    });
    const res = await searchSite({
      businessId: "b1",
      q: "linen",
      isEnabled: allOn,
      limitPerGroup: 3,
      db,
    });
    const item = res.groups[0]!.items[0]!;
    expect(item).toMatchObject({
      type: "products",
      href: "/shop/linen-dress",
      image: "https://cdn/x.jpg",
      priceLabel: "$68.00+",
    });
    expect(item.snippet).toBeUndefined(); // title matched
  });

  it("drops a group whose feature flag is off, and skips its query", async () => {
    const { fake, db } = makeDb({
      product: [product({})],
      event: [],
      faqItem: [{ id: "f1", question: "Linen care?", answer: "Wash cold." }],
    });
    const res = await searchSite({
      businessId: "b1",
      q: "linen",
      isEnabled: except("products", "collections"),
      limitPerGroup: 3,
      db,
    });
    expect(res.groups.map((g) => g.type)).toEqual(["faqs"]);
    expect(fake.product.findMany).not.toHaveBeenCalled();
    expect(fake.collection.findMany).not.toHaveBeenCalled();
  });

  it("drops blog posts when blog is off and builds blog hrefs when on", async () => {
    const pages = [
      {
        id: "pg1",
        title: "Our story",
        slug: "story",
        type: "page",
        excerpt: null,
        metaTitle: null,
        metaDescription: null,
        metaKeywords: null,
        content: null,
        image: null,
      },
      {
        id: "pg2",
        title: "Story time",
        slug: "story-time",
        type: "blog",
        excerpt: null,
        metaTitle: null,
        metaDescription: null,
        metaKeywords: null,
        content: null,
        image: null,
      },
    ];
    const on = await searchSite({
      businessId: "b1",
      q: "story",
      isEnabled: allOn,
      limitPerGroup: 5,
      type: "pages",
      db: makeDb({ page: pages }).db,
    });
    expect(on.groups[0]!.items.map((i) => i.href)).toEqual([
      "/blog/story-time", // title starts with the query: outranks "Our story"
      "/story",
    ]);
    expect(on.groups[0]!.items[0]!.subtitle).toBe("Blog post");

    const off = makeDb({ page: pages });
    const res = await searchSite({
      businessId: "b1",
      q: "story",
      isEnabled: except("blog"),
      limitPerGroup: 5,
      type: "pages",
      db: off.db,
    });
    expect(res.groups[0]!.items.map((i) => i.href)).toEqual(["/story"]);
    expect(off.fake.page.findMany.mock.calls[0]![0].where.type).toEqual({
      not: "blog",
    });
  });

  it("never selects previewDraft and caps the page scan at 500", async () => {
    const { fake, db } = makeDb();
    await searchSite({
      businessId: "b1",
      q: "about",
      isEnabled: allOn,
      limitPerGroup: 3,
      type: "pages",
      db,
    });
    const args = fake.page.findMany.mock.calls[0]![0];
    expect(args.select).not.toHaveProperty("previewDraft");
    expect(args.select).not.toHaveProperty("previewDraftUpdatedAt");
    expect(Object.keys(args.select).sort()).toEqual(
      [
        "content",
        "excerpt",
        "id",
        "image",
        "metaDescription",
        "metaKeywords",
        "metaTitle",
        "slug",
        "title",
        "type",
      ].sort(),
    );
    expect(args.take).toBe(500);
  });

  it("skips pages whose slug a built-in route shadows or that are empty policies", async () => {
    const base = {
      excerpt: null,
      metaTitle: null,
      metaDescription: null,
      metaKeywords: null,
      image: null,
    };
    const { db } = makeDb({
      page: [
        {
          ...base,
          id: "1",
          title: "Shipping rules",
          slug: "shop",
          type: "page",
          content: null,
        },
        {
          ...base,
          id: "2",
          title: "Shipping rules",
          slug: "search",
          type: "page",
          content: null,
        },
        {
          ...base,
          id: "3",
          title: "Shipping policy",
          slug: "shipping-policy",
          type: "policy",
          content: { type: "doc", content: [] },
        },
        {
          ...base,
          id: "4",
          title: "Shipping rules",
          slug: "shipping-rules",
          type: "page",
          content: null,
        },
      ],
    });
    const res = await searchSite({
      businessId: "b1",
      q: "shipping",
      isEnabled: allOn,
      limitPerGroup: 10,
      type: "pages",
      db,
    });
    expect(res.groups[0]!.items.map((i) => i.id)).toEqual(["4"]);
  });

  it("restricts to a single group when type is set", async () => {
    const { fake, db } = makeDb();
    await searchSite({
      businessId: "b1",
      q: "linen",
      isEnabled: allOn,
      limitPerGroup: 24,
      type: "events",
      db,
    });
    expect(fake.event.findMany).toHaveBeenCalledTimes(1);
    expect(fake.product.findMany).not.toHaveBeenCalled();
    expect(fake.page.findMany).not.toHaveBeenCalled();
  });

  it("orders groups by business type and sums the total", async () => {
    const rows: Rows = {
      product: [product({})],
      faqItem: [{ id: "f1", question: "Linen care?", answer: "Wash cold." }],
      service: [
        {
          id: "s1",
          name: "Linen tailoring",
          slug: "tailoring",
          description: null,
          image: null,
          items: [{ name: "Hem", description: null, priceLabel: "$20" }],
        },
      ],
    };
    const run = (businessType: string | null) =>
      searchSite({
        businessId: "b1",
        q: "linen",
        isEnabled: allOn,
        businessType,
        limitPerGroup: 3,
        db: makeDb(rows).db,
      });

    const shop = await run("products");
    expect(shop.groups.map((g) => g.type)).toEqual([
      "products",
      "services",
      "faqs",
    ]);
    expect(shop.total).toBe(3);
    expect((await run("services")).groups.map((g) => g.type)).toEqual([
      "services",
      "faqs",
      "products",
    ]);
    expect((await run("informational")).groups.map((g) => g.type)).toEqual([
      "faqs",
      "services",
      "products",
    ]);
    expect((await run(null)).groups.map((g) => g.type)).toEqual([
      "products",
      "services",
      "faqs",
    ]);
  });

  it("gives FAQs an answer snippet and links to /faq", async () => {
    const { db } = makeDb({
      faqItem: [
        {
          id: "f1",
          question: "Do you ship?",
          answer: "<p>Yes, <b>worldwide</b>.</p>",
        },
      ],
    });
    const res = await searchSite({
      businessId: "b1",
      q: "ship",
      isEnabled: allOn,
      limitPerGroup: 3,
      type: "faqs",
      db,
    });
    expect(res.groups[0]!.items[0]).toMatchObject({
      href: "/faq",
      snippet: "Yes, worldwide.",
    });
  });
});

describe("groupOrderForBusinessType", () => {
  it("falls back to the default order for unknown types", () => {
    expect(groupOrderForBusinessType("nonsense")).toEqual(
      groupOrderForBusinessType(null),
    );
    expect(groupOrderForBusinessType("donations")).toEqual(
      groupOrderForBusinessType("informational"),
    );
  });
});
