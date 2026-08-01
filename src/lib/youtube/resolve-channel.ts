import "server-only";

import { parseChannelRef } from "./parse";

/**
 * Server-only, BEST-EFFORT resolution of a YouTube `@handle` to its
 * canonical `UC…` channel ID, by scraping the public channel page
 * (`youtube.com/@<handle>`). There is no official, documented API for this
 * lookup on the free/unauthenticated surface we use elsewhere in this
 * feature (the Atom feeds and oEmbed are both documented; this is not).
 *
 * Because the page's HTML/JSON structure is undocumented and can change
 * without notice, this function is deliberately tolerant: it tries two
 * independent extraction strategies and returns `null` — never throws — for
 * any failure (network error, non-OK response, page structure we don't
 * recognize, or an extracted value that doesn't look like a real channel
 * ID). A `null` result is an EXPECTED, routine outcome of best-effort
 * scraping (unlike `src/lib/youtube/feed.ts` / `oembed.ts`, which hit
 * documented, stable endpoints) — so, unlike those siblings, this module
 * does NOT report to Sentry. The caller is expected to show the owner a
 * fallback hint: "You can find your Channel ID in YouTube Studio → Settings
 * → Channel → Advanced settings."
 */

const REQUEST_TIMEOUT_MS = 10_000;

/** `<link rel="canonical" href="https://www.youtube.com/channel/UC…">` */
const CANONICAL_LINK_RE =
  /<link\s+rel="canonical"\s+href="https:\/\/www\.youtube\.com\/channel\/([^"]+)"/;

/** `"channelId":"UC…"` embedded in the page's inline JSON state. */
const INLINE_CHANNEL_ID_RE = /"channelId":"([^"]+)"/;

export async function resolveChannelHandle(
  handle: string,
): Promise<string | null> {
  const trimmed = handle.trim().replace(/^@/, "");
  if (!trimmed) return null;

  const url = `https://www.youtube.com/@${encodeURIComponent(trimmed)}`;

  let html: string;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        // A generic browser-like UA — some responses vary/degrade for
        // requests that look like bots.
        "User-Agent":
          "Mozilla/5.0 (compatible; SimplePress/1.0; +https://simplepress.co)",
      },
    });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  const candidate =
    CANONICAL_LINK_RE.exec(html)?.[1] ?? INLINE_CHANNEL_ID_RE.exec(html)?.[1];
  if (!candidate) return null;

  // Validate the scraped value against the real `UC…` shape before trusting
  // it — reuses parse.ts's channel-ID validator rather than re-deriving it.
  const ref = parseChannelRef(candidate);
  return ref?.kind === "channel" && ref.externalId === candidate
    ? candidate
    : null;
}
