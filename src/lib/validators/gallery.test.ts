import { describe, expect, it } from "vitest";

import { ADMIN_BULK_SELECTION_LIMIT } from "~/lib/validators/admin-table";

import {
  GALLERY_MAX_IMAGES,
  galleryCreateSchema,
  galleryImageCreateSchema,
  galleryReorderImagesSchema,
} from "./gallery";

const baseGallery = {
  name: "Test gallery",
  layout: "grid" as const,
  columns: 3,
  gap: 8,
  showCaptions: true,
  enableLightbox: true,
};

const imagesOfLength = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    url: `https://example.com/${i}.jpg`,
  }));

const idsOfLength = (n: number) =>
  Array.from({ length: n }, (_, i) => `img-${i}`);

/**
 * Every array these three schemas accept fans out into per-row database work —
 * one `createMany` for the two image lists, one Prisma `update` PER ID inside a
 * single `$transaction` for the reorder list. Uncapped, a single request is an
 * uncapped amount of that work, which is why the caps exist at all.
 */
describe("gallery bulk array caps", () => {
  it("caps galleryImageCreateSchema.images at the admin bulk selection limit", () => {
    expect(
      galleryImageCreateSchema.safeParse({
        galleryId: "g1",
        images: imagesOfLength(ADMIN_BULK_SELECTION_LIMIT),
      }).success,
    ).toBe(true);

    expect(
      galleryImageCreateSchema.safeParse({
        galleryId: "g1",
        images: imagesOfLength(ADMIN_BULK_SELECTION_LIMIT + 1),
      }).success,
    ).toBe(false);
  });

  it("caps galleryReorderImagesSchema.imageIds at GALLERY_MAX_IMAGES", () => {
    expect(
      galleryReorderImagesSchema.safeParse({
        galleryId: "g1",
        imageIds: idsOfLength(GALLERY_MAX_IMAGES),
      }).success,
    ).toBe(true);

    expect(
      galleryReorderImagesSchema.safeParse({
        galleryId: "g1",
        imageIds: idsOfLength(GALLERY_MAX_IMAGES + 1),
      }).success,
    ).toBe(false);
  });

  it("caps galleryCreateSchema.images at GALLERY_MAX_IMAGES", () => {
    expect(
      galleryCreateSchema.safeParse({
        ...baseGallery,
        images: imagesOfLength(GALLERY_MAX_IMAGES),
      }).success,
    ).toBe(true);

    expect(
      galleryCreateSchema.safeParse({
        ...baseGallery,
        images: imagesOfLength(GALLERY_MAX_IMAGES + 1),
      }).success,
    ).toBe(false);
  });

  /**
   * Guards the one way these caps can regress into a functional bug: the
   * reorder client sends EVERY image id in the gallery on every drop, and
   * galleries have no size limit of their own. Standardising this list on the
   * 100-row bulk-selection limit would silently break drag-and-drop on any
   * larger gallery, so the whole-gallery cap must stay comfortably above it.
   */
  it("keeps the whole-gallery cap above the bulk-selection limit", () => {
    expect(GALLERY_MAX_IMAGES).toBeGreaterThan(ADMIN_BULK_SELECTION_LIMIT);
  });

  it("still accepts a gallery created with no images at all", () => {
    expect(galleryCreateSchema.safeParse(baseGallery).success).toBe(true);
  });
});
