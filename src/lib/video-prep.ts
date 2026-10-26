/**
 * Client-only checks and helpers for product gallery videos.
 *
 * Videos are uploaded as-is (no transcoding in the browser), so the checks
 * here exist to stop files that would upload fine but never play for
 * shoppers: wrong container, too big, HEVC (iPhone "High Efficiency", which
 * Chrome/Firefox can't reliably decode), or anything this browser can't
 * decode at all. `captureVideoPoster` grabs a still frame so the gallery has
 * something to show before playback.
 *
 * Must only be called in the browser. `detectHevc` is pure and safe anywhere.
 */

import { prepareImageForUpload } from "~/lib/image-prep";
import {
  MAX_PRODUCT_VIDEO_BYTES,
  PRODUCT_VIDEO_EXTS,
  PRODUCT_VIDEO_MIME_TYPES,
} from "~/lib/products/media";

const METADATA_TIMEOUT_MS = 10_000;
const POSTER_TIMEOUT_MS = 15_000;
const POSTER_MAX_EDGE = 1600;
const POSTER_QUALITY = 0.85;

export const PRODUCT_VIDEO_UNPLAYABLE_MESSAGE =
  "This video can't be played in this browser. Export it as MP4 (H.264).";

export const PRODUCT_VIDEO_HEVC_MESSAGE =
  "This video uses HEVC (iPhone 'High Efficiency') and won't play in Chrome or Firefox. Export it as MP4 (H.264), or set iPhone Settings → Camera → Formats → Most Compatible.";

export type ProductVideoCheck =
  | { ok: true; durationSec: number; width: number; height: number }
  | { ok: false; message: string };

const EXT_TO_MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

function fileExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

/** True when the file looks like a video the `productVideos` route accepts. */
export function isProductVideoFile(file: Pick<File, "name" | "type">): boolean {
  const type = file.type.toLowerCase();
  if ((PRODUCT_VIDEO_MIME_TYPES as readonly string[]).includes(type)) {
    return true;
  }
  // Some browsers leave `type` empty (or report e.g. video/x-m4v oddities);
  // fall back to the extension only when no type was given.
  return (
    type === "" &&
    (PRODUCT_VIDEO_EXTS as readonly string[]).includes(fileExt(file.name))
  );
}

/** True for any video-ish file (used to route a mixed drop: video vs photo). */
export function looksLikeVideoFile(file: Pick<File, "name" | "type">): boolean {
  return (
    file.type.startsWith("video/") ||
    /\.(mp4|mov|webm|m4v|avi|mkv|3gp|ogv)$/i.test(file.name)
  );
}

/**
 * The upload route checks MIME type, so a file whose browser-reported type is
 * empty (but whose extension is allowed) is re-wrapped with the right type.
 */
export function withProductVideoMimeType(file: File): File {
  if (file.type) return file;
  const mime = EXT_TO_MIME[fileExt(file.name)];
  if (!mime) return file;
  return new File([file], file.name, {
    type: mime,
    lastModified: file.lastModified,
  });
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset]! << 24) |
      (bytes[offset + 1]! << 16) |
      (bytes[offset + 2]! << 8) |
      bytes[offset + 3]!) >>>
    0
  );
}

function boxType(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset]!,
    bytes[offset + 1]!,
    bytes[offset + 2]!,
    bytes[offset + 3]!,
  );
}

function containsFourcc(
  bytes: Uint8Array,
  start: number,
  end: number,
  fourccs: readonly string[],
): boolean {
  const codes = fourccs.map((f) => [...f].map((c) => c.charCodeAt(0)));
  for (let i = start; i + 4 <= end; i++) {
    for (const code of codes) {
      if (
        bytes[i] === code[0] &&
        bytes[i + 1] === code[1] &&
        bytes[i + 2] === code[2] &&
        bytes[i + 3] === code[3]
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * True when an MP4/MOV (ISO BMFF) file declares an HEVC video track — a
 * `hvc1` or `hev1` sample entry. Only the `moov` box (track metadata) is
 * scanned: scanning the media data too would false-positive on compressed
 * bytes that happen to spell the fourcc. Non-BMFF input (e.g. WebM) → false.
 */
export function detectHevc(bytes: Uint8Array): boolean {
  const HEVC = ["hvc1", "hev1"] as const;
  let offset = 0;
  while (offset + 8 <= bytes.length) {
    let size = readUint32(bytes, offset);
    const type = boxType(bytes, offset + 4);
    let headerSize = 8;
    if (size === 1) {
      // 64-bit "largesize" follows the type.
      if (offset + 16 > bytes.length) return false;
      const high = readUint32(bytes, offset + 8);
      const low = readUint32(bytes, offset + 12);
      size = high * 2 ** 32 + low;
      headerSize = 16;
    } else if (size === 0) {
      // Box runs to the end of the file.
      size = bytes.length - offset;
    }
    if (size < headerSize || !/^[\x20-\x7e]{4}$/.test(type)) {
      // Not a box structure we understand — don't guess.
      return false;
    }
    const end = Math.min(bytes.length, offset + size);
    if (type === "moov") {
      return containsFourcc(bytes, offset + headerSize, end, HEVC);
    }
    offset += size;
  }
  return false;
}

/** Loads `src` into a detached `<video>` and resolves once metadata is in. */
function loadVideoMetadata(
  src: string,
  { crossOrigin, timeoutMs }: { crossOrigin: boolean; timeoutMs: number },
): Promise<HTMLVideoElement | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    if (crossOrigin) video.crossOrigin = "anonymous";

    let settled = false;
    const finish = (result: HTMLVideoElement | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
      if (!result) releaseVideo(video);
      resolve(result);
    };
    const onLoaded = () => finish(video);
    const onError = () => finish(null);
    const timer = window.setTimeout(() => finish(null), timeoutMs);

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("error", onError);
    video.src = src;
  });
}

function releaseVideo(video: HTMLVideoElement) {
  video.removeAttribute("src");
  try {
    video.load();
  } catch {
    // Already torn down.
  }
}

/**
 * Checks a picked video before it joins the gallery: type, size, HEVC, and
 * whether this browser can decode it at all. Never throws.
 */
export async function checkProductVideoFile(
  file: File,
): Promise<ProductVideoCheck> {
  if (!isProductVideoFile(file)) {
    return {
      ok: false,
      message: `"${file.name}" isn't a supported video. Use MP4, WebM or MOV.`,
    };
  }
  if (file.size > MAX_PRODUCT_VIDEO_BYTES) {
    return { ok: false, message: `"${file.name}" is over 50MB.` };
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (detectHevc(bytes)) {
      return { ok: false, message: PRODUCT_VIDEO_HEVC_MESSAGE };
    }
  } catch {
    // Couldn't read the bytes — let the decode probe below decide.
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const video = await loadVideoMetadata(objectUrl, {
      crossOrigin: false,
      timeoutMs: METADATA_TIMEOUT_MS,
    });
    // videoWidth 0 = audio decoded but the picture can't be.
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      if (video) releaseVideo(video);
      return { ok: false, message: PRODUCT_VIDEO_UNPLAYABLE_MESSAGE };
    }
    const result: ProductVideoCheck = {
      ok: true,
      durationSec: Number.isFinite(video.duration) ? video.duration : 0,
      width: video.videoWidth,
      height: video.videoHeight,
    };
    releaseVideo(video);
    return result;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    } catch {
      // Tainted canvas (cross-origin video without CORS) throws here.
      resolve(null);
    }
  });
}

function seekTo(video: HTMLVideoElement, time: number): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      resolve(ok);
    };
    const onSeeked = () => finish(true);
    const onError = () => finish(false);
    const timer = window.setTimeout(() => finish(false), POSTER_TIMEOUT_MS);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    video.currentTime = time;
  });
}

/**
 * Captures a still frame (≈0.5s in) as an image File for the video's poster.
 * `src` is a picked File or a stored video URL (loaded with CORS, so a bucket
 * without CORS headers taints the canvas → null). Returns null on any
 * failure; callers then leave the poster empty.
 */
export async function captureVideoPoster(
  src: File | string,
): Promise<File | null> {
  if (typeof window === "undefined") return null;
  const isUrl = typeof src === "string";
  const objectUrl = isUrl ? null : URL.createObjectURL(src);
  let video: HTMLVideoElement | null = null;
  try {
    video = await loadVideoMetadata(objectUrl ?? (src as string), {
      crossOrigin: isUrl,
      timeoutMs: POSTER_TIMEOUT_MS,
    });
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }
    // Metadata-only preload may not fetch frames; ask for data before seeking.
    video.preload = "auto";
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const target = duration > 0 ? Math.min(0.5, duration / 2) : 0.1;
    if (!(await seekTo(video, target))) return null;

    const scale = Math.min(
      1,
      POSTER_MAX_EDGE / Math.max(video.videoWidth, video.videoHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Safari can't encode WebP and silently hands back PNG; prefer JPEG there.
    let blob = await canvasToBlob(canvas, "image/webp", POSTER_QUALITY);
    let name = "poster.webp";
    if (blob?.type !== "image/webp") {
      blob = await canvasToBlob(canvas, "image/jpeg", POSTER_QUALITY);
      name = "poster.jpg";
    }
    if (!blob) return null;

    const file = new File([blob], name, { type: blob.type });
    return await prepareImageForUpload(file);
  } catch {
    return null;
  } finally {
    if (video) releaseVideo(video);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

/** "0:07", "1:23" — for the gallery duration chip. */
export function formatVideoDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
