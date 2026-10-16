/**
 * Pure PDF helpers for the Media Library document route.
 *
 * Key shape: `{biz}/library-doc-{hex}.pdf` or, when the original file name
 * yields a slug, `{biz}/library-doc-{hex}-{slug}.pdf` — both are valid
 * everywhere (older uploads and content-addressed re-hosts have no slug).
 *
 * Kept out of `src/app/api/upload/route.ts` (a Next route file may only export
 * HTTP handlers) so the checks are unit-testable and shared with
 * `media.verifyDocument`.
 */

/** Key segment every Media Library PDF carries: `{biz}/library-doc-{hex}.pdf`. */
export const LIBRARY_DOC_PREFIX = "library-doc-";

/** Longest slug kept from the original file name. */
const MAX_SLUG_LENGTH = 60;

/**
 * URL-safe slug of a file name, without its extension: lowercase ASCII (accents
 * stripped via NFKD), runs of anything but `[a-z0-9]` become `-`, dashes
 * trimmed, capped at 60 characters. "" when nothing usable is left.
 */
export function libraryDocumentSlug(fileName: string): string {
  const base = fileName.replace(/\.[^./\\]*$/, "");
  return base
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, "");
}

/**
 * Storage key for a new Media Library PDF:
 * `{biz}/library-doc-{16hex}[-{slug}].pdf`. `hex` is injectable for tests;
 * by default it's 8 random bytes.
 */
export function libraryDocumentKey(
  businessId: string,
  fileName: string,
  hex: string = randomHex16(),
): string {
  const slug = libraryDocumentSlug(fileName);
  return `${businessId}/${LIBRARY_DOC_PREFIX}${hex}${slug ? `-${slug}` : ""}.pdf`;
}

function randomHex16(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The slug part of a `library-doc-{hex}-{slug}.pdf` key, or "" when absent. */
export function documentSlugFromKey(key: string): string {
  const name = key.split("/").pop() ?? key;
  const m = /^library-doc-[0-9a-f]+(?:-(.+))?\.pdf$/i.exec(name);
  return m?.[1] ?? "";
}

/**
 * Owner-facing name for a Media Library PDF:
 * `library-doc-{hex}-annual-report-2025.pdf` → "annual-report-2025.pdf";
 * "Document.pdf" when the key has no slug. Any other key shape returns its
 * plain file name.
 */
export function documentDisplayName(key: string): string {
  const name = key.split("/").pop() ?? key;
  if (!/^library-doc-[0-9a-f]+(?:-.+)?\.pdf$/i.test(name)) return name;
  const slug = documentSlugFromKey(name);
  return slug ? `${slug}.pdf` : "Document.pdf";
}

/**
 * Default link text / menu label for a picked PDF. A name from the key is a
 * slug ("annual-report-2025.pdf" → "Annual report 2025"); a name the owner
 * just uploaded is kept as typed, minus the extension.
 */
export function documentLinkText(name: string): string {
  const base = name.replace(/\.pdf$/i, "").trim();
  if (!/^[a-z0-9-]+$/.test(base)) return base || "Document";
  const words = base.replace(/-+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Document";
}

/** `".pdf"` when `filename` ends in it (any case), otherwise `null`. */
export function pdfExtOrNull(filename: string): ".pdf" | null {
  return filename.toLowerCase().endsWith(".pdf") ? ".pdf" : null;
}

/** True when `key` (`{biz}/…`) is shaped like an uploaded Media Library PDF. */
export function isLibraryDocumentKey(key: string): boolean {
  const slashIdx = key.indexOf("/");
  if (slashIdx < 0) return false;
  const suffix = key.slice(slashIdx + 1);
  return (
    suffix.startsWith(LIBRARY_DOC_PREFIX) &&
    suffix.toLowerCase().endsWith(".pdf")
  );
}

/** True when the first bytes are the `%PDF-` file signature. */
export function hasPdfSignature(bytes: Uint8Array): boolean {
  const magic = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
  return bytes.length >= magic.length && magic.every((b, i) => bytes[i] === b);
}
