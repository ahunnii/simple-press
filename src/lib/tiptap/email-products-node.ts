import type { JSONContent } from "@tiptap/core";
import { mergeAttributes, Node } from "@tiptap/core";

/**
 * Shared `emailProducts` node definition: a row of product cards (image,
 * name, price, a "Shop now" button) in a marketing email.
 *
 * Email only: the node is registered in the admin editor only when it runs
 * with `emailMode` (the campaign composer), and it is never part of the
 * storefront renderer's schema. The email HTML is built by
 * `~/lib/marketing/tiptap-to-email`, which should read the attrs through the
 * helpers below (`sanitizeEmailProductItems`, `coerceEmailProductsButtonLabel`).
 *
 * This module must stay free of React, tRPC and `server-only` so the email
 * renderer can import it on the server. The admin editor `.extend()`s
 * `EmailProducts` with its node view and `insertEmailProducts` /
 * `setEmailProducts` commands. No commands live here.
 *
 * Items are a snapshot taken when the owner picks the products (name, photo,
 * price at that moment), so a sent email never changes afterwards.
 *
 * Markup (`renderHTML`):
 *
 *   <div data-type="email-products" data-items="[…JSON…]" data-button-label="Shop now"></div>
 */

/** Most products one block may show. */
export const EMAIL_PRODUCTS_MAX = 4;

/** Longest button label an owner may type. */
export const EMAIL_PRODUCTS_BUTTON_LABEL_MAX = 40;

export const DEFAULT_EMAIL_PRODUCTS_BUTTON_LABEL = "Shop now";

/** Caps on the snapshot strings, so a hand-edited doc can't balloon. */
const MAX_ID_LENGTH = 100;
const MAX_NAME_LENGTH = 200;
const MAX_SLUG_LENGTH = 200;
const MAX_URL_LENGTH = 2048;

/** One product as it was when the owner picked it. Prices are in cents. */
export interface EmailProductItem {
  productId: string;
  name: string;
  imageUrl: string | null;
  priceCents: number;
  compareAtCents: number | null;
  slug: string;
}

export interface EmailProductsNodeAttrs {
  items: EmailProductItem[];
  buttonLabel: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cents = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : null;

function sanitizeItem(raw: unknown): EmailProductItem | null {
  if (!isRecord(raw)) return null;

  const productId =
    typeof raw.productId === "string" ? raw.productId.trim() : "";
  if (!productId || productId.length > MAX_ID_LENGTH) return null;

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) return null;

  const slug = typeof raw.slug === "string" ? raw.slug.trim() : "";
  if (!slug || slug.length > MAX_SLUG_LENGTH) return null;

  const priceCents = cents(raw.priceCents);
  if (priceCents === null) return null;

  const imageUrl =
    typeof raw.imageUrl === "string" &&
    raw.imageUrl.trim() !== "" &&
    raw.imageUrl.length <= MAX_URL_LENGTH
      ? raw.imageUrl.trim()
      : null;

  // A compare-at price only means "on sale" when it's above the price.
  const compareAt = cents(raw.compareAtCents);
  const compareAtCents =
    compareAt !== null && compareAt > priceCents ? compareAt : null;

  return {
    productId,
    name: name.slice(0, MAX_NAME_LENGTH),
    imageUrl,
    priceCents,
    compareAtCents,
    slug,
  };
}

/**
 * Narrows any stored/parsed `items` value to well-formed products: drops
 * entries that fail the shape check and repeats of the same product, and
 * keeps at most `EMAIL_PRODUCTS_MAX`.
 */
export function sanitizeEmailProductItems(raw: unknown): EmailProductItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const items: EmailProductItem[] = [];
  for (const entry of raw) {
    const item = sanitizeItem(entry);
    if (!item || seen.has(item.productId)) continue;
    seen.add(item.productId);
    items.push(item);
    if (items.length === EMAIL_PRODUCTS_MAX) break;
  }
  return items;
}

/** `data-items` back to items; anything unparseable is no items. */
export function parseEmailProductItemsAttr(
  value: string | null | undefined,
): EmailProductItem[] {
  if (!value) return [];
  try {
    return sanitizeEmailProductItems(JSON.parse(value));
  } catch {
    return [];
  }
}

/**
 * The button label to show: whitespace collapsed, capped at
 * `EMAIL_PRODUCTS_BUTTON_LABEL_MAX`, and the default when blank.
 */
export function coerceEmailProductsButtonLabel(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_EMAIL_PRODUCTS_BUTTON_LABEL;
  const label = value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, EMAIL_PRODUCTS_BUTTON_LABEL_MAX)
    .trim();
  return label || DEFAULT_EMAIL_PRODUCTS_BUTTON_LABEL;
}

/**
 * Visits every `emailProducts` node in document order, at ANY depth. No depth
 * cap on purpose: a block the email walker renders must never escape
 * hydration (the walker would then render the editor's untrusted snapshot).
 * Iterative, so a deeply nested document can't overflow the stack.
 */
export function forEachProductBlock(
  root: JSONContent,
  visit: (block: JSONContent) => void,
): void {
  const stack: JSONContent[] = [root];
  const seen = new Set<JSONContent>();
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (seen.has(node)) continue; // never loop on a shared/cyclic object
    seen.add(node);
    if (node.type === "emailProducts") {
      visit(node);
      continue;
    }
    const children = Array.isArray(node.content)
      ? node.content.filter((c): c is JSONContent => isRecord(c))
      : [];
    for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]!);
  }
}

/**
 * How many product blocks in `doc` have no usable products (and so render
 * nothing). Pure: reads the items as they are, without the database. Also the
 * composer's "choose products or remove the block" check.
 */
export function countEmptyProductBlocks(
  doc: JSONContent | null | undefined,
): number {
  if (!isRecord(doc)) return 0;
  let count = 0;
  forEachProductBlock(doc, (block) => {
    if (sanitizeEmailProductItems(block.attrs?.items).length === 0) count++;
  });
  return count;
}

export interface EmailProductsOptions {
  HTMLAttributes: Record<string, unknown>;
}

export const EmailProducts = Node.create<EmailProductsOptions>({
  name: "emailProducts",

  group: "block",

  atom: true,

  selectable: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      items: {
        default: [],
        parseHTML: (element) =>
          parseEmailProductItemsAttr(element.getAttribute("data-items")),
        // Emitted by the node-level `renderHTML` from the sanitized value.
        renderHTML: () => ({}),
      },
      buttonLabel: {
        default: DEFAULT_EMAIL_PRODUCTS_BUTTON_LABEL,
        parseHTML: (element) =>
          coerceEmailProductsButtonLabel(
            element.getAttribute("data-button-label"),
          ),
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="email-products"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = node.attrs as Partial<EmailProductsNodeAttrs>;
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "email-products",
        "data-items": JSON.stringify(sanitizeEmailProductItems(attrs.items)),
        "data-button-label": coerceEmailProductsButtonLabel(attrs.buttonLabel),
      }),
    ];
  },
});
