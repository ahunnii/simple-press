/**
 * Per-store icons served from the store's own domain: `/site-icon/favicon.ico`,
 * sized PNGs, the apple-touch tile and the maskable manifest icon. Generated
 * on demand from the store's favicon (else logo) with sharp, then held in an
 * in-memory LRU. next.config rewrites the root `/favicon.ico` and
 * `/apple-touch-icon.png` here.
 *
 * Never 500s: no business, no usable source, or a fetch/decode failure falls
 * back to SimplePress — the static `.ico`, or PNGs rendered from
 * `public/simplepress-icon.png` (only 48px today; drop a 512px+ square in at
 * the same path and every fallback size sharpens, ETags included).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";

import type { CachedIcon } from "~/lib/site-icons/cache";
import type { IconVariantName } from "~/lib/site-icons/variants";
import { businessHostFilter } from "~/lib/domain-utils";
import {
  getCachedIcon,
  markIconFailed,
  setCachedIcon,
} from "~/lib/site-icons/cache";
import { fetchIconSource, renderIconVariant } from "~/lib/site-icons/render";
import { fnv1a, resolveIconSources } from "~/lib/site-icons/source";
import { ICON_VARIANTS, isIconVariantName } from "~/lib/site-icons/variants";
import { db } from "~/server/db";

export const runtime = "nodejs";

const CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800";
const PLATFORM_ICO_PATH = "/simplepress-favicon.ico";

// Keyed by content hash so a replaced file busts browser ETags on deploy.
let platformIcon: Promise<{ source: string; body: Buffer }> | null = null;
function readPlatformIcon() {
  platformIcon ??= readFile(
    path.join(process.cwd(), "public", "simplepress-icon.png"),
  ).then(
    (body) => ({ source: `platform:${fnv1a(body.toString("base64"))}`, body }),
    (error: unknown) => {
      platformIcon = null;
      throw error;
    },
  );
  return platformIcon;
}

function etagFor(cacheKey: string) {
  return `"${fnv1a(cacheKey)}"`;
}

function matchesIfNoneMatch(header: string | null, etag: string) {
  if (!header) return false;
  return header
    .split(",")
    .some((tag) => tag.trim().replace(/^W\//, "") === etag);
}

async function loadIcon(
  source: string,
  name: IconVariantName,
  load: () => Promise<Buffer>,
): Promise<CachedIcon | null> {
  const key = `${source}|${name}`;
  const cached = getCachedIcon(key);
  if (cached === "failed") return null;
  if (cached) return cached;

  try {
    const icon: CachedIcon = {
      body: await renderIconVariant(await load(), name),
      contentType: ICON_VARIANTS[name].contentType,
      etag: etagFor(key),
    };
    setCachedIcon(key, icon);
    return icon;
  } catch (error) {
    console.warn(`[site-icon] could not render ${name} from ${source}`, error);
    markIconFailed(key);
    return null;
  }
}

function iconResponse(icon: CachedIcon, ifNoneMatch: string | null) {
  const headers = { "Cache-Control": CACHE_CONTROL, ETag: icon.etag };
  if (matchesIfNoneMatch(ifNoneMatch, icon.etag)) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(new Uint8Array(icon.body), {
    headers: { ...headers, "Content-Type": icon.contentType },
  });
}

function notModified(etag: string) {
  return new Response(null, {
    status: 304,
    headers: { "Cache-Control": CACHE_CONTROL, ETag: etag },
  });
}

async function storeIconSources(): Promise<string[]> {
  try {
    const host = (await headers()).get("host") ?? "";
    const business = await db.business.findFirst({
      where: { ...businessHostFilter(host), status: "active" },
      select: { siteContent: { select: { faviconUrl: true, logoUrl: true } } },
    });
    return resolveIconSources(business?.siteContent);
  } catch (error) {
    console.warn("[site-icon] business lookup failed", error);
    return [];
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  if (!isIconVariantName(file)) {
    return new Response("Not found", { status: 404 });
  }
  const ifNoneMatch = req.headers.get("if-none-match");

  for (const source of await storeIconSources()) {
    // The source URL is immutable content, so a matching ETag can answer
    // without fetching anything.
    const etag = etagFor(`${source}|${file}`);
    if (matchesIfNoneMatch(ifNoneMatch, etag)) return notModified(etag);

    const icon = await loadIcon(source, file, () => fetchIconSource(source));
    if (icon) return iconResponse(icon, ifNoneMatch);
  }

  if (file === "favicon.ico") {
    // Short cache: the store may add a favicon or logo later.
    return new Response(null, {
      status: 302,
      headers: {
        Location: PLATFORM_ICO_PATH,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  try {
    const platform = await readPlatformIcon();
    const icon = await loadIcon(
      platform.source,
      file,
      async () => platform.body,
    );
    if (icon) return iconResponse(icon, ifNoneMatch);
  } catch (error) {
    console.warn("[site-icon] could not read the SimplePress icon", error);
  }
  return new Response(null, {
    status: 302,
    headers: { Location: PLATFORM_ICO_PATH },
  });
}
