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
  },
}));

const { db } = await import("~/server/db");
const { buildGalleryExternalUsage, buildUsedMediaIndex } =
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

// ─── buildGalleryExternalUsage ────────────────────────────────────────────────

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
