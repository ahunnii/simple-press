/**
 * `buildUsedMediaIndex` is the platform's only authority on "does anything
 * still reference this S3 object". Both the Media Library's delete gate
 * (`media.delete` / `media.bulkDelete`), `gallery.delete`, and
 * `product.delete` / `bulkDelete` / `syncImages` decide whether to destroy a
 * stored object based on what it reports. A blind spot here is not a cosmetic
 * "shows as unused" bug — it is a live file getting deleted out of MinIO, which
 * a database restore does not bring back.
 *
 * These tests cover blind spots that were fixed:
 *  - `Service.customFields` (service-page template fields) was not scanned at all
 *  - `Product.additionalFields` was scanned only at the `additionalInformation`
 *    key, so any other image URL in that free-form blob was invisible
 *  - `SiteContent.pageMeta` / `popupConfig`, `Page.previewDraft` and
 *    `Business.maintenanceImage` / `maintenanceMessage` were not scanned at all
 *  - `Form.definition` picture-choice option photos / reference image were not
 *    scanned at all
 *
 * `~/server/db` is mocked, so this runs in the `unit` project (`pnpm test:nodb`)
 * with no Postgres. The service-template registry is NOT mocked — resolving a
 * real field key to its real label/type is half the behaviour under test.
 */
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/server/db", () => ({
  db: {
    siteContent: { findUnique: vi.fn() },
    business: { findUnique: vi.fn() },
    product: { findMany: vi.fn() },
    productVariant: { findMany: vi.fn() },
    productOptionValue: { findMany: vi.fn() },
    collection: { findMany: vi.fn() },
    service: { findMany: vi.fn() },
    event: { findMany: vi.fn() },
    video: { findMany: vi.fn() },
    image: { findMany: vi.fn() },
    page: { findMany: vi.fn() },
    galleryImage: { findMany: vi.fn() },
    gallery: { findMany: vi.fn() },
    testimonial: { findMany: vi.fn() },
    productReview: { findMany: vi.fn() },
    form: { findMany: vi.fn() },
    marketingCampaign: { findMany: vi.fn() },
  },
}));

const { db } = await import("~/server/db");
const { buildGalleryExternalUsage, buildUsedMediaIndex, isLibraryOwnedKey } =
  await import("./usage");
const { keyToPublicUrl } = await import("~/lib/s3/url");
const { SERVICE_TEMPLATE_FIELDS } = await import("~/lib/service-templates");

const BUSINESS_ID = "biz_1";

/**
 * Cast a mocked Prisma delegate method to a plain vitest Mock — the real
 * delegate types are heavily overloaded and none of that fidelity matters
 * here; every test hands back a hand-built row shape.
 */
const asMock = (fn: unknown) =>
  fn as Mock<(args?: unknown) => Promise<unknown>>;

/** Every table the scanner touches, so a test only sets up the one it cares about. */
const EMPTY_TABLES = [
  db.product.findMany,
  db.productVariant.findMany,
  db.productOptionValue.findMany,
  db.collection.findMany,
  db.service.findMany,
  db.event.findMany,
  db.video.findMany,
  db.image.findMany,
  db.page.findMany,
  db.galleryImage.findMany,
  db.gallery.findMany,
  db.testimonial.findMany,
  db.productReview.findMany,
  db.form.findMany,
  db.marketingCampaign.findMany,
];

beforeEach(() => {
  vi.clearAllMocks();
  asMock(db.siteContent.findUnique).mockResolvedValue(null);
  asMock(db.business.findUnique).mockResolvedValue(null);
  for (const fn of EMPTY_TABLES) asMock(fn).mockResolvedValue([]);
});

/** Build a Service row in the shape the scanner selects. */
function serviceRow(customFields: unknown, serviceTemplateId = "service-two") {
  return {
    id: "svc_1",
    name: "Deep Clean",
    image: null,
    ogImage: null,
    serviceTemplateId,
    customFields,
    items: [],
  };
}

// ─── Service.customFields ─────────────────────────────────────────────────────

describe("buildUsedMediaIndex — Service.customFields", () => {
  it("reports a URL referenced ONLY from a service-page template field", async () => {
    const url = keyToPublicUrl(`${BUSINESS_ID}/image-svc-intro.jpg`);
    asMock(db.service.findMany).mockResolvedValue([
      serviceRow({ "service-two.intro-image": url }),
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);
    const usages = index.get(url);

    expect(usages).toHaveLength(1);
    expect(usages?.[0]).toMatchObject({
      url,
      entityType: "service",
      entityId: "svc_1",
      entityLabel: "Deep Clean",
      adminHref: "/admin/services/svc_1",
    });
    // Label comes from the real service-template registry, not the raw key.
    expect(usages?.[0]?.location).toContain("Intro Image");
  });

  it("never flags a service field as inactiveTemplate (nothing scrubs that blob)", async () => {
    const url = keyToPublicUrl(`${BUSINESS_ID}/image-svc-intro.jpg`);
    asMock(db.service.findMany).mockResolvedValue([
      // A key owned by a DIFFERENT service template than the one the service
      // currently uses — the closest analogue to SiteContent's inactive-template
      // leftovers. It must still block deletion: the media router's scrub only
      // ever touches SiteContent, so deleting here would leave the service row
      // pointing at a 404.
      serviceRow({ "service-two.intro-image": url }, "service-one"),
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);
    const usages = index.get(url) ?? [];

    expect(usages).toHaveLength(1);
    expect(usages[0]?.inactiveTemplate).toBeUndefined();
    // Unknown-to-this-template key falls back to the raw key in the label.
    expect(usages[0]?.location).toContain("service-two.intro-image");
  });

  it("finds URLs nested inside a richtext (TipTap) service field", async () => {
    const url = keyToPublicUrl(`${BUSINESS_ID}/image-in-body.png`);
    asMock(db.service.findMany).mockResolvedValue([
      serviceRow({
        "service-two.intro-body": {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "hi" }] },
            { type: "image", attrs: { src: url } },
          ],
        },
      }),
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.get(url)).toHaveLength(1);
    expect(index.get(url)?.[0]?.location).toContain("rich text");
  });

  it("finds URLs from a video node nested inside a richtext (TipTap) service field", async () => {
    const url = keyToPublicUrl(`${BUSINESS_ID}/video-in-body.mp4`);
    asMock(db.service.findMany).mockResolvedValue([
      serviceRow({
        "service-two.intro-body": {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "hi" }] },
            { type: "video", attrs: { src: url, ambient: true } },
          ],
        },
      }),
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.get(url)).toHaveLength(1);
    expect(index.get(url)?.[0]?.location).toContain("rich text");
  });

  it("ignores non-storage URLs in service fields", async () => {
    const external = "https://images.example.com/not-ours.jpg";
    asMock(db.service.findMany).mockResolvedValue([
      serviceRow({ "service-two.intro-image": external }),
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.get(external)).toBeUndefined();
  });

  it("treats a gallery-type service field as an embed, so gallery.delete sees it", async () => {
    // Guard: if the registry ever loses its gallery-type service fields this
    // test is silently vacuous, so assert the fixture is real.
    const galleryField = (SERVICE_TEMPLATE_FIELDS["service-two"] ?? []).find(
      (f) => f.type === "gallery",
    );
    expect(galleryField).toBeDefined();

    const url = keyToPublicUrl(`${BUSINESS_ID}/image-gallery-1.jpg`);
    asMock(db.service.findMany).mockResolvedValue([
      serviceRow({ [galleryField!.key]: "gal_1" }),
    ]);
    asMock(db.galleryImage.findMany).mockResolvedValue([
      {
        id: "gi_1",
        url,
        galleryId: "gal_1",
        gallery: { name: "Before & After" },
      },
    ]);
    asMock(db.gallery.findMany).mockResolvedValue([{ id: "gal_1" }]);

    const external = await buildGalleryExternalUsage(BUSINESS_ID);
    const embeds = external.get("gal_1");

    // Without the customFields scan nothing references the gallery ID, so
    // `gallery.delete` would have removed it (and its now-unreferenced S3
    // objects) while the service page still rendered it.
    expect(embeds).toBeDefined();
    expect(embeds?.[0]?.location).toContain(galleryField!.label);
    expect(embeds?.[0]?.adminHref).toBe("/admin/services/svc_1");

    // The media index still expands the embed to per-image usages.
    const index = await buildUsedMediaIndex(BUSINESS_ID);
    expect(index.get(url)?.map((u) => u.entityType)).toEqual(
      expect.arrayContaining(["galleryImage", "service"]),
    );
  });
});

describe("buildUsedMediaIndex — Service.customFields list rows + dream-lane", () => {
  it("finds photos inside the image sub-field of a service-template LIST field", async () => {
    // Guard: the fixture must be a real list field with an image sub-field.
    const listField = (SERVICE_TEMPLATE_FIELDS["dream-lane"] ?? []).find(
      (f) => f.key === "dream-lane.sections",
    );
    expect(listField?.type).toBe("list");
    const itemSchema =
      listField?.type === "list" ? (listField.itemSchema ?? []) : [];
    expect(itemSchema.some((i) => i.type === "image")).toBe(true);

    const a = keyToPublicUrl(`${BUSINESS_ID}/image-lane-a.jpg`);
    const b = keyToPublicUrl(`${BUSINESS_ID}/image-lane-b.jpg`);
    asMock(db.service.findMany).mockResolvedValue([
      serviceRow(
        {
          "dream-lane.sections": [
            {
              _id: "r1",
              heading: "One",
              body: "x",
              image: a,
              alt: "",
              crop: "",
            },
            {
              _id: "r2",
              heading: "Two",
              body: "",
              image: b,
              alt: "",
              crop: "",
            },
            { _id: "r3", heading: "Text only", body: "y", image: "" },
          ],
        },
        "dream-lane",
      ),
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);
    for (const url of [a, b]) {
      const usages = index.get(url);
      expect(usages).toHaveLength(1);
      expect(usages?.[0]).toMatchObject({
        entityType: "service",
        entityId: "svc_1",
        entityLabel: "Deep Clean",
        adminHref: "/admin/services/svc_1",
      });
      expect(usages?.[0]?.location).toContain("Sections");
      // Must block deletion: nothing scrubs Service.customFields.
      expect(usages?.[0]?.inactiveTemplate).toBeUndefined();
    }
  });

  it("treats EVERY gallery-type service-template field as an embed (generic, incl. dream-lane.gallery)", async () => {
    const galleryFields = Object.entries(SERVICE_TEMPLATE_FIELDS).flatMap(
      ([templateId, fields]) =>
        fields
          .filter((f) => f.type === "gallery")
          .map((f) => ({ templateId, key: f.key })),
    );
    expect(galleryFields.map((f) => f.key)).toEqual(
      expect.arrayContaining(["service-two.gallery", "dream-lane.gallery"]),
    );

    for (const { templateId, key } of galleryFields) {
      asMock(db.service.findMany).mockResolvedValue([
        serviceRow({ [key]: "gal_1" }, templateId),
      ]);
      asMock(db.gallery.findMany).mockResolvedValue([{ id: "gal_1" }]);

      const embeds = (await buildGalleryExternalUsage(BUSINESS_ID)).get(
        "gal_1",
      );
      expect(embeds, key).toHaveLength(1);
      expect(embeds?.[0]?.adminHref, key).toBe("/admin/services/svc_1");
      // Active (blocking) — never the scrub-and-delete path.
      expect(embeds?.[0]?.inactiveTemplate, key).toBeUndefined();
    }
  });
});

// ─── Product.additionalFields ─────────────────────────────────────────────────

describe("buildUsedMediaIndex — Product.additionalFields", () => {
  function productRow(additionalFields: unknown) {
    return {
      id: "prod_1",
      name: "Stoneware Mug",
      ogImage: null,
      additionalFields,
    };
  }

  it("reports a URL referenced only from a NON-additionalInformation key", async () => {
    const url = keyToPublicUrl(`${BUSINESS_ID}/image-feature-icon.svg`);
    asMock(db.product.findMany).mockResolvedValue([
      productRow({
        comingSoon: false,
        productTagline: "Hand thrown",
        productFeatures: [{ icon: url, text: "Handmade in Detroit" }],
      }),
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);
    const usages = index.get(url);

    expect(usages).toHaveLength(1);
    expect(usages?.[0]).toMatchObject({
      url,
      entityType: "product",
      entityId: "prod_1",
      entityLabel: "Stoneware Mug",
      adminHref: "/admin/products/prod_1",
    });
    expect(usages?.[0]?.location).toContain("productFeatures");
  });

  it("still reports additionalInformation TipTap images under their original label", async () => {
    const url = keyToPublicUrl(`${BUSINESS_ID}/image-care-guide.jpg`);
    asMock(db.product.findMany).mockResolvedValue([
      productRow({
        additionalInformation: {
          type: "doc",
          content: [{ type: "image", attrs: { src: url } }],
        },
      }),
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.get(url)?.[0]?.location).toBe(
      "Product additional information",
    );
  });

  it("does not choke on a null / non-object additionalFields blob", async () => {
    asMock(db.product.findMany).mockResolvedValue([
      productRow(null),
      { ...productRow("nonsense"), id: "prod_2" },
    ]);

    await expect(buildUsedMediaIndex(BUSINESS_ID)).resolves.toBeInstanceOf(Map);
  });
});

// ─── ProductOptionValue.imageUrl ──────────────────────────────────────────────

describe("buildUsedMediaIndex — product option values", () => {
  it("indexes customizer value images so product deletes don't reap them", async () => {
    const url = keyToPublicUrl(`${BUSINESS_ID}/image-heart-charm.jpg`);
    asMock(db.productOptionValue.findMany).mockResolvedValue([
      { id: "val_1", label: "Heart", imageUrl: url, group: { name: "Charms" } },
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.get(url)?.[0]).toMatchObject({
      entityType: "productOptionValue",
      entityId: "val_1",
      entityLabel: "Heart",
      location: 'Product option "Charms"',
    });
  });
});

// ─── Product gallery Image rows ───────────────────────────────────────────────

describe("buildUsedMediaIndex — Product gallery Image rows", () => {
  it("counts a gallery row even when Image.businessId is unset (legacy syncImages)", async () => {
    const url = keyToPublicUrl(`${BUSINESS_ID}/image-gallery.jpg`);
    asMock(db.image.findMany).mockResolvedValue([
      { id: "img_1", url, productId: "prod_1" },
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.get(url)?.[0]).toMatchObject({
      url,
      location: "Product image",
      entityType: "image",
      entityId: "img_1",
      adminHref: "/admin/products/prod_1",
    });

    expect(asMock(db.image.findMany).mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        where: {
          OR: [
            { businessId: BUSINESS_ID },
            { product: { businessId: BUSINESS_ID } },
          ],
        },
      }),
    );
  });
});

// ─── SiteContent.pageMeta / popupConfig ───────────────────────────────────────

describe("buildUsedMediaIndex — SiteContent SEO + popup blobs", () => {
  function siteContentRow(overrides: Record<string, unknown>) {
    return {
      heroImageUrl: null,
      aboutImageUrl: null,
      ogImage: null,
      faviconUrl: null,
      logoUrl: null,
      pageMeta: null,
      popupConfig: null,
      customFields: null,
      previewCustomFields: null,
      business: { templateId: "modern" },
      ...overrides,
    };
  }

  it("reports a per-route pageMeta ogImage, labelled with the route", async () => {
    const url = keyToPublicUrl(`${BUSINESS_ID}/image-about-og.jpg`);
    const retired = keyToPublicUrl(`${BUSINESS_ID}/image-retired-og.jpg`);
    asMock(db.siteContent.findUnique).mockResolvedValue(
      siteContentRow({
        pageMeta: {
          about: { title: "About us", ogImage: url },
          contact: { title: "No image here" },
          // A route key no longer in STATIC_SEO_ROUTES still blocks deletion.
          "old-route": { ogImage: retired },
        },
      }),
    );

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.get(url)).toEqual([
      {
        url,
        location: "Page SEO image",
        entityType: "siteContent",
        entityLabel: "About",
        adminHref: "/admin/content/seo",
      },
    ]);
    expect(index.get(retired)?.[0]?.entityLabel).toBe("old-route");
  });

  it("reports the announcement popup image", async () => {
    const url = keyToPublicUrl(`${BUSINESS_ID}/image-popup.jpg`);
    asMock(db.siteContent.findUnique).mockResolvedValue(
      siteContentRow({ popupConfig: { mode: "image", imagePath: url } }),
    );

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.get(url)?.[0]).toMatchObject({
      location: "Announcement popup",
      entityType: "siteContent",
      adminHref: "/admin/content/announcements",
    });
  });

  it("does not choke on malformed pageMeta / popupConfig blobs", async () => {
    asMock(db.siteContent.findUnique).mockResolvedValue(
      siteContentRow({
        pageMeta: { about: "nonsense", shop: null, blog: { ogImage: 42 } },
        popupConfig: ["nonsense"],
      }),
    );

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.size).toBe(0);
  });
});

// ─── Page.previewDraft ────────────────────────────────────────────────────────

describe("buildUsedMediaIndex — Page.previewDraft", () => {
  it("reports media referenced only from an unpublished visual-editor draft", async () => {
    const url = keyToPublicUrl(`${BUSINESS_ID}/image-draft-only.jpg`);
    const videoUrl = keyToPublicUrl(`${BUSINESS_ID}/video-draft-only.mp4`);
    asMock(db.page.findMany).mockResolvedValue([
      {
        id: "page_1",
        title: "About",
        slug: "about",
        image: null,
        ogImage: null,
        content: { type: "doc", content: [] },
        previewDraft: {
          title: "About (new)",
          excerpt: null,
          content: {
            type: "doc",
            content: [
              { type: "image", attrs: { src: url } },
              { type: "video", attrs: { src: videoUrl } },
            ],
          },
        },
        type: "page",
      },
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.get(url)?.[0]).toMatchObject({
      location: "Page content (draft)",
      entityType: "page",
      entityId: "page_1",
      adminHref: "/admin/content/pages/page_1",
    });
    expect(index.get(videoUrl)).toHaveLength(1);
  });
});

// ─── Business maintenance page ────────────────────────────────────────────────

describe("buildUsedMediaIndex — Business maintenance page", () => {
  it("reports the maintenance flyer image and rich-text message images", async () => {
    const flyer = keyToPublicUrl(`${BUSINESS_ID}/image-flyer.jpg`);
    const inline = keyToPublicUrl(`${BUSINESS_ID}/image-inline.jpg`);
    asMock(db.business.findUnique).mockResolvedValue({
      maintenanceImage: flyer,
      maintenanceMessage: {
        type: "doc",
        content: [{ type: "image", attrs: { src: inline } }],
      },
    });

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.get(flyer)).toEqual([
      {
        url: flyer,
        location: "Maintenance page",
        entityType: "business",
        entityLabel: "Flyer image",
        adminHref: "/admin/settings/availability",
      },
    ]);
    expect(index.get(inline)?.[0]?.location).toBe(
      "Maintenance page message (rich text)",
    );
  });
});

// ─── Links to stored files (Media Library PDFs) ───────────────────────────────

describe("buildUsedMediaIndex — links to stored files", () => {
  const pdf = keyToPublicUrl(`${BUSINESS_ID}/library-doc-ab12cd.pdf`);

  /** A paragraph whose single text run carries a `link` mark to `href`. */
  const linkDoc = (...hrefs: string[]) => ({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: hrefs.map((href) => ({
          type: "text",
          text: "Download",
          marks: [{ type: "bold" }, { type: "link", attrs: { href } }],
        })),
      },
    ],
  });

  function pageRow(content: unknown, type = "page") {
    return {
      id: "page_1",
      title: "Menu",
      slug: "menu",
      image: null,
      ogImage: null,
      content,
      previewDraft: null,
      type,
    };
  }

  function siteContentRow(overrides: Record<string, unknown>) {
    return {
      heroImageUrl: null,
      aboutImageUrl: null,
      ogImage: null,
      faviconUrl: null,
      logoUrl: null,
      pageMeta: null,
      popupConfig: null,
      bannerConfig: null,
      navigationItems: null,
      footerNavigationItems: null,
      customFields: null,
      previewCustomFields: null,
      business: { templateId: "modern" },
      ...overrides,
    };
  }

  it("records a rich-text link mark pointing at a stored PDF, keyed canonically", async () => {
    asMock(db.page.findMany).mockResolvedValue([
      // `#page=2` and `?v=1` must still resolve to the object's public URL —
      // that is the key the Media Library looks rows up by.
      pageRow(linkDoc(`${pdf}#page=2`, `${pdf}?v=1`)),
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.get(pdf)).toEqual([
      {
        url: `${pdf}#page=2`,
        location: "Linked from page",
        entityType: "page",
        entityId: "page_1",
        entityLabel: "Menu",
        adminHref: "/admin/content/pages/page_1",
      },
      expect.objectContaining({ url: `${pdf}?v=1` }),
    ]);
  });

  it("labels blog-post links as such", async () => {
    asMock(db.page.findMany).mockResolvedValue([pageRow(linkDoc(pdf), "blog")]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.get(pdf)?.[0]).toMatchObject({
      location: "Linked from blog post",
      adminHref: "/admin/content/blog/page_1",
    });
  });

  it("ignores link marks that do not point at our bucket", async () => {
    asMock(db.page.findMany).mockResolvedValue([
      pageRow(
        linkDoc(
          "https://example.com/menu.pdf",
          "/contact",
          "#faq",
          "mailto:hi@example.com",
          "",
        ),
      ),
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.size).toBe(0);
  });

  it("records links inside template-field, product and maintenance rich text", async () => {
    asMock(db.siteContent.findUnique).mockResolvedValue(
      siteContentRow({ customFields: { "custom-about-body": linkDoc(pdf) } }),
    );
    asMock(db.product.findMany).mockResolvedValue([
      {
        id: "prod_1",
        name: "Cake",
        ogImage: null,
        additionalFields: { additionalInformation: linkDoc(pdf) },
      },
    ]);
    asMock(db.business.findUnique).mockResolvedValue({
      maintenanceImage: null,
      maintenanceMessage: linkDoc(pdf),
    });

    const index = await buildUsedMediaIndex(BUSINESS_ID);
    const locations = (index.get(pdf) ?? []).map((u) => u.location);

    expect(locations).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^Linked from .*custom-about-body \(rich text\)$/,
        ),
        "Linked from Product additional information",
        "Linked from maintenance page message (rich text)",
      ]),
    );
    expect(locations).toHaveLength(3);
  });

  it("records a stored file URL saved in a template url field", async () => {
    asMock(db.siteContent.findUnique).mockResolvedValue(
      siteContentRow({
        customFields: { "modern.homepage.hero-cta-button-link": pdf },
      }),
    );

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.get(pdf)).toHaveLength(1);
    expect(index.get(pdf)?.[0]?.entityType).toBe("siteContent");
  });

  it("never flags an inactive template's rich-text link (the scrub can't remove link marks)", async () => {
    asMock(db.siteContent.findUnique).mockResolvedValue(
      siteContentRow({
        customFields: { "noise.about-story-body": linkDoc(pdf) },
      }),
    );

    const index = await buildUsedMediaIndex(BUSINESS_ID);
    const usages = index.get(pdf) ?? [];

    expect(usages).toHaveLength(1);
    expect(usages[0]?.location).toContain("(not active)");
    expect(usages[0]?.inactiveTemplate).toBeUndefined();
  });

  it("records navigation, footer quick-link, banner and popup hrefs", async () => {
    asMock(db.siteContent.findUnique).mockResolvedValue(
      siteContentRow({
        navigationItems: [
          { label: "Shop", href: "/shop" },
          {
            label: "Menus",
            href: "",
            children: [
              { label: "Dinner", href: ` ${pdf} ` },
              { label: "Elsewhere", href: "https://example.com/x.pdf" },
            ],
          },
          "nonsense",
        ],
        footerNavigationItems: [{ label: "Price list", href: pdf }],
        bannerConfig: {
          enabled: true,
          version: "v1",
          content: linkDoc(pdf),
          linkUrl: pdf,
        },
        popupConfig: {
          mode: "text",
          version: "v1",
          content: null,
          ctaUrl: pdf,
        },
      }),
    );

    const index = await buildUsedMediaIndex(BUSINESS_ID);
    const usages = index.get(pdf) ?? [];

    expect(usages).toEqual(
      expect.arrayContaining([
        {
          url: pdf,
          location: "Navigation menu",
          entityType: "siteContent",
          entityLabel: "Menus › Dinner",
          adminHref: "/admin/content/navigation",
        },
        expect.objectContaining({
          location: "Footer quick links",
          entityLabel: "Price list",
        }),
        expect.objectContaining({
          location: "Announcement banner",
          entityLabel: "Banner link",
        }),
        expect.objectContaining({
          location: "Announcement banner",
          entityLabel: "Linked from message",
        }),
        expect.objectContaining({
          location: "Announcement popup",
          entityLabel: "Popup button link",
        }),
      ]),
    );
    expect(usages).toHaveLength(5);
    expect(index.size).toBe(1);
  });
});

// ─── Email campaigns ──────────────────────────────────────────────────────────

describe("buildUsedMediaIndex — email campaigns", () => {
  const pdf = keyToPublicUrl(`${BUSINESS_ID}/library-doc-ab12cd-menu.pdf`);
  const photo = keyToPublicUrl(`${BUSINESS_ID}/library-77aa.jpg`);
  const logo = keyToPublicUrl(`${BUSINESS_ID}/logo.png`);

  function campaignRow(overrides: Record<string, unknown>) {
    return {
      id: "camp_1",
      subject: "Fall menu",
      status: "SENT",
      bodyText: null,
      bodyJson: null,
      renderedHtml: null,
      renderedText: null,
      ...overrides,
    };
  }

  it("records a tiptap campaign's linked PDF and inline image, once each", async () => {
    asMock(db.marketingCampaign.findMany).mockResolvedValue([
      campaignRow({
        bodyJson: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Menu",
                  marks: [{ type: "link", attrs: { href: `${pdf}#page=2` } }],
                },
              ],
            },
            { type: "image", attrs: { src: photo } },
          ],
        },
        // The frozen render repeats both URLs and adds the header logo.
        renderedHtml: `<img src="${logo}"><a href="${pdf}#page=2">Menu</a><img src="${photo}">`,
        renderedText: `Menu (${pdf}#page=2)`,
      }),
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.get(pdf)).toEqual([
      {
        url: `${pdf}#page=2`,
        location: "Linked from email campaign",
        entityType: "marketingCampaign",
        entityId: "camp_1",
        entityLabel: "Fall menu",
        adminHref: "/admin/marketing/campaigns/camp_1",
      },
    ]);
    expect(index.get(photo)).toEqual([
      expect.objectContaining({ location: "Email campaign image" }),
    ]);
    expect(index.get(logo)).toEqual([
      expect.objectContaining({ location: "Email campaign" }),
    ]);
  });

  it("finds bare URLs in a plain-text draft and labels them (draft)", async () => {
    asMock(db.marketingCampaign.findMany).mockResolvedValue([
      campaignRow({
        status: "DRAFT",
        subject: "  ",
        bodyText: `Our menu: ${pdf}. Elsewhere: https://example.com/x.pdf`,
      }),
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.size).toBe(1);
    expect(index.get(pdf)?.[0]).toMatchObject({
      location: "Linked from email campaign (draft)",
      entityLabel: "Untitled campaign",
    });
  });

  it("ignores campaigns with no stored files", async () => {
    asMock(db.marketingCampaign.findMany).mockResolvedValue([
      campaignRow({
        bodyText: "Visit https://example.com/menu.pdf or /contact",
        renderedHtml: '<a href="https://example.com">x</a>',
      }),
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.size).toBe(0);
  });
});

// ─── Form.definition (picture choice) ─────────────────────────────────────────

describe("buildUsedMediaIndex — Form picture-choice media", () => {
  const optionUrl = keyToPublicUrl(`${BUSINESS_ID}/image-form-gold.jpg`);
  const referenceUrl = keyToPublicUrl(`${BUSINESS_ID}/image-form-ref.jpg`);

  function formRow(definition: unknown) {
    return { id: "form_1", name: "Order Form", definition };
  }

  it("reports option photos and the reference image under the field label", async () => {
    asMock(db.form.findMany).mockResolvedValue([
      formRow({
        version: 1,
        fields: [
          {
            id: "f1",
            type: "picturechoice",
            label: "Finish",
            required: false,
            selection: "one",
            referenceImageUrl: referenceUrl,
            options: [
              { id: "o1", label: "Gold", imageUrl: optionUrl },
              { id: "o2", label: "Red", color: "#ff0000" },
            ],
          },
        ],
        settings: {},
      }),
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.get(optionUrl)).toEqual([
      {
        url: optionUrl,
        location: "Form: Order Form — Finish",
        entityType: "form",
        entityId: "form_1",
        entityLabel: "Order Form",
        adminHref: "/admin/forms/form_1",
      },
    ]);
    expect(index.get(referenceUrl)).toHaveLength(1);
    expect(index.get(referenceUrl)?.[0]?.location).toContain("Finish");
  });

  it("reports images and linked files inside the screening unlock note", async () => {
    const noteImage = keyToPublicUrl(`${BUSINESS_ID}/image-note.jpg`);
    const notePdf = keyToPublicUrl(`${BUSINESS_ID}/file-guide.pdf`);
    asMock(db.form.findMany).mockResolvedValue([
      formRow({
        version: 1,
        fields: [{ id: "f1", type: "text", label: "Name", required: false }],
        settings: {
          screening: {
            enabled: true,
            questions: [{ id: "q1", prompt: "Over 18?" }],
            unlockContent: {
              type: "doc",
              content: [
                { type: "image", attrs: { src: noteImage } },
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Guide",
                      marks: [{ type: "link", attrs: { href: notePdf } }],
                    },
                  ],
                },
              ],
            },
          },
        },
      }),
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.get(noteImage)?.[0]).toMatchObject({
      entityType: "form",
      entityId: "form_1",
      location: "Form: Order Form — screening message",
    });
    expect(index.get(notePdf)?.[0]).toMatchObject({
      entityId: "form_1",
      location: "Linked from Form: Order Form — screening message",
    });
  });

  it("reports images and linked files inside screening fail messages", async () => {
    const failImage = keyToPublicUrl(`${BUSINESS_ID}/image-fail.jpg`);
    const defaultPdf = keyToPublicUrl(`${BUSINESS_ID}/file-default.pdf`);
    asMock(db.form.findMany).mockResolvedValue([
      formRow({
        version: 1,
        fields: [{ id: "f1", type: "text", label: "Name", required: false }],
        settings: {
          screening: {
            enabled: true,
            questions: [
              {
                id: "q1",
                prompt: "Over 18?",
                failContent: {
                  type: "doc",
                  content: [{ type: "image", attrs: { src: failImage } }],
                },
              },
            ],
            defaultFailContent: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Help",
                      marks: [{ type: "link", attrs: { href: defaultPdf } }],
                    },
                  ],
                },
              ],
            },
          },
        },
      }),
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.get(failImage)?.[0]).toMatchObject({
      entityType: "form",
      entityId: "form_1",
      location: "Form: Order Form — screening message",
    });
    expect(index.get(defaultPdf)?.[0]).toMatchObject({
      entityId: "form_1",
      location: "Linked from Form: Order Form — screening message",
    });
  });

  it("still reports media from a definition that no longer validates", async () => {
    asMock(db.form.findMany).mockResolvedValue([
      formRow({ fields: [{ options: [{ imageUrl: optionUrl }] }] }),
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.get(optionUrl)?.[0]).toMatchObject({
      entityType: "form",
      entityId: "form_1",
    });
  });

  it("ignores external URLs and non-object definitions", async () => {
    asMock(db.form.findMany).mockResolvedValue([
      formRow(null),
      formRow({
        version: 1,
        fields: [
          {
            id: "f1",
            type: "picturechoice",
            label: "Finish",
            required: false,
            selection: "one",
            options: [
              { id: "o1", label: "A", imageUrl: "https://example.com/a.jpg" },
              { id: "o2", label: "B" },
            ],
          },
        ],
        settings: {},
      }),
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.size).toBe(0);
  });
});

describe("buildGalleryExternalUsage", () => {
  function pageRow(content: unknown, id = "page_1", title = "About") {
    return {
      id,
      title,
      slug: title.toLowerCase(),
      image: null,
      ogImage: null,
      content,
      previewDraft: null,
      type: "page",
    };
  }
  const galleryDoc = (galleryId: string) => ({
    type: "doc",
    content: [{ type: "gallery", attrs: { galleryId } }],
  });

  it("does NOT flag a gallery whose image is merely shared with a product", async () => {
    // A Media Library pick: the same S3 object is a product image AND a
    // gallery image. Deleting the gallery leaves the product intact (and
    // deleteUnreferencedGalleryObjects keeps the file), so it is no embed.
    const url = keyToPublicUrl(`${BUSINESS_ID}/image-shared.jpg`);
    asMock(db.image.findMany).mockResolvedValue([
      { id: "img_1", url, productId: "prod_1" },
    ]);
    asMock(db.galleryImage.findMany).mockResolvedValue([
      { id: "gi_1", url, galleryId: "gal_1", gallery: { name: "Lookbook" } },
    ]);
    asMock(db.gallery.findMany).mockResolvedValue([{ id: "gal_1" }]);

    const external = await buildGalleryExternalUsage(BUSINESS_ID);
    expect(external.get("gal_1")).toBeUndefined();

    // ...while the shared file stays referenced for S3 cleanup purposes.
    const index = await buildUsedMediaIndex(BUSINESS_ID);
    expect(index.get(url)?.map((u) => u.entityType)).toEqual(
      expect.arrayContaining(["image", "galleryImage"]),
    );
  });

  it("does NOT flag a duplicate just because its source gallery is embedded", async () => {
    const url = keyToPublicUrl(`${BUSINESS_ID}/image-dup.jpg`);
    asMock(db.page.findMany).mockResolvedValue([
      pageRow(galleryDoc("gal_src")),
    ]);
    asMock(db.galleryImage.findMany).mockResolvedValue([
      { id: "gi_1", url, galleryId: "gal_src", gallery: { name: "Src" } },
      {
        id: "gi_2",
        url,
        galleryId: "gal_dup",
        gallery: { name: "Src (copy)" },
      },
    ]);
    asMock(db.gallery.findMany).mockResolvedValue([{ id: "gal_src" }]);

    const external = await buildGalleryExternalUsage(BUSINESS_ID);

    expect(external.get("gal_src")).toHaveLength(1);
    expect(external.get("gal_dup")).toBeUndefined();
  });

  it("flags a TipTap gallery block, one entry per page, labelled with the page", async () => {
    asMock(db.page.findMany).mockResolvedValue([
      pageRow({
        type: "doc",
        content: [
          { type: "gallery", attrs: { galleryId: "gal_1" } },
          { type: "gallery", attrs: { galleryId: "gal_1" } },
        ],
      }),
    ]);
    asMock(db.gallery.findMany).mockResolvedValue([{ id: "gal_1" }]);

    const external = await buildGalleryExternalUsage(BUSINESS_ID);

    expect(external.get("gal_1")).toEqual([
      expect.objectContaining({
        entityLabel: "About",
        adminHref: "/admin/content/pages/page_1",
      }),
    ]);
  });

  it("flags an embedded gallery even while it has no images", async () => {
    asMock(db.page.findMany).mockResolvedValue([pageRow(galleryDoc("gal_1"))]);
    asMock(db.gallery.findMany).mockResolvedValue([{ id: "gal_1" }]);

    const external = await buildGalleryExternalUsage(BUSINESS_ID);

    expect(external.get("gal_1")).toHaveLength(1);
  });

  function siteContentWithFields(
    customFields: unknown,
    templateId: string,
    previewCustomFields: unknown = null,
  ) {
    return {
      heroImageUrl: null,
      aboutImageUrl: null,
      ogImage: null,
      faviconUrl: null,
      logoUrl: null,
      pageMeta: null,
      popupConfig: null,
      customFields,
      previewCustomFields,
      business: { templateId },
    };
  }

  it("flags an embed from an inactive template's gallery field as inactiveTemplate", async () => {
    // Business is on Modern; the Noise gallery field is a leftover.
    asMock(db.siteContent.findUnique).mockResolvedValue(
      siteContentWithFields(
        { "noise.homepage.intro-gallery": "gal_1" },
        "modern",
        { "noise.homepage.intro-gallery": "gal_1" },
      ),
    );
    asMock(db.gallery.findMany).mockResolvedValue([{ id: "gal_1" }]);

    const external = await buildGalleryExternalUsage(BUSINESS_ID);
    const usages = external.get("gal_1") ?? [];

    // Published + draft blobs → two entries, both inactive.
    expect(usages).toHaveLength(2);
    for (const u of usages) {
      expect(u.inactiveTemplate).toBe(true);
      expect(u.location).toContain("(not active)");
    }
  });

  it("does not flag the same gallery field when its template IS active", async () => {
    asMock(db.siteContent.findUnique).mockResolvedValue(
      siteContentWithFields(
        { "noise.homepage.intro-gallery": "gal_1" },
        "noise",
      ),
    );
    asMock(db.gallery.findMany).mockResolvedValue([{ id: "gal_1" }]);

    const external = await buildGalleryExternalUsage(BUSINESS_ID);

    expect(external.get("gal_1")).toHaveLength(1);
    expect(external.get("gal_1")?.[0]?.inactiveTemplate).toBeUndefined();
  });

  it("reports active page embeds unflagged alongside inactive-template ones", async () => {
    asMock(db.siteContent.findUnique).mockResolvedValue(
      siteContentWithFields(
        { "noise.homepage.intro-gallery": "gal_1" },
        "modern",
      ),
    );
    asMock(db.page.findMany).mockResolvedValue([pageRow(galleryDoc("gal_1"))]);
    asMock(db.gallery.findMany).mockResolvedValue([{ id: "gal_1" }]);

    const external = await buildGalleryExternalUsage(BUSINESS_ID);
    const usages = external.get("gal_1") ?? [];

    expect(usages).toHaveLength(2);
    expect(usages.filter((u) => !u.inactiveTemplate)).toEqual([
      expect.objectContaining({ entityLabel: "About" }),
    ]);
    expect(usages.filter((u) => u.inactiveTemplate)).toHaveLength(1);
  });

  it("never flags a service-page gallery field (gallery.delete's scrub is SiteContent-only)", async () => {
    asMock(db.service.findMany).mockResolvedValue([
      serviceRow({ "service-two.gallery": "gal_1" }, "service-two"),
    ]);
    asMock(db.gallery.findMany).mockResolvedValue([{ id: "gal_1" }]);

    const external = await buildGalleryExternalUsage(BUSINESS_ID);

    expect(external.get("gal_1")).toHaveLength(1);
    expect(external.get("gal_1")?.[0]?.inactiveTemplate).toBeUndefined();
  });

  it("drops references to galleries that are not this business's", async () => {
    asMock(db.page.findMany).mockResolvedValue([
      pageRow(galleryDoc("gal_gone")),
    ]);
    asMock(db.gallery.findMany).mockResolvedValue([]);

    const external = await buildGalleryExternalUsage(BUSINESS_ID);

    expect(external.size).toBe(0);
    expect(asMock(db.gallery.findMany).mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        where: { businessId: BUSINESS_ID, id: { in: ["gal_gone"] } },
      }),
    );
  });
});

describe("isLibraryOwnedKey", () => {
  it("is true for library- uploads under a business prefix", () => {
    expect(isLibraryOwnedKey("biz/library-abc.webp")).toBe(true);
  });

  it("is false for other key families", () => {
    expect(isLibraryOwnedKey("biz/image-abc.webp")).toBe(false);
    expect(isLibraryOwnedKey("biz/gallery-abc.webp")).toBe(false);
    expect(isLibraryOwnedKey("biz/logo.png")).toBe(false);
  });

  it("requires the business prefix (no slash means not ours)", () => {
    expect(isLibraryOwnedKey("library-x.webp")).toBe(false);
  });

  it("only matches at the start of the suffix", () => {
    expect(isLibraryOwnedKey("biz/image-library-abc.webp")).toBe(false);
  });
});
