"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import type { Product } from "~/types";
import { formatPrice } from "~/lib/prices";
import { parseCardAdditionalFields } from "~/lib/products";
import { checkProductStatus } from "~/lib/products/check-product-status";
import { useCart } from "~/providers/cart-context";

/* Palette used to tint the variant swatch squares when no color info */
const SWATCH_PALETTE = [
  "var(--vn-ink)",
  "var(--vn-steel)",
  "var(--vn-bone)",
  "var(--vn-steel-mist)",
];

type Props = {
  product: Product;
  index: number;
};

export function NoiseProductCard({ product, index }: Props) {
  const { addItem } = useCart();

  const productStatus = checkProductStatus({
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

  const productImage = product.images[0]?.url ?? "/placeholder.svg";
  const additional = parseCardAdditionalFields(product.additionalFields);

  /* Corner stamp label — combine edition + status if flagged */
  const isNew = productStatus.badgeLabel?.toLowerCase() === "new";
  const isSoldOut = !productStatus.inStock;
  const editionBase = `N° ${String(index + 1).padStart(2, "0")}`;
  const editionLabel = isNew
    ? `${editionBase} · NEW`
    : isSoldOut
      ? `${editionBase} · SOLD`
      : editionBase;

  /* Variant swatches — try to read hex color from options, fall back to palette */
  const swatches: { bg: string; border: string }[] = product.variants
    .slice(0, 4)
    .map((v, i) => {
      const opts = v.options as Record<string, string> | null | undefined;
      const colorVal = opts
        ? (Object.values(opts).find((val) =>
            typeof val === "string" && /^#[0-9a-f]{3,6}$/i.test(val),
          ) ?? null)
        : null;
      return colorVal
        ? { bg: colorVal, border: "var(--vn-ink)" }
        : {
            bg: SWATCH_PALETTE[i % SWATCH_PALETTE.length] ?? "var(--vn-ink)",
            border: "var(--vn-ink)",
          };
    });

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (productStatus.disableCart) return;
    addItem({
      productId: product.id,
      variantId: null,
      productName: product.name,
      variantName: null,
      price: productStatus.displayPrice,
      compareAtPrice: productStatus.isOnSale
        ? productStatus.displayCompareAtPrice
        : null,
      imageUrl: productImage,
      sku: null,
      maxInventory: productStatus.maxInventory,
    });
  };

  return (
    <Link href={`/shop/${product.slug}`} className="vn-prod-link group block">
      {/* Image — 4:5 aspect ratio matching design */}
      <div
        className="vn-prod-pic relative w-full overflow-hidden border border-foreground"
        style={{ aspectRatio: "4 / 5", background: "var(--vn-steel)" }}
      >
        {productImage !== "/placeholder.svg" ? (
          <Image
            src={productImage}
            alt={product.name ?? "Product image"}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          /* Placeholder panel matching design's striped steel */
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background:
                "repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 12px, transparent 12px 24px), linear-gradient(180deg, var(--vn-steel-deep), var(--vn-steel))",
            }}
          >
            <span
              className="font-serif italic select-none"
              style={{
                fontSize: "64px",
                color: "var(--vn-bone)",
                opacity: 0.4,
              }}
            >
              {String(index + 1)}
            </span>
          </div>
        )}

        {/* Top-left: edition stamp (+ status suffix if sold/new) */}
        <div
          className="absolute left-2.5 top-2.5 font-mono text-[10px] tracking-[0.18em] uppercase px-1.5 py-1 whitespace-nowrap"
          style={
            isNew
              ? {
                  background: "var(--vn-paper)",
                  color: "var(--vn-ink)",
                  border: "1px solid var(--vn-ink)",
                }
              : isSoldOut
                ? {
                    background: "var(--vn-steel)",
                    color: "var(--vn-bone)",
                  }
                : {
                    background: "var(--vn-bone)",
                    color: "var(--vn-ink)",
                  }
          }
        >
          {editionLabel}
        </div>

        {/* Top-right: price stamp */}
        <div
          className="absolute right-2.5 top-2.5 font-mono text-[10px] tracking-[0.18em] uppercase px-1.5 py-1 whitespace-nowrap"
          style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
        >
          {formatPrice(productStatus.displayPrice)}
          {productStatus.variablePricing && "+"}
        </div>

        {/* Add-to-cart bar — slides up on hover */}
        {!productStatus.disableCart && (
          <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
            <button
              onClick={handleAddToCart}
              className="flex w-full items-center justify-center gap-2 py-3 font-mono text-[10px] tracking-[0.25em] uppercase transition-opacity hover:opacity-80"
              style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Add to bag
            </button>
          </div>
        )}
      </div>

      {/* Meta — grid: name (1fr) + price (auto), sub row spans both */}
      <div
        className="mt-3"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: "4px 12px",
          alignItems: "baseline",
        }}
      >
        {/* Product name */}
        <h3
          className="font-serif italic leading-[1.1] truncate min-w-0 transition-opacity group-hover:opacity-60"
          style={{ fontSize: "22px", letterSpacing: "-0.005em" }}
        >
          {product.name}
        </h3>

        {/* Price */}
        <span
          className="font-mono whitespace-nowrap"
          style={{ fontSize: "13px", letterSpacing: "0.06em" }}
        >
          {productStatus.isOnSale && productStatus.displayCompareAtPrice ? (
            <span
              className="line-through mr-1.5"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              {formatPrice(productStatus.displayCompareAtPrice)}
            </span>
          ) : null}
          {formatPrice(productStatus.displayPrice)}
        </span>

        {/* Sub row — tagline left, swatches right */}
        <div
          className="col-span-2 flex items-center justify-between gap-3.5 min-w-0"
          style={{ marginTop: "2px" }}
        >
          <span
            className="font-mono text-[10.5px] tracking-[0.16em] uppercase truncate min-w-0"
            style={{ color: "var(--vn-steel)" }}
          >
            {additional?.productTagline ?? (product.sku ? `SKU · ${product.sku}` : " ")}
          </span>

          {/* Variant swatches — 9×9 squares */}
          {swatches.length > 0 && (
            <div className="flex gap-1.5 flex-shrink-0">
              {swatches.map((sw, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    width: "9px",
                    height: "9px",
                    background: sw.bg,
                    border: `1px solid ${sw.border}`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
