import "server-only";

import * as Sentry from "@sentry/nextjs";
import { XMLParser } from "fast-xml-parser";

import {
  parseChannelRef,
  parseSourceInput,
  parseYouTubeVideoId,
  youtubeWatchUrl,
} from "./parse";

/**
 * Server-only client for YouTube's public Atom feeds
 * (`/feeds/videos.xml?channel_id=…` and `?playlist_id=…`) — no API key
 * required, but also no official support contract; this is a documented but
 * unofficial surface, so we're defensive about malformed/unexpected shapes.
 *
 * Mirrors `src/lib/umami/client.ts`: every exported wrapper is server-only,
 * fetches with `cache: "no-store"`, never throws to the caller, and reports
 * failures to Sentry (`service: "youtube"`) while returning a safe empty
 * default (`[]`) so a hung/broken feed can never take down the cron sync.
 *
 * `parseFeedXml` is exported separately (pure, no network) so tests can
 * exercise the parsing logic directly against captured fixtures.
 *
 * TRAP (verified against real captured feeds): `<yt:channelId>` appears at
 * BOTH the feed root and inside each `<entry>`, and they are NOT the same
 * string — the feed-root value has the `UC` prefix stripped
 * (`<yt:channelId>_x5XG1…</yt:channelId>` for channel `UC_x5XG1…`), while
 * the entry-level value is the full `UC…` ID. This parser never reads
 * `feed["yt:channelId"]` at all — it only descends into `feed.entry[]`, so
 * the stripped feed-root value can never leak into a `ParsedFeedEntry`.
 */

const REQUEST_TIMEOUT_MS = 10_000;

export type ParsedFeedEntry = {
  youtubeId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  channelTitle: string | null;
  publishedAt: Date;
};

// ─── XML parsing ───────────────────────────────────────────────────────────

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Keep every value a string — fast-xml-parser's numeric coercion would
  // otherwise mangle an all-digit title or ID.
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  // Always force <entry> into an array, even when the feed has exactly one
  // entry (fast-xml-parser otherwise returns a bare object for a single
  // occurrence), so downstream code has one shape to handle.
  isArray: (name) => name === "entry",
});

type RawMediaThumbnail = { "@_url"?: unknown };
type RawMediaGroup = {
  "media:description"?: unknown;
  "media:thumbnail"?: RawMediaThumbnail;
};
type RawAuthor = { name?: unknown };
type RawEntry = {
  "yt:videoId"?: unknown;
  title?: unknown;
  published?: unknown;
  author?: RawAuthor;
  "media:group"?: RawMediaGroup;
};
type RawFeed = { feed?: { entry?: RawEntry[] } };

/** Round-trips a candidate bare video ID through the existing URL validator
 * (build a watch URL, then re-parse it) instead of re-deriving the 11-char
 * shape regex here. Returns `null` for anything that doesn't come back out
 * looking like a real video ID. */
function validateVideoId(candidate: unknown): string | null {
  if (typeof candidate !== "string" || !candidate) return null;
  return parseYouTubeVideoId(youtubeWatchUrl(candidate));
}

function parseEntry(entry: RawEntry): ParsedFeedEntry | null {
  const youtubeId = validateVideoId(entry["yt:videoId"]);
  if (!youtubeId) return null;

  const publishedRaw = entry.published;
  if (typeof publishedRaw !== "string" || !publishedRaw) return null;
  const publishedAt = new Date(publishedRaw);
  if (Number.isNaN(publishedAt.getTime())) return null;

  const title = typeof entry.title === "string" ? entry.title : "";

  const mediaGroup = entry["media:group"];
  const description =
    typeof mediaGroup?.["media:description"] === "string"
      ? mediaGroup["media:description"]
      : null;
  const thumbnailUrl =
    typeof mediaGroup?.["media:thumbnail"]?.["@_url"] === "string"
      ? mediaGroup["media:thumbnail"]["@_url"]
      : null;

  const channelTitle =
    typeof entry.author?.name === "string" ? entry.author.name : null;

  return {
    youtubeId,
    title,
    description,
    thumbnailUrl,
    channelTitle,
    publishedAt,
  };
}

/**
 * Pure parser: XML string → validated entries. Never throws — malformed XML,
 * an empty string, or a well-formed feed with zero `<entry>` elements all
 * resolve to `[]`. A single malformed entry (missing `yt:videoId` or an
 * unparseable `published` date) is skipped without discarding its siblings.
 */
export function parseFeedXml(xml: string): ParsedFeedEntry[] {
  if (!xml?.trim()) return [];

  let parsed: RawFeed;
  try {
    parsed = xmlParser.parse(xml) as RawFeed;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { service: "youtube", endpoint: "feed-parse" },
    });
    return [];
  }

  const entries = parsed?.feed?.entry;
  if (!Array.isArray(entries)) return [];

  const results: ParsedFeedEntry[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const parsedEntry = parseEntry(entry);
    if (parsedEntry) results.push(parsedEntry);
  }
  return results;
}

// ─── Network fetch ──────────────────────────────────────────────────────────

async function fetchFeed(
  url: string,
  endpoint: "channel-feed" | "playlist-feed",
): Promise<ParsedFeedEntry[]> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      Sentry.captureMessage(`YouTube feed fetch failed: ${res.status}`, {
        level: "warning",
        tags: { service: "youtube", endpoint },
        extra: { url, status: res.status },
      });
      return [];
    }

    const xml = await res.text();
    return parseFeedXml(xml);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { service: "youtube", endpoint },
      extra: { url },
    });
    return [];
  }
}

/**
 * Fetches and parses a channel's public upload feed
 * (`/feeds/videos.xml?channel_id=…`).
 *
 * `channelId` is re-validated against the `UC…` shape (via `parseChannelRef`)
 * before it's interpolated into the request URL — never trust a caller-
 * supplied ID as pre-validated. Returns `[]` on invalid shape, non-OK
 * response, network failure, or a malformed/empty feed; every failure is
 * reported to Sentry.
 */
export async function fetchChannelFeed(
  channelId: string,
): Promise<ParsedFeedEntry[]> {
  const ref = parseChannelRef(channelId);
  if (ref?.kind !== "channel" || ref.externalId !== channelId) {
    Sentry.captureMessage(
      "fetchChannelFeed called with an invalid channel id shape",
      {
        level: "warning",
        tags: { service: "youtube", endpoint: "channel-feed" },
        extra: { channelId },
      },
    );
    return [];
  }

  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  return fetchFeed(url, "channel-feed");
}

/**
 * Fetches and parses a playlist's video feed
 * (`/feeds/videos.xml?playlist_id=…`).
 *
 * `playlistId` is re-validated (via `parseSourceInput`, restricted to `PL…`
 * user playlists and `UU…` channel-uploads playlists — the only prefixes
 * that back a stable, subscribable feed) before it's interpolated into the
 * request URL. Returns `[]` on invalid shape, non-OK response, network
 * failure, or a malformed/empty feed; every failure is reported to Sentry.
 */
export async function fetchPlaylistFeed(
  playlistId: string,
): Promise<ParsedFeedEntry[]> {
  const ref = parseSourceInput(playlistId);
  if (ref?.kind !== "playlist" || ref.externalId !== playlistId) {
    Sentry.captureMessage(
      "fetchPlaylistFeed called with an invalid playlist id shape",
      {
        level: "warning",
        tags: { service: "youtube", endpoint: "playlist-feed" },
        extra: { playlistId },
      },
    );
    return [];
  }

  const url = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistId)}`;
  return fetchFeed(url, "playlist-feed");
}
