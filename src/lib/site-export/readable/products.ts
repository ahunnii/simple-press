/** Readable documents for products, the catalog index and collections. */
import { primaryPhoto, photosOnly, videosOnly } from "~/lib/products/media";
import { esc, fieldTable } from "../html";
import { SITE_EXPORT_DIRS } from "../types";
import {
  docLink,
  fileNameOf,
  formatMoney,
  humanize,
  imgHtml,
  indexDoc,
  inlineText,
  linkHtml,
  listHtml,
  mediaHref,
  photosGridHtml,
  plainTextHtml,
  seoRows,
  shell,
  tableHtml,
  yesNo,
} from "./shared";
import type { CollectionInput, ProductInput, RenderCtx } from "./types";

export const PRODUCTS_INDEX_PATH = `${SITE_EXPORT_DIRS.products}/index.html`;
export const COLLECTIONS_PATH = `${SITE_EXPORT_DIRS.products}/Collections.html`;
const PRODUCTS_CRUMB = { label: "Products", zipPath: PRODUCTS_INDEX_PATH };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stockText(p: ProductInput): string {
  if (!p.trackInventory) return "Not tracked";
  const base = String(p.inventoryQty);
  return p.allowBackorders ? `${base} (backorders allowed)` : base;
}

function weightText(p: ProductInput): string {
  if (p.weight === null || p.weight === undefined || p.weight === 0) return "";
  return `${p.weight} ${p.weightUnit ?? "lb"}`;
}

function statusText(p: ProductInput): string {
  const base = p.published ? "Published" : "Draft (not visible on your site)";
  return p.featured ? `${base}, featured` : base;
}

function variantsTable(p: ProductInput, ctx: RenderCtx, docPath: string): string {
  if (p.variants.length === 0) return "";
  const optionKeys: string[] = [];
  for (const v of p.variants) {
    if (!isRecord(v.options)) continue;
    for (const k of Object.keys(v.options)) {
      if (!optionKeys.includes(k)) optionKeys.push(k);
    }
  }
  const anyPhoto = p.variants.some((v) => v.imageUrl);
  const anySku = p.variants.some((v) => v.sku);
  return tableHtml(
    [
      "Variant",
      ...optionKeys.map(humanize),
      "Price",
      "Compare-at price",
      ...(anySku ? ["SKU"] : []),
      "Stock",
      ...(anyPhoto ? ["Photo"] : []),
    ],
    p.variants.map((v) => [
      esc(v.name),
      ...optionKeys.map((k) => {
        const val = isRecord(v.options) ? v.options[k] : undefined;
        return typeof val === "string" || typeof val === "number" ? esc(val) : "";
      }),
      // A variant without its own price uses the product price.
      esc(formatMoney(v.price ?? p.price)),
      esc(formatMoney(v.compareAtPrice)),
      ...(anySku ? [esc(v.sku ?? "")] : []),
      p.trackInventory ? esc(v.inventoryQty) : "Not tracked",
      ...(anyPhoto
        ? [imgHtml(ctx, docPath, v.imageUrl, v.name, 64)]
        : []),
    ]),
  );
}

function extraFields(p: ProductInput): Array<[string, string]> {
  if (!isRecord(p.additionalFields)) return [];
  return Object.entries(p.additionalFields)
    .filter(([, v]) => typeof v === "string" || typeof v === "number")
    .map(([k, v]): [string, string] => [humanize(k), inlineText(String(v))]);
}

/** "Videos" sub-section: one link per product video (file sits in Photos/Videos/). */
function productVideosHtml(
  p: ProductInput,
  ctx: RenderCtx,
  docPath: string,
): string {
  const videos = videosOnly(p.images).filter((v) => Boolean(v.url));
  if (videos.length === 0) return "";
  const items = videos.map((v) => {
    const name = fileNameOf(v.url);
    const href = mediaHref(ctx, docPath, v.url);
    // Not in the export (download failed): show the name only, not a dead link.
    return href && !(href.startsWith("/") && !href.startsWith("//"))
      ? `<a href="${esc(href)}">${esc(name)}</a>`
      : esc(name);
  });
  return `<h3>Videos</h3><p class="muted">These files are in the Videos folder of your download.</p>${listHtml(items)}`;
}

export function renderProductDoc(
  p: ProductInput,
  ctx: RenderCtx,
  docPath: string,
): string {
  const details = fieldTable([
    ["Name", esc(p.name)],
    ["Price", esc(formatMoney(p.price))],
    ["Compare-at price (was)", esc(formatMoney(p.compareAtPrice))],
    ["SKU", esc(p.sku ?? "")],
    ["Barcode", esc(p.barcode ?? "")],
    ["Stock", esc(stockText(p))],
    ["Weight", esc(weightText(p))],
    ["Status", esc(statusText(p))],
    ["Collections", p.collections.map(esc).join(", ")],
    [
      "Subscribe & save",
      p.subscriptionEnabled
        ? `${yesNo(true)}${p.subscriptionDiscountPercent ? `, ${esc(p.subscriptionDiscountPercent)}% off` : ""}`
        : "",
    ],
    ["Address on your site", linkHtml(`${ctx.business.siteUrl}/shop/${p.slug}`)],
    ...extraFields(p),
  ]);

  const body = [
    details,
    p.excerpt ? `<h2>Short description</h2>${plainTextHtml(p.excerpt)}` : "",
    p.description ? `<h2>Description</h2>${plainTextHtml(p.description)}` : "",
    p.variants.length > 0
      ? `<h2>Options and variants</h2>${variantsTable(p, ctx, docPath)}`
      : "",
    (() => {
      const photos = photosOnly(p.images);
      return photos.length > 0
        ? `<h2>Photos</h2>${photosGridHtml(ctx, docPath, photos.map((i) => ({ ...i, alt: i.alt ?? p.name })))}`
        : "";
    })(),
    productVideosHtml(p, ctx, docPath),
    (() => {
      const seo = fieldTable([
        ...seoRows(p),
        ["Social share image", p.ogImage ? imgHtml(ctx, docPath, p.ogImage, "") : ""],
      ]);
      return seo ? `<h2>Search engine details</h2>${seo}` : "";
    })(),
  ].join("");

  return shell(ctx, {
    docPath,
    title: p.name,
    subtitle: formatMoney(p.price),
    breadcrumbs: [PRODUCTS_CRUMB, { label: p.name }],
    bodyHtml: body,
  });
}

export function renderProductsIndex(
  entries: Array<{ product: ProductInput; path: string }>,
  ctx: RenderCtx,
  hasCollections: boolean,
): string {
  const rows = entries.map(({ product: p, path }) => {
    const first = primaryPhoto(p.images);
    const photo = first
      ? imgHtml(ctx, PRODUCTS_INDEX_PATH, first.url, p.name, 64)
      : "";
    return [
      photo,
      docLink(PRODUCTS_INDEX_PATH, path, p.name),
      esc(formatMoney(p.price)),
      p.published ? "Published" : "Draft",
      linkHtml(`${ctx.business.siteUrl}/shop/${p.slug}`, "View on site"),
    ];
  });
  return indexDoc(ctx, {
    docPath: PRODUCTS_INDEX_PATH,
    title: "Products",
    intro: `${entries.length} product${entries.length === 1 ? "" : "s"}. Click a product to see its full details, photos and options.`,
    headers: ["Photo", "Name", "Price", "Status", "Link"],
    rows,
    breadcrumbs: [{ label: "Products" }],
    extraHtml: hasCollections
      ? `<p>${docLink(PRODUCTS_INDEX_PATH, COLLECTIONS_PATH, "See collections")}</p>`
      : "",
  });
}

/** Anchor id for a collection heading. */
export function collectionAnchor(slug: string): string {
  return `collection-${slug.replace(/[^a-z0-9-]+/gi, "-")}`;
}

export function renderCollectionsDoc(
  collections: CollectionInput[],
  productPaths: Map<string, string>,
  ctx: RenderCtx,
): string {
  const body = collections
    .map((c) => {
      const items = listHtml(
        c.products.map((p) => {
          const path = productPaths.get(p.slug);
          return path ? docLink(COLLECTIONS_PATH, path, p.name) : esc(p.name);
        }),
      );
      return [
        `<h2 id="${esc(collectionAnchor(c.slug))}">${esc(c.name)}</h2>`,
        fieldTable([
          ["Status", c.published ? "Published" : "Draft (not visible on your site)"],
          ["Address on your site", linkHtml(`${ctx.business.siteUrl}/collections/${c.slug}`)],
          ["SEO title", inlineText(c.metaTitle)],
          ["SEO description", inlineText(c.metaDescription)],
        ]),
        c.imageUrl ? photosGridHtml(ctx, COLLECTIONS_PATH, [{ url: c.imageUrl, alt: c.name }]) : "",
        c.description ? plainTextHtml(c.description) : "",
        items ? `<h3>Products in this collection</h3>${items}` : `<p class="muted">No products yet.</p>`,
      ].join("");
    })
    .join("");
  return shell(ctx, {
    docPath: COLLECTIONS_PATH,
    title: "Collections",
    subtitle: `${collections.length} collection${collections.length === 1 ? "" : "s"}`,
    breadcrumbs: [PRODUCTS_CRUMB, { label: "Collections" }],
    bodyHtml: body,
  });
}
