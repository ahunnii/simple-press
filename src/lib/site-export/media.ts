/**
 * "Download your site" export — photo/video index and download.
 *
 * Every stored object under `{businessId}/` (as listed by
 * `listBusinessObjects`, which already drops editor-note attachments) is
 * downloaded and filed ONCE into a readable folder under `Photos/`, named for
 * its FIRST use in this priority order:
 *
 *   Branding → Products → Collections → Galleries → Blog → Pages → Services →
 *   Events → Testimonials → Product reviews → Videos → Site sections
 *
 * Anything uploaded but unreferenced lands in `Photos/Media Library/` (unused
 * `video-*` uploads in `Photos/Videos/`, a stale logo/favicon in Branding).
 *
 * Images the site shows that were never uploaded to storage — template
 * defaults served from `public/` and pasted external image URLs — are fetched
 * best-effort into `Photos/Template & stock images/`.
 *
 * Reference detection mirrors src/lib/media/usage.ts (same columns, same
 * TipTap / JSON deep walk) but also keeps non-storage URLs, so external images
 * can be found. User avatars (`avatars/{userId}`) are not under the business
 * prefix and are deliberately not exported.
 *
 * No `next/headers`, `checkBusiness` or `server-only` — callable from the
 * route handler or a script.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import type { MediaIndex, SiteExportFile } from "./types";
import type { DownloadedObject } from "~/lib/s3/download";
import type { ListedObject, MediaKind } from "~/lib/s3/list";
import type { TemplateField } from "~/lib/template-fields";
import { normalizeUrl } from "~/lib/media/usage";
import { chunkedAsync, downloadStoredObjects } from "~/lib/s3/download";
import { listBusinessObjects } from "~/lib/s3/list";
import { isStorageUrl, keyToPublicUrl, publicUrlToKey } from "~/lib/s3/url";
import { safeFetch } from "~/lib/safe-fetch";
import { TEMPLATE_FIELDS } from "~/lib/template-fields";
import { STATIC_SEO_ROUTES } from "~/lib/validators/site-seo";
import { db } from "~/server/db";

import { createNameDeduper, safeName, SITE_EXPORT_DIRS } from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────

export type MediaCategory =
  | "branding"
  | "products"
  | "collections"
  | "galleries"
  | "blog"
  | "pages"
  | "services"
  | "events"
  | "testimonials"
  | "reviews"
  | "videos"
  | "siteSections";

/** First-use priority: a file used in several places is filed under the earliest. */
export const MEDIA_CATEGORY_ORDER: readonly MediaCategory[] = [
  "branding",
  "products",
  "collections",
  "galleries",
  "blog",
  "pages",
  "services",
  "events",
  "testimonials",
  "reviews",
  "videos",
  "siteSections",
];

export const MEDIA_CATEGORY_FOLDERS: Record<MediaCategory, string> = {
  branding: "Branding",
  products: "Products",
  collections: "Collections",
  galleries: "Galleries",
  blog: "Blog",
  pages: "Pages",
  services: "Services",
  events: "Events",
  testimonials: "Testimonials",
  reviews: "Product reviews",
  videos: "Videos",
  siteSections: "Site sections",
};

export const MEDIA_LIBRARY_FOLDER = "Media Library";
export const EXTERNAL_IMAGES_FOLDER = "Template & stock images";

/** Best-effort limits for images not in storage. */
const EXTERNAL_MAX_FILES = 200;
const EXTERNAL_MAX_BYTES = 15 * 1024 * 1024;
const EXTERNAL_TIMEOUT_MS = 10_000;

/** Template placeholders — not a real picture, never worth exporting. */
const PLACEHOLDER_PATHS = new Set(["/placeholder.svg", "/placeholder.png"]);

const IMAGE_EXT_RE =
  /\.(jpe?g|png|gif|webp|avif|svg|bmp|ico|tiff?|heic|heif)$/i;

const CONTENT_TYPE_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/pjpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/svg+xml": ".svg",
  "image/bmp": ".bmp",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
  "image/tiff": ".tif",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/ogg": ".ogv",
  "application/pdf": ".pdf",
};

// ─── Reference model ──────────────────────────────────────────────────────────

/** One place content points at a media URL. */
export interface MediaReference {
  /** The string exactly as stored (may carry a query string, may be a bare key). */
  url: string;
  category: MediaCategory;
  /**
   * Stable id of the owning record (product id, gallery id, …). References
   * sharing a groupKey share one sub-folder and are numbered 01, 02, … in
   * reference order. Omit for a flat file in the category folder.
   */
  groupKey?: string;
  /** Display name for the group sub-folder (product name, post title, …). */
  groupName?: string;
  /** Flat files only: file name stem ("Logo"). Falls back to the original basename. */
  label?: string;
  /** Image-typed field: qualifies an extension-less external URL for download. */
  isImageField?: boolean;
  /** Not shown on the live site (e.g. inactive-template field) — never fetch externally. */
  skipExternal?: boolean;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function stripQueryAndHash(url: string): string {
  const h = url.indexOf("#");
  return normalizeUrl(h >= 0 ? url.slice(0, h) : url);
}

/**
 * Resolve a content reference to a storage key under `{businessId}/`, or null.
 * Accepts the canonical public URL (with or without a query string) and the
 * bare key, matching how usage.ts / store-transfer rewrite.ts normalize.
 */
export function referenceToKey(raw: string, businessId: string): string | null {
  const url = stripQueryAndHash(raw.trim());
  if (!url) return null;
  const key = publicUrlToKey(url) ?? url;
  return key.startsWith(`${businessId}/`) ? key : null;
}

/** File extension (".jpg") for a path or key, else from a content type, else "". */
export function fileExtension(
  nameOrPath: string,
  contentType?: string | null,
): string {
  const ext = path.posix.extname(nameOrPath).toLowerCase();
  if (/^\.[a-z0-9]{1,5}$/.test(ext)) return ext;
  if (contentType) {
    const ct = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
    return CONTENT_TYPE_EXT[ct] ?? "";
  }
  return "";
}

/** "image-ab12.jpg" → "image-ab12" (no extension, filesystem-safe). */
function basenameStem(nameOrPath: string): string {
  const base = path.posix.basename(nameOrPath);
  const ext = path.posix.extname(base);
  return safeName(ext ? base.slice(0, -ext.length) : base, "file");
}

/** Per-folder unique file names, keeping the extension last: "01.jpg", "01 (2).jpg". */
function createFileNameDeduper(): (stem: string, ext: string) => string {
  const used = new Set<string>();
  return (stem, ext) => {
    let name = `${stem}${ext}`;
    for (let n = 2; used.has(name.toLowerCase()); n++) {
      name = `${stem} (${n})${ext}`;
    }
    used.add(name.toLowerCase());
    return name;
  };
}

/**
 * Allocates zip paths under `Photos/`, keeping every folder's file names and
 * every category's group sub-folder names unique.
 */
function createPathAllocator() {
  const photos = SITE_EXPORT_DIRS.photos;
  const fileDedupers = new Map<
    string,
    ReturnType<typeof createFileNameDeduper>
  >();
  const groupFolders = new Map<string, string>(); // `${category}\0${groupKey}` → folder
  const groupDedupers = new Map<MediaCategory, (name: string) => string>();
  const groupCounters = new Map<string, number>(); // folder → last number used

  const fileIn = (folder: string, stem: string, ext: string): string => {
    let dedupe = fileDedupers.get(folder);
    if (!dedupe) {
      dedupe = createFileNameDeduper();
      fileDedupers.set(folder, dedupe);
    }
    return `${folder}/${dedupe(stem, ext)}`;
  };

  const groupFolder = (
    category: MediaCategory,
    groupKey: string,
    groupName?: string,
  ) => {
    const id = `${category}\0${groupKey}`;
    const existing = groupFolders.get(id);
    if (existing) return existing;
    let dedupe = groupDedupers.get(category);
    if (!dedupe) {
      dedupe = createNameDeduper();
      groupDedupers.set(category, dedupe);
    }
    const folder = `${photos}/${MEDIA_CATEGORY_FOLDERS[category]}/${dedupe(safeName(groupName ?? ""))}`;
    groupFolders.set(id, folder);
    return folder;
  };

  return {
    /** Numbered file in a record's sub-folder: Photos/Products/Blue Mug/01.jpg */
    numbered(
      category: MediaCategory,
      groupKey: string,
      groupName: string | undefined,
      ext: string,
    ) {
      const folder = groupFolder(category, groupKey, groupName);
      const n = (groupCounters.get(folder) ?? 0) + 1;
      groupCounters.set(folder, n);
      return fileIn(folder, String(n).padStart(2, "0"), ext);
    },
    /** Flat file in a top-level Photos folder: Photos/Branding/Logo.png */
    flat(folderName: string, stem: string, ext: string) {
      return fileIn(`${photos}/${folderName}`, stem, ext);
    },
  };
}

export interface StoredObjectForNaming {
  key: string;
  kind: MediaKind;
  contentType?: string;
}

export type PathAllocator = ReturnType<typeof createPathAllocator>;

/**
 * Pure: file each stored object under its first use. `objects` should only
 * contain the objects that will actually be in the zip, so numbering has no
 * gaps (a reference to a stored file that failed to download is skipped).
 * Returns key → zip path for every object.
 */
export function assignStoredPaths(
  objects: StoredObjectForNaming[],
  refs: MediaReference[],
  businessId: string,
  allocator: PathAllocator = createPathAllocator(),
): Map<string, string> {
  const byKey = new Map(objects.map((o) => [o.key, o]));
  const assigned = new Map<string, string>();
  const rank = (c: MediaCategory) => MEDIA_CATEGORY_ORDER.indexOf(c);
  // Array.prototype.sort is stable — reference order within a category holds.
  const ordered = [...refs].sort((a, b) => rank(a.category) - rank(b.category));

  for (const ref of ordered) {
    const key = referenceToKey(ref.url, businessId);
    if (!key || assigned.has(key)) continue;
    const obj = byKey.get(key);
    if (!obj) continue;
    const ext = fileExtension(key, obj.contentType);

    let zipPath: string;
    if (ref.groupKey !== undefined) {
      zipPath = allocator.numbered(
        ref.category,
        ref.groupKey,
        ref.groupName,
        ext,
      );
    } else {
      const stem = ref.label ? safeName(ref.label) : basenameStem(key);
      zipPath = allocator.flat(MEDIA_CATEGORY_FOLDERS[ref.category], stem, ext);
    }
    assigned.set(key, zipPath);
  }

  // Unreferenced uploads, in listing order.
  for (const obj of objects) {
    if (assigned.has(obj.key)) continue;
    const ext = fileExtension(obj.key, obj.contentType);
    let zipPath: string;
    if (obj.kind === "logo") {
      zipPath = allocator.flat(MEDIA_CATEGORY_FOLDERS.branding, "Logo", ext);
    } else if (obj.kind === "favicon") {
      zipPath = allocator.flat(MEDIA_CATEGORY_FOLDERS.branding, "Favicon", ext);
    } else if (obj.kind === "video") {
      zipPath = allocator.flat(
        MEDIA_CATEGORY_FOLDERS.videos,
        basenameStem(obj.key),
        ext,
      );
    } else {
      zipPath = allocator.flat(
        MEDIA_LIBRARY_FOLDER,
        basenameStem(obj.key),
        ext,
      );
    }
    assigned.set(obj.key, zipPath);
  }

  return assigned;
}

export type ExternalSource =
  | { type: "remote"; fetchUrl: string }
  | { type: "public"; relPath: string };

/**
 * Pure: decide whether a reference is an image to fetch from outside storage.
 * Stored keys (ours, listed or not) are never external. Remote http(s) URLs
 * qualify with an image extension, or from an image-typed field; `/…` paths
 * (served from the app's public/ dir) need an image extension.
 */
export function toExternalSource(
  raw: string,
  businessId: string,
  isImageField = false,
): ExternalSource | null {
  const s = raw.trim();
  if (!s || s.startsWith("data:") || /\s/.test(s)) return null;
  if (referenceToKey(s, businessId)) return null;

  if (/^(https?:)?\/\//i.test(s)) {
    const fetchUrl = s.startsWith("//") ? `https:${s}` : s;
    let pathname: string;
    try {
      pathname = new URL(fetchUrl).pathname;
    } catch {
      return null;
    }
    if (!IMAGE_EXT_RE.test(pathname) && !isImageField) return null;
    return { type: "remote", fetchUrl };
  }

  if (s.startsWith("/")) {
    const relPath = stripQueryAndHash(s);
    if (!IMAGE_EXT_RE.test(relPath) || PLACEHOLDER_PATHS.has(relPath))
      return null;
    return { type: "public", relPath };
  }

  return null;
}

export interface ExternalCandidate {
  /** Dedupe identity: fetch URL (remote) or path (public). */
  id: string;
  source: ExternalSource;
  /** Every raw reference string that resolves to this candidate. */
  raws: string[];
}

/** Pure: unique external images in first-use order. */
export function planExternalImages(
  refs: MediaReference[],
  businessId: string,
): ExternalCandidate[] {
  const rank = (c: MediaCategory) => MEDIA_CATEGORY_ORDER.indexOf(c);
  const ordered = [...refs].sort((a, b) => rank(a.category) - rank(b.category));
  const byId = new Map<string, ExternalCandidate>();

  for (const ref of ordered) {
    if (ref.skipExternal) continue;
    const source = toExternalSource(ref.url, businessId, ref.isImageField);
    if (!source) continue;
    const id =
      source.type === "remote"
        ? stripQueryAndHash(source.fetchUrl)
        : source.relPath;
    const existing = byId.get(id);
    if (existing) {
      if (!existing.raws.includes(ref.url.trim()))
        existing.raws.push(ref.url.trim());
    } else {
      byId.set(id, { id, source, raws: [ref.url.trim()] });
    }
  }
  return [...byId.values()];
}

/** Pure: file name for an external image ("hero.jpg", or "image.png" from content type). */
export function externalFileName(
  source: ExternalSource,
  contentType?: string | null,
): { stem: string; ext: string } {
  let pathname: string;
  if (source.type === "public") {
    pathname = source.relPath;
  } else {
    try {
      pathname = new URL(source.fetchUrl).pathname;
    } catch {
      pathname = "";
    }
  }
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // keep the raw pathname
  }
  const base = path.posix.basename(decoded) || "image";
  return { stem: basenameStem(base), ext: fileExtension(base, contentType) };
}

// ─── Reference collection (DB, read-only) ─────────────────────────────────────

const IMAGE_KEY_RE =
  /image|photo|picture|thumbnail|poster|logo|avatar|background|^src$/i;
const HTML_SRC_RE =
  /<(?:img|video|source)\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi;

/** Could this string be a media reference (URL, path or bare key)? */
function looksLikeReference(s: string, businessId: string): boolean {
  if (s.length > 2048 || /\s/.test(s)) return false;
  return (
    /^(https?:)?\/\//i.test(s) ||
    s.startsWith("/") ||
    s.startsWith(`${businessId}/`)
  );
}

/**
 * Walk any JSON value (TipTap docs, template custom fields, free-form blobs)
 * and report every string that could be a media reference. HTML strings have
 * their `<img|video|source src>` attributes extracted. `isImage` is true for
 * TipTap `image` node srcs, HTML img srcs and values under image-ish keys.
 */
export function collectJsonReferences(
  value: unknown,
  businessId: string,
  onRef: (url: string, isImage: boolean) => void,
  imageHint = false,
): void {
  if (value === null || value === undefined) return;

  if (typeof value === "string") {
    const s = value.trim();
    if (looksLikeReference(s, businessId)) {
      onRef(s, imageHint || isStorageUrl(s));
    } else if (s.includes("<")) {
      for (const m of s.matchAll(HTML_SRC_RE)) {
        if (m[1]) onRef(m[1].trim(), true);
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value)
      collectJsonReferences(item, businessId, onRef, imageHint);
    return;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const isImageNode = obj.type === "image";
    for (const [k, v] of Object.entries(obj)) {
      const hint =
        imageHint || (isImageNode && k === "attrs") || IMAGE_KEY_RE.test(k);
      collectJsonReferences(v, businessId, onRef, hint);
    }
  }
}

function isEmptyFieldValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/**
 * Pure: references from SiteContent.customFields plus the active template's
 * built-in image defaults (only where the owner left the field unset).
 */
export function collectCustomFieldReferences(
  customFields: unknown,
  templateFields: TemplateField[],
  businessId: string,
): MediaReference[] {
  const refs: MediaReference[] = [];
  const fieldsByKey = new Map(templateFields.map((f) => [f.key, f]));
  const cf =
    customFields &&
    typeof customFields === "object" &&
    !Array.isArray(customFields)
      ? (customFields as Record<string, unknown>)
      : {};

  for (const [key, value] of Object.entries(cf)) {
    const field = fieldsByKey.get(key);
    if (field?.type === "gallery") continue; // gallery id, not a URL
    collectJsonReferences(
      value,
      businessId,
      (url, isImage) => {
        refs.push({
          url,
          category: "siteSections",
          label: field?.label,
          isImageField: isImage || field?.type === "image",
          // Keys the active template doesn't declare belong to a template the
          // owner switched away from (or legacy data) — not on the live site.
          skipExternal: !field,
        });
      },
      field?.type === "image",
    );
  }

  for (const field of templateFields) {
    if (!isEmptyFieldValue(cf[field.key])) continue;
    if (field.type === "image" && field.defaultValue) {
      refs.push({
        url: field.defaultValue,
        category: "siteSections",
        label: field.label,
        isImageField: true,
      });
    } else if (field.type === "list" && field.defaultRows) {
      const imageKeys = field.itemSchema
        .filter((s) => s.type === "image")
        .map((s) => s.key);
      for (const row of field.defaultRows) {
        for (const k of imageKeys) {
          const url = row[k];
          if (url) {
            refs.push({
              url,
              category: "siteSections",
              label: field.label,
              isImageField: true,
            });
          }
        }
      }
    }
  }

  return refs;
}

/**
 * Load every place content references media, in first-use order. Read-only.
 * Drafts (Page.previewDraft, SiteContent.previewCustomFields) are skipped —
 * they aren't on the live site; stored files used only there still export,
 * under Media Library.
 */
export async function collectMediaReferences(
  businessId: string,
): Promise<MediaReference[]> {
  const [
    business,
    siteContent,
    products,
    collections,
    galleries,
    pages,
    services,
    events,
    testimonials,
    reviews,
    videos,
  ] = await Promise.all([
    db.business.findUnique({
      where: { id: businessId },
      select: {
        templateId: true,
        maintenanceImage: true,
        maintenanceMessage: true,
      },
    }),
    db.siteContent.findUnique({
      where: { businessId },
      select: {
        logoUrl: true,
        faviconUrl: true,
        ogImage: true,
        heroImageUrl: true,
        aboutImageUrl: true,
        pageMeta: true,
        popupConfig: true,
        customFields: true,
      },
    }),
    db.product.findMany({
      where: { businessId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        ogImage: true,
        description: true,
        additionalFields: true,
        images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
        variants: { select: { imageUrl: true } },
      },
    }),
    db.collection.findMany({
      where: { businessId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, imageUrl: true, ogImage: true },
    }),
    db.gallery.findMany({
      where: { businessId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
    }),
    db.page.findMany({
      where: { businessId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        type: true,
        image: true,
        ogImage: true,
        content: true,
      },
    }),
    db.service.findMany({
      where: { businessId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        image: true,
        ogImage: true,
        customFields: true,
        items: { orderBy: { sortOrder: "asc" }, select: { image: true } },
      },
    }),
    db.event.findMany({
      where: { businessId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        coverImage: true,
        coverVideo: true,
        blurb: true,
      },
    }),
    db.testimonial.findMany({
      where: { businessId },
      orderBy: { createdAt: "asc" },
      select: { id: true, customerName: true, photoUrls: true },
    }),
    db.productReview.findMany({
      where: { product: { businessId } },
      orderBy: { createdAt: "asc" },
      select: {
        images: true,
        videoUrl: true,
        product: { select: { id: true, name: true } },
      },
    }),
    db.video.findMany({
      where: { businessId },
      orderBy: { sortOrder: "asc" },
      select: { title: true, titleOverride: true, thumbnailOverride: true },
    }),
  ]);

  const refs: MediaReference[] = [];
  const push = (
    url: string | null | undefined,
    ref: Omit<MediaReference, "url">,
  ) => {
    if (url?.trim()) refs.push({ url: url.trim(), ...ref });
  };
  /** Deep-walk a JSON/HTML value into one group (or flat category). */
  const walk = (
    value: unknown,
    ref: Omit<MediaReference, "url" | "isImageField">,
  ) => {
    collectJsonReferences(value, businessId, (url, isImage) =>
      refs.push({ url, ...ref, isImageField: isImage }),
    );
  };

  // ── Branding ───────────────────────────────────────────────────────────────
  push(siteContent?.logoUrl, {
    category: "branding",
    label: "Logo",
    isImageField: true,
  });
  push(siteContent?.faviconUrl, {
    category: "branding",
    label: "Favicon",
    isImageField: true,
  });
  push(siteContent?.ogImage, {
    category: "branding",
    label: "Social sharing image",
    isImageField: true,
  });

  // ── Products ───────────────────────────────────────────────────────────────
  for (const p of products) {
    const g = {
      category: "products" as const,
      groupKey: p.id,
      groupName: p.name,
    };
    for (const img of p.images) push(img.url, { ...g, isImageField: true });
    for (const v of p.variants) push(v.imageUrl, { ...g, isImageField: true });
    push(p.ogImage, { ...g, isImageField: true });
    walk(p.description, g);
    walk(p.additionalFields, g);
  }

  // ── Collections ────────────────────────────────────────────────────────────
  for (const c of collections) {
    const g = {
      category: "collections" as const,
      groupKey: c.id,
      groupName: c.name,
    };
    push(c.imageUrl, { ...g, isImageField: true });
    push(c.ogImage, { ...g, isImageField: true });
  }

  // ── Galleries ──────────────────────────────────────────────────────────────
  for (const gal of galleries) {
    const g = {
      category: "galleries" as const,
      groupKey: gal.id,
      groupName: gal.name,
    };
    for (const img of gal.images) push(img.url, { ...g, isImageField: true });
  }

  // ── Blog, then other pages (incl. policies) ────────────────────────────────
  for (const category of ["blog", "pages"] as const) {
    for (const page of pages) {
      if ((page.type === "blog") !== (category === "blog")) continue;
      const g = { category, groupKey: page.id, groupName: page.title };
      push(page.image, { ...g, isImageField: true });
      push(page.ogImage, { ...g, isImageField: true });
      walk(page.content, g);
    }
  }
  if (business) {
    const g = {
      category: "pages" as const,
      groupKey: "__maintenance",
      groupName: "Coming soon page",
    };
    push(business.maintenanceImage, { ...g, isImageField: true });
    walk(business.maintenanceMessage, g);
  }

  // ── Services ───────────────────────────────────────────────────────────────
  for (const s of services) {
    const g = {
      category: "services" as const,
      groupKey: s.id,
      groupName: s.name,
    };
    push(s.image, { ...g, isImageField: true });
    for (const item of s.items) push(item.image, { ...g, isImageField: true });
    push(s.ogImage, { ...g, isImageField: true });
    walk(s.customFields, g);
  }

  // ── Events ─────────────────────────────────────────────────────────────────
  for (const e of events) {
    const g = {
      category: "events" as const,
      groupKey: e.id,
      groupName: e.name,
    };
    push(e.coverImage, { ...g, isImageField: true });
    push(e.coverVideo, g);
    walk(e.blurb, g);
  }

  // ── Testimonials ───────────────────────────────────────────────────────────
  for (const t of testimonials) {
    const g = {
      category: "testimonials" as const,
      groupKey: t.id,
      groupName: t.customerName,
    };
    for (const url of t.photoUrls) push(url, { ...g, isImageField: true });
  }

  // ── Product reviews (grouped per product) ──────────────────────────────────
  for (const r of reviews) {
    const g = {
      category: "reviews" as const,
      groupKey: r.product.id,
      groupName: r.product.name,
    };
    for (const url of r.images) push(url, { ...g, isImageField: true });
    push(r.videoUrl, g);
  }

  // ── Videos (owner thumbnail overrides; synced YouTube thumbnails are skipped) ─
  for (const v of videos) {
    push(v.thumbnailOverride, {
      category: "videos",
      label: `${v.titleOverride ?? v.title} - thumbnail`,
      isImageField: true,
    });
  }

  // ── Site sections ──────────────────────────────────────────────────────────
  if (siteContent) {
    push(siteContent.heroImageUrl, {
      category: "siteSections",
      label: "Hero image",
      isImageField: true,
    });
    push(siteContent.aboutImageUrl, {
      category: "siteSections",
      label: "About image",
      isImageField: true,
    });

    const pageMeta = siteContent.pageMeta;
    if (pageMeta && typeof pageMeta === "object" && !Array.isArray(pageMeta)) {
      for (const [routeKey, entry] of Object.entries(
        pageMeta as Record<string, unknown>,
      )) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry))
          continue;
        const ogImage = (entry as Record<string, unknown>).ogImage;
        if (typeof ogImage !== "string") continue;
        const routeLabel =
          STATIC_SEO_ROUTES.find((r) => r.key === routeKey)?.label ?? routeKey;
        push(ogImage, {
          category: "siteSections",
          label: `${routeLabel} sharing image`,
          isImageField: true,
        });
      }
    }

    const popup = siteContent.popupConfig;
    if (popup && typeof popup === "object" && !Array.isArray(popup)) {
      const imagePath = (popup as Record<string, unknown>).imagePath;
      if (typeof imagePath === "string") {
        push(imagePath, {
          category: "siteSections",
          label: "Announcement popup",
          isImageField: true,
        });
      }
    }
  }

  refs.push(
    ...collectCustomFieldReferences(
      siteContent?.customFields,
      TEMPLATE_FIELDS[business?.templateId ?? ""] ?? [],
      businessId,
    ),
  );

  return refs;
}

// ─── External fetch ───────────────────────────────────────────────────────────

async function readPublicFile(relPath: string): Promise<Uint8Array | null> {
  const publicDir = path.join(process.cwd(), "public");
  let decoded: string;
  try {
    decoded = decodeURIComponent(relPath);
  } catch {
    return null;
  }
  const full = path.resolve(publicDir, `.${decoded}`);
  if (!full.startsWith(publicDir + path.sep)) return null; // traversal guard
  try {
    const stat = await fs.stat(full);
    if (!stat.isFile() || stat.size > EXTERNAL_MAX_BYTES) return null;
    return new Uint8Array(await fs.readFile(full));
  } catch {
    return null;
  }
}

async function fetchExternal(
  candidate: ExternalCandidate,
): Promise<{ bytes: Uint8Array; contentType: string | null } | null> {
  if (candidate.source.type === "public") {
    const bytes = await readPublicFile(candidate.source.relPath);
    return bytes ? { bytes, contentType: null } : null;
  }
  try {
    const { bytes, contentType } = await safeFetch(candidate.source.fetchUrl, {
      allowHttp: true,
      maxBytes: EXTERNAL_MAX_BYTES,
      timeoutMs: EXTERNAL_TIMEOUT_MS,
    });
    const ct = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
    if (ct ? !ct.startsWith("image/") : !IMAGE_EXT_RE.test(candidate.id))
      return null;
    return { bytes: new Uint8Array(bytes), contentType };
  } catch {
    return null;
  }
}

// ─── buildMediaIndex ──────────────────────────────────────────────────────────

/**
 * Download every stored photo/video for `businessId` (plus best-effort
 * external/template images) into readable `Photos/…` paths.
 *
 * `onProgress(done, total)` reports stored downloads first; once external
 * images are planned, `total` grows by their count.
 *
 * Throws only if the storage listing or the reference queries fail; individual
 * download failures are reported in `stats.missing` / `stats.external`.
 */
export async function buildMediaIndex(
  businessId: string,
  opts?: { onProgress?: (done: number, total: number) => void },
): Promise<MediaIndex> {
  const onProgress = opts?.onProgress;
  const listed: ListedObject[] = await listBusinessObjects(businessId);

  const [refs, downloaded] = await Promise.all([
    collectMediaReferences(businessId),
    downloadStoredObjects(listed, 5, onProgress),
  ]);

  return assembleMediaIndex(businessId, listed, downloaded, refs, onProgress);
}

/**
 * The part of `buildMediaIndex` after listing/downloading/collecting: naming,
 * external fetches, byUrl. Exported for tests.
 */
export async function assembleMediaIndex(
  businessId: string,
  listed: ListedObject[],
  downloaded: DownloadedObject[],
  refs: MediaReference[],
  onProgress?: (done: number, total: number) => void,
): Promise<MediaIndex> {
  const files: SiteExportFile[] = [];
  const byUrl = new Map<string, string>();
  const missing: string[] = [];
  const allocator = createPathAllocator();

  // ── Stored objects ─────────────────────────────────────────────────────────
  const ok: Array<DownloadedObject & { buffer: ArrayBuffer }> = [];
  for (const d of downloaded) {
    if (d.buffer === null) missing.push(d.obj.key);
    else ok.push({ ...d, buffer: d.buffer });
  }
  const keyToPath = assignStoredPaths(
    ok.map((d) => ({
      key: d.obj.key,
      kind: d.obj.kind,
      contentType: d.contentType,
    })),
    refs,
    businessId,
    allocator,
  );
  for (const d of ok) {
    const zipPath = keyToPath.get(d.obj.key);
    if (!zipPath) continue;
    files.push({
      path: zipPath,
      contents: new Uint8Array(d.buffer),
      compress: false,
    });
    byUrl.set(keyToPublicUrl(d.obj.key), zipPath);
    byUrl.set(d.obj.key, zipPath);
  }
  // Every stored form actually used in content (query strings, bare keys).
  for (const ref of refs) {
    const key = referenceToKey(ref.url, businessId);
    const zipPath = key ? keyToPath.get(key) : undefined;
    if (zipPath) {
      byUrl.set(ref.url, zipPath);
      byUrl.set(stripQueryAndHash(ref.url), zipPath);
    }
  }

  // ── External / template images ─────────────────────────────────────────────
  const candidates = planExternalImages(refs, businessId);
  const toFetch = candidates.slice(0, EXTERNAL_MAX_FILES);
  const external: MediaIndex["stats"]["external"] = [];

  const storedTotal = downloaded.length;
  const total = storedTotal + toFetch.length;
  let done = storedTotal;
  const fetched = await chunkedAsync(toFetch, 5, async (c) => {
    const result = await fetchExternal(c);
    done++;
    onProgress?.(done, total);
    return { c, result };
  });

  for (const { c, result } of fetched) {
    const url = c.raws[0] ?? c.id;
    if (!result) {
      external.push({ url, zipPath: null });
      continue;
    }
    const { stem, ext } = externalFileName(c.source, result.contentType);
    const zipPath = allocator.flat(EXTERNAL_IMAGES_FOLDER, stem, ext);
    files.push({ path: zipPath, contents: result.bytes, compress: false });
    for (const raw of c.raws) {
      byUrl.set(raw, zipPath);
      byUrl.set(stripQueryAndHash(raw), zipPath);
    }
    byUrl.set(c.id, zipPath);
    external.push({ url, zipPath });
  }
  // Over the cap: listed (so START HERE can mention them) but not fetched.
  for (const c of candidates.slice(EXTERNAL_MAX_FILES)) {
    external.push({ url: c.raws[0] ?? c.id, zipPath: null });
  }

  files.sort((a, b) => a.path.localeCompare(b.path));

  return {
    byUrl,
    files,
    stats: {
      listed: listed.length,
      included: ok.length,
      missing,
      external,
    },
  };
}
