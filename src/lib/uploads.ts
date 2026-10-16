/**
 * Per-route `maxFiles` caps for the `images` router at `src/app/api/upload/route.ts`.
 *
 * Single source of truth shared by the server route (which enforces the real
 * limit) and any client-side batching logic (e.g. `useDeferredImageUpload`,
 * which must never send a batch larger than what the server route accepts).
 * If you add a new multi-file route to the server router, add its `maxFiles`
 * here too — a missing/stale entry would let a client silently batch above
 * the server's real cap and have uploads rejected mid-batch.
 */
export const ROUTE_MAX_FILES: Record<string, number> = {
  images: 10,
  galleryImages: 10,
  libraryImages: 10,
  libraryDocuments: 5,
  testimonials: 5,
  editorNoteImages: 3,
};

/**
 * Max images an owner can upload in a single drop on the Media Library page.
 * Larger drops are split into batches of `ROUTE_MAX_FILES.libraryImages`.
 */
export const MEDIA_LIBRARY_UPLOAD_MAX = 50;

/**
 * Max size of one Media Library PDF. Keep in sync with the `libraryDocuments`
 * route's `maxFileSize` in `src/app/api/upload/route.ts`.
 */
export const MAX_DOCUMENT_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_DOCUMENT_UPLOAD_LABEL = "20MB";

/** True for a PDF by MIME type or (when the browser reports none) extension. */
export function isPdfFile(file: Pick<File, "name" | "type">): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export function getStoredPath(file: {
  objectInfo?: {
    key?: string;
    path?: string;
    metadata?: { pathname?: string; pathName?: string };
  };
}): string {
  const meta = file.objectInfo?.metadata as Record<string, string> | undefined;
  return meta?.pathname ?? meta?.pathName ?? "";
}

/**
 * Resolve the natural pixel dimensions of an image at `url`.
 *
 * Best-effort: uses a DOM Image element, resolves `{}` on any error so callers
 * never have to guard against rejection. Safe to call with object URLs.
 */
export function getImageDimensions(
  url: string,
): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({});
    img.src = url;
  });
}
