/**
 * Isomorphic embed utilities — safe to run on server and client.
 * No DOM APIs used.
 */

/** Sandbox attribute for all embedded iframes. */
export const EMBED_SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-popups";

/** Default iframe height in pixels when no height is specified. */
export const DEFAULT_EMBED_HEIGHT = 600;

/**
 * Validates that `src` is an absolute HTTPS URL.
 *
 * Returns the normalised `href` when valid, or `null` for http:, javascript:,
 * data:, relative URLs, and anything else that cannot be parsed.
 */
export function sanitizeEmbedSrc(src: string): string | null {
  try {
    const url = new URL(src);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Converts known video page URLs to their embeddable counterparts.
 *
 * Handles:
 * - `youtube.com/watch?v=ID` (any subdomain) → `https://www.youtube.com/embed/ID`
 * - `youtu.be/ID`            → `https://www.youtube.com/embed/ID`
 * - `youtube.com/shorts/ID`  → `https://www.youtube.com/embed/ID`
 * - `vimeo.com/123456`       → `https://player.vimeo.com/video/123456`
 *
 * Anything else — including URLs that are already embed URLs — is returned unchanged.
 */
export function normalizeVideoUrl(src: string): string {
  try {
    const url = new URL(src);
    const host = url.hostname;

    // YouTube: www.youtube.com, m.youtube.com, youtube.com, etc.
    const isYouTubeHost =
      host === "youtube.com" ||
      host.endsWith(".youtube.com") ||
      host === "youtu.be";

    if (isYouTubeHost) {
      // youtu.be/<ID>
      if (host === "youtu.be") {
        const videoId = url.pathname.slice(1);
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      }

      // youtube.com/watch?v=<ID>
      const watchId = url.searchParams.get("v");
      if (url.pathname === "/watch" && watchId) {
        return `https://www.youtube.com/embed/${watchId}`;
      }

      // youtube.com/shorts/<ID>
      const shortsMatch = /^\/shorts\/([^/?#]+)/.exec(url.pathname);
      if (shortsMatch?.[1]) {
        return `https://www.youtube.com/embed/${shortsMatch[1]}`;
      }
    }

    // Vimeo: vimeo.com/<numeric-id>
    if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
      const vimeoMatch = /^\/(\d+)$/.exec(url.pathname);
      if (vimeoMatch?.[1]) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
      }
    }

    return src;
  } catch {
    return src;
  }
}

/**
 * Returns `true` when `src` points to a known video embed host.
 *
 * Recognised hosts: `youtube.com`, `youtube-nocookie.com`, `youtu.be`,
 * `vimeo.com`, `player.vimeo.com` — and any subdomain of those.
 * Uses an exact-match-or-dot-suffix check to avoid false positives like
 * `evilyoutube.com`.
 */
export function isVideoEmbed(src: string): boolean {
  try {
    const host = new URL(src).hostname;
    const VIDEO_HOSTS = [
      "youtube.com",
      "youtube-nocookie.com",
      "youtu.be",
      "vimeo.com",
      "player.vimeo.com",
    ];
    return VIDEO_HOSTS.some(
      (h) => host === h || host.endsWith(`.${h}`),
    );
  } catch {
    return false;
  }
}

/** Parsed result from `parseEmbedInput`. */
export type ParsedEmbedInput = { src: string; width?: number; height?: number };

/**
 * Parses a raw embed input string — either a bare URL or an `<iframe>` snippet.
 *
 * - If the trimmed input contains `<iframe`, src/width/height are extracted via regex.
 * - Otherwise the whole string is treated as a URL.
 * - The extracted src is run through `normalizeVideoUrl` then `sanitizeEmbedSrc`.
 * - Returns `null` when the src is invalid or cannot be sanitized.
 * - `width` and `height` are only included when parsed as finite positive numbers.
 */
export function parseEmbedInput(input: string): ParsedEmbedInput | null {
  const trimmed = input.trim();

  let rawSrc: string;
  let width: number | undefined;
  let height: number | undefined;

  if (/<iframe/i.test(trimmed)) {
    // Extract src attribute
    const srcMatch = /<iframe[^>]*\ssrc=["']([^"']+)["']/i.exec(trimmed);
    if (!srcMatch?.[1]) return null;
    rawSrc = srcMatch[1];

    // Extract optional width
    const widthMatch = /<iframe[^>]*\swidth=["']?(\d+)/i.exec(trimmed);
    if (widthMatch?.[1]) {
      const w = Number(widthMatch[1]);
      if (Number.isFinite(w) && w > 0) width = w;
    }

    // Extract optional height
    const heightMatch = /<iframe[^>]*\sheight=["']?(\d+)/i.exec(trimmed);
    if (heightMatch?.[1]) {
      const h = Number(heightMatch[1]);
      if (Number.isFinite(h) && h > 0) height = h;
    }
  } else {
    rawSrc = trimmed;
  }

  const normalized = normalizeVideoUrl(rawSrc);
  const safeSrc = sanitizeEmbedSrc(normalized);
  if (!safeSrc) return null;

  const result: ParsedEmbedInput = { src: safeSrc };
  if (width !== undefined) result.width = width;
  if (height !== undefined) result.height = height;
  return result;
}
