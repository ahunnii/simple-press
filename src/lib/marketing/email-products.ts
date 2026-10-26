import type { JSONContent } from "@tiptap/core";

import type { EmailProductItem } from "~/lib/tiptap/email-products-node";
import type { DbClient, TxClient } from "~/server/db";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { PHOTO_ONLY_WHERE } from "~/lib/products/media";
import {
  coerceEmailProductsButtonLabel,
  countEmptyProductBlocks,
  EMAIL_PRODUCTS_MAX,
  forEachProductBlock,
  sanitizeEmailProductItems,
} from "~/lib/tiptap/email-products-node";

import { productToEmailItem } from "./product-to-email-item";

// Pure and client-safe, so it lives with the node definition (the composer
// uses it too); re-exported for the server-side callers and tests.
export { countEmptyProductBlocks };

/**
 * Server side of the email `emailProducts` block: before a campaign is
 * previewed or queued, every product block is rebuilt from the database.
 *
 * The block's items arrive from the composer as a snapshot (name, photo,
 * price, slug). Only each item's `productId` (and its order) is kept; name,
 * slug, photo and price all come from the store's own published products,
 * through the same derivation the picker uses (`productToEmailItem`), so a
 * tampered draft can't advertise a fake price or link another store's
 * product. Products that are gone, unpublished, or belong to another business
 * are dropped with a warning.
 *
 * Server-only by use (it takes the Prisma client); like the rest of
 * `~/lib/marketing` it carries no `server-only` import so integration tests
 * can load it.
 */

const MAX_ID_LENGTH = 100;

/**
 * Most distinct products one document may hydrate (ten full blocks). Blocks
 * that would go past it are emptied with a warning, which blocks the send.
 */
export const EMAIL_PRODUCTS_DOC_MAX_PRODUCTS = EMAIL_PRODUCTS_MAX * 10;

export const SHOP_OFF_WARNING =
  "Your shop is turned off, so product blocks were left out.";
export const TOO_MANY_PRODUCTS_WARNING = `This message has more than ${EMAIL_PRODUCTS_DOC_MAX_PRODUCTS} different products, so the extra product blocks were left out. Remove some product blocks.`;
const MAX_WARNING_NAME_LENGTH = 80;

export type HydrateEmailProductsResult = {
  /** A new document; the input is never mutated. */
  doc: JSONContent;
  /** Owner-facing notes, one per dropped product (deduplicated). */
  warnings: string[];
  /** Product blocks left with no products (they won't render). */
  emptyProductBlocks: number;
};

type RequestedItem = { productId: string; snapshotName: string | null };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The products a block asks for, in order: only the ids are trusted (the
 * snapshot name is kept for the warning text). Repeats are dropped and at
 * most `EMAIL_PRODUCTS_MAX` are kept, matching `sanitizeEmailProductItems`.
 */
function requestedItems(attrs: unknown): RequestedItem[] {
  const raw = isRecord(attrs) ? attrs.items : undefined;
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: RequestedItem[] = [];
  for (const entry of raw) {
    if (!isRecord(entry) || typeof entry.productId !== "string") continue;
    const productId = entry.productId.trim();
    if (!productId || productId.length > MAX_ID_LENGTH || seen.has(productId))
      continue;
    seen.add(productId);
    const name =
      typeof entry.name === "string"
        ? entry.name.replace(/\s+/g, " ").trim()
        : "";
    out.push({
      productId,
      snapshotName: name ? name.slice(0, MAX_WARNING_NAME_LENGTH) : null,
    });
    if (out.length === EMAIL_PRODUCTS_MAX) break;
  }
  return out;
}

function unavailableWarning(item: RequestedItem): string {
  return item.snapshotName
    ? `"${item.snapshotName}" is no longer available and was left out.`
    : "A product is no longer available and was left out.";
}

/**
 * Rebuilds every product block in `doc` from the store's published products
 * (one query for the whole document). Returns a new document with fresh
 * items in each block's original order, a warning per dropped product, and
 * the number of blocks left empty.
 *
 * With the store's `products` feature off, every block comes out empty (one
 * warning). At most `EMAIL_PRODUCTS_DOC_MAX_PRODUCTS` distinct products are
 * hydrated per document; a block that would go past that is emptied.
 */
export async function hydrateEmailProducts(
  db: DbClient | TxClient,
  businessId: string,
  doc: JSONContent,
): Promise<HydrateEmailProductsResult> {
  if (!isRecord(doc)) return { doc, warnings: [], emptyProductBlocks: 0 };

  // Work on a copy so the caller's document is never touched.
  const copy = structuredClone(doc);

  const blocks: { node: JSONContent; requested: RequestedItem[] }[] = [];
  forEachProductBlock(copy, (node) => {
    blocks.push({ node, requested: requestedItems(node.attrs) });
  });
  if (blocks.length === 0) {
    return { doc: copy, warnings: [], emptyProductBlocks: 0 };
  }

  const warnings = new Set<string>();

  // The shop is off: no product may be advertised.
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: { featureFlags: true },
  });
  const shopOn =
    !!business && resolveFlags(business.featureFlags).isEnabled("products");
  if (!shopOn) {
    warnings.add(SHOP_OFF_WARNING);
    for (const block of blocks) block.requested = [];
  }

  // Cap the distinct products per document, in document order: a block that
  // would bring in products past the cap is emptied as a whole.
  const ids = new Set<string>();
  for (const block of blocks) {
    const added = block.requested
      .map((r) => r.productId)
      .filter((id) => !ids.has(id));
    if (ids.size + added.length > EMAIL_PRODUCTS_DOC_MAX_PRODUCTS) {
      warnings.add(TOO_MANY_PRODUCTS_WARNING);
      block.requested = [];
      continue;
    }
    for (const id of added) ids.add(id);
  }

  const products =
    ids.size === 0
      ? []
      : await db.product.findMany({
          where: { id: { in: [...ids] }, businessId, published: true },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            compareAtPrice: true,
            variants: {
              select: { price: true, compareAtPrice: true },
              orderBy: { createdAt: "asc" },
            },
            images: {
              where: PHOTO_ONLY_WHERE,
              orderBy: { sortOrder: "asc" },
              take: 1,
              select: { url: true },
            },
          },
        });

  // Snapshot each product once, through the same sanitizer the renderer uses.
  const fresh = new Map<string, EmailProductItem>();
  for (const product of products) {
    const [item] = sanitizeEmailProductItems([productToEmailItem(product)]);
    if (item) fresh.set(product.id, item);
  }

  let emptyProductBlocks = 0;
  for (const { node, requested } of blocks) {
    const items: EmailProductItem[] = [];
    for (const req of requested) {
      const item = fresh.get(req.productId);
      if (item) items.push(item);
      else warnings.add(unavailableWarning(req));
    }
    if (items.length === 0) emptyProductBlocks++;
    const attrs = isRecord(node.attrs) ? node.attrs : {};
    node.attrs = {
      ...attrs,
      items,
      buttonLabel: coerceEmailProductsButtonLabel(attrs.buttonLabel),
    };
  }

  return { doc: copy, warnings: [...warnings], emptyProductBlocks };
}
