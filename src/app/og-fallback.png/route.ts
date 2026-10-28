/**
 * `/og-fallback.png` — the share-card image for a store that has no
 * `og:image` of its own: a 1200×630 PNG with the store logo centred on it.
 *
 * Facebook, iMessage and LinkedIn don't render AVIF (or SVG) `og:image`s, and
 * most uploaded logos are exactly that, so `buildPageMetadata` and the root
 * layout point their logo fallback here instead of at the raw logo file. The
 * business comes from the Host header, like `/site-icon/<file>`; rendering,
 * LRU and ETag handling are shared with it (`~/lib/site-icons`). The URL carries
 * `?v=<hash of the logo URL>`, so a logo change busts scraper caches.
 *
 * 404 when the store has no (usable) logo or the logo can't be decoded.
 */

import { headers } from "next/headers";

import { businessHostFilter } from "~/lib/domain-utils";
import {
  etagFor,
  imageResponse,
  loadCachedImage,
  matchesIfNoneMatch,
  notModified,
} from "~/lib/site-icons/http";
import { fetchIconSource, renderOgFallbackCard } from "~/lib/site-icons/render";
import { resolveLogoSource } from "~/lib/site-icons/source";
import { db } from "~/server/db";

export const runtime = "nodejs";

async function storeLogoSource(): Promise<string | null> {
  try {
    const host = (await headers()).get("host") ?? "";
    const business = await db.business.findFirst({
      where: { ...businessHostFilter(host), status: "active" },
      select: { siteContent: { select: { logoUrl: true } } },
    });
    return resolveLogoSource(business?.siteContent);
  } catch (error) {
    console.warn("[og-fallback] business lookup failed", error);
    return null;
  }
}

export async function GET(req: Request) {
  const notFound = () =>
    new Response("Not found", {
      status: 404,
      // Short: the store may upload a logo later.
      headers: { "Cache-Control": "public, max-age=300" },
    });

  const source = await storeLogoSource();
  if (!source) return notFound();

  const key = `${source}|og-fallback`;
  const ifNoneMatch = req.headers.get("if-none-match");
  // The source URL is immutable content, so a matching ETag can answer
  // without fetching anything.
  const etag = etagFor(key);
  if (matchesIfNoneMatch(ifNoneMatch, etag)) return notModified(etag);

  const card = await loadCachedImage(
    key,
    "image/png",
    async () => renderOgFallbackCard(await fetchIconSource(source)),
    "[og-fallback]",
  );
  return card ? imageResponse(card, ifNoneMatch) : notFound();
}
