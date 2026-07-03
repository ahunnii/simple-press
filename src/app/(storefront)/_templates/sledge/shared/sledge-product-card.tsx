"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import type { Product } from "~/types";
import { formatPrice } from "~/lib/prices";
import { parseCardAdditionalFields } from "~/lib/products";
import { checkProductStatus } from "~/lib/products/check-product-status";
import { useCart } from "~/providers/cart-context";
import { WishlistButton } from "~/app/(storefront)/_components/wishlist/wishlist-button";

type Props = {
  product: Product;
  index: number;
};

export function NoiseProductCard({ product, index: _index }: Props) {
  const { addItem } = useCart();
  // S-2: announce add-to-cart feedback to screen readers
  const [announce, setAnnounce] = useState("");

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

  const isNew = productStatus.badgeLabel?.toLowerCase() === "new";
  const isSoldOut = productStatus.isOutOfStock;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (productStatus.disableCart) return;
    addItem({
      productId: product.id,
      productSlug: product.slug,
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
    // S-2: set announce message for screen readers
    setAnnounce(`${product.name} added to cart`);
  };

  return (
    <div className="group relative">
      {/* S-2: sr-only live region for add-to-cart feedback */}
      <span className="sr-only" role="status">
        {announce}
      </span>
      {/* Image — rounded card, zoom on hover */}
      <Link
        href={`/shop/${product.slug}`}
        className="sledge-card-img relative block w-full overflow-hidden rounded-2xl"
      >
        <Image
          src={productImage}
          alt={product.name ?? "Product image"}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Status badge */}
        {productStatus?.badgeLabel && (
          <div
            className={`sledge-card-badge absolute top-2.5 left-2.5 px-1.5 py-1 font-mono text-[10px] tracking-[0.18em] whitespace-nowrap uppercase ${
              isNew
                ? "sledge-badge-new"
                : isSoldOut
                  ? "sledge-badge-sold"
                  : "sledge-badge-default"
            }`}
          >
            {productStatus.badgeLabel}
          </div>
        )}
      </Link>

      {/* Wishlist heart — top-right of the image (badge is top-left); sits as
          a sibling of the image link so it's never a <button> inside an <a> */}
      <WishlistButton
        item={{
          productId: product.id,
          name: product.name,
          slug: product.slug,
          price: productStatus.displayPrice,
          imageUrl: product.images[0]?.url ?? null,
        }}
        className="absolute top-2.5 right-2.5 z-10"
      />

      {/*
       * Single meta section — no duplicate panel.
       * On hover it lifts toward the image and gains a white card treatment.
       * The CTA reveals via grid-rows height animation so it occupies no space
       * in the default state. The translate-up (~32px) roughly equals the CTA
       * height so the visual card bottom stays consistent across hover/default.
       */}
      <div className="sledge-card-meta">
        <h3 className="sledge-card-name min-w-0 truncate leading-tight">
          <Link
            href={`/shop/${product.slug}`}
            className="font-serif transition-opacity hover:opacity-60"
          >
            {product.name}
          </Link>
        </h3>

        <span className="sledge-card-price mt-1.5 block font-mono">
          {productStatus.isOnSale && productStatus.displayCompareAtPrice ? (
            <span className="sledge-price-compare mr-2 line-through">
              {formatPrice(productStatus.displayCompareAtPrice)}
            </span>
          ) : null}
          {formatPrice(productStatus.displayPrice)}
          {productStatus.variablePricing && "+"}
        </span>

        {additional?.productTagline && (
          <span className="sledge-card-tagline mt-1 block min-w-0 truncate font-mono text-[11px] tracking-[0.14em] uppercase">
            {additional.productTagline}
          </span>
        )}

        {/* CTA — always in layout, opacity-only reveal so card height never shifts */}
        <div className="sledge-cta-reveal">
          {!productStatus.disableCart ? (
            <button
              type="button"
              onClick={handleAddToCart}
              aria-label={`Add ${product.name} to cart`}
              className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase transition-opacity hover:opacity-60"
            >
              Add to cart →
            </button>
          ) : (
            <Link
              href={`/shop/${product.slug}`}
              aria-label={`View ${product.name}`}
              className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase transition-opacity hover:opacity-60"
            >
              View item →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
