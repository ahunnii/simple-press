/**
 * ListObjectsV2 helper for a single business prefix.
 *
 * Paginates automatically (up to MAX_PAGES pages) and hand-parses the XML
 * response.  No new dependency is introduced — key names are controlled
 * (`{businessId}/{prefix}-{hex}{ext}`) so no XML-escapable characters are
 * expected.  The parser can be swapped for a proper dependency later if key
 * formats change.
 */

import { EDITOR_NOTE_KEY_SEGMENT } from "~/lib/editor-notes";
import { s3Client } from "~/lib/s3/client";
import { keyToPublicUrl, STORAGE_BUCKET } from "~/lib/s3/url";

export type MediaKind =
  | "image"
  | "video"
  | "logo"
  | "favicon"
  | "testimonial"
  | "gallery"
  | "other";

export interface ListedObject {
  key: string;
  url: string;
  size: number;
  lastModified: Date;
  kind: MediaKind;
}

/** Safety cap — each page holds up to 1000 objects. */
const MAX_PAGES = 50;

/**
 * Classify a storage key's media kind from the path suffix after the
 * `{businessId}/` prefix.
 *
 *   testimonials/…   → "testimonial"
 *   gallery-…        → "gallery"
 *   logo.…           → "logo"
 *   favicon.…        → "favicon"
 *   video-…          → "video"
 *   image-…          → "image"
 *   library-…        → "image" (Media Library bulk uploads)
 *   anything else    → "other"
 *
 * The image-ish kinds (testimonial / gallery / image) are only assigned to
 * files that really are displayable images. A stray font, PDF or other file
 * that happens to sit under one of those prefixes is "other", so the image
 * pickers (which filter on kind) never offer it as a broken thumbnail while
 * the Media Library page still lists it under "Other" with a download.
 */
export const DISPLAYABLE_IMAGE_EXTENSIONS: ReadonlySet<string> = new Set([
  ".jpg",
  ".jpeg",
  ".jfif",
  ".png",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
  ".bmp",
]);

/** True when the key's file extension is a browser-displayable image type. */
export function hasImageExtension(key: string): boolean {
  const name = key.split("/").pop() ?? key;
  const dot = name.lastIndexOf(".");
  if (dot < 0) return false;
  return DISPLAYABLE_IMAGE_EXTENSIONS.has(name.slice(dot).toLowerCase());
}

export function classifyKind(suffix: string): MediaKind {
  const isImageFile = hasImageExtension(suffix);
  if (suffix.startsWith("testimonials/"))
    return isImageFile ? "testimonial" : "other";
  if (suffix.startsWith("gallery-")) return isImageFile ? "gallery" : "other";
  if (suffix.startsWith("logo.")) return "logo";
  if (suffix.startsWith("favicon.")) return "favicon";
  if (suffix.startsWith("video-")) return "video";
  if (suffix.startsWith("image-")) return isImageFile ? "image" : "other";
  if (suffix.startsWith("library-")) return isImageFile ? "image" : "other";
  return "other";
}

/** Extract the text content of a simple XML element (first match). */
function extractXmlTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
  const m = re.exec(xml);
  return m?.[1]?.trim() ?? null;
}

/** Parse all `<Contents>…</Contents>` blocks out of an XML response. */
export function parseContents(xml: string): ListedObject[] {
  const objects: ListedObject[] = [];
  const contentsRe = /<Contents>([\s\S]*?)<\/Contents>/g;
  let match: RegExpExecArray | null;

  while ((match = contentsRe.exec(xml)) !== null) {
    const block = match[1];
    if (!block) continue;

    const key = extractXmlTag(block, "Key");
    const sizeStr = extractXmlTag(block, "Size");
    const lastModifiedStr = extractXmlTag(block, "LastModified");

    if (!key || !sizeStr || !lastModifiedStr) continue;

    // The prefix is `{businessId}/`; everything after the first slash is the suffix
    const slashIdx = key.indexOf("/");
    const suffix = slashIdx >= 0 ? key.slice(slashIdx + 1) : key;

    // Editor-note attachments are platform-support artifacts, not site media —
    // keep them out of the owner's Media Library and the store-transfer export.
    if (suffix.startsWith(EDITOR_NOTE_KEY_SEGMENT)) continue;

    objects.push({
      key,
      url: keyToPublicUrl(key),
      size: parseInt(sizeStr, 10),
      lastModified: new Date(lastModifiedStr),
      kind: classifyKind(suffix),
    });
  }

  return objects;
}

/**
 * List all S3 objects under `{businessId}/`, paginating as needed.
 *
 * Throws if the S3 API returns a non-OK status.
 */
export async function listBusinessObjects(
  businessId: string,
): Promise<ListedObject[]> {
  const bucketUrl = s3Client.buildBucketUrl(STORAGE_BUCKET);
  const prefix = encodeURIComponent(`${businessId}/`);
  const results: ListedObject[] = [];
  let continuationToken: string | null = null;
  let pages = 0;

  while (pages < MAX_PAGES) {
    pages++;

    let url = `${bucketUrl}?list-type=2&prefix=${prefix}`;
    if (continuationToken) {
      url += `&continuation-token=${encodeURIComponent(continuationToken)}`;
    }

    const res = await s3Client.s3.fetch(url, { method: "GET" });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `S3 ListObjectsV2 failed: HTTP ${res.status} for businessId "${businessId}" — ${body}`,
      );
    }

    const xml = await res.text();

    // Parse object entries for this page
    results.push(...parseContents(xml));

    // Check for truncation
    const isTruncated = extractXmlTag(xml, "IsTruncated");
    if (isTruncated?.toLowerCase() !== "true") break;

    const nextToken = extractXmlTag(xml, "NextContinuationToken");
    if (!nextToken) break; // shouldn't happen, but guard against infinite loop
    continuationToken = nextToken;
  }

  return results;
}
