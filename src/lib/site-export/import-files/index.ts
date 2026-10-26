/**
 * Platform import files for the "Download your site" export.
 *
 * Loads the store's catalog once (read-only), normalizes it into
 * `ExportProduct[]`, and runs the four pure builders. Must stay free of
 * `next/headers`, `checkBusiness` and `server-only` so the orchestrator can
 * call it from a route or a script.
 */
import type {
  SiteExportBusiness,
  SiteExportFile,
  SiteExportNote,
} from "../types";
import type {
  ExportProduct,
  ExportProductOption,
  ExportProductVariant,
} from "./types";
import { photosOnly, videosOnly } from "~/lib/products/media";
import {
  resolveVariantCompareAtPrice,
  resolveVariantPrice,
} from "~/lib/variant-price";
import { db } from "~/server/db";

import { SITE_EXPORT_DIRS } from "../types";
import { buildShopifyProductsCsv } from "./shopify-products";
import { buildSquareItemsCsv } from "./square-items";
import { buildSquarespaceProductsCsv } from "./squarespace-products";
import { buildWixProductsCsv } from "./wix-products";

export { buildShopifyProductsCsv } from "./shopify-products";
export { buildSquareItemsCsv } from "./square-items";
export { buildSquarespaceProductsCsv } from "./squarespace-products";
export { buildWixProductsCsv } from "./wix-products";
export type { ExportProduct } from "./types";

/** Make a stored image URL absolute so platforms can fetch it. */
export function absoluteUrl(url: string, siteUrl: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return `${siteUrl.replace(/\/+$/, "")}/${trimmed.replace(/^\/+/, "")}`;
}

function parseOptions(raw: unknown): ExportProductOption[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const out: ExportProductOption[] = [];
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === null || value === undefined) continue;
    if (typeof value !== "string" && typeof value !== "number") continue;
    const v = String(value);
    if (!v.trim()) continue;
    const name = key.trim();
    out.push({
      name: name ? name.charAt(0).toUpperCase() + name.slice(1) : key,
      value: v.trim(),
    });
  }
  return out;
}

async function loadProducts(
  businessId: string,
  siteUrl: string,
): Promise<ExportProduct[]> {
  const rows = await db.product.findMany({
    where: { businessId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
      collectionProducts: {
        include: { collection: { select: { name: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return rows.map((p): ExportProduct => {
    const variants = p.variants.map((v): ExportProductVariant => {
      const compareAt = resolveVariantCompareAtPrice(
        v.price,
        v.compareAtPrice,
        p.compareAtPrice,
      );
      return {
        name: v.name,
        sku: v.sku,
        priceCents: Math.round(resolveVariantPrice(v.price, p.price)),
        compareAtCents: compareAt ? Math.round(compareAt) : null,
        inventoryQty: v.inventoryQty,
        options: parseOptions(v.options),
        imageUrl: v.imageUrl ? absoluteUrl(v.imageUrl, siteUrl) : null,
      };
    });

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description ?? p.excerpt ?? "",
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
      priceCents: Math.round(p.price),
      compareAtCents: p.compareAtPrice ? Math.round(p.compareAtPrice) : null,
      costCents: p.cost ? Math.round(p.cost) : null,
      sku: p.sku,
      barcode: p.barcode,
      published: p.published,
      trackInventory: p.trackInventory,
      inventoryQty: p.inventoryQty,
      allowBackorders: p.allowBackorders,
      weight: p.weight,
      weightUnit: p.weightUnit === "kg" ? "kg" : "lb",
      images: photosOnly(p.images).map((img) => ({
        url: absoluteUrl(img.url, siteUrl),
        altText: img.altText,
      })),
      videoCount: videosOnly(p.images).length,
      collections: p.collectionProducts.map((cp) => cp.collection.name),
      variants,
    };
  });
}

export async function buildImportFiles(
  businessId: string,
  business: SiteExportBusiness,
): Promise<{ files: SiteExportFile[]; notes: SiteExportNote[] }> {
  const products = await loadProducts(businessId, business.siteUrl);

  if (products.length === 0) {
    return {
      files: [],
      notes: [
        {
          level: "info",
          message:
            "This store has no products, so no Shopify, Wix, Squarespace or Square product import files were created.",
        },
      ],
    };
  }

  const dir = SITE_EXPORT_DIRS.importFiles;
  const shopify = buildShopifyProductsCsv(products, {
    storeName: business.name,
  });
  const wix = buildWixProductsCsv(products);
  const squarespace = buildSquarespaceProductsCsv(products);
  const square = buildSquareItemsCsv(products);

  const hidden = products.filter((p) => !p.published).length;
  const withVideos = products.filter((p) => (p.videoCount ?? 0) > 0).length;
  const notes: SiteExportNote[] = [
    {
      level: "info",
      message: `Product import files list ${products.length} product(s)${hidden > 0 ? `, ${hidden} of them hidden or draft (imported hidden)` : ""}. Images in these files link to your live site's photos, so import before your old site goes offline.`,
    },
    ...(withVideos > 0
      ? [
          {
            level: "info" as const,
            message: `${withVideos} product(s) have videos. These import files only carry photos; the product videos are in the Videos folder (inside Photos) and can be added by hand on the new platform.`,
          },
        ]
      : []),
    ...shopify.notes.map((n) => ({ ...n, message: `Shopify: ${n.message}` })),
    ...wix.notes.map((n) => ({ ...n, message: `Wix: ${n.message}` })),
    ...squarespace.notes.map((n) => ({
      ...n,
      message: `Squarespace: ${n.message}`,
    })),
    ...square.notes.map((n) => ({ ...n, message: `Square: ${n.message}` })),
  ];

  return {
    files: [
      { path: `${dir}/Shopify/products.csv`, contents: shopify.csv },
      { path: `${dir}/Wix/products.csv`, contents: wix.csv },
      { path: `${dir}/Squarespace/products.csv`, contents: squarespace.csv },
      { path: `${dir}/Square/items.csv`, contents: square.csv },
    ],
    notes,
  };
}
