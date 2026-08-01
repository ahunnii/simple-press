import "server-only";

import * as Sentry from "@sentry/nextjs";

import { youtubeWatchUrl } from "./parse";

/**
 * Server-only client for YouTube's public oEmbed endpoint. Used to fetch
 * lightweight metadata (title, author, thumbnail) for a single video when an
 * owner pastes a link — no API key required.
 *
 * Mirrors `src/lib/umami/client.ts` / `src/lib/youtube/feed.ts`: server-only,
 * `cache: "no-store"`, ~10s request timeout, never throws to the caller.
 */

const REQUEST_TIMEOUT_MS = 10_000;

export type VideoOembed = {
  title: string;
  authorName: string | null;
  thumbnailUrl: string | null;
};

type RawOembedResponse = {
  title?: unknown;
  author_name?: unknown;
  thumbnail_url?: unknown;
};

/**
 * Fetches oEmbed metadata for a video ID.
 *
 * Returns `null` on a 404 — that's the EXPECTED outcome when an owner pastes
 * a link to a private, deleted, or otherwise nonexistent video, so it is
 * intentionally NOT reported to Sentry (same policy as tRPC's expected 4xx
 * codes and the checkout route's expected 400s — see CLAUDE.md's Sentry
 * table). Any other non-OK status or network/parse failure IS reported and
 * also resolves to `null`.
 */
export async function fetchVideoOembed(
  videoId: string,
): Promise<VideoOembed | null> {
  const watchUrl = youtubeWatchUrl(videoId);
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (res.status === 404) {
      // Expected: private/deleted/nonexistent video. Not a bug.
      return null;
    }

    if (!res.ok) {
      Sentry.captureMessage(`YouTube oEmbed fetch failed: ${res.status}`, {
        level: "warning",
        tags: { service: "youtube", endpoint: "oembed" },
        extra: { url, status: res.status, videoId },
      });
      return null;
    }

    const data = (await res.json()) as RawOembedResponse;

    const title = typeof data.title === "string" ? data.title : "";
    const authorName =
      typeof data.author_name === "string" ? data.author_name : null;
    const thumbnailUrl =
      typeof data.thumbnail_url === "string" ? data.thumbnail_url : null;

    return { title, authorName, thumbnailUrl };
  } catch (err) {
    Sentry.captureException(err, {
      tags: { service: "youtube", endpoint: "oembed" },
      extra: { videoId },
    });
    return null;
  }
}
