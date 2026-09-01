"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import type { BambooGlyphId } from "./bamboo-glyph";
import type { Product } from "~/types";
import { formatPrice } from "~/lib/prices";
import { checkProductStatus } from "~/lib/products/check-product-status";
import { cn } from "~/lib/utils";
import { WishlistButton } from "~/app/(storefront)/_components/wishlist/wishlist-button";

import { BambooGlyph } from "./bamboo-glyph";

/**
 * Product card system — ported from the mockup's `.card`/`.blob`/`.sprout`
 * rules (mockup-b-shop.elided.html lines ~220-272) onto the `.bamboo-card` /
 * `.bamboo-card-art` / `.bamboo-blob` / `.bamboo-sprout` / `.bamboo-card-photo`
 * / `.bamboo-card-photo-img` / `.bamboo-card-link` / `.bamboo-price` /
 * `.bamboo-card-foot` classes (F1 follow-up, `src/styles/globals.css`).
 *
 * Structural note (matches `bamboo-post-card.tsx` / `bamboo-collection-art.tsx`
 * exactly): `.bamboo-card` is the whole visual card (an `<article>`, NOT an
 * anchor) and `.bamboo-card-link` is a small `<Link>` wrapping just the
 * title text — its `::after{inset:0}` pseudo-element escalates to the
 * nearest positioned ancestor (`.bamboo-card`, `position:relative`) and
 * stretches to cover the whole card, so the entire tile is clickable while
 * the wishlist button stays a normal, non-nested `<button>` (never inside an
 * `<a>`).
 *
 * PROPS SIGNATURE IS UNCHANGED — the homepage and collections pages already
 * render `<BambooProductCard index={index} product={product} />` and
 * `<BambooHorizontalProductCard index={index} product={product} />` against
 * this exact contract; do not add required props.
 */

type Props = {
  product: Product;
  index: number;
};

/** Every tile in a row gets its own blob shape, tint and angle — design.md:
 * "the row must not read stamped". Cycled by `index`, not `nth-child` (the
 * real DOM parent of a card is a per-item reveal wrapper, so CSS `nth-child`
 * can't see the grid position). Same five personalities as
 * `collections/bamboo-collection-art.tsx` for a consistent card family. */
const BAMBOO_PRODUCT_BLOB_PERSONALITIES: Record<string, string>[] = [
  {
    "--bc": "var(--bamboo-sage)",
    "--br": "-13deg",
    "--bw": "80%",
    "--bh": "76%",
    "--brad": "58% 42% 47% 53% / 45% 52% 48% 55%",
  },
  {
    "--bc": "var(--bamboo-sage-deep)",
    "--br": "9deg",
    "--bw": "74%",
    "--bh": "81%",
    "--brad": "44% 56% 62% 38% / 53% 42% 58% 47%",
  },
  {
    "--bc":
      "color-mix(in srgb, var(--bamboo-sage) 55%, var(--bamboo-sage-deep) 45%)",
    "--br": "-3deg",
    "--bw": "79%",
    "--bh": "73%",
    "--brad": "64% 36% 39% 61% / 37% 59% 41% 63%",
  },
  {
    "--bc": "var(--bamboo-sage-deep)",
    "--br": "7deg",
    "--bw": "76%",
    "--bh": "79%",
    "--brad": "52% 48% 36% 64% / 58% 40% 60% 42%",
  },
  {
    "--bc": "var(--bamboo-sage)",
    "--br": "-9deg",
    "--bw": "82%",
    "--bh": "74%",
    "--brad": "39% 61% 57% 43% / 48% 56% 44% 52%",
  },
];

function bambooProductBlobStyle(index: number): CSSProperties {
  const style = BAMBOO_PRODUCT_BLOB_PERSONALITIES[
    index % BAMBOO_PRODUCT_BLOB_PERSONALITIES.length
  ] ?? { "--bc": "var(--bamboo-sage)" };
  return style as CSSProperties;
}

/**
 * Illustrated roll fallback art for a product with no image, composed from
 * sprite fragments the same way the mockup's illustrated shop cards are
 * (mockup-b-shop.elided.html cards 2-5): one wrapper `<svg>` with a POSITIVE
 * viewBox, `<use>` fragments placed with x/y/width/height, and a
 * ground-shadow ellipse under each object so nothing floats. Purely
 * decorative — the card's title link carries the accessible name.
 */
type ArtNode =
  | {
      kind: "shadow";
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      o: string;
    }
  | {
      kind: "piece";
      id: BambooGlyphId;
      x: number;
      y: number;
      w: number;
      h: number;
    };

const BAMBOO_PRODUCT_ART_COMPOSITIONS: { width: string; nodes: ArtNode[] }[] = [
  // her pack, alone.
  {
    width: "70%",
    nodes: [
      { kind: "shadow", cx: 165, cy: 218, rx: 100, ry: 15, o: "0.16" },
      { kind: "piece", id: "s-pack", x: 0, y: 8, w: 330, h: 202 },
    ],
  },
  // two standing rolls.
  {
    width: "84%",
    nodes: [
      { kind: "shadow", cx: 90, cy: 196, rx: 54, ry: 10, o: "0.13" },
      { kind: "shadow", cx: 210, cy: 226, rx: 60, ry: 11, o: "0.16" },
      { kind: "piece", id: "s-roll-tall", x: 16, y: 20, w: 146, h: 186 },
      { kind: "piece", id: "s-roll-tall", x: 132, y: 42, w: 152, h: 194 },
    ],
  },
  // a tissue box with a top-down roll beside it.
  {
    width: "86%",
    nodes: [
      { kind: "shadow", cx: 150, cy: 224, rx: 94, ry: 15, o: "0.16" },
      { kind: "piece", id: "s-roll-top", x: 182, y: 30, w: 82, h: 82 },
      { kind: "piece", id: "s-tissue-box", x: 40, y: 56, w: 212, h: 170 },
    ],
  },
  // the pack with two rolls standing behind it.
  {
    width: "88%",
    nodes: [
      { kind: "shadow", cx: 55, cy: 171, rx: 42, ry: 8, o: "0.12" },
      { kind: "shadow", cx: 249, cy: 167, rx: 44, ry: 8, o: "0.12" },
      { kind: "piece", id: "s-roll-front", x: 12, y: 87, w: 86, h: 83 },
      { kind: "piece", id: "s-roll-front", x: 204, y: 81, w: 90, h: 86 },
      { kind: "shadow", cx: 152, cy: 212, rx: 92, ry: 13, o: "0.16" },
      { kind: "piece", id: "s-pack", x: 58, y: 30, w: 192, h: 186 },
    ],
  },
];

function BambooProductArt({
  index,
  className,
}: {
  index: number;
  className?: string;
}) {
  const composition =
    BAMBOO_PRODUCT_ART_COMPOSITIONS[
      index % BAMBOO_PRODUCT_ART_COMPOSITIONS.length
    ] ?? BAMBOO_PRODUCT_ART_COMPOSITIONS[0];
  if (!composition) return null;

  return (
    <span
      className={cn("relative block", className)}
      style={{ width: composition.width }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 330 250" className="block h-auto w-full">
        {composition.nodes.map((node, i) =>
          node.kind === "shadow" ? (
            <ellipse
              key={i}
              cx={node.cx}
              cy={node.cy}
              rx={node.rx}
              ry={node.ry}
              fill="var(--bamboo-pine)"
              opacity={node.o}
            />
          ) : (
            <use
              key={i}
              href={`#${node.id}`}
              x={node.x}
              y={node.y}
              width={node.w}
              height={node.h}
            />
          ),
        )}
      </svg>
    </span>
  );
}

/** Shared stock/status computation for both card variants below. */
function useCardStatus(product: Product) {
  return checkProductStatus({
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    trackInventory: product.trackInventory,
    inventoryQty: product.inventoryQty,
    allowBackorders: product.allowBackorders,
    baseInventoryUnit: product.baseInventoryUnit
      ? { inventoryQty: product.baseInventoryUnit.inventoryQty }
      : null,
    baseUnitsConsumed: product.baseUnitsConsumed,
    additionalFields: product.additionalFields,
    variants: product.variants.map((v) => ({
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      inventoryQty: v.inventoryQty,
    })),
  });
}

/** "Coming soon" / "Out of stock" render as the muted terracotta chip; every
 * other state (in stock, pre-order) renders as plain pine text. */
function availability(productStatus: ReturnType<typeof useCardStatus>): {
  text: string;
  muted: boolean;
} {
  if (productStatus.badgeLabel === "Coming Soon") {
    return { text: "Coming soon", muted: true };
  }
  if (productStatus.isOutOfStock) {
    return { text: "Out of stock", muted: true };
  }
  if (productStatus.badgeLabel === "Pre-order") {
    return { text: "Pre-order", muted: false };
  }
  return { text: "In stock", muted: false };
}

const OOS_CHIP_STYLE: CSSProperties = {
  backgroundColor:
    "color-mix(in srgb, var(--bamboo-terracotta) 13%, transparent)",
};

export function BambooProductCard({ product, index }: Props) {
  const productStatus = useCardStatus(product);
  const productImage = product.images[0]?.url ?? null;
  const { text: availabilityText, muted: availabilityMuted } =
    availability(productStatus);

  return (
    <article className="bamboo-card group flex h-full flex-col">
      <div className="bamboo-card-art">
        <span className="bamboo-blob" style={bambooProductBlobStyle(index)} />
        {productImage ? (
          <span
            className="bamboo-card-photo"
            style={{ "--aw": "78%" } as CSSProperties}
          >
            <Image
              className="bamboo-card-photo-img"
              src={productImage}
              alt=""
              width={1200}
              height={1011}
              sizes="(max-width: 640px) 84vw, (max-width: 1024px) 42vw, 28vw"
            />
          </span>
        ) : (
          <BambooProductArt index={index} />
        )}
        {productStatus.isOnSale && productStatus.savingsLabel ? (
          <span className="absolute top-0 left-0 rounded-full bg-[var(--bamboo-terracotta-deep)] px-3 py-1 text-xs font-semibold text-[var(--bamboo-cream)]">
            {productStatus.savingsLabel}
          </span>
        ) : null}
        <span className="bamboo-sprout" aria-hidden="true">
          <BambooGlyph id="s-sprig" className="block h-auto w-full" />
        </span>
      </div>

      <h3 className="font-heading mt-5 text-[1.22rem] leading-[1.2] font-semibold tracking-[-0.01em] text-[var(--bamboo-pine)]">
        <Link href={`/shop/${product.slug}`} className="bamboo-card-link">
          {product.name}
        </Link>
      </h3>

      <div className="bamboo-card-foot mt-2">
        <div className="flex items-baseline gap-2">
          <span className="bamboo-price">
            {formatPrice(productStatus.displayPrice)}
            {productStatus.variablePricing ? (
              <span className="ml-0.5 text-sm font-normal text-[var(--bamboo-ink-soft)]">
                +
              </span>
            ) : null}
          </span>
          {productStatus.isOnSale && productStatus.displayCompareAtPrice ? (
            <span className="text-sm text-[var(--bamboo-muted)] line-through">
              <span className="sr-only">Original price: </span>
              {formatPrice(productStatus.displayCompareAtPrice)}
            </span>
          ) : null}
        </div>
        <span
          className={cn(
            "text-[0.82rem] font-medium whitespace-nowrap",
            availabilityMuted
              ? "rounded-full px-[0.6rem] py-[0.16rem] text-[var(--bamboo-terracotta-deep)]"
              : "text-[var(--bamboo-pine)]",
          )}
          style={availabilityMuted ? OOS_CHIP_STYLE : undefined}
        >
          {availabilityText}
        </span>
      </div>

      {product.description ? (
        <p className="mt-3 line-clamp-2 max-w-[36ch] text-[0.9rem] leading-[1.55] text-[var(--bamboo-ink-soft)]">
          {product.description}
        </p>
      ) : null}

      <span
        aria-hidden="true"
        className={cn(
          "relative mt-4 inline-block self-start text-[0.95rem] font-medium text-[var(--bamboo-pine)]",
          "after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-0 after:rounded-[2px] after:bg-[var(--bamboo-terracotta)] after:transition-[width] after:duration-300",
          "group-focus-within:after:w-full group-hover:after:w-full",
        )}
      >
        View Product →
      </span>

      <WishlistButton
        item={{
          productId: product.id,
          name: product.name,
          slug: product.slug,
          price: productStatus.displayPrice,
          imageUrl: productImage,
        }}
        className="absolute top-3 right-3 z-10 bg-[var(--bamboo-roll)]/85 text-[var(--bamboo-terracotta-deep)] backdrop-blur-sm hover:bg-[var(--bamboo-roll)]"
      />
    </article>
  );
}

export function BambooHorizontalProductCard({ product, index }: Props) {
  const productStatus = useCardStatus(product);
  const productImage = product.images[0]?.url ?? null;
  const { text: availabilityText, muted: availabilityMuted } =
    availability(productStatus);

  return (
    <article className="bamboo-card group relative flex items-center gap-4">
      <div
        className={cn(
          "relative h-20 w-20 shrink-0 overflow-hidden rounded-[14px]",
          index % 2 === 0
            ? "bg-[var(--bamboo-sage)]"
            : "bg-[var(--bamboo-sage-deep)]",
        )}
      >
        {productImage ? (
          <Image
            src={productImage}
            alt=""
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <BambooGlyph id="s-roll-front" className="h-12 w-auto" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-heading truncate text-[1.02rem] font-semibold text-[var(--bamboo-pine)]">
          <Link href={`/shop/${product.slug}`} className="bamboo-card-link">
            {product.name}
          </Link>
        </h3>

        <div className="bamboo-card-foot mt-1.5">
          <div className="flex items-baseline gap-2">
            <span className="bamboo-price !mt-0 !text-[1.05rem]">
              {formatPrice(productStatus.displayPrice)}
              {productStatus.variablePricing ? (
                <span className="ml-0.5 text-sm font-normal text-[var(--bamboo-ink-soft)]">
                  +
                </span>
              ) : null}
            </span>
            {productStatus.isOnSale && productStatus.displayCompareAtPrice ? (
              <span className="text-sm text-[var(--bamboo-muted)] line-through">
                <span className="sr-only">Original price: </span>
                {formatPrice(productStatus.displayCompareAtPrice)}
              </span>
            ) : null}
          </div>
          <span
            className={cn(
              "text-[0.78rem] font-medium whitespace-nowrap",
              availabilityMuted
                ? "rounded-full px-[0.5rem] py-[0.1rem] text-[var(--bamboo-terracotta-deep)]"
                : "text-[var(--bamboo-pine)]",
            )}
            style={availabilityMuted ? OOS_CHIP_STYLE : undefined}
          >
            {availabilityText}
          </span>
        </div>
      </div>
    </article>
  );
}
