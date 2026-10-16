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
 *  - Targeted URL keys inside small config blobs (SiteContent.pageMeta
 *    `ogImage`s, SiteContent.popupConfig `imagePath`)
 *  - TipTap rich-text documents embedded in content columns and additionalFields
 *    (including Page.previewDraft and Business.maintenanceMessage) — image /
 *    video `src`s AND `link` mark `href`s that point at our bucket (a PDF
 *    linked from a page must not read as unused)
 *  - Navigation menus (SiteContent.navigationItems + children,
 *    footerNavigationItems) and the banner / popup link targets
 *  - Gallery images that are referenced by gallery-type template fields or by
 *    `gallery` nodes inside TipTap documents
 *  - Logo / favicon fixed-key objects are never auto-cleaned (`isAlwaysInUseKey`);
 *    the Media Library protects only the one in use (`isProtectedBrandAssetKey`)
 */

import type { TemplateField } from "~/lib/template-fields";
import { isStorageUrl, STORAGE_BASE } from "~/lib/s3/url";
import { SERVICE_TEMPLATE_FIELDS } from "~/lib/service-templates";
import { TEMPLATE_FIELDS } from "~/lib/template-fields";
import { getTemplateLabel } from "~/lib/template-ownership";
import {
  isPictureChoiceField,
  parseStoredFormDefinition,
} from "~/lib/validators/form";
import { STATIC_SEO_ROUTES } from "~/lib/validators/site-seo";
import { db } from "~/server/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MediaUsage {
  url: string;
  location: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  adminHref?: string;
  /**
   * true when this reference comes from a template FIELD VALUE belonging to a
   * template that is not the business's active template — i.e. leftover content
   * from a template the owner switched away from. Consumers may treat a file
   * whose every usage is inactiveTemplate as safe to clean up.
   */
  inactiveTemplate?: boolean;
}

/** A template field key resolved back to the template that declares it. */
type TemplateFieldOwner = { templateId: string; field: TemplateField };

/**
 * Reverse index of every field key in the registry → the template that owns it.
 *
 * Field keys are effectively unique per template across `TEMPLATE_FIELDS`, so
 * this is very nearly a bijection. Where two templates DO declare the same key,
 * the first one in registry iteration order wins — arbitrary but deterministic,
 * which is all the attribution label needs.
 */
function buildTemplateFieldOwnerIndex(): Map<string, TemplateFieldOwner> {
  const owners = new Map<string, TemplateFieldOwner>();
  for (const [templateId, fields] of Object.entries(TEMPLATE_FIELDS)) {
    for (const field of fields) {
      if (!owners.has(field.key)) owners.set(field.key, { templateId, field });
    }
  }
  return owners;
}

// ─── Always-in-use predicate ──────────────────────────────────────────────────

/**
 * Logo and favicon objects live at fixed keys ({businessId}/logo.{ext},
 * favicon.{ext}). This strict predicate is for automatic "delete if
 * unreferenced" cleanup (gallery / product routers), which must never remove
 * a brand file: the SiteContent column can lag an upload. A format switch
 * (logo.png → logo.svg) leaves the old key behind, so the Media Library
 * narrows this to the key actually in use via `isProtectedBrandAssetKey`
 * (`~/lib/media/brand-asset-keys`), letting the stale one be deleted.
 */
export function isAlwaysInUseKey(key: string): boolean {
  // Key shape: {businessId}/logo.{ext} or {businessId}/favicon.{ext}
  const slashIdx = key.indexOf("/");
  if (slashIdx < 0) return false;
  const suffix = key.slice(slashIdx + 1);
  return suffix.startsWith("logo.") || suffix.startsWith("favicon.");
}

/**
 * Files uploaded straight to the Media Library (`libraryImages` route) are
 * owner-curated: they're deliberately unreferenced until the owner picks them,
 * so automatic "delete if unreferenced" cleanup must never remove them. They
 * live until explicitly deleted from the Media Library.
 */
export function isLibraryOwnedKey(key: string): boolean {
  // Key shape: {businessId}/library-{hex}.{ext}
  const slashIdx = key.indexOf("/");
  if (slashIdx < 0) return false;
  return key.slice(slashIdx + 1).startsWith("library-");
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

type UsageMap = Map<string, MediaUsage[]>;

/** Normalize a URL before using it as a map key (strip query string). */
export function normalizeUrl(url: string): string {
  const q = url.indexOf("?");
  return q >= 0 ? url.slice(0, q) : url;
}

/**
 * Drop a `#fragment` so the map key stays the canonical object URL. Only
 * links realistically carry one (`…/library-doc-ab12.pdf#page=3`), but a
 * fragment never names a different object, so stripping it everywhere is safe.
 */
function stripHash(url: string): string {
  const h = url.indexOf("#");
  return h >= 0 ? url.slice(0, h) : url;
}

function addUsage(map: UsageMap, rawUrl: string, usage: MediaUsage): void {
  if (!rawUrl || !isStorageUrl(rawUrl)) return;
  // Map keys are what `keyToPublicUrl(key)` yields — no query, no fragment.
  const key = normalizeUrl(stripHash(rawUrl));
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
 * - `image` and `video` nodes → calls `onImageSrc` with `attrs.src` (the
 *   callback is named for images historically, but it's really "storage URL
 *   found in rich text" — a video's `src` feeds the same URL→key matching
 *   path as an image's, otherwise uploaded clips used in a page/post would
 *   show as unused in the Media Library and be eligible for deletion)
 * - `gallery` nodes → calls `onGalleryId` with `attrs.galleryId`
 * - `link` marks (on any node, normally text) whose `attrs.href` points at
 *   our bucket → calls `onLinkHref` (e.g. a Media Library PDF linked from a
 *   page). Off-bucket hrefs (other sites, `/contact`, `mailto:`) are skipped.
 *   Storage hrefs are always absolute — `normalizeEditorHref` only relativises
 *   the store's OWN hosts, never the storage host — so no relative-href
 *   resolution is needed. Omit `onLinkHref` to report links via `onImageSrc`.
 * - `embed` nodes are deliberately ignored (external iframes)
 */
function walkTiptap(
  node: unknown,
  onImageSrc: (src: string) => void,
  onGalleryId: (id: string) => void,
  onLinkHref: (href: string) => void = onImageSrc,
): void {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;

  const n = node as Record<string, unknown>;

  if (Array.isArray(n.marks)) {
    for (const mark of n.marks) {
      if (!mark || typeof mark !== "object") continue;
      const m = mark as Record<string, unknown>;
      if (m.type !== "link") continue;
      const href = (m.attrs as Record<string, unknown> | undefined)?.href;
      if (typeof href !== "string") continue;
      const trimmed = href.trim();
      if (trimmed && isStorageUrl(trimmed)) onLinkHref(trimmed);
    }
  }

  if (n.type === "image" || n.type === "video") {
    const attrs = n.attrs as Record<string, unknown> | undefined;
    const src = attrs?.src;
    if (typeof src === "string" && src) onImageSrc(src);
  } else if (n.type === "gallery") {
    const attrs = n.attrs as Record<string, unknown> | undefined;
    const galleryId = attrs?.galleryId;
    if (typeof galleryId === "string" && galleryId) onGalleryId(galleryId);
  }
  // `embed` → intentionally ignored
  // "quoteCalculator" nodes are intentionally ignored: they reference a calculator id, not media.
  // "form" nodes are intentionally ignored: they reference a form id, not media.

  const content = n.content;
  if (Array.isArray(content)) {
    for (const child of content) {
      walkTiptap(child, onImageSrc, onGalleryId, onLinkHref);
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

// ─── Storage URLs in plain text / HTML ────────────────────────────────────────

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Our storage base, then everything up to whitespace, a quote, `<>`, `()` or `[]`. */
const STORAGE_URL_RE = new RegExp(
  `${escapeRegExp(STORAGE_BASE)}[^\\s"'<>()\\[\\]]+`,
  "g",
);

/**
 * Every storage URL written out in a plain-text or HTML string (an email
 * body, a frozen email render). Sentence punctuation stuck to the end of a
 * bare URL ("…/menu.pdf.") is dropped so the key still matches.
 */
export function findStorageUrlsInText(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(STORAGE_URL_RE)) {
    const url = m[0].replace(/[.,;:!?]+$/, "");
    if (url.length > STORAGE_BASE.length) out.push(url);
  }
  return out;
}

// ─── Main scanner ─────────────────────────────────────────────────────────────

/**
 * A place that embeds a whole gallery BY ID — a gallery-type template field or
 * a TipTap `gallery` node. Collected WITH the context of where it was found (so
 * a gallery used on the Modern template's hero field is attributed as such).
 */
type GalleryRef = {
  id: string;
  location: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  adminHref?: string;
  /** Set when the reference came from an inactive template's field value. */
  inactiveTemplate?: boolean;
};

/**
 * Build a complete usage index for all S3 objects referenced by `businessId`.
 *
 * All independent DB queries run in parallel via `Promise.all`.
 */
export async function buildUsedMediaIndex(
  businessId: string,
): Promise<UsageMap> {
  const { map, galleryRefs } = await scanMediaReferences(businessId);
  await resolveGalleryRefs(businessId, map, galleryRefs);
  return map;
}

/**
 * The scan behind `buildUsedMediaIndex`: every direct URL reference lands in
 * `map`, while gallery references (customFields, previewCustomFields and TipTap
 * documents store a gallery ID, not image URLs) are returned unresolved in
 * `galleryRefs`. `buildUsedMediaIndex` expands those to per-image usages;
 * `buildGalleryExternalUsage` reads them as-is.
 */
async function scanMediaReferences(
  businessId: string,
): Promise<{ map: UsageMap; galleryRefs: GalleryRef[] }> {
  const map: UsageMap = new Map();
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
        pageMeta: true,
        popupConfig: true,
        bannerConfig: true,
        navigationItems: true,
        footerNavigationItems: true,
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

      // Per-route SEO overrides: { [routeKey]: { title, description, ogImage } }
      // (src/lib/validators/site-seo.ts). Read raw rather than through
      // `parsePageMeta` — an entry under a retired route key still holds the
      // URL, and an unattributable reference must keep blocking deletion.
      const pageMeta = sc.pageMeta;
      if (
        pageMeta &&
        typeof pageMeta === "object" &&
        !Array.isArray(pageMeta)
      ) {
        for (const [routeKey, entry] of Object.entries(
          pageMeta as Record<string, unknown>,
        )) {
          if (!entry || typeof entry !== "object" || Array.isArray(entry))
            continue;
          const ogImage = (entry as Record<string, unknown>).ogImage;
          if (typeof ogImage !== "string" || !ogImage) continue;
          const routeLabel =
            STATIC_SEO_ROUTES.find((r) => r.key === routeKey)?.label ??
            routeKey;
          addUsage(map, ogImage, {
            url: ogImage,
            location: "Page SEO image",
            entityType: "siteContent",
            entityLabel: routeLabel,
            adminHref: "/admin/content/seo",
          });
        }
      }

      // Announcement popup image (PopupConfig.imagePath —
      // src/lib/validators/site-banner.ts). BannerConfig has no dedicated
      // media field; both blobs' `content` docs and link targets (`linkUrl`,
      // `ctaUrl`) are scanned below.
      const popup = sc.popupConfig;
      if (popup && typeof popup === "object" && !Array.isArray(popup)) {
        const imagePath = (popup as Record<string, unknown>).imagePath;
        if (typeof imagePath === "string" && imagePath) {
          addUsage(map, imagePath, {
            url: imagePath,
            location: "Announcement popup",
            entityType: "siteContent",
            entityLabel: "Popup image",
            adminHref: "/admin/content/announcements",
          });
        }
      }

      // Link targets: an owner can point a menu item, the banner or the popup
      // button at a Media Library file (e.g. a PDF menu). Read raw — like
      // pageMeta, a blob that no longer validates still holds live links.
      const linkUsage = (
        href: unknown,
        location: string,
        entityLabel: string | undefined,
        adminHref: string,
      ) => {
        if (typeof href !== "string") return;
        const trimmed = href.trim();
        if (!trimmed) return;
        addUsage(map, trimmed, {
          url: trimmed,
          location,
          entityType: "siteContent",
          entityLabel,
          adminHref,
        });
      };
      const asRecord = (v: unknown): Record<string, unknown> | null =>
        v && typeof v === "object" && !Array.isArray(v)
          ? (v as Record<string, unknown>)
          : null;
      /** A non-blank string label, else undefined (menu labels can be ""). */
      const labelOf = (v: unknown): string | undefined =>
        typeof v === "string" && v.trim() !== "" ? v : undefined;
      const scanNavItems = (items: unknown, location: string) => {
        if (!Array.isArray(items)) return;
        for (const raw of items) {
          const item = asRecord(raw);
          if (!item) continue;
          const label = labelOf(item.label);
          linkUsage(item.href, location, label, "/admin/content/navigation");
          if (Array.isArray(item.children)) {
            for (const rawChild of item.children) {
              const child = asRecord(rawChild);
              if (!child) continue;
              const childLabel = labelOf(child.label);
              linkUsage(
                child.href,
                location,
                label && childLabel ? `${label} › ${childLabel}` : childLabel,
                "/admin/content/navigation",
              );
            }
          }
        }
      };
      scanNavItems(sc.navigationItems, "Navigation menu");
      scanNavItems(sc.footerNavigationItems, "Footer quick links");

      // Banner / popup messages are TipTap docs (`content`) that were never
      // scanned — walk them for media AND links like any other rich text.
      const walkAnnouncementDoc = (doc: unknown, location: string) => {
        const usage = (entityLabel: string) => ({
          location,
          entityType: "siteContent",
          entityLabel,
          adminHref: "/admin/content/announcements",
        });
        walkTiptap(
          doc,
          (src) =>
            addUsage(map, src, { url: src, ...usage("Message (rich text)") }),
          (id) => galleryRefs.push({ id, ...usage("Message (rich text)") }),
          (href) =>
            addUsage(map, href, { url: href, ...usage("Linked from message") }),
        );
      };
      const banner = asRecord(sc.bannerConfig);
      if (banner) {
        linkUsage(
          banner.linkUrl,
          "Announcement banner",
          "Banner link",
          "/admin/content/announcements",
        );
        walkAnnouncementDoc(banner.content, "Announcement banner");
      }
      const popupLinks = asRecord(sc.popupConfig);
      if (popupLinks) {
        linkUsage(
          popupLinks.ctaUrl,
          "Announcement popup",
          "Popup button link",
          "/admin/content/announcements",
        );
        walkAnnouncementDoc(popupLinks.content, "Announcement popup");
      }

      const templateId = sc.business?.templateId ?? "";
      const templateLabel = getTemplateLabel(templateId);
      const fieldsByKey = new Map(
        (TEMPLATE_FIELDS[templateId] ?? []).map((f) => [f.key, f]),
      );

      // `customFields` is ONE blob shared by every template the business has
      // ever used, so a key in it may belong to a template that is no longer
      // active. Resolve such keys against the full registry (built at most once
      // per call, on the first miss) so their usages can be labelled — and
      // flagged — as leftovers from an inactive template.
      let fieldOwners: Map<string, TemplateFieldOwner> | null = null;
      const getInactiveOwner = (
        key: string,
      ): TemplateFieldOwner | undefined => {
        fieldOwners ??= buildTemplateFieldOwnerIndex();
        return fieldOwners.get(key);
      };

      // Attribute each custom-field value to its template + field label, e.g.
      // "Modern template · Hero image", or "Default template (not active) ·
      // Hero image" when another template owns the key. Keys owned by NO
      // template (legacy / orphaned data) keep the conservative old fallback:
      // raw key, active template's label, and NO inactiveTemplate flag — an
      // unattributable reference must keep blocking deletion.
      const scanCustomFields = (fields: unknown, isDraft: boolean) => {
        if (!fields || typeof fields !== "object" || Array.isArray(fields))
          return;
        const obj = fields as Record<string, unknown>;

        for (const [fieldKey, value] of Object.entries(obj)) {
          const activeField = fieldsByKey.get(fieldKey);
          const owner = activeField ? undefined : getInactiveOwner(fieldKey);
          const field = activeField ?? owner?.field;
          const fieldLabel = field?.label ?? fieldKey;
          const draftSuffix = isDraft ? " (draft)" : "";
          const location = owner
            ? `${getTemplateLabel(owner.templateId)} template (not active) · ${fieldLabel}${draftSuffix}`
            : `${templateLabel} template · ${fieldLabel}${draftSuffix}`;
          const inactiveTemplate = owner ? true : undefined;

          // gallery-type fields store a gallery ID (a string), not a URL
          if (field?.type === "gallery" && typeof value === "string" && value) {
            galleryRefs.push({
              id: value,
              location,
              entityType: "siteContent",
              adminHref: "/admin/content/template",
              inactiveTemplate,
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
                // `scrubMediaUrlsFromSiteContent` matches exact / query-stripped
                // strings only, so a `…pdf#page=2` value would survive the
                // scrub and dangle — keep it blocking instead of flagging it.
                inactiveTemplate: url.includes("#")
                  ? undefined
                  : inactiveTemplate,
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
                    inactiveTemplate,
                  });
                },
                (id) => {
                  galleryRefs.push({
                    id,
                    location: `${location} (rich text)`,
                    entityType: "siteContent",
                    adminHref: "/admin/content/template",
                    inactiveTemplate,
                  });
                },
                (href) => {
                  // Never flagged `inactiveTemplate`, even from an inactive
                  // template: the delete-time scrub removes `src` nodes, not
                  // `link` marks, so a flagged link would let the file be
                  // deleted while the stored link still points at it.
                  addUsage(map, href, {
                    url: href,
                    location: `Linked from ${location} (rich text)`,
                    entityType: "siteContent",
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

        // `additionalFields` is a free-form, template-specific JSON blob
        // (happy-bamboo alone stores `productTagline`, `productFeatures[]`,
        // `comingSoon` and `additionalInformation` in it). Only the
        // `additionalInformation` TipTap document used to be scanned, so an
        // image URL written under ANY other key was invisible: it reported as
        // unused in the Media Library and was one click from deletion while
        // still rendering on the storefront.
        //
        // The whole blob is now deep-walked. `deepWalkJson` still recognises
        // embedded TipTap documents and hands them to `walkTiptap`, so
        // rich-text images AND gallery nodes keep exactly the behaviour — and,
        // for `additionalInformation`, exactly the label — they had before.
        const af = p.additionalFields;
        if (af && typeof af === "object" && !Array.isArray(af)) {
          const productUsage = (location: string) => ({
            location,
            entityType: "product",
            entityId: p.id,
            entityLabel: p.name,
            adminHref: `/admin/products/${p.id}`,
          });

          for (const [fieldKey, value] of Object.entries(
            af as Record<string, unknown>,
          )) {
            // Preserve the pre-existing label for the one key that was already
            // scanned, so Media Library rows don't churn.
            const isAdditionalInfo = fieldKey === "additionalInformation";
            const location = isAdditionalInfo
              ? "Product additional information"
              : `Product additional fields · ${fieldKey}`;
            const richTextLocation = isAdditionalInfo
              ? location
              : `${location} (rich text)`;

            deepWalkJson(
              value,
              (url) => {
                addUsage(map, url, { url, ...productUsage(location) });
              },
              (doc) => {
                walkTiptap(
                  doc,
                  (src) => {
                    addUsage(map, src, {
                      url: src,
                      ...productUsage(richTextLocation),
                    });
                  },
                  (id) => {
                    galleryRefs.push({
                      id,
                      ...productUsage(richTextLocation),
                    });
                  },
                  (href) => {
                    addUsage(map, href, {
                      url: href,
                      ...productUsage(`Linked from ${richTextLocation}`),
                    });
                  },
                );
              },
            );
          }
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

  // ── 3b. Product option values (customizer tile images) ─────────────────────
  const optionValuesPromise = db.productOptionValue
    .findMany({
      where: { group: { businessId }, imageUrl: { not: null } },
      select: {
        id: true,
        label: true,
        imageUrl: true,
        group: { select: { name: true } },
      },
    })
    .then((values) => {
      for (const v of values) {
        if (v.imageUrl) {
          addUsage(map, v.imageUrl, {
            url: v.imageUrl,
            location: `Product option "${v.group.name}"`,
            entityType: "productOptionValue",
            entityId: v.id,
            entityLabel: v.label,
            adminHref: "/admin/products",
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
        serviceTemplateId: true,
        customFields: true,
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

        // `Service.customFields` holds the service-PAGE template fields —
        // written by `services.updateCustomFields` and edited through the same
        // `FieldGroup` widget as the site template editor, so it carries image,
        // video, richtext and gallery references exactly like
        // `SiteContent.customFields` does. It was not scanned at all before:
        // a photo placed on a service field reported as unused in the Media
        // Library and was one click from deletion while still live on the site.
        //
        // Field labels/types are resolved against SERVICE_TEMPLATE_FIELDS so
        // gallery-type fields (service-two, vii-*) are recognised as gallery
        // embeds — without that, a gallery embedded ONLY on a service page
        // looks unembedded to `buildGalleryExternalUsage`, and `gallery.delete`
        // happily removes it (and its now-unreferenced S3 objects).
        //
        // NOTE: no `inactiveTemplate` flagging here, unlike SiteContent. That
        // flag means "deletable, and the URL gets scrubbed out of the blob in
        // the same mutation" — but the scrub
        // (`scrubMediaUrlsFromSiteContent` in the media router) only ever
        // touches SiteContent. Flagging a stale service-template field would
        // therefore delete the object and leave `Service.customFields`
        // pointing at a 404. The same holds for gallery embeds: the scrub in
        // `gallery.delete` is SiteContent-only too.
        const cf = s.customFields;
        if (cf && typeof cf === "object" && !Array.isArray(cf)) {
          const serviceFieldsByKey = new Map(
            (SERVICE_TEMPLATE_FIELDS[s.serviceTemplateId] ?? []).map((f) => [
              f.key,
              f,
            ]),
          );

          for (const [fieldKey, value] of Object.entries(
            cf as Record<string, unknown>,
          )) {
            const field = serviceFieldsByKey.get(fieldKey);
            const location = `Service page content · ${field?.label ?? fieldKey}`;
            const serviceUsage = (loc: string) => ({
              location: loc,
              entityType: "service",
              entityId: s.id,
              entityLabel: s.name,
              adminHref: `/admin/services/${s.id}`,
            });

            // gallery-type fields store a gallery ID (a string), not a URL
            if (
              field?.type === "gallery" &&
              typeof value === "string" &&
              value
            ) {
              galleryRefs.push({ id: value, ...serviceUsage(location) });
              continue;
            }

            deepWalkJson(
              value,
              (url) => {
                addUsage(map, url, { url, ...serviceUsage(location) });
              },
              (doc) => {
                walkTiptap(
                  doc,
                  (src) => {
                    addUsage(map, src, {
                      url: src,
                      ...serviceUsage(`${location} (rich text)`),
                    });
                  },
                  (id) => {
                    galleryRefs.push({
                      id,
                      ...serviceUsage(`${location} (rich text)`),
                    });
                  },
                  (href) => {
                    addUsage(map, href, {
                      url: href,
                      ...serviceUsage(`Linked from ${location} (rich text)`),
                    });
                  },
                );
              },
            );
          }
        }
      }
    });

  // ── 5b. Events (flier cover image / cover video) ────────────────────────────
  const eventsPromise = db.event
    .findMany({
      where: { businessId },
      select: { id: true, name: true, coverImage: true, coverVideo: true },
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
        if (e.coverVideo) {
          addUsage(map, e.coverVideo, {
            url: e.coverVideo,
            location: "Event video",
            entityType: "event",
            entityId: e.id,
            entityLabel: e.name,
            adminHref: `/admin/events/${e.id}`,
          });
        }
      }
    });

  // ── 5c. Videos (owner-uploaded thumbnail override) ─────────────────────────
  //
  // IMPORTANT: only `thumbnailOverride` belongs here. The sync-owned
  // `thumbnailUrl` column points at YouTube's CDN (`*.ytimg.com`), never at
  // an object in our bucket — `addUsage`'s `isStorageUrl` guard would reject
  // it anyway, but do NOT be tempted to add it "for completeness" if this
  // section is ever extended. Registering a remote YouTube thumbnail as
  // media usage would make the library think it's a managed file we can
  // re-host or that deleting frees storage — neither is true.
  const videosPromise = db.video
    .findMany({
      where: { businessId },
      select: {
        id: true,
        title: true,
        titleOverride: true,
        thumbnailOverride: true,
      },
    })
    .then((videos) => {
      for (const v of videos) {
        if (v.thumbnailOverride) {
          addUsage(map, v.thumbnailOverride, {
            url: v.thumbnailOverride,
            location: "Video thumbnail override",
            entityType: "video",
            entityId: v.id,
            entityLabel: v.titleOverride ?? v.title,
            adminHref: `/admin/videos/${v.id}`,
          });
        }
      }
    });

  // ── 6. Images (product image gallery rows) ─────────────────────────────────
  // `syncImages` historically created Image rows without `businessId`, so a
  // `where: { businessId }` scan missed gallery photos that were still on a
  // product. Reuse makes that dangerous (Media Library delete would destroy
  // a live object). Match either the denormalized column or the parent
  // product so both old and new rows count as used.
  const imagesPromise = db.image
    .findMany({
      where: {
        OR: [{ businessId }, { product: { businessId } }],
      },
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
        previewDraft: true,
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
        const linkLocation = `Linked from ${
          page.type === "blog"
            ? "blog post"
            : page.type === "policy"
              ? "policy page"
              : "page"
        }`;
        const walkPageDoc = (
          doc: unknown,
          location: string,
          linkLoc: string,
        ) => {
          walkTiptap(
            doc,
            (src) => {
              addUsage(map, src, {
                url: src,
                location,
                entityType: "page",
                entityId: page.id,
                entityLabel: page.title,
                adminHref: pageHref,
              });
            },
            (id) => {
              galleryRefs.push({
                id,
                location,
                entityType: "page",
                entityId: page.id,
                entityLabel: page.title,
                adminHref: pageHref,
              });
            },
            (href) => {
              // Renders as "Linked from page — <title>" in the Media Library.
              addUsage(map, href, {
                url: href,
                location: linkLoc,
                entityType: "page",
                entityId: page.id,
                entityLabel: page.title,
                adminHref: pageHref,
              });
            },
          );
        };
        if (page.content)
          walkPageDoc(page.content, "Page content", linkLocation);

        // Visual-editor draft: { title, excerpt, content } — only `content`
        // (a TipTap doc) can hold media. An image placed in the draft but not
        // yet published is live the moment the owner hits Publish.
        const draft = page.previewDraft;
        if (draft && typeof draft === "object" && !Array.isArray(draft)) {
          const draftContent = (draft as Record<string, unknown>).content;
          if (draftContent)
            walkPageDoc(
              draftContent,
              "Page content (draft)",
              `${linkLocation} (draft)`,
            );
        }
      }
    });

  // ── 7b. Business (maintenance / coming-soon page) ──────────────────────────
  const businessPromise = db.business
    .findUnique({
      where: { id: businessId },
      select: { maintenanceImage: true, maintenanceMessage: true },
    })
    .then((b) => {
      if (!b) return;
      const maintenanceUsage = (location: string, entityLabel?: string) => ({
        location,
        entityType: "business",
        entityLabel,
        adminHref: "/admin/settings/availability",
      });

      if (b.maintenanceImage) {
        addUsage(map, b.maintenanceImage, {
          url: b.maintenanceImage,
          ...maintenanceUsage("Maintenance page", "Flyer image"),
        });
      }

      // The message is a TipTap doc (src/lib/maintenance-config.ts); its
      // editor's image dialog accepts a pasted URL, so walk it like Page.content.
      if (b.maintenanceMessage) {
        walkTiptap(
          b.maintenanceMessage,
          (src) => {
            addUsage(map, src, {
              url: src,
              ...maintenanceUsage("Maintenance page message (rich text)"),
            });
          },
          (id) => {
            galleryRefs.push({
              id,
              ...maintenanceUsage("Maintenance page message (rich text)"),
            });
          },
          (href) => {
            addUsage(map, href, {
              url: href,
              ...maintenanceUsage(
                "Linked from maintenance page message (rich text)",
              ),
            });
          },
        );
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
            adminHref: `/admin/testimonials`,
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

  // ── 10b. Forms (picture-choice option photos + reference image) ─────────────
  // `Form.definition` is a JSON blob. Media lives in `picturechoice` fields
  // (each option's `imageUrl` and the field's `referenceImageUrl`) and in the
  // screening "shown when they qualify" note (a TipTap doc: images, and links
  // to uploaded files such as a PDF).
  const formsPromise = db.form
    .findMany({
      where: { businessId },
      select: { id: true, name: true, definition: true },
    })
    .then((forms) => {
      for (const form of forms) {
        const formUsage = (location: string): MediaUsage => ({
          url: "",
          location,
          entityType: "form",
          entityId: form.id,
          entityLabel: form.name,
          adminHref: `/admin/forms/${form.id}`,
        });
        const parsed = parseStoredFormDefinition(form.definition);
        if (!parsed.success) {
          // A definition that no longer validates still holds live photos —
          // fall back to a generic walk so they never read as unused.
          deepWalkJson(
            form.definition,
            (url) =>
              addUsage(map, url, {
                ...formUsage(`Form: ${form.name}`),
                url,
              }),
            () => undefined,
          );
          continue;
        }
        for (const field of parsed.data.fields) {
          if (!isPictureChoiceField(field)) continue;
          const fieldLabel = field.label || "Picture choice";
          if (field.referenceImageUrl) {
            addUsage(map, field.referenceImageUrl, {
              ...formUsage(
                `Form: ${form.name} — ${fieldLabel} (reference image)`,
              ),
              url: field.referenceImageUrl,
            });
          }
          for (const option of field.options) {
            if (!option.imageUrl) continue;
            addUsage(map, option.imageUrl, {
              ...formUsage(`Form: ${form.name} — ${fieldLabel}`),
              url: option.imageUrl,
            });
          }
        }
        const screening = parsed.data.settings.screening;
        const noteLocation = `Form: ${form.name} — screening message`;
        const screeningDocs = [
          screening.unlockContent,
          screening.defaultFailContent,
          ...screening.questions.map((question) => question.failContent),
        ];
        for (const doc of screeningDocs) {
          if (!doc) continue;
          walkTiptap(
            doc,
            (src) =>
              addUsage(map, src, {
                ...formUsage(noteLocation),
                url: src,
              }),
            () => undefined,
            (href) =>
              addUsage(map, href, {
                ...formUsage(`Linked from ${noteLocation}`),
                url: href,
              }),
          );
        }
      }
    });

  // ── 10c. Email campaigns (body + frozen send render) ──────────────────────
  // A campaign that went out points at storage objects from people's inboxes
  // — deleting a linked PDF (or an inline image) would break mail that was
  // already delivered, so every campaign counts, in every status. Drafts are
  // labelled "(draft)" like page drafts. Sources:
  //  - `bodyJson` (tiptap): link marks + image nodes via `walkTiptap`
  //    (gallery nodes are not rendered into email, so they are ignored)
  //  - `bodyText` (plain text): bare URLs, which mail clients turn into links
  //  - `renderedHtml` / `renderedText`: the copy frozen at queue time, which
  //    is what was actually sent (also catches the header logo)
  const campaignsPromise = db.marketingCampaign
    .findMany({
      where: { businessId },
      select: {
        id: true,
        subject: true,
        status: true,
        bodyText: true,
        bodyJson: true,
        renderedHtml: true,
        renderedText: true,
      },
    })
    .then((campaigns) => {
      for (const c of campaigns) {
        const draft = c.status === "DRAFT" ? " (draft)" : "";
        const seen = new Set<string>();
        const campaignUsage = (rawUrl: string, location: string) => {
          if (!isStorageUrl(rawUrl)) return;
          const key = normalizeUrl(stripHash(rawUrl));
          if (seen.has(key)) return; // one row per file per campaign
          seen.add(key);
          addUsage(map, rawUrl, {
            url: rawUrl,
            location: `${location}${draft}`,
            entityType: "marketingCampaign",
            entityId: c.id,
            entityLabel: c.subject.trim() || "Untitled campaign",
            adminHref: `/admin/marketing/campaigns/${c.id}`,
          });
        };

        if (c.bodyJson) {
          walkTiptap(
            c.bodyJson,
            (src) => campaignUsage(src, "Email campaign image"),
            () => undefined,
            (href) => campaignUsage(href, "Linked from email campaign"),
          );
        }
        if (c.bodyText) {
          for (const url of findStorageUrlsInText(c.bodyText))
            campaignUsage(url, "Linked from email campaign");
        }
        for (const rendered of [c.renderedHtml, c.renderedText]) {
          if (!rendered) continue;
          for (const url of findStorageUrlsInText(rendered))
            campaignUsage(url, "Email campaign");
        }
      }
    });

  // Run all independent queries in parallel
  await Promise.all([
    siteContentPromise,
    productsPromise,
    variantsPromise,
    optionValuesPromise,
    collectionsPromise,
    servicesPromise,
    eventsPromise,
    videosPromise,
    imagesPromise,
    pagesPromise,
    businessPromise,
    galleryImagesPromise,
    testimonialsPromise,
    reviewsPromise,
    formsPromise,
    campaignsPromise,
  ]);

  return { map, galleryRefs };
}

/**
 * Step 11 of `buildUsedMediaIndex`: expand the gallery references accumulated
 * during the scan into per-image usages in `map`.
 */
async function resolveGalleryRefs(
  businessId: string,
  map: UsageMap,
  galleryRefs: GalleryRef[],
): Promise<void> {
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
        // location already names the gallery — no separate entityLabel.
        //
        // The inactive-template flag rides along: a gallery embedded from a
        // field of a template the owner switched away from produces inactive
        // usages for every image in it. That never makes those images
        // deletable on its own — step 8 already gave each of them an
        // always-active "Gallery — name" usage from its own GalleryImage row,
        // so a gallery-contained file can never be inactive-only overall.
        addUsage(map, img.url, {
          url: img.url,
          location: `${ref.location} — gallery “${img.name}”`,
          entityType: ref.entityType,
          entityId: ref.entityId,
          adminHref: ref.adminHref,
          inactiveTemplate: ref.inactiveTemplate,
        });
      }
    }
  }
}

// ─── Gallery external-usage helper ────────────────────────────────────────────

export type GalleryExternalUsage = {
  location: string;
  entityLabel?: string;
  adminHref?: string;
  /**
   * Set when the embed is a field value of a template the owner switched away
   * from (carried from the scan — only SiteContent refs ever set it). Such an
   * embed is reported but does NOT block `gallery.delete`; the delete scrubs it.
   */
  inactiveTemplate?: boolean;
};

/**
 * For every gallery in `businessId`, find where the gallery ITSELF is embedded
 * on the storefront — a gallery-type template field or a TipTap `gallery` node
 * holding its ID. Keyed by gallery ID; an absent key means "not embedded".
 *
 * Deliberately gallery-ID-based, NOT image-URL-based. Galleries can pull images
 * from the Media Library, so one of a gallery's image URLs may also be a
 * product, collection or page image. That shared file is not an embed of the
 * gallery: deleting the gallery leaves the product page intact, and the file
 * itself is protected separately — `gallery.delete` only removes S3 objects
 * that `buildUsedMediaIndex` reports as unreferenced once the gallery's rows
 * are gone. Likewise a `gallery.duplicate` copy (which shares its source's
 * image URLs) is not embedded just because its source is.
 *
 * Empty galleries count: an embedded gallery with no images yet is still
 * embedded, and deleting it would leave a dangling reference.
 *
 * Usages are deduped to one per entityType+entityId (falling back to location
 * when entityId is absent), so a page embedding the gallery twice lists once.
 *
 * This is the single source of truth for both `gallery.delete`'s CONFLICT
 * guard and the admin "Embedded" badge — they must never drift apart.
 *
 * `inactiveTemplate` is carried through, matching the Media Library rule
 * (`deleteMedia` in `~/server/media/library`): an embed that is a leftover field
 * value of a template the owner switched away from is REPORTED (with the flag)
 * but does not block deletion — owners have no UI to clear an inactive
 * template's fields. `gallery.delete` blocks only on usages without the flag and
 * scrubs the inactive ones out of `SiteContent.customFields` /
 * `previewCustomFields` before deleting, so a reactivated template falls back to
 * its field defaults. When an active and an inactive reference dedupe to the
 * same entry, the active one wins.
 */
export async function buildGalleryExternalUsage(
  businessId: string,
): Promise<Map<string, GalleryExternalUsage[]>> {
  const { galleryRefs } = await scanMediaReferences(businessId);
  if (galleryRefs.length === 0) return new Map();

  // Drop references to galleries that no longer exist (or were never this
  // business's), so every key is a real gallery of `businessId`.
  const galleries = await db.gallery.findMany({
    where: {
      businessId,
      id: { in: Array.from(new Set(galleryRefs.map((r) => r.id))) },
    },
    select: { id: true },
  });
  const known = new Set(galleries.map((g) => g.id));

  const deduped = new Map<string, Map<string, GalleryExternalUsage>>();
  for (const ref of galleryRefs) {
    if (!known.has(ref.id)) continue;
    const usages =
      deduped.get(ref.id) ?? new Map<string, GalleryExternalUsage>();
    const key = `${ref.entityType}:${ref.entityId ?? ref.location}`;
    const existing = usages.get(key);
    // Active wins: never let an inactive duplicate downgrade an active entry
    // (that would let `gallery.delete` through and scrub a live embed).
    if (!existing || (existing.inactiveTemplate && !ref.inactiveTemplate)) {
      usages.set(key, {
        location: ref.location,
        entityLabel: ref.entityLabel,
        adminHref: ref.adminHref,
        inactiveTemplate: ref.inactiveTemplate ? true : undefined,
      });
    }
    deduped.set(ref.id, usages);
  }

  return new Map(
    Array.from(deduped, ([id, usages]) => [id, Array.from(usages.values())]),
  );
}
