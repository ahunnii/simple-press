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
  testimonials: 5,
};

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
