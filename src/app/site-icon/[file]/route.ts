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
  etagFor,
  imageResponse,
  loadCachedImage,
  matchesIfNoneMatch,
  notModified,
} from "~/lib/site-icons/http";
import { fetchIconSource, renderIconVariant } from "~/lib/site-icons/render";
import { fnv1a, resolveIconSources } from "~/lib/site-icons/source";
import { ICON_VARIANTS, isIconVariantName } from "~/lib/site-icons/variants";
import { db } from "~/server/db";

export const runtime = "nodejs";

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

async function loadIcon(
  source: string,
  name: IconVariantName,
  load: () => Promise<Buffer>,
): Promise<CachedIcon | null> {
  return loadCachedImage(
    `${source}|${name}`,
    ICON_VARIANTS[name].contentType,
    async () => renderIconVariant(await load(), name),
    "[site-icon]",
  );
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
    if (icon) return imageResponse(icon, ifNoneMatch);
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
    if (icon) return imageResponse(icon, ifNoneMatch);
  } catch (error) {
    console.warn("[site-icon] could not read the SimplePress icon", error);
  }
  return new Response(null, {
    status: 302,
    headers: { Location: PLATFORM_ICO_PATH },
  });
}
