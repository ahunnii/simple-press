import "server-only";

import sharp from "sharp";

import type { IconBackground, IconVariantName } from "./variants";

import { buildIco, isIco, readIcoLargestPng } from "./ico";
import { ICON_VARIANTS, TRANSPARENT } from "./variants";

const FETCH_TIMEOUT_MS = 5_000;
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;

/**
 * Download an icon source image. https only, 5s timeout, 5MB cap (checked
 * against Content-Length up front and the bytes actually read). Redirects are
 * refused so a storage URL can't bounce the server somewhere else.
 */
export async function fetchIconSource(url: string): Promise<Buffer> {
  if (new URL(url).protocol !== "https:") {
    throw new Error("Icon source must be https");
  }
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "error",
    cache: "no-store",
  });
  if (!res.ok || !res.body) {
    throw new Error(`Icon source fetch failed: ${res.status}`);
  }
  const declared = Number(res.headers.get("content-length"));
  if (declared > MAX_SOURCE_BYTES) {
    await res.body.cancel();
    throw new Error("Icon source too large");
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_SOURCE_BYTES) {
      await reader.cancel();
      throw new Error("Icon source too large");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/**
 * Unwrap an ICO to its largest PNG and pick an SVG raster density so the long
 * edge lands at (or above) `targetPx` instead of being upscaled blurry (SVGs
 * rasterise at 72dpi by default).
 */
async function prepareSource(
  input: Buffer,
  targetPx: number,
): Promise<{ buf: Buffer; density: number | undefined }> {
  let buf = input;
  if (isIco(buf)) {
    const png = readIcoLargestPng(buf);
    if (!png) throw new Error("ICO has no PNG entries");
    buf = png;
  }

  const meta = await sharp(buf, { animated: false }).metadata();
  let density: number | undefined;
  if (meta.format === "svg" && meta.width && meta.height) {
    const scale = targetPx / Math.max(meta.width, meta.height);
    density = Math.min(2400, Math.max(72, Math.ceil(72 * scale)));
  }
  return { buf, density };
}

/**
 * Render a square `size`×`size` PNG from any image sharp can read (PNG, JPEG,
 * WebP, AVIF, GIF first frame, SVG) or a PNG-bearing ICO. The image is fitted
 * inside `size·(1-2·paddingPct)` and centred on `background`; an opaque
 * background also flattens the image's own transparency.
 */
export async function renderIconPng(
  input: Buffer,
  size: number,
  {
    background = TRANSPARENT,
    paddingPct = 0,
  }: { background?: IconBackground; paddingPct?: number } = {},
): Promise<Buffer> {
  const { buf, density } = await prepareSource(input, size);

  const inner = Math.max(1, Math.round(size * (1 - 2 * paddingPct)));
  const pad = size - inner;
  const before = Math.floor(pad / 2);

  let pipeline = sharp(buf, { animated: false, density }).resize(inner, inner, {
    fit: "contain",
    background,
  });
  if (background.alpha >= 1) pipeline = pipeline.flatten({ background });
  if (pad > 0) {
    pipeline = pipeline.extend({
      top: before,
      bottom: pad - before,
      left: before,
      right: pad - before,
      background,
    });
  }
  return pipeline.png().toBuffer();
}

/** Render a named variant (one PNG, or the multi-size ICO) from a source image. */
export async function renderIconVariant(
  input: Buffer,
  name: IconVariantName,
): Promise<Buffer> {
  const variant = ICON_VARIANTS[name];
  const opts = {
    background: variant.background,
    paddingPct: variant.paddingPct,
  };
  if (variant.contentType === "image/x-icon") {
    const pngs = await Promise.all(
      variant.sizes.map(async (size) => ({
        size,
        data: await renderIconPng(input, size, opts),
      })),
    );
    return buildIco(pngs);
  }
  return renderIconPng(input, variant.sizes[0]!, opts);
}

export const OG_CARD_WIDTH = 1200;
export const OG_CARD_HEIGHT = 630;
// The logo is fitted inside 70% × 62% of the card: ~180px of air left and right
// and ~120px above and below a square logo, which survives the crops
// link-preview UIs apply.
const OG_LOGO_MAX_W = Math.round(OG_CARD_WIDTH * 0.7);
const OG_LOGO_MAX_H = Math.round(OG_CARD_HEIGHT * 0.62);
const WHITE: IconBackground = { r: 255, g: 255, b: 255, alpha: 1 };

/**
 * The background a logo was designed on: its own top-left pixel when that is
 * fully opaque (a JPEG/PNG logo exported on a cream or navy square), else
 * white (transparent PNG/WebP/AVIF/SVG logos, which assume a light page).
 */
async function ogBackground(
  buf: Buffer,
  density: number | undefined,
): Promise<IconBackground> {
  const { data } = await sharp(buf, { animated: false, density })
    .ensureAlpha()
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [r, g, b, a] = data;
  if (r === undefined || g === undefined || b === undefined || a !== 255) {
    return WHITE;
  }
  return { r, g, b, alpha: 1 };
}

/**
 * The share-card fallback for stores with no `og:image`: a 1200×630 PNG with
 * the logo contain-fitted and centred with generous padding. Accepts anything
 * sharp reads (PNG, JPEG, WebP, AVIF, GIF first frame, SVG, PNG-bearing ICO) —
 * the point is turning formats Facebook/iMessage/LinkedIn can't show (AVIF,
 * SVG) into one they can.
 */
export async function renderOgFallbackCard(input: Buffer): Promise<Buffer> {
  const { buf, density } = await prepareSource(input, OG_LOGO_MAX_W);
  const background = await ogBackground(buf, density);

  const logo = await sharp(buf, { animated: false, density })
    .resize(OG_LOGO_MAX_W, OG_LOGO_MAX_H, {
      fit: "inside",
      // Logos are often a few hundred px; upscaling beats a postage stamp.
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: OG_CARD_WIDTH,
      height: OG_CARD_HEIGHT,
      channels: 4,
      background,
    },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .flatten({ background })
    .png()
    .toBuffer();
}
