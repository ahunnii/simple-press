import type { SiteExportSummary } from "./types";

/** Test fixture builder (not exported from index.ts). */
export function makeSummary(
  overrides: Partial<SiteExportSummary> = {},
): SiteExportSummary {
  return {
    business: {
      id: "biz_1",
      name: 'Tom & Jerry\'s <Bakery>',
      slug: "tom-jerry",
      templateId: "default",
      siteUrl: "https://tom-jerry.simplepress.example",
      supportEmail: "hi@example.com",
      customDomain: "tomjerrys.com",
      exportedAt: new Date("2026-10-09T12:00:00Z"),
    },
    counts: {
      pages: 4,
      posts: 7,
      products: 23,
      collections: 3,
      services: 2,
      events: 5,
      galleries: 2,
      faqs: 6,
      testimonials: 9,
      photos: 112,
      videos: 2,
      customers: 41,
      orders: 58,
      forms: 2,
      invoices: 3,
      subscriptions: 4,
      loyaltyMembers: 12,
    },
    documents: [
      { section: "Pages", label: "About us", path: "Pages/About us.html" },
      { section: "Blog", label: "Hello", path: "Blog/Hello.html" },
      { section: "Products", label: "Catalog", path: "Products/index.html" },
      { section: "Products", label: "Blue Mug", path: "Products/Blue Mug.html" },
    ],
    spreadsheets: [
      { path: "Spreadsheets/Customers.csv", rows: 41 },
      { path: "Spreadsheets/Orders.csv", rows: 58 },
      { path: "Spreadsheets/Products.csv", rows: 23 },
    ],
    importFiles: [
      "Import files/WordPress/content.wxr.xml",
      "Import files/WordPress/woocommerce-products.csv",
      "Import files/Shopify/products.csv",
      "Import files/Wix/products.csv",
      "Import files/Squarespace/products.csv",
      "Import files/Square/items.csv",
    ],
    externalImages: [
      { url: "https://images.example.com/a.jpg?x=1&y=2", zipPath: "Photos/Template & stock images/a.jpg" },
      { url: "https://images.example.com/b.jpg", zipPath: null },
    ],
    notes: [{ level: "warn", message: "3 photos could not be downloaded <check>" }],
    hasStripe: true,
    hasCustomDomain: true,
    ...overrides,
  };
}

/** Every zip path a document in the export may legitimately link to. */
export function existingPaths(summary: SiteExportSummary, guidePaths: string[]): Set<string> {
  return new Set([
    "START HERE.html",
    "Site details.html",
    ...guidePaths,
    ...summary.documents.map((d) => d.path),
    ...summary.spreadsheets.map((s) => s.path),
    ...summary.importFiles,
    ...summary.externalImages.flatMap((e) => (e.zipPath ? [e.zipPath] : [])),
  ]);
}

/** Resolve every relative href in `html` against `docPath` and return zip paths. */
export function linkedZipPaths(docPath: string, html: string): string[] {
  const out: string[] = [];
  const re = /href="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1]!.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    if (/^[a-z]+:/i.test(raw) || raw.startsWith("#")) continue;
    const stack = docPath.split("/").slice(0, -1);
    for (const seg of raw.split("/")) {
      if (seg === "..") stack.pop();
      else if (seg !== ".") stack.push(decodeURIComponent(seg));
    }
    out.push(stack.join("/"));
  }
  return out;
}
