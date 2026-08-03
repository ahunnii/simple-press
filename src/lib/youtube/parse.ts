/**
 * Isomorphic YouTube URL parsing utilities — safe to run on server and
 * client. No DOM APIs used.
 *
 * House style follows `src/lib/embed.ts`: every parser is pure and
 * non-throwing (`try/catch` around `new URL()`), returns `null` for invalid
 * input rather than throwing, and host matching is exact-match-or-dot-suffix
 * (never `.includes()` / bare `endsWith`) so lookalike hosts like
 * `evilyoutube.com` are rejected.
 *
 * The IDs extracted here get interpolated into outbound fetch URLs by the
 * sync/oembed/feed modules, so every extracted ID is shape-validated before
 * it's returned — a value that fails the shape check is treated the same as
 * unparseable input (`null`), never passed through as-is.
 */

const YOUTUBE_HOSTS = ["youtube.com", "youtube-nocookie.com", "youtu.be"];

/** Exact-match-or-dot-suffix host check — mirrors `isVideoEmbed` in embed.ts. */
function isYouTubeHost(host: string): boolean {
  return YOUTUBE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

/** 11 chars of `[A-Za-z0-9_-]` — the fixed shape of a YouTube video ID. */
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** `UC` + 22 chars of `[A-Za-z0-9_-]` (24 chars total) — a channel ID. */
const CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{22}$/;

/** At least 2 chars of `[A-Za-z0-9_-]` — a playlist (or uploads-playlist) ID. */
const PLAYLIST_ID_RE = /^[A-Za-z0-9_-]{2,}$/;

function tryParseUrl(input: string): URL | null {
  try {
    return new URL(input.trim());
  } catch {
    return null;
  }
}

/**
 * Decodes and lightly sanitizes a path segment captured as a channel handle
 * (`@handle`, legacy `/c/Name`, `/user/Name`). Returns `null` for anything
 * that decodes to empty, is implausibly long, or still contains a slash or
 * whitespace after decoding (i.e. path-traversal-shaped input).
 */
function sanitizeHandle(raw: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const trimmed = decoded.trim();
  if (!trimmed || trimmed.length > 100) return null;
  if (/[/\s]/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Extracts the 11-char video ID from a YouTube video URL.
 *
 * Accepts (any subdomain of the host, e.g. `www.`, `m.`):
 * - `youtube.com/watch?v=ID` (extra params like `?t=`, `&list=`, `si=` are ignored)
 * - `youtu.be/ID` (including `youtu.be/ID?t=30`)
 * - `youtube.com/shorts/ID`
 * - `youtube.com/embed/ID` and `youtube-nocookie.com/embed/ID`
 * - `youtube.com/live/ID`
 *
 * Returns `null` for anything else, including malformed IDs (wrong length or
 * illegal characters) and non-YouTube hosts — never throws.
 */
export function parseYouTubeVideoId(input: string): string | null {
  const url = tryParseUrl(input);
  if (!url) return null;

  const host = url.hostname;
  if (!isYouTubeHost(host)) return null;

  let candidate: string | null = null;

  if (host === "youtu.be" || host.endsWith(".youtu.be")) {
    const segment = url.pathname.slice(1).split("/")[0];
    candidate = segment ?? null;
  } else {
    const watchId = url.searchParams.get("v");
    if (url.pathname === "/watch" && watchId) {
      candidate = watchId;
    } else {
      const match = /^\/(?:shorts|embed|live)\/([^/?#]+)/.exec(url.pathname);
      candidate = match?.[1] ?? null;
    }
  }

  if (!candidate) return null;
  return VIDEO_ID_RE.test(candidate) ? candidate : null;
}

/**
 * Extracts the `list` query param from a playlist or watch URL.
 *
 * Accepts `youtube.com/playlist?list=PL…` and any YouTube watch/shorts URL
 * that carries a `list` param (e.g. `youtube.com/watch?v=ID&list=PL…`).
 * Returns `null` when there is no `list` param, the host isn't YouTube, or
 * the extracted value doesn't match the expected ID shape.
 */
export function parsePlaylistId(input: string): string | null {
  const url = tryParseUrl(input);
  if (!url) return null;

  const host = url.hostname;
  if (!isYouTubeHost(host)) return null;
  // youtu.be short links never carry a `list` param in practice, and
  // treating a stray `?list=` on that host as authoritative would be
  // surprising — restrict to the youtube.com / youtube-nocookie.com family.
  if (host === "youtu.be" || host.endsWith(".youtu.be")) return null;

  const list = url.searchParams.get("list");
  if (!list) return null;
  return PLAYLIST_ID_RE.test(list) ? list : null;
}

export type ChannelRef =
  | { kind: "channel"; externalId: string }
  | { kind: "handle"; handle: string };

/**
 * Extracts a channel reference from a YouTube channel URL, or from a bare
 * channel ID string.
 *
 * Accepts:
 * - `youtube.com/channel/UC…` → `{ kind: "channel", externalId }`
 * - `youtube.com/@SomeHandle` → `{ kind: "handle", handle }` (leading `@` stripped)
 * - legacy `youtube.com/c/Name` and `youtube.com/user/Name` → `{ kind: "handle", handle: "Name" }`
 * - a bare `UC…` string on its own → `{ kind: "channel", externalId }`
 *
 * Returns `null` for anything else.
 */
export function parseChannelRef(input: string): ChannelRef | null {
  const trimmed = input.trim();

  // Bare channel ID, e.g. "UCxxxxxxxxxxxxxxxxxxxxxxxx" (no URL wrapper).
  // Checked first: a valid channel ID only ever contains
  // `[A-Za-z0-9_-]`, so this can never accidentally match a URL string.
  if (CHANNEL_ID_RE.test(trimmed)) {
    return { kind: "channel", externalId: trimmed };
  }

  const url = tryParseUrl(trimmed);
  if (!url) return null;

  const host = url.hostname;
  if (!isYouTubeHost(host)) return null;

  const channelMatch = /^\/channel\/([^/?#]+)/.exec(url.pathname);
  if (channelMatch?.[1]) {
    return CHANNEL_ID_RE.test(channelMatch[1])
      ? { kind: "channel", externalId: channelMatch[1] }
      : null;
  }

  const handleMatch = /^\/@([^/?#]+)/.exec(url.pathname);
  if (handleMatch?.[1]) {
    const handle = sanitizeHandle(handleMatch[1]);
    return handle ? { kind: "handle", handle } : null;
  }

  const legacyMatch = /^\/(?:c|user)\/([^/?#]+)/.exec(url.pathname);
  if (legacyMatch?.[1]) {
    const handle = sanitizeHandle(legacyMatch[1]);
    return handle ? { kind: "handle", handle } : null;
  }

  return null;
}

export type SourceRef =
  | { kind: "channel" | "playlist"; externalId: string }
  | { kind: "handle"; handle: string };

/**
 * Convenience dispatcher for the admin "add a source" form: tries to parse
 * `input` as a playlist first, then as a channel reference (URL or bare
 * `UC…` ID). A bare `PL…`/`UU…` string on its own is treated as a playlist.
 *
 * Returns `null` when `input` doesn't match any known form.
 */
export function parseSourceInput(input: string): SourceRef | null {
  const trimmed = input.trim();

  const playlistFromUrl = parsePlaylistId(trimmed);
  if (playlistFromUrl) {
    return { kind: "playlist", externalId: playlistFromUrl };
  }

  // Bare playlist ID, e.g. "PLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" or an
  // "uploads" playlist ID "UUxxxxxxxxxxxxxxxxxxxxxx" (no URL wrapper).
  //
  // Deliberately limited to `PL` (a real, user-created playlist) and `UU` (a
  // channel's auto "uploads" playlist). Do NOT widen this to the other prefixes
  // YouTube uses — they all produce a source that can never sync:
  //   LL = Liked videos, FL = Favorites, WL = Watch Later — private to the
  //        account, so `feeds/videos.xml?playlist_id=…` returns nothing.
  //   RD = an auto-generated "mix"/radio, computed per viewer at request time.
  //        It has no stable membership and therefore no feed.
  // Accepting any of those would let an owner add a source that reports success,
  // then silently returns zero videos forever — much worse than rejecting the
  // input up front with "that doesn't look like a playlist we can follow".
  if (/^(?:PL|UU)/.test(trimmed) && PLAYLIST_ID_RE.test(trimmed)) {
    return { kind: "playlist", externalId: trimmed };
  }

  return parseChannelRef(trimmed);
}

/** Builds a canonical watch-page URL for a (already-validated) video ID. */
export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Builds a privacy-enhanced embed URL for a (already-validated) video ID,
 * using the `youtube-nocookie.com` domain.
 */
export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}
