/**
 * "Download your site" export — shared contracts.
 *
 * Every builder under `src/lib/site-export/` returns `SiteExportFile[]` (or a
 * richer result that contains them) and never touches HTTP, `next/headers`, or
 * `checkBusiness` — the route handler owns auth and ZIP assembly, and the
 * orchestrator (`build.ts`) owns ordering.
 *
 * Zip paths are human-facing folder names (spaces allowed), always using "/"
 * separators and never starting with "/".
 */

export interface SiteExportFile {
  /** Path inside the ZIP, e.g. "Photos/Products/Blue Mug/01.jpg". */
  path: string;
  contents: string | Uint8Array;
  /**
   * false = store uncompressed (photos/videos are already compressed).
   * Defaults to true (DEFLATE).
   */
  compress?: boolean;
}

export interface SiteExportNote {
  level: "info" | "warn";
  message: string;
}

/** Top-level folder names — single source of truth for cross-links. */
export const SITE_EXPORT_DIRS = {
  guides: "Guides",
  pages: "Pages",
  blog: "Blog",
  products: "Products",
  services: "Services",
  events: "Events",
  galleries: "Galleries",
  photos: "Photos",
  spreadsheets: "Spreadsheets",
  importFiles: "Import files",
  developers: "For developers",
  licenses: "Licenses",
} as const;

export const START_HERE_PATH = "START HERE.html";
export const SITE_DETAILS_PATH = "Site details.html";

/**
 * Photo/video index produced by `media.ts`.
 *
 * `byUrl` is keyed by every form a stored file can be referenced by in the
 * database (public URL and bare S3 key) and maps to its zip path. Readable
 * documents use it to swap remote image URLs for local relative paths.
 */
export interface MediaIndex {
  byUrl: Map<string, string>;
  /** The photo/video files themselves (compress: false). */
  files: SiteExportFile[];
  stats: {
    /** Objects listed under `{businessId}/` (after editor-note exclusion). */
    listed: number;
    /** Stored objects successfully downloaded into the zip. */
    included: number;
    /** Stored objects that failed to download (key). */
    missing: string[];
    /** Images referenced by content but not in storage, fetched best-effort. */
    external: Array<{ url: string; zipPath: string | null }>;
  };
}

/**
 * Basic store facts every builder may need. Loaded once by the orchestrator.
 */
export interface SiteExportBusiness {
  id: string;
  name: string;
  slug: string;
  templateId: string;
  /** Canonical public URL of the live site, no trailing slash. */
  siteUrl: string;
  supportEmail: string | null;
  customDomain: string | null;
  exportedAt: Date;
}

/**
 * Turn an absolute zip path into a path relative to the document that links
 * to it. Both arguments are zip paths ("Products/blue-mug.html",
 * "Photos/Products/Blue Mug/01.jpg"). Each segment is URI-encoded so spaces
 * and "&" survive in href/src attributes.
 */
export function relativeZipPath(fromDocPath: string, toZipPath: string): string {
  const fromParts = fromDocPath.split("/").slice(0, -1);
  const toParts = toZipPath.split("/");
  let common = 0;
  while (
    common < fromParts.length &&
    common < toParts.length - 1 &&
    fromParts[common] === toParts[common]
  ) {
    common++;
  }
  const ups = fromParts.length - common;
  const rest = toParts.slice(common);
  return [...Array<string>(ups).fill(".."), ...rest]
    .map((seg) => (seg === ".." ? seg : encodeURIComponent(seg)))
    .join("/");
}

/**
 * Resolve a content image URL for use inside a readable document. Returns a
 * relative path when the file is in the export, otherwise the original URL
 * (so external images still render while online).
 */
export function resolveMediaHref(
  media: Pick<MediaIndex, "byUrl">,
  fromDocPath: string,
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  const zipPath = media.byUrl.get(url) ?? media.byUrl.get(stripQuery(url));
  return zipPath ? relativeZipPath(fromDocPath, zipPath) : url;
}

function stripQuery(url: string): string {
  const q = url.search(/[?#]/);
  return q === -1 ? url : url.slice(0, q);
}

/** Filesystem-safe, human-readable name segment ("Blue Mug / 12oz" → "Blue Mug - 12oz"). */
export function safeName(name: string, fallback = "Untitled"): string {
  const cleaned = name
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " - ")
    .replace(/\s+/g, " ")
    .replace(/^[\s.-]+|[\s.-]+$/g, "")
    .slice(0, 80)
    .trim();
  return cleaned || fallback;
}

/** Make names unique within a folder: "Blue Mug", "Blue Mug (2)", … */
export function createNameDeduper(): (name: string) => string {
  const seen = new Map<string, number>();
  return (name: string) => {
    const key = name.toLowerCase();
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return n === 1 ? name : `${name} (${n})`;
  };
}
