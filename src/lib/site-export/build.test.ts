import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MediaIndex, SiteExportFile } from "./types";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  buildMediaIndex: vi.fn(),
  buildReadableDocuments: vi.fn(),
  buildSpreadsheets: vi.fn(),
  buildImportFiles: vi.fn(),
  collectWordPressExport: vi.fn(),
  collectStoreContent: vi.fn(),
  buildLicenseFiles: vi.fn(),
}));

vi.mock("~/server/db", () => ({
  db: { business: { findUnique: mocks.findUnique } },
}));
vi.mock("~/lib/canonical", () => ({
  getCanonicalBaseUrl: (b: { subdomain: string; customDomain?: string | null; domainStatus?: string | null }) =>
    b.customDomain && b.domainStatus === "ACTIVE"
      ? `https://${b.customDomain}`
      : `https://${b.subdomain}.simplepress.test`,
}));
vi.mock("./media", () => ({ buildMediaIndex: mocks.buildMediaIndex }));
vi.mock("./readable", () => ({
  buildReadableDocuments: mocks.buildReadableDocuments,
}));
vi.mock("./spreadsheets", () => ({ buildSpreadsheets: mocks.buildSpreadsheets }));
vi.mock("./import-files", () => ({ buildImportFiles: mocks.buildImportFiles }));
vi.mock("./licenses", () => ({ buildLicenseFiles: mocks.buildLicenseFiles }));
vi.mock("~/lib/wordpress/export", () => ({
  collectWordPressExport: mocks.collectWordPressExport,
}));
vi.mock("~/lib/store-transfer/export", () => ({
  collectStoreContent: mocks.collectStoreContent,
}));

import {
  buildSiteExport,
  csvDataRows,
  guardPaths,
  mediaNotes,
  siteExportFilename,
  unsafePathReason,
  zipSiteExport,
  zipSiteExportStream,
} from "./build";

const BIZ = "biz_1";
const bytes = (n: number) => new Uint8Array(n).fill(7);

function mediaIndex(overrides: Partial<MediaIndex["stats"]> = {}): MediaIndex {
  return {
    byUrl: new Map([["https://cdn/x.jpg", "Photos/Products/Blue Mug/01.jpg"]]),
    files: [
      { path: "Photos/Branding/logo.png", contents: bytes(4), compress: false },
      { path: "Photos/Products/Blue Mug/01.jpg", contents: bytes(4), compress: false },
      { path: "Photos/Videos/intro.mp4", contents: bytes(4), compress: false },
      { path: "Photos/Media Library/clip.mov", contents: bytes(4), compress: false },
      { path: "Photos/Template & stock images/hero.jpg", contents: bytes(4), compress: false },
    ],
    stats: {
      listed: 4,
      included: 4,
      missing: [],
      external: [
        { url: "https://img.example/hero.jpg", zipPath: "Photos/Template & stock images/hero.jpg" },
        { url: "https://img.example/gone.jpg", zipPath: null },
      ],
      ...overrides,
    },
  };
}

function wordpressExport(products = 2) {
  return {
    businessSlug: "blue-mug-co",
    counts: {
      pages: 3,
      blogPosts: 1,
      policies: 2,
      faqs: 0,
      testimonials: 0,
      products,
      orders: 1,
      customers: 1,
      discounts: 0,
      reviews: 0,
    },
    files: [
      { path: "README.md", contents: "# readme" },
      { path: "content.wxr.xml", contents: "<rss/>" },
      { path: "products.csv", contents: "ID,Name\n1,Mug\n" },
      { path: "data.json", contents: '{"formatVersion":1}' },
      { path: "records/orders.csv", contents: "id\n1\n" },
      { path: "records/customers.csv", contents: "id\n1\n" },
    ],
  };
}

function setup(opts: { media?: MediaIndex; products?: number } = {}) {
  mocks.findUnique.mockResolvedValue({
    id: BIZ,
    name: "Blue Mug Co.",
    slug: "blue-mug-co",
    subdomain: "bluemug",
    templateId: "olive",
    supportEmail: "hi@bluemug.test",
    customDomain: "bluemug.com",
    domainStatus: "ACTIVE",
    stripeAccountId: "acct_123",
    _count: { forms: 3 },
  });
  mocks.buildMediaIndex.mockResolvedValue(opts.media ?? mediaIndex());
  mocks.buildReadableDocuments.mockResolvedValue({
    files: [
      { path: "Pages/index.html", contents: "<p>pages</p>" },
      { path: "Products/index.html", contents: "<p>products</p>" },
      { path: "Site details.html", contents: "<p>details</p>" },
      { path: "Pages/About.html", contents: "<p>about</p>" },
    ],
    counts: {
      pages: 2,
      posts: 1,
      products: 2,
      collections: 1,
      services: 0,
      events: 0,
      galleries: 0,
      faqs: 4,
      testimonials: 5,
    },
    index: [
      { section: "Pages", label: "All pages", path: "Pages/index.html" },
      { section: "Pages", label: "About", path: "Pages/About.html" },
      { section: "Products", label: "Catalog", path: "Products/index.html" },
    ],
    notes: [{ level: "info", message: "readable note" }],
  });
  mocks.buildSpreadsheets.mockResolvedValue({
    files: [
      { path: "Spreadsheets/products.csv", contents: '"A"\n"1"\n"2"\n' },
      { path: "Spreadsheets/customers.csv", contents: '"A"\n"1"\n' },
      { path: "Spreadsheets/orders.csv", contents: '"A"\n' },
      {
        path: "Spreadsheets/Form entries/Contact.csv",
        contents: '﻿"Q","A"\n"1","multi\nline"\n"2","b"\n',
      },
    ],
    counts: {
      products: 2,
      customers: 1,
      orders: 0,
      invoices: 6,
      subscriptions: 2,
      "loyalty-members": 9,
      "form-entries": 2,
    },
    notes: [{ level: "warn", message: "sheet note" }],
  });
  mocks.buildImportFiles.mockResolvedValue({
    files: [
      { path: "Import files/Shopify/products.csv", contents: "s" },
      { path: "Import files/Wix/products.csv", contents: "w" },
      { path: "Import files/Squarespace/products.csv", contents: "q" },
      { path: "Import files/Square/items.csv", contents: "sq" },
    ],
    notes: [{ level: "info", message: "import note" }],
  });
  mocks.collectWordPressExport.mockResolvedValue(wordpressExport(opts.products ?? 2));
  mocks.collectStoreContent.mockResolvedValue({
    manifestContent: { business: { name: "Blue Mug Co." } },
    templateId: "olive",
    businessSlug: "blue-mug-co",
  });
  mocks.buildLicenseFiles.mockResolvedValue([
    { path: "Licenses/LICENSE-AGPL-3.0.txt", contents: "agpl" },
    { path: "Licenses/NOTICE.txt", contents: "notice" },
  ]);
}

beforeEach(() => {
  vi.clearAllMocks();
  setup();
});

const paths = (files: SiteExportFile[]) => files.map((f) => f.path);
const topLevel = (p: string): string => p.split("/")[0] ?? p;

describe("buildSiteExport", () => {
  it("assembles the files in the documented order", async () => {
    const { files, filename } = await buildSiteExport(BIZ);
    const order = paths(files);
    expect(order[0]).toBe("START HERE.html");
    expect(order.slice(1, 9).every((p) => p.startsWith("Guides/"))).toBe(true);
    expect(order[9]).toBe("Site details.html");

    // Top-level sections appear in one contiguous run each, in this order.
    const sections: string[] = [];
    for (const p of order) {
      const t = topLevel(p);
      if (sections[sections.length - 1] !== t) sections.push(t);
    }
    expect(sections).toEqual([
      "START HERE.html",
      "Guides",
      "Site details.html",
      "Pages",
      "Products",
      "Photos",
      "Spreadsheets",
      "Import files",
      "For developers",
      "Licenses",
    ]);
    expect(filename).toMatch(/^Blue Mug Co - Site Export - \d{4}-\d{2}-\d{2}\.zip$/);
  });

  it("passes the media index to the readable builder and loads the business", async () => {
    const { summary } = await buildSiteExport(BIZ);
    const ctx = mocks.buildReadableDocuments.mock.calls[0]![1] as {
      media: Pick<MediaIndex, "byUrl">;
    };
    expect(ctx.media.byUrl.get("https://cdn/x.jpg")).toBe("Photos/Products/Blue Mug/01.jpg");
    expect(summary.business).toMatchObject({
      id: BIZ,
      name: "Blue Mug Co.",
      siteUrl: "https://bluemug.com",
      customDomain: "bluemug.com",
      supportEmail: "hi@bluemug.test",
      templateId: "olive",
    });
    expect(summary.hasStripe).toBe(true);
    expect(summary.hasCustomDomain).toBe(true);
  });

  it("hides a custom domain that is not active", async () => {
    mocks.findUnique.mockResolvedValueOnce({
      id: BIZ,
      name: "X",
      slug: "x",
      subdomain: "x",
      templateId: "default",
      supportEmail: null,
      customDomain: "x.com",
      domainStatus: "PENDING_DNS",
      stripeAccountId: null,
      _count: { forms: 0 },
    });
    const { summary } = await buildSiteExport(BIZ);
    expect(summary.business.customDomain).toBeNull();
    expect(summary.business.siteUrl).toBe("https://x.simplepress.test");
    expect(summary.hasCustomDomain).toBe(false);
    expect(summary.hasStripe).toBe(false);
  });

  it("throws a clear error when the business is missing", async () => {
    mocks.findUnique.mockResolvedValueOnce(null);
    await expect(buildSiteExport(BIZ)).rejects.toThrow("Business not found");
  });

  it("re-paths the WordPress export and drops its README and records", async () => {
    const { files } = await buildSiteExport(BIZ);
    const p = paths(files);
    expect(p).toContain("Import files/WordPress/content.wxr.xml");
    expect(p).toContain("Import files/WordPress/woocommerce-products.csv");
    expect(p).toContain("For developers/data.json");
    expect(p).toContain("For developers/README.txt");
    expect(p.some((x) => x.endsWith("README.md"))).toBe(false);
    expect(p.some((x) => x.includes("records/"))).toBe(false);
    const wxr = files.find((f) => f.path === "Import files/WordPress/content.wxr.xml");
    expect(wxr?.contents).toBe("<rss/>");
  });

  it("skips the WooCommerce CSV when the store has no products", async () => {
    setup({ products: 0 });
    const { files, summary } = await buildSiteExport(BIZ);
    expect(paths(files)).not.toContain("Import files/WordPress/woocommerce-products.csv");
    expect(summary.importFiles).not.toContain("Import files/WordPress/woocommerce-products.csv");
  });

  it("writes the store-content JSON for developers", async () => {
    const { files } = await buildSiteExport(BIZ);
    const f = files.find((x) => x.path === "For developers/simplepress-store-content.json");
    const json = JSON.parse(String(f?.contents)) as Record<string, unknown>;
    expect(json).toMatchObject({
      formatVersion: 2,
      templateId: "olive",
      content: { business: { name: "Blue Mug Co." } },
    });
    expect(typeof json.exportedAt).toBe("string");
    expect(String(f?.contents)).toContain('\n  "templateId"');
  });

  it("maps every count into the summary", async () => {
    const { summary } = await buildSiteExport(BIZ);
    expect(summary.counts).toEqual({
      pages: 2,
      posts: 1,
      products: 2,
      collections: 1,
      services: 0,
      events: 0,
      galleries: 0,
      faqs: 4,
      testimonials: 5,
      photos: 3, // logo, product photo, stock image
      videos: 2, // Photos/Videos/intro.mp4 + .mov in Media Library
      customers: 1,
      orders: 0,
      forms: 3, // all forms (db), not just the 1 with entries
      invoices: 6,
      subscriptions: 2,
      loyaltyMembers: 9,
    });
    expect(summary.spreadsheets).toEqual([
      { path: "Spreadsheets/products.csv", rows: 2 },
      { path: "Spreadsheets/customers.csv", rows: 1 },
      { path: "Spreadsheets/orders.csv", rows: 0 },
      { path: "Spreadsheets/Form entries/Contact.csv", rows: 2 },
    ]);
    expect(summary.importFiles).toEqual([
      "Import files/WordPress/content.wxr.xml",
      "Import files/WordPress/woocommerce-products.csv",
      "Import files/Shopify/products.csv",
      "Import files/Wix/products.csv",
      "Import files/Squarespace/products.csv",
      "Import files/Square/items.csv",
    ]);
    expect(summary.documents.map((d) => d.path)).toEqual([
      "Pages/index.html",
      "Pages/About.html",
      "Products/index.html",
    ]);
    expect(summary.externalImages).toHaveLength(2);
    expect(summary.notes.map((n) => n.message)).toEqual([
      "readable note",
      "sheet note",
      "import note",
    ]);
  });

  it("turns a failing optional builder into a note instead of failing", async () => {
    mocks.collectWordPressExport.mockRejectedValueOnce(new Error("boom"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { files, summary } = await buildSiteExport(BIZ);
    spy.mockRestore();
    expect(paths(files).some((p) => p.startsWith("Import files/WordPress/"))).toBe(false);
    expect(paths(files)).not.toContain("For developers/data.json");
    expect(summary.notes.some((n) => n.level === "warn" && n.message.includes("WordPress") && n.message.includes("boom"))).toBe(true);
  });

  it("summarizes many missing photos and notes the listing mismatch", async () => {
    const missing = Array.from({ length: 12 }, (_, i) => `${BIZ}/image-${i}.jpg`);
    setup({ media: mediaIndex({ listed: 16, included: 4, missing }) });
    const { summary } = await buildSiteExport(BIZ);
    const warn = summary.notes.filter((n) => n.level === "warn");
    expect(warn[0]?.message).toContain("12 photos or videos couldn't be downloaded");
    expect(warn[0]?.message).toContain("image-9.jpg");
    expect(warn[0]?.message).not.toContain("image-10.jpg");
    expect(warn[0]?.message).not.toContain(`${BIZ}/`);
    expect(summary.notes.some((n) => n.level === "info" && n.message.includes("16 uploaded files; 4 are included"))).toBe(true);
  });

  it("drops duplicate and unsafe paths with a warn note", async () => {
    mocks.buildImportFiles.mockResolvedValueOnce({
      files: [
        { path: "Import files/Shopify/products.csv", contents: "first" },
        { path: "import files/shopify/PRODUCTS.csv", contents: "dupe" },
        { path: "Import files/../evil.csv", contents: "x" },
        { path: "/abs.csv", contents: "x" },
      ],
      notes: [],
    });
    const { files, summary } = await buildSiteExport(BIZ);
    const p = paths(files);
    expect(p.filter((x) => x.toLowerCase() === "import files/shopify/products.csv")).toEqual([
      "Import files/Shopify/products.csv",
    ]);
    expect(p.some((x) => x.includes(".."))).toBe(false);
    expect(p.some((x) => x.startsWith("/"))).toBe(false);
    expect(summary.importFiles).not.toContain("Import files/../evil.csv");
    const pathNotes = summary.notes.filter(
      (n) => n.level === "warn" && /left out of the export|same name/.test(n.message),
    );
    expect(pathNotes).toHaveLength(3);
    expect(new Set(p).size).toBe(p.length);
  });

  it("reports progress", async () => {
    const steps: string[] = [];
    mocks.buildMediaIndex.mockImplementationOnce(
      async (_id: string, o: { onProgress?: (d: number, t: number) => void }) => {
        for (let d = 1; d <= 60; d++) o.onProgress?.(d, 60);
        return mediaIndex();
      },
    );
    await buildSiteExport(BIZ, { onProgress: (s) => steps.push(s) });
    expect(steps[0]).toBe("Loading store");
    expect(steps).toContain("Downloading photos and videos (25/60)");
    expect(steps).toContain("Downloading photos and videos (60/60)");
    expect(steps).not.toContain("Downloading photos and videos (26/60)");
    expect(steps[steps.length - 1]).toBe("Done");
  });
});

describe("helpers", () => {
  it("formats the filename with a safe store name and UTC date", () => {
    expect(siteExportFilename("Tom & Jerry's: Bakery", new Date("2026-10-09T23:30:00Z"))).toBe(
      "Tom & Jerry's - Bakery - Site Export - 2026-10-09.zip",
    );
    expect(siteExportFilename("  ", new Date("2026-01-02T00:00:00Z"))).toBe(
      "Store - Site Export - 2026-01-02.zip",
    );
  });

  it("lists up to 10 missing keys individually", () => {
    const notes = mediaNotes(
      { listed: 3, included: 1, missing: [`${BIZ}/a.jpg`, `${BIZ}/b.jpg`], external: [] },
      BIZ,
    );
    expect(notes.map((n) => n.level)).toEqual(["warn", "warn", "info"]);
    expect(notes[0]?.message).toMatch(/: a\.jpg\.$/);
    expect(mediaNotes({ listed: 1, included: 1, missing: [], external: [] }, BIZ)).toEqual([]);
  });

  it("counts CSV data rows with BOMs and multi-line cells", () => {
    expect(csvDataRows('﻿"a","b"\n"1","x\ny"\n"2","z"\n')).toBe(2);
    expect(csvDataRows('"a"\n')).toBe(0);
    expect(csvDataRows("")).toBe(0);
  });

  it("rejects unsafe zip paths", () => {
    expect(unsafePathReason("Photos/a..b.jpg")).toBeNull();
    expect(unsafePathReason("/a")).not.toBeNull();
    expect(unsafePathReason("a/../b")).not.toBeNull();
    expect(unsafePathReason("a//b")).not.toBeNull();
    expect(unsafePathReason("a\\b")).not.toBeNull();
    expect(guardPaths([{ path: "a", contents: "" }, { path: "A", contents: "" }]).files).toHaveLength(1);
  });
});

describe("zipSiteExport", () => {
  it("stores photos uncompressed and deflates everything else", async () => {
    const text = "hello ".repeat(200);
    const zipped = await zipSiteExport([
      { path: "START HERE.html", contents: text },
      { path: "Photos/Products/Blue Mug/01.jpg", contents: bytes(500), compress: false },
    ]);
    expect(zipped).toBeInstanceOf(Uint8Array);
    const zip = await JSZip.loadAsync(zipped);
    const html = zip.file("START HERE.html")!;
    const jpg = zip.file("Photos/Products/Blue Mug/01.jpg")!;
    expect(await html.async("string")).toBe(text);
    expect(await jpg.async("uint8array")).toEqual(bytes(500));

    type Internal = { _data: { compression: { magic: string }; compressedSize: number } };
    const htmlData = (html as unknown as Internal)._data;
    const jpgData = (jpg as unknown as Internal)._data;
    expect(htmlData.compression.magic).toBe("\x08\x00"); // DEFLATE
    expect(htmlData.compressedSize).toBeLessThan(text.length);
    expect(jpgData.compression.magic).toBe("\x00\x00"); // STORE
    expect(jpgData.compressedSize).toBe(500);
  });
});

describe("zipSiteExportStream", () => {
  it("streams a ZIP with the same entries as the buffered version", async () => {
    const text = "hello ".repeat(200);
    const stream = zipSiteExportStream([
      { path: "START HERE.html", contents: text },
      { path: "Photos/Products/Blue Mug/01.jpg", contents: bytes(500), compress: false },
    ]);
    const zipped = new Uint8Array(await new Response(stream).arrayBuffer());
    const zip = await JSZip.loadAsync(zipped);
    expect(await zip.file("START HERE.html")!.async("string")).toBe(text);
    expect(await zip.file("Photos/Products/Blue Mug/01.jpg")!.async("uint8array")).toEqual(bytes(500));
  });
});
