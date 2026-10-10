import { describe, expect, it } from "vitest";

import { business, ctx, mediaMap, page, product } from "./fixtures";
import type { ReadableData } from "./fetch";
import { assembleReadableDocuments } from "./index";
import type { SiteDetailsInput } from "./types";

const details: SiteDetailsInput = {
  name: "Mug & Co",
  subdomain: "mug",
  customDomain: "mugs.com",
  domainStatus: "ACTIVE",
  templateId: "dream",
  templateLabel: "Dream",
  supportEmail: "hi@mug.com",
  ownerEmail: null,
  phoneNumber: "555-0100",
  businessAddress: "1 Main St",
  timeZone: "America/Detroit",
  latitude: null,
  longitude: null,
  areaServed: [],
  businessHours: [{ days: ["mon", "tue"], closed: false, open: "09:00", close: "17:00" }],
  offersInStorePickup: false,
  pickupLocation: null,
  pickupInstructions: null,
  siteContent: {
    heroTitle: null, heroSubtitle: null, heroImageUrl: null, heroButtonText: null, heroButtonLink: null,
    aboutTitle: null, aboutText: null, aboutImageUrl: null, features: null, footerText: null,
    socialLinks: { instagram: "https://instagram.com/mug", facebook: "javascript:alert(1)" },
    metaTitle: "Mugs", metaDescription: null, metaKeywords: null, ogImage: null, faviconUrl: null,
    seoBrandName: null, pageMeta: { about: { title: "About us" } },
    logoUrl: "https://cdn.example.com/b/hero.jpg", logoAltText: null,
    primaryColor: "#112233", secondaryColor: null, accentColor: null,
    navigationItems: [{ label: "Shop", href: "/shop", children: [{ label: "Mugs", href: "/collections/mugs" }] }],
    footerNavigationItems: null, bannerConfig: null, popupConfig: null, customFields: null,
  },
  theme: { paletteLabel: null, paletteColors: [], fontsLabel: null, fontVars: {} },
};

const data: ReadableData = {
  pages: [page({ id: "1", title: "About" }), page({ id: "2", title: "About", slug: "about-2" }), page({ id: "3", title: "Index", slug: "index" })],
  posts: [page({ id: "4", title: "News", slug: "news", type: "blog" })],
  products: [product(), product({ slug: "blue-mug-2" })],
  collections: [],
  services: [],
  events: [],
  galleries: [],
  faqs: [{ id: "f1", question: "Q?", answer: "A.", published: true }],
  testimonials: [],
  details,
  registry: {
    templateId: "dream", templateLabel: "Dream", resolved: true, fields: [], groupTitles: {}, pageTitles: {},
  },
  customFields: null,
  timeZone: "America/Detroit",
  galleryMap: new Map(),
  serviceFieldInfo: () => ({ fields: [], groupTitles: {} }),
};

describe("assembleReadableDocuments", () => {
  const out = assembleReadableDocuments(data, { business, media: { byUrl: mediaMap } });
  const paths = out.files.map((f) => f.path);

  it("dedupes same-titled pages and reserves index.html", () => {
    expect(paths).toContain("Pages/About.html");
    expect(paths).toContain("Pages/About (2).html");
    expect(paths).toContain("Pages/Index (2).html");
    expect(paths.filter((p) => p === "Pages/index.html")).toHaveLength(1);
    expect(paths).toContain("Products/Blue Mug.html");
    expect(paths).toContain("Products/Blue Mug (2).html");
  });

  it("produces unique paths and lists every doc in the index", () => {
    expect(new Set(paths).size).toBe(paths.length);
    expect(out.index.map((e) => e.path).sort()).toEqual([...paths].sort());
    expect(paths).toContain("Site details.html");
    expect(paths).toContain("Blog/index.html");
    expect(paths).toContain("Products/index.html");
    expect(paths).toContain("Pages/FAQ.html");
    expect(paths.some((p) => p.startsWith("Events/"))).toBe(false);
  });

  it("reports counts", () => {
    expect(out.counts).toMatchObject({ pages: 3, posts: 1, products: 2, faqs: 1, services: 0 });
  });

  it("renders site details: hours, safe social links, nested menu, domain note", () => {
    const html = out.files.find((f) => f.path === "Site details.html")!.contents as string;
    expect(html).toContain("Mon–Tue");
    expect(html).toContain("9:00 AM – 5:00 PM");
    expect(html).toContain("https://instagram.com/mug");
    expect(html).toContain("<code>#112233</code>");
    expect(html).toContain("Mugs");
    expect(html).toContain("mugs.com");
    expect(html).toContain("point it at your new host");
    expect(html).toContain('src="Photos/Pages/hero.jpg"');
    // javascript: social link must not become an href
    expect(html).not.toContain('href="javascript');
    expect(html).toContain("About us");
    void ctx;
  });
});
