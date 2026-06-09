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
