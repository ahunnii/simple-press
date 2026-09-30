/**
 * Client-only image preparation for uploads.
 *
 * Phone cameras routinely produce huge JPEGs and HEIC/HEIF files that the
 * upload server rejects (HEIC/HEIF isn't in the accepted raster set — see
 * `ALLOWED_RASTER_IMAGE_EXTS` in `src/app/api/upload/route.ts`) or that blow
 * past the 5MB client-side size checks. `prepareImageForUpload` normalizes a
 * `File` before it ever reaches those checks: HEIC/HEIF is transcoded to a
 * web-safe format, and anything oversized or with a very large long edge is
 * downscaled and re-encoded to WebP (falling back to JPEG/PNG when needed).
 *
 * As a side effect of the decode → canvas → re-encode pipeline, this also
 * strips all EXIF metadata (including GPS location) from re-encoded images.
 * Orientation is preserved by decoding with `imageOrientation: "from-image"`
 * before the EXIF block is dropped.
 *
 * GIF and SVG files are always returned unchanged (GIF to preserve
 * animation; SVG is vector and canvas re-encoding would rasterize it).
 *
 * Must only be called in the browser — guarded by a `typeof window` check,
 * it returns the original file unchanged in any non-browser environment.
 */

const DEFAULT_MAX_EDGE = 2560;
const DEFAULT_QUALITY = 0.85;
const SKIP_REENCODE_MAX_BYTES = 1.5 * 1024 * 1024; // ~1.5MB

const REENCODE_SKIP_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export type PrepareImageOptions = {
  /** Longest edge (px) to downscale to when re-encoding. Default 2560. */
  maxEdge?: number;
  /** WebP/JPEG encode quality (0-1). Default 0.85. */
  quality?: number;
};

function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (
    type === "image/heic" ||
    type === "image/heif" ||
    type === "image/heic-sequence" ||
    type === "image/heif-sequence"
  ) {
    return true;
  }
  return /\.(heic|heif)$/i.test(file.name);
}

function isGifFile(file: File): boolean {
  return file.type === "image/gif" || /\.gif$/i.test(file.name);
}

function isSvgFile(file: File): boolean {
  return file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
}

function replaceExtension(name: string, newExt: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.${newExt}`;
}

type CanvasLike = {
  width: number;
  height: number;
  getContext(id: "2d"): {
    drawImage(
      image: ImageBitmap,
      dx: number,
      dy: number,
      dw: number,
      dh: number,
    ): void;
  } | null;
};

function createCanvas(width: number, height: number): CanvasLike {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function canvasToBlob(
  canvas: CanvasLike,
  type: string,
  quality: number,
): Promise<Blob | null> {
  if (
    typeof OffscreenCanvas !== "undefined" &&
    canvas instanceof OffscreenCanvas
  ) {
    return canvas.convertToBlob({ type, quality }).catch(() => null);
  }
  const htmlCanvas = canvas as HTMLCanvasElement;
  return new Promise((resolve) => {
    htmlCanvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/** Decodes `file` to a bitmap, converting HEIC/HEIF via heic2any first if the
 *  browser can't decode it natively. Returns null if decoding fails entirely. */
async function decodeToBitmap(file: File): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    if (isHeicFile(file)) {
      try {
        const heic2any = (await import("heic2any")).default;
        const converted = await heic2any({
          blob: file,
          toType: "image/jpeg",
        });
        const blob = Array.isArray(converted) ? converted[0] : converted;
        if (!blob) return null;
        return await createImageBitmap(blob, {
          imageOrientation: "from-image",
        });
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Prepares a phone-camera (or any) image `File` for upload: transcodes
 * HEIC/HEIF to a web-safe format and downscales/re-encodes large images to
 * WebP (falling back to JPEG/PNG). See module docs for full behavior,
 * including the EXIF/GPS stripping side effect. Safe to call unconditionally
 * before existing client-side type/size validation — it never throws, and
 * falls back to returning the original `file` whenever conversion isn't
 * possible or wouldn't help.
 */
export async function prepareImageForUpload(
  file: File,
  opts?: PrepareImageOptions,
): Promise<File> {
  if (typeof window === "undefined") return file;
  if (isGifFile(file) || isSvgFile(file)) return file;

  const maxEdge = opts?.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = opts?.quality ?? DEFAULT_QUALITY;
  const heic = isHeicFile(file);
  const alreadyAcceptedType = !heic && REENCODE_SKIP_TYPES.has(file.type);

  // Cheap, already-small, already-accepted files: only decode far enough to
  // check dimensions, and bail before ever touching a canvas.
  if (alreadyAcceptedType && file.size <= SKIP_REENCODE_MAX_BYTES) {
    const bitmap = await decodeToBitmap(file);
    if (!bitmap) return file;
    const longEdge = Math.max(bitmap.width, bitmap.height);
    if (longEdge <= maxEdge) {
      bitmap.close();
      return file;
    }
    return reencode(bitmap, file, maxEdge, quality, heic);
  }

  const bitmap = await decodeToBitmap(file);
  if (!bitmap) return file;
  return reencode(bitmap, file, maxEdge, quality, heic);
}

async function reencode(
  bitmap: ImageBitmap,
  file: File,
  maxEdge: number,
  quality: number,
  heic: boolean,
): Promise<File> {
  try {
    const { width, height } = bitmap;
    const longEdge = Math.max(width, height);
    const scale = longEdge > maxEdge ? maxEdge / longEdge : 1;
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = createCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    let blob = await canvasToBlob(canvas, "image/webp", quality);
    let outType = "image/webp";
    let outExt = "webp";

    // Older Safari silently ignores unsupported `type` (returns PNG) or the
    // canvas may fail to encode. Verify we actually got webp; else fall back.
    if (blob?.type !== "image/webp") {
      if (file.type === "image/png" && !heic) {
        // Keep PNG (preserves alpha) rather than filling white over jpeg.
        blob = await canvasToBlob(canvas, "image/png", quality);
        outType = "image/png";
        outExt = "png";
      } else {
        blob = await canvasToBlob(canvas, "image/jpeg", quality);
        outType = "image/jpeg";
        outExt = "jpg";
      }
    }

    if (!blob) return file;

    // If re-encoding made things worse, prefer the original when it's
    // already an accepted, reasonably-sized type.
    const alreadyAcceptedType = !heic && REENCODE_SKIP_TYPES.has(file.type);
    if (alreadyAcceptedType && blob.size >= file.size) {
      return file;
    }

    return new File([blob], replaceExtension(file.name, outExt), {
      type: outType,
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}
