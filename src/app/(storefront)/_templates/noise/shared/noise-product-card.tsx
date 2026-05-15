"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import type { Product } from "~/types";
import { formatPrice } from "~/lib/prices";
import { parseCardAdditionalFields } from "~/lib/products";
import { checkProductStatus } from "~/lib/products/check-product-status";
import { useCart } from "~/providers/cart-context";

type Props = {
  product: Product;
  index: number;
};

export function NoiseProductCard({ product }: Props) {
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
    <Link href={`/shop/${product.slug}`} className="group block">
      {/* Image container */}
      <div className="bg-muted relative aspect-square w-full overflow-hidden">
        <Image
          src={productImage}
          alt={product.name ?? "Product Image"}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Status badges */}
        {productStatus?.badgeLabel && (
          <div className="bg-foreground text-background absolute top-3 left-3 px-2 py-1 font-sans text-[9px] tracking-[0.2em] uppercase">
            {productStatus.badgeLabel}
          </div>
        )}

        {/* Hover Add to Cart overlay */}
        {!productStatus.disableCart && (
          <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
            <button
              onClick={handleAddToCart}
              className="bg-foreground text-background flex w-full items-center justify-center gap-2 py-3 font-sans text-[10px] tracking-[0.25em] uppercase transition-opacity hover:opacity-80"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Add to Cart
            </button>
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="mt-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-foreground truncate font-serif text-base leading-tight font-light transition-opacity group-hover:opacity-70">
            {product.name}
          </h3>
          {additional?.productTagline && (
            <p className="text-muted-foreground mt-0.5 truncate font-sans text-xs">
              {additional.productTagline}
            </p>
          )}
        </div>
        <span className="text-foreground shrink-0 font-sans text-sm font-medium">
          {formatPrice(productStatus.displayPrice)}{" "}
          {productStatus.variablePricing && (
            <span className="ml-1 text-base">+</span>
          )}
          {productStatus.isOnSale && productStatus.displayCompareAtPrice && (
            <span className="text-muted-foreground text-sm line-through">
              {formatPrice(productStatus.displayCompareAtPrice)}
            </span>
          )}
        </span>
      </div>
    </Link>
  );
}
