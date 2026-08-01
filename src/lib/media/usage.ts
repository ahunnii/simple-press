/**
 * Exhaustive media-usage scanner.
 *
 * Builds a Map<canonicalPublicUrl, MediaUsage[]> that tells the Media Library
 * which database entities reference each stored object.  Only URLs that
 * resolve to our own storage bucket are indexed (external / OAuth avatar URLs
 * are silently dropped).
 *
 * The scanner is intentionally exhaustive:
 *  - Plain image/video columns on every relevant model
 *  - JSON custom fields (generic deep walk + targeted gallery-field pass)
 *  - TipTap rich-text documents embedded in content columns and additionalFields
 *  - Gallery images that are referenced by gallery-type template fields or by
 *    `gallery` nodes inside TipTap documents
 *  - Logo / favicon objects are marked "always in use" via `isAlwaysInUseKey`
 */

import { isStorageUrl } from "~/lib/s3/url";
import { TEMPLATE_FIELDS } from "~/lib/template-fields";
import { getTemplateLabel } from "~/lib/template-ownership";
import { db } from "~/server/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MediaUsage {
  url: string;
  location: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  adminHref?: string;
}

// ─── Always-in-use predicate ──────────────────────────────────────────────────

/**
 * Logo and favicon objects are written to a fixed key and should never be
 * one-click-deletable — the upload always overwrites the same S3 key, so the
 * SiteContent column may transiently lag after a re-upload.
 */
export function isAlwaysInUseKey(key: string): boolean {
  // Key shape: {businessId}/logo.{ext} or {businessId}/favicon.{ext}
  const slashIdx = key.indexOf("/");
  if (slashIdx < 0) return false;
  const suffix = key.slice(slashIdx + 1);
  return suffix.startsWith("logo.") || suffix.startsWith("favicon.");
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

type UsageMap = Map<string, MediaUsage[]>;

/** Normalize a URL before using it as a map key (strip query string). */
export function normalizeUrl(url: string): string {
  const q = url.indexOf("?");
  return q >= 0 ? url.slice(0, q) : url;
}

function addUsage(map: UsageMap, rawUrl: string, usage: MediaUsage): void {
  if (!rawUrl || !isStorageUrl(rawUrl)) return;
  const key = normalizeUrl(rawUrl);
  const existing = map.get(key);
  if (existing) {
    existing.push(usage);
  } else {
    map.set(key, [usage]);
  }
}

// ─── TipTap document walker ───────────────────────────────────────────────────

/**
 * Recursively walk a TipTap JSON document.
 *
 * - `image` nodes → calls `onImageSrc` with `attrs.src`
 * - `gallery` nodes → calls `onGalleryId` with `attrs.galleryId`
 * - `embed` nodes are deliberately ignored (external iframes)
 */
function walkTiptap(
  node: unknown,
  onImageSrc: (src: string) => void,
  onGalleryId: (id: string) => void,
): void {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;

  const n = node as Record<string, unknown>;

  if (n.type === "image") {
    const attrs = n.attrs as Record<string, unknown> | undefined;
    const src = attrs?.src;
    if (typeof src === "string" && src) onImageSrc(src);
  } else if (n.type === "gallery") {
    const attrs = n.attrs as Record<string, unknown> | undefined;
    const galleryId = attrs?.galleryId;
    if (typeof galleryId === "string" && galleryId) onGalleryId(galleryId);
  }
  // `embed` → intentionally ignored

  const content = n.content;
  if (Array.isArray(content)) {
    for (const child of content) {
      walkTiptap(child, onImageSrc, onGalleryId);
    }
  }
}

// ─── Generic JSON deep-walker ─────────────────────────────────────────────────

/**
 * Recursively walk any JSON value and collect:
 *  1. Storage URLs from string values
 *  2. TipTap `{type:"doc"}` objects for further walking
 */
function deepWalkJson(
  value: unknown,
  onStorageUrl: (url: string) => void,
  onTiptapDoc: (doc: unknown) => void,
): void {
  if (value === null || value === undefined) return;

  if (typeof value === "string") {
    if (isStorageUrl(value)) onStorageUrl(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) deepWalkJson(item, onStorageUrl, onTiptapDoc);
    return;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // Detect TipTap document
    if (obj.type === "doc" && Array.isArray(obj.content)) {
      onTiptapDoc(obj);
      return; // TipTap walker handles children
    }
    for (const v of Object.values(obj)) {
      deepWalkJson(v, onStorageUrl, onTiptapDoc);
    }
  }
}

// ─── Main scanner ─────────────────────────────────────────────────────────────

/**
 * Build a complete usage index for all S3 objects referenced by `businessId`.
 *
 * All independent DB queries run in parallel via `Promise.all`.
 */
export async function buildUsedMediaIndex(
  businessId: string,
): Promise<UsageMap> {
  const map: UsageMap = new Map();

  // Gallery references found in customFields, previewCustomFields, and TipTap
  // documents store a gallery ID, not image URLs. We collect each reference
  // WITH the context of where it was found (so a gallery used on the Modern
  // template's hero field is attributed as such), then resolve the IDs to image
  // URLs in one batch query at the end.
  type GalleryRef = {
    id: string;
    location: string;
    entityType: string;
    entityId?: string;
    entityLabel?: string;
    adminHref?: string;
  };
  const galleryRefs: GalleryRef[] = [];

  // ── 1. SiteContent ─────────────────────────────────────────────────────────
  const siteContentPromise = db.siteContent
    .findUnique({
      where: { businessId },
      select: {
        heroImageUrl: true,
        aboutImageUrl: true,
        ogImage: true,
        faviconUrl: true,
        logoUrl: true,
        customFields: true,
        previewCustomFields: true,
        business: { select: { templateId: true } },
      },
    })
    .then((sc) => {
      if (!sc) return;

      const scUsage = (url: string | null | undefined, label: string) => {
        if (url) {
          addUsage(map, url, {
            url,
            location: "Site Content",
            entityType: "siteContent",
            entityLabel: label,
            adminHref: "/admin/settings",
          });
        }
      };

      scUsage(sc.heroImageUrl, "Hero image");
      scUsage(sc.aboutImageUrl, "About image");
      scUsage(sc.ogImage, "OG image");
      scUsage(sc.faviconUrl, "Favicon");
      scUsage(sc.logoUrl, "Logo");

      const templateId = sc.business?.templateId ?? "";
      const templateLabel = getTemplateLabel(templateId);
      const fieldsByKey = new Map(
        (TEMPLATE_FIELDS[templateId] ?? []).map((f) => [f.key, f]),
      );

      // Attribute each custom-field value to its template + field label, e.g.
      // "Modern template · Hero image". Unknown keys (template switched, legacy
      // data) fall back to the raw field key so nothing is lost.
      const scanCustomFields = (fields: unknown, isDraft: boolean) => {
        if (!fields || typeof fields !== "object" || Array.isArray(fields))
          return;
        const obj = fields as Record<string, unknown>;

        for (const [fieldKey, value] of Object.entries(obj)) {
          const field = fieldsByKey.get(fieldKey);
          const fieldLabel = field?.label ?? fieldKey;
          const draftSuffix = isDraft ? " (draft)" : "";
          const location = `${templateLabel} template · ${fieldLabel}${draftSuffix}`;

          // gallery-type fields store a gallery ID (a string), not a URL
          if (field?.type === "gallery" && typeof value === "string" && value) {
            galleryRefs.push({
              id: value,
              location,
              entityType: "siteContent",
              entityLabel: fieldLabel,
              adminHref: "/admin/content/template",
            });
            continue;
          }

          // Generic deep walk of this field's value — catches plain URL strings
          // (image/video/list fields) and embedded TipTap docs (richtext fields)
          deepWalkJson(
            value,
            (url) => {
              // location already includes the field label — no entityLabel
              addUsage(map, url, {
                url,
                location,
                entityType: "siteContent",
                adminHref: "/admin/content/template",
              });
            },
            (doc) => {
              walkTiptap(
                doc,
                (src) => {
                  addUsage(map, src, {
                    url: src,
                    location: `${location} (rich text)`,
                    entityType: "siteContent",
                    adminHref: "/admin/content/template",
                  });
                },
                (id) => {
                  galleryRefs.push({
                    id,
                    location: `${location} (rich text)`,
                    entityType: "siteContent",
                    entityLabel: fieldLabel,
                    adminHref: "/admin/content/template",
                  });
                },
              );
            },
          );
        }
      };

      scanCustomFields(sc.customFields, false);
      scanCustomFields(sc.previewCustomFields, true);
    });

  // ── 2. Products (ogImage) ──────────────────────────────────────────────────
  const productsPromise = db.product
    .findMany({
      where: { businessId },
      select: { id: true, name: true, ogImage: true, additionalFields: true },
    })
    .then((products) => {
      for (const p of products) {
        if (p.ogImage) {
          addUsage(map, p.ogImage, {
            url: p.ogImage,
            location: "Product SEO",
            entityType: "product",
            entityId: p.id,
            entityLabel: p.name,
            adminHref: `/admin/products/${p.id}`,
          });
        }

        // additionalFields.additionalInformation → TipTap doc
        const af = p.additionalFields as Record<string, unknown> | null;
        const additionalInfo = af?.additionalInformation;
        if (additionalInfo && typeof additionalInfo === "object") {
          walkTiptap(
            additionalInfo,
            (src) => {
              addUsage(map, src, {
                url: src,
                location: "Product additional information",
                entityType: "product",
                entityId: p.id,
                entityLabel: p.name,
                adminHref: `/admin/products/${p.id}`,
              });
            },
            (id) => {
              galleryRefs.push({
                id,
                location: "Product additional information",
                entityType: "product",
                entityId: p.id,
                entityLabel: p.name,
                adminHref: `/admin/products/${p.id}`,
              });
            },
          );
        }
      }
    });

  // ── 3. ProductVariants (imageUrl) ──────────────────────────────────────────
  const variantsPromise = db.productVariant
    .findMany({
      where: { product: { businessId } },
      select: {
        id: true,
        imageUrl: true,
        product: { select: { id: true, name: true } },
      },
    })
    .then((variants) => {
      for (const v of variants) {
        if (v.imageUrl) {
          addUsage(map, v.imageUrl, {
            url: v.imageUrl,
            location: "Product variant image",
            entityType: "productVariant",
            entityId: v.id,
            entityLabel: v.product.name,
            adminHref: `/admin/products/${v.product.id}`,
          });
        }
      }
    });

  // ── 4. Collections ─────────────────────────────────────────────────────────
  const collectionsPromise = db.collection
    .findMany({
      where: { businessId },
      select: { id: true, name: true, imageUrl: true, ogImage: true },
    })
    .then((collections) => {
      for (const c of collections) {
        if (c.imageUrl) {
          addUsage(map, c.imageUrl, {
            url: c.imageUrl,
            location: "Collection image",
            entityType: "collection",
            entityId: c.id,
            entityLabel: c.name,
            adminHref: `/admin/collections/${c.id}`,
          });
        }
        if (c.ogImage) {
          addUsage(map, c.ogImage, {
            url: c.ogImage,
            location: "Collection SEO image",
            entityType: "collection",
            entityId: c.id,
            entityLabel: c.name,
            adminHref: `/admin/collections/${c.id}`,
          });
        }
      }
    });

  // ── 5. Services + ServiceItems ─────────────────────────────────────────────
  const servicesPromise = db.service
    .findMany({
      where: { businessId },
      select: {
        id: true,
        name: true,
        image: true,
        ogImage: true,
        items: { select: { id: true, name: true, image: true } },
      },
    })
    .then((services) => {
      for (const s of services) {
        if (s.image) {
          addUsage(map, s.image, {
            url: s.image,
            location: "Service image",
            entityType: "service",
            entityId: s.id,
            entityLabel: s.name,
            adminHref: `/admin/services/${s.id}`,
          });
        }
        if (s.ogImage) {
          addUsage(map, s.ogImage, {
            url: s.ogImage,
            location: "Service SEO image",
            entityType: "service",
            entityId: s.id,
            entityLabel: s.name,
            adminHref: `/admin/services/${s.id}`,
          });
        }
        for (const item of s.items) {
          if (item.image) {
            addUsage(map, item.image, {
              url: item.image,
              location: "Service item image",
              entityType: "serviceItem",
              entityId: item.id,
              entityLabel: item.name,
              adminHref: `/admin/services/${s.id}`,
            });
          }
        }
      }
    });

  // ── 5b. Events (flier cover image) ──────────────────────────────────────────
  const eventsPromise = db.event
    .findMany({
      where: { businessId },
      select: { id: true, name: true, coverImage: true },
    })
    .then((events) => {
      for (const e of events) {
        if (e.coverImage) {
          addUsage(map, e.coverImage, {
            url: e.coverImage,
            location: "Event flier",
            entityType: "event",
            entityId: e.id,
            entityLabel: e.name,
            adminHref: `/admin/events/${e.id}`,
          });
        }
      }
    });

  // ── 6. Images (product image gallery rows) ─────────────────────────────────
  const imagesPromise = db.image
    .findMany({
      where: { businessId },
      select: { id: true, url: true, productId: true },
    })
    .then((images) => {
      for (const img of images) {
        addUsage(map, img.url, {
          url: img.url,
          location: "Product image",
          entityType: "image",
          entityId: img.id,
          adminHref: img.productId
            ? `/admin/products/${img.productId}`
            : undefined,
        });
      }
    });

  // ── 7. Pages (image, ogImage, content TipTap) ──────────────────────────────
  const pagesPromise = db.page
    .findMany({
      where: { businessId },
      select: {
        id: true,
        title: true,
        slug: true,
        image: true,
        ogImage: true,
        content: true,
        type: true,
      },
    })
    .then((pages) => {
      for (const page of pages) {
        // Blog posts live under /admin/content/blog, not /admin/content/pages
        // — routing a blog post's image usage to the Pages editor 404s (or
        // opens the wrong record if a page happens to share the id).
        const pageHref =
          page.type === "blog"
            ? `/admin/content/blog/${page.id}`
            : `/admin/content/pages/${page.id}`;
        if (page.image) {
          addUsage(map, page.image, {
            url: page.image,
            location: "Page image",
            entityType: "page",
            entityId: page.id,
            entityLabel: page.title,
            adminHref: pageHref,
          });
        }
        if (page.ogImage) {
          addUsage(map, page.ogImage, {
            url: page.ogImage,
            location: "Page SEO image",
            entityType: "page",
            entityId: page.id,
            entityLabel: page.title,
            adminHref: pageHref,
          });
        }
        if (page.content) {
          walkTiptap(
            page.content,
            (src) => {
              addUsage(map, src, {
                url: src,
                location: "Page content",
                entityType: "page",
                entityId: page.id,
                entityLabel: page.title,
                adminHref: pageHref,
              });
            },
            (id) => {
              galleryRefs.push({
                id,
                location: "Page content",
                entityType: "page",
                entityId: page.id,
                entityLabel: page.title,
                adminHref: pageHref,
              });
            },
          );
        }
      }
    });

  // ── 8. GalleryImages ───────────────────────────────────────────────────────
  const galleryImagesPromise = db.galleryImage
    .findMany({
      where: { gallery: { businessId } },
      select: {
        id: true,
        url: true,
        galleryId: true,
        gallery: { select: { name: true } },
      },
    })
    .then((images) => {
      for (const img of images) {
        addUsage(map, img.url, {
          url: img.url,
          location: `Gallery — ${img.gallery.name}`,
          entityType: "galleryImage",
          entityId: img.id,
          entityLabel: img.gallery.name,
          adminHref: `/admin/galleries/${img.galleryId}`,
        });
      }
    });

  // ── 9. Testimonials (photoUrls[]) ──────────────────────────────────────────
  const testimonialsPromise = db.testimonial
    .findMany({
      where: { businessId },
      select: { id: true, customerName: true, photoUrls: true },
    })
    .then((testimonials) => {
      for (const t of testimonials) {
        for (const url of t.photoUrls) {
          addUsage(map, url, {
            url,
            location: "Testimonial photo",
            entityType: "testimonial",
            entityId: t.id,
            entityLabel: t.customerName,
            adminHref: `/admin/reviews`,
          });
        }
      }
    });

  // ── 10. ProductReviews (images[], videoUrl) ────────────────────────────────
  const reviewsPromise = db.productReview
    .findMany({
      where: { product: { businessId } },
      select: {
        id: true,
        images: true,
        videoUrl: true,
        product: { select: { id: true, name: true } },
      },
    })
    .then((reviews) => {
      for (const r of reviews) {
        for (const url of r.images) {
          addUsage(map, url, {
            url,
            location: "Product review image",
            entityType: "productReview",
            entityId: r.id,
            entityLabel: r.product.name,
            adminHref: `/admin/reviews`,
          });
        }
        if (r.videoUrl) {
          addUsage(map, r.videoUrl, {
            url: r.videoUrl,
            location: "Product review video",
            entityType: "productReview",
            entityId: r.id,
            entityLabel: r.product.name,
            adminHref: `/admin/reviews`,
          });
        }
      }
    });

  // Run all independent queries in parallel
  await Promise.all([
    siteContentPromise,
    productsPromise,
    variantsPromise,
    collectionsPromise,
    servicesPromise,
    eventsPromise,
    imagesPromise,
    pagesPromise,
    galleryImagesPromise,
    testimonialsPromise,
    reviewsPromise,
  ]);

  // ── 11. Resolve gallery references accumulated during the scan ─────────────
  //
  // gallery-type template fields and TipTap gallery nodes store a gallery ID,
  // not individual image URLs. Resolve each referenced gallery's images in one
  // batch query, then attribute every image to the REAL place the gallery is
  // referenced (e.g. "Modern template · Featured gallery") rather than a generic
  // label. A single gallery referenced from multiple places yields one usage per
  // place. This runs after the main scan so direct GalleryImage rows (step 8)
  // and gallery-reference usages both land in the map.
  if (galleryRefs.length > 0) {
    const uniqueIds = Array.from(new Set(galleryRefs.map((r) => r.id)));
    const galleryImages = await db.galleryImage.findMany({
      where: { galleryId: { in: uniqueIds }, gallery: { businessId } },
      select: {
        url: true,
        galleryId: true,
        gallery: { select: { name: true } },
      },
    });

    const imagesByGallery = new Map<string, { url: string; name: string }[]>();
    for (const img of galleryImages) {
      const list = imagesByGallery.get(img.galleryId) ?? [];
      list.push({ url: img.url, name: img.gallery.name });
      imagesByGallery.set(img.galleryId, list);
    }

    for (const ref of galleryRefs) {
      const imgs = imagesByGallery.get(ref.id);
      if (!imgs) continue;
      for (const img of imgs) {
        // location already names the gallery — no separate entityLabel
        addUsage(map, img.url, {
          url: img.url,
          location: `${ref.location} — gallery “${img.name}”`,
          entityType: ref.entityType,
          entityId: ref.entityId,
          adminHref: ref.adminHref,
        });
      }
    }
  }

  return map;
}
