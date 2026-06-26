/**
 * vii Services Index — server entry
 *
 * Resolves the owner-selected closing gallery (a Gallery picked via the
 * `vii.services.gallery` field, which stores a gallery id) and hands its images
 * to the client body. Mirrors the gallery-resolution pattern in
 * `homepage/vii-homepage.tsx` (Instagram strip).
 */
import type { RouterOutputs } from "~/trpc/react";
import { db } from "~/server/db";

import { resolveFields } from "..";
import {
  ViiServicesIndexClient,
  type ServicesGalleryImage,
} from "./vii-services-index-client";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  services: RouterOutputs["services"]["getAllPublic"];
};

export async function ViiServicesIndexPage({ business, services }: Props) {
  const f = resolveFields(business.siteContent?.customFields, [
    "vii.services.gallery",
  ]);

  const galleryId = f["vii.services.gallery"]?.trim();
  const gallery = galleryId
    ? await db.gallery.findUnique({
        where: { id: galleryId },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      })
    : null;

  // Scope to this business — galleries are tenant-owned.
  const galleryImages: ServicesGalleryImage[] =
    gallery && gallery.businessId === business.id
      ? gallery.images.map((img) => ({
          url: img.url,
          altText: img.altText ?? "",
        }))
      : [];

  return (
    <ViiServicesIndexClient
      business={business}
      services={services}
      galleryImages={galleryImages}
    />
  );
}
