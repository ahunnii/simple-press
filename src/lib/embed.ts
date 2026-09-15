/**
 * Isomorphic embed utilities — safe to run on server and client.
 * No DOM APIs used.
 */

// ---------------------------------------------------------------------------
// Embed sizing / display types
// ---------------------------------------------------------------------------

/** Named aspect-ratio presets for iframe embeds. */
export type EmbedAspectRatio = "16:9" | "4:3" | "1:1" | "9:16" | "fit";

/** Named max-width presets for iframe embed containers. */
export type EmbedWidth = "full" | "large" | "medium" | "small";

/** Display mode for iframe embeds. */
export type EmbedDisplayMode = "inline" | "dialog";

/** Ordered options for aspect-ratio selects. */
export const EMBED_ASPECT_RATIOS: ReadonlyArray<{
  value: EmbedAspectRatio;
  label: string;
}> = [
  { value: "16:9", label: "Video (16:9)" },
  { value: "4:3", label: "Classic (4:3)" },
  { value: "1:1", label: "Square (1:1)" },
  { value: "9:16", label: "Vertical (9:16)" },
  { value: "fit", label: "Fit content (set height)" },
] as const;

/** Ordered options for max-width selects, with Tailwind className. */
export const EMBED_WIDTH_PRESETS: ReadonlyArray<{
  value: EmbedWidth;
  label: string;
  className: string;
}> = [
  { value: "full", label: "Full width", className: "" },
  { value: "large", label: "Large", className: "max-w-4xl" },
  { value: "medium", label: "Medium", className: "max-w-2xl" },
  { value: "small", label: "Small", className: "max-w-md" },
] as const;

/**
 * Converts a named aspect-ratio preset to a CSS `aspect-ratio` value string.
 *
 * Returns `null` for `"fit"`, `undefined`, or any unrecognised value — the
 * caller should fall back to a fixed pixel height.
 */
export function aspectRatioToCss(value?: string): string | null {
  switch (value) {
    case "16:9":
      return "16 / 9";
    case "4:3":
      return "4 / 3";
    case "1:1":
      return "1 / 1";
    case "9:16":
      return "9 / 16";
    default:
      return null;
  }
}

/**
 * Returns the Tailwind `max-w-*` class for the given width preset.
 * Returns `""` for `"full"`, `undefined`, or unrecognised values.
 */
export function embedWidthClass(value?: string): string {
  switch (value) {
    case "large":
      return "max-w-4xl";
    case "medium":
      return "max-w-2xl";
    case "small":
      return "max-w-md";
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Coerce helpers — validate and narrow unknown values to the named unions.
// These are intentionally non-throwing: return undefined for invalid input.
// ---------------------------------------------------------------------------

/** Returns a valid `EmbedAspectRatio` or `undefined`. */
export function coerceEmbedAspectRatio(
  v: unknown,
): EmbedAspectRatio | undefined {
  if (
    v === "16:9" ||
    v === "4:3" ||
    v === "1:1" ||
    v === "9:16" ||
    v === "fit"
  ) {
    return v;
  }
  return undefined;
}

/** Returns a valid `EmbedWidth` or `undefined`. */
export function coerceEmbedWidth(v: unknown): EmbedWidth | undefined {
  if (v === "full" || v === "large" || v === "medium" || v === "small") {
    return v;
  }
  return undefined;
}

/** Returns a valid `EmbedDisplayMode` or `undefined`. */
export function coerceEmbedDisplayMode(
  v: unknown,
): EmbedDisplayMode | undefined {
  if (v === "inline" || v === "dialog") {
    return v;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Original exports (unchanged below)
// ---------------------------------------------------------------------------

/**
 * Sandbox attribute for all embedded iframes (owner-supplied, arbitrary
 * third-party HTTPS URLs — video players, maps, booking widgets, forms, etc.
 * via EmbedFrame / the `iframe` template field type).
 *
 * SECURITY NOTE:
 * `allow-scripts` + `allow-same-origin` together are a well-known sandbox
 * weakening: if the framed document's origin is the SAME as the origin it's
 * embedded on, `allow-same-origin` stops the browser from forcing that frame
 * into a unique opaque origin, so the "sandbox" no longer isolates it from
 * that origin's cookies/localStorage/sessionStorage. Concretely here, that
 * would matter if an owner points an embed at a URL on their own subdomain
 * (or the platform domain) rather than a genuine third-party site.
 *
 * We keep both flags anyway because dropping `allow-same-origin` breaks a
 * large share of real-world embeds this feature exists to support — Google
 * Maps, Calendly, Typeform, booking widgets like Vagaro, and other
 * third-party tools commonly read their own cookies/localStorage (auth,
 * CSRF tokens, saved form state, booking session) and simply render blank or
 * fail to load without it.
 *
 * The same-origin gap is closed at validation time instead of by removing
 * `allow-same-origin`: `sanitizeEmbedSrc` rejects the platform domain and any
 * of its subdomains (`isPlatformHost`, checked against
 * `NEXT_PUBLIC_PLATFORM_DOMAIN` by default), `localhost`/`127.0.0.1`/`[::1]`
 * and `*.localhost` unconditionally, and any caller-supplied `blockedHosts`
 * (used by `EmbedFrame` at render time to also reject the *current* page's
 * own hostname, which covers custom domains the isomorphic platform-domain
 * check can't know about). Combined with the existing absolute-HTTPS-only
 * check, an embed src can never share an origin with the page that renders
 * it.
 */
export const EMBED_SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-popups";

/** Default iframe height in pixels when no height is specified. */
export const DEFAULT_EMBED_HEIGHT = 600;

/**
 * Returns `true` when `hostname` is the platform's own domain or a subdomain
 * of it (e.g. a tenant's `<shop>.<platform>` subdomain, or a deeper
 * subdomain of that).
 *
 * `hostname` is lowercased and a single trailing dot is stripped before
 * comparing. `platformDomain` defaults to `NEXT_PUBLIC_PLATFORM_DOMAIN`
 * (also trimmed + lowercased); when it can't be resolved to a non-empty
 * value this returns `false` rather than throwing. Uses the same
 * exact-match-or-dot-suffix technique as `isVideoEmbed` to avoid false
 * positives like `evilplatform.com` matching `platform.com`.
 */
export function isPlatformHost(
  hostname: string,
  platformDomain?: string,
): boolean {
  const domain = (platformDomain ?? process.env.NEXT_PUBLIC_PLATFORM_DOMAIN)
    ?.trim()
    .toLowerCase();
  if (!domain) return false;

  const host = hostname.toLowerCase().replace(/\.$/, "");
  return host === domain || host.endsWith(`.${domain}`);
}

/**
 * Validates that `src` is an absolute HTTPS URL that does not point back at
 * the embedding platform itself.
 *
 * Returns the normalised `href` when valid, or `null` for http:, javascript:,
 * data:, relative URLs, anything else that cannot be parsed, the platform
 * domain / any of its subdomains (see `isPlatformHost`), `localhost` /
 * `127.0.0.1` / `[::1]` / any `*.localhost` host, or a host listed in
 * `opts.blockedHosts` (exact match, case-insensitive — e.g. the current
 * page's own hostname, for a runtime same-origin check custom domains need
 * that this isomorphic function alone can't perform).
 */
export function sanitizeEmbedSrc(
  src: string,
  opts?: { blockedHosts?: readonly string[]; platformDomain?: string },
): string | null {
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return null;

    const host = url.hostname.toLowerCase();

    if (isPlatformHost(host, opts?.platformDomain)) return null;

    if (host === "localhost" || host.endsWith(".localhost")) return null;
    if (host === "127.0.0.1" || host === "[::1]" || host === "::1") {
      return null;
    }

    const blockedHosts = opts?.blockedHosts;
    if (blockedHosts?.some((blocked) => blocked.toLowerCase() === host)) {
      return null;
    }

    return url.href;
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
    return VIDEO_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/**
 * Validates and canonicalises an Instagram URL for use as an embed permalink.
 *
 * Accepts any URL whose hostname is exactly `instagram.com`,
 * `www.instagram.com`, or any `*.instagram.com` subdomain (e.g.
 * `m.instagram.com`). Uses the same exact-match-or-dot-suffix check as
 * `isVideoEmbed` to avoid accepting `evilinstagram.com`.
 *
 * The returned URL is normalised:
 * - Protocol forced to `https:`
 * - Hostname normalised to `www.instagram.com`
 * - Query string and fragment stripped (removes tracking params such as
 *   `utm_source`, etc.)
 * - Pathname preserved exactly; a single trailing slash is appended if the
 *   last path segment has no file extension (i.e. looks like a resource
 *   path, not a file download).
 *
 * Returns the clean canonical URL string, or `null` when the input cannot be
 * parsed, uses a non-HTTPS protocol, or is not an Instagram domain.
 */
export function sanitizeInstagramUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());

    if (url.protocol !== "https:") return null;

    const host = url.hostname;
    const isInstagram =
      host === "instagram.com" || host.endsWith(".instagram.com");
    if (!isInstagram) return null;

    // Ensure a trailing slash when the pathname has no file extension.
    const { pathname } = url;
    const lastSegment = pathname.split("/").pop() ?? "";
    const normalizedPath =
      lastSegment.includes(".") || pathname.endsWith("/")
        ? pathname
        : `${pathname}/`;

    return `https://www.instagram.com${normalizedPath}`;
  } catch {
    return null;
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
 * - `opts` is forwarded to `sanitizeEmbedSrc` unchanged (e.g. to pass an
 *   explicit `platformDomain` in tests, or `blockedHosts`).
 */
export function parseEmbedInput(
  input: string,
  opts?: { blockedHosts?: readonly string[]; platformDomain?: string },
): ParsedEmbedInput | null {
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
  const safeSrc = sanitizeEmbedSrc(normalized, opts);
  if (!safeSrc) return null;

  const result: ParsedEmbedInput = { src: safeSrc };
  if (width !== undefined) result.width = width;
  if (height !== undefined) result.height = height;
  return result;
}
