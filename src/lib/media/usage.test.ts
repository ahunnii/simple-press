/**
 * `buildUsedMediaIndex` is the platform's only authority on "does anything
 * still reference this S3 object". Both the Media Library's delete gate
 * (`media.delete` / `media.bulkDelete`), `gallery.delete`, and
 * `product.delete` / `bulkDelete` / `syncImages` decide whether to destroy a
 * stored object based on what it reports. A blind spot here is not a cosmetic
 * "shows as unused" bug — it is a live file getting deleted out of MinIO, which
 * a database restore does not bring back.
 *
 * These tests cover the two blind spots that were fixed:
 *  - `Service.customFields` (service-page template fields) was not scanned at all
 *  - `Product.additionalFields` was scanned only at the `additionalInformation`
 *    key, so any other image URL in that free-form blob was invisible
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
    product: { findMany: vi.fn() },
    productVariant: { findMany: vi.fn() },
    collection: { findMany: vi.fn() },
    service: { findMany: vi.fn() },
    event: { findMany: vi.fn() },
    video: { findMany: vi.fn() },
    image: { findMany: vi.fn() },
    page: { findMany: vi.fn() },
    galleryImage: { findMany: vi.fn() },
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
  db.testimonial.findMany,
  db.productReview.findMany,
];

beforeEach(() => {
  vi.clearAllMocks();
  asMock(db.siteContent.findUnique).mockResolvedValue(null);
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

  it("ignores non-storage URLs in service fields", async () => {
    const external = "https://images.example.com/not-ours.jpg";
    asMock(db.service.findMany).mockResolvedValue([
      serviceRow({ "service-two.intro-image": external }),
    ]);

    const index = await buildUsedMediaIndex(BUSINESS_ID);

    expect(index.get(external)).toBeUndefined();
  });

  it("resolves a gallery-type service field to its images, so gallery.delete sees the embed", async () => {
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

    const external = await buildGalleryExternalUsage(BUSINESS_ID);
    const embeds = external.get("gal_1");

    // Without the customFields scan the gallery's only usage is its own
    // GalleryImage row, which `buildGalleryExternalUsage` skips — so
    // `gallery.delete` would have destroyed these objects while the service
    // page still rendered them.
    expect(embeds).toBeDefined();
    expect(embeds?.[0]?.location).toContain(galleryField!.label);
    expect(embeds?.[0]?.adminHref).toBe("/admin/services/svc_1");
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
