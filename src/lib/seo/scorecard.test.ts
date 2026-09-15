/**
 * Focused unit coverage for the two rendered-title-aware rules added to
 * `computeSeoScorecard`:
 *  - `meta-title` bands the RENDERED "title | brand" length (what Google
 *    actually shows), not the raw field — but still scores 0 when the field
 *    itself is blank, since the check is "did the owner write one".
 *  - `local-address` prefers the structured `addressCity`/`addressState`/
 *    `addressPostalCode` columns over the legacy free-text `businessAddress`.
 *
 * `~/server/db` is mocked, so this runs in the `unit` project
 * (`pnpm test:nodb`) with no Postgres — same pattern as
 * `src/lib/media/usage.test.ts`. Every table `computeSeoScorecard` can touch
 * is stubbed to resolve `0`; every catalog feature flag is off, so only the
 * always-run `faqItem.count` is actually invoked, but the rest are mocked
 * too so this doesn't silently depend on that gating.
 */
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  BusinessForScorecard,
  SiteContentForScorecard,
} from "./scorecard";

vi.mock("~/server/db", () => ({
  db: {
    faqItem: { count: vi.fn() },
    page: { count: vi.fn() },
    product: { count: vi.fn() },
    image: { count: vi.fn() },
    collection: { count: vi.fn() },
    service: { count: vi.fn() },
    galleryImage: { count: vi.fn() },
  },
}));

const { db } = await import("~/server/db");
const { computeSeoScorecard } = await import("./scorecard");

/** The real Prisma delegate types are heavily overloaded; none of that
 * fidelity matters here — every test hands back `0`. */
const asMock = (fn: unknown) => fn as Mock<(args?: unknown) => Promise<number>>;

const ZERO_TABLES = [
  db.faqItem.count,
  db.page.count,
  db.product.count,
  db.image.count,
  db.collection.count,
  db.service.count,
  db.galleryImage.count,
];

beforeEach(() => {
  for (const fn of ZERO_TABLES) asMock(fn).mockResolvedValue(0);
});

const NEVER_ENABLED = () => false;

const BASE_BUSINESS: BusinessForScorecard = {
  name: "Bloom Apothecary",
  domainStatus: "ACTIVE",
  allowAiCrawlers: true,
  localBusinessEnabled: false,
  businessAddress: null,
  phoneNumber: null,
  businessHours: [],
  addressStreet: null,
  addressCity: null,
  addressState: null,
  addressPostalCode: null,
};

const BASE_SITE_CONTENT: SiteContentForScorecard = {
  metaTitle: null,
  metaDescription: null,
  seoBrandName: null,
  ogImage: null,
  faviconUrl: null,
  pageMeta: {},
  siteVerification: {},
};

type Scorecard = Awaited<ReturnType<typeof computeSeoScorecard>>;

function metaTitleItem(scorecard: Scorecard) {
  return scorecard.groups
    .find((g) => g.id === "listing")
    ?.items.find((i) => i.key === "meta-title");
}

function localAddressItem(scorecard: Scorecard) {
  return scorecard.groups
    .find((g) => g.id === "local")
    ?.items.find((i) => i.key === "local-address");
}

describe("computeSeoScorecard — meta-title (rendered length)", () => {
  it("scores 0 with 'Not set' when the field itself is blank, even though the rendered fallback (business name) is never blank", async () => {
    const scorecard = await computeSeoScorecard({
      businessId: "biz_1",
      isEnabled: NEVER_ENABLED,
      business: BASE_BUSINESS,
      siteContent: { ...BASE_SITE_CONTENT, metaTitle: "" },
    });
    const item = metaTitleItem(scorecard);
    expect(item?.score).toBe(0);
    expect(item?.detail).toBe("Not set");
  });

  it("bands on the RENDERED 'title | brand' length, not the raw field length", async () => {
    // "Lavender Soap" (13) + " | " (3) + "Bloom Apothecary" (16) = 32 — inside 30–60.
    const scorecard = await computeSeoScorecard({
      businessId: "biz_1",
      isEnabled: NEVER_ENABLED,
      business: BASE_BUSINESS,
      siteContent: { ...BASE_SITE_CONTENT, metaTitle: "Lavender Soap" },
    });
    const item = metaTitleItem(scorecard);
    expect(item?.score).toBe(1);
    expect(item?.detail).toBe("32 characters");
  });

  it("honors seoBrandName over the business name when computing the rendered length", async () => {
    // "Lavender Soap" (13) + " | " (3) + "Bloom Co" (8) = 24 — under the 30 floor,
    // even though the raw field alone would already read that way too; the point
    // is the SHORT BRAND is what gets measured, not the full business name.
    const scorecard = await computeSeoScorecard({
      businessId: "biz_1",
      isEnabled: NEVER_ENABLED,
      business: BASE_BUSINESS,
      siteContent: {
        ...BASE_SITE_CONTENT,
        metaTitle: "Lavender Soap",
        seoBrandName: "Bloom Co",
      },
    });
    const item = metaTitleItem(scorecard);
    expect(item?.score).toBe(0.5);
    expect(item?.detail).toBe("24 characters — aim for 30–60");
  });

  it("halves the score when the rendered title overruns the band", async () => {
    const scorecard = await computeSeoScorecard({
      businessId: "biz_1",
      isEnabled: NEVER_ENABLED,
      business: BASE_BUSINESS,
      siteContent: {
        ...BASE_SITE_CONTENT,
        metaTitle:
          "The Best Handmade Ceramic Pottery And Stoneware Mugs You Can Buy Online Today",
      },
    });
    const item = metaTitleItem(scorecard);
    expect(item?.score).toBe(0.5);
    expect(item?.detail).toContain("aim for 30");
  });

  it("skips the suffix (and its length) when the title already contains the brand", async () => {
    // Rendered title is just the 24-char field verbatim — no " | Bloom Apothecary"
    // appended — so this stays out of band at 24, not in-band at 24+19.
    const scorecard = await computeSeoScorecard({
      businessId: "biz_1",
      isEnabled: NEVER_ENABLED,
      business: BASE_BUSINESS,
      siteContent: {
        ...BASE_SITE_CONTENT,
        metaTitle: "Shop Bloom Apothecary",
      },
    });
    const item = metaTitleItem(scorecard);
    expect(item?.detail).toBe("21 characters — aim for 30–60");
  });
});

describe("computeSeoScorecard — local-address", () => {
  it("scores 0 with 'Not set' when nothing is set", async () => {
    const scorecard = await computeSeoScorecard({
      businessId: "biz_1",
      isEnabled: NEVER_ENABLED,
      business: { ...BASE_BUSINESS, localBusinessEnabled: true },
      siteContent: BASE_SITE_CONTENT,
    });
    const item = localAddressItem(scorecard);
    expect(item?.score).toBe(0);
    expect(item?.detail).toBe("Not set");
  });

  it("scores 0.5 for the legacy free-text address alone", async () => {
    const scorecard = await computeSeoScorecard({
      businessId: "biz_1",
      isEnabled: NEVER_ENABLED,
      business: {
        ...BASE_BUSINESS,
        localBusinessEnabled: true,
        businessAddress: "123 Main St, Detroit, MI 48201",
      },
      siteContent: BASE_SITE_CONTENT,
    });
    const item = localAddressItem(scorecard);
    expect(item?.score).toBe(0.5);
    expect(item?.detail).toBe(
      "Add city, state and ZIP so search engines can place you on a map",
    );
  });

  it("scores 1 once city, state and postal code are all set", async () => {
    const scorecard = await computeSeoScorecard({
      businessId: "biz_1",
      isEnabled: NEVER_ENABLED,
      business: {
        ...BASE_BUSINESS,
        localBusinessEnabled: true,
        addressCity: "Detroit",
        addressState: "MI",
        addressPostalCode: "48201",
      },
      siteContent: BASE_SITE_CONTENT,
    });
    const item = localAddressItem(scorecard);
    expect(item?.score).toBe(1);
    expect(item?.detail).toBe(
      "Emitted as a structured PostalAddress in your LocalBusiness schema",
    );
  });

  it("scores 0 when only some structured parts are set (e.g. city without state/ZIP)", async () => {
    const scorecard = await computeSeoScorecard({
      businessId: "biz_1",
      isEnabled: NEVER_ENABLED,
      business: {
        ...BASE_BUSINESS,
        localBusinessEnabled: true,
        addressCity: "Detroit",
      },
      siteContent: BASE_SITE_CONTENT,
    });
    const item = localAddressItem(scorecard);
    expect(item?.score).toBe(0);
  });

  it("prefers the structured address even when the legacy field is also set", async () => {
    const scorecard = await computeSeoScorecard({
      businessId: "biz_1",
      isEnabled: NEVER_ENABLED,
      business: {
        ...BASE_BUSINESS,
        localBusinessEnabled: true,
        businessAddress: "123 Main St, Detroit, MI 48201",
        addressCity: "Detroit",
        addressState: "MI",
        addressPostalCode: "48201",
      },
      siteContent: BASE_SITE_CONTENT,
    });
    const item = localAddressItem(scorecard);
    expect(item?.score).toBe(1);
    expect(item?.detail).toBe(
      "Emitted as a structured PostalAddress in your LocalBusiness schema",
    );
  });
});
