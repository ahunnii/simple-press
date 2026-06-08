"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import type { Product } from "~/types";
import { computeSavingsLabel, formatPrice } from "~/lib/prices";
import { checkProductStatus } from "~/lib/products/check-product-status";

type Props = {
  product: Product;
  index: number;
};
export function DarkTrendProductCard({ product }: Props) {
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

  return (
    <div className="group relative">
      <Link href={`/shop/${product.slug}`} className="block">
        {/* Image Container */}
        <div className="bg-secondary relative mb-4 aspect-3/4 overflow-hidden rounded-lg">
          {productImage ? (
            <Image
              src={productImage}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="text-muted-foreground flex h-full w-full items-center justify-center">
              <ShoppingBag className="h-12 w-12" aria-hidden="true" />
            </div>
          )}

          {/* Discount Badge */}
          {productStatus.isOnSale && productStatus.displayCompareAtPrice && (
            <div className="bg-primary text-primary-foreground absolute top-3 left-3 rounded px-2 py-1 text-xs font-medium">
              {computeSavingsLabel(
                productStatus.displayPrice,
                productStatus.displayCompareAtPrice,
              )}
            </div>
          )}

          {/* Out of Stock Badge */}
          {productStatus.isOutOfStock && (
            <div className="bg-destructive text-destructive-foreground absolute top-3 right-3 rounded px-2 py-1 text-xs font-medium">
              Sold Out
            </div>
          )}

          {/* Decorative hover overlay — the whole card is a link; this span is aria-hidden */}
          <div
            aria-hidden="true"
            className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
          >
            <span className="bg-primary text-primary-foreground font-heading flex w-full items-center justify-center rounded-md px-4 py-2 text-sm tracking-wider">
              VIEW PRODUCT
            </span>
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-1">
          {/* {product.ad && (
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {product.productType}
          </p>
        )} */}
          <h3 className="text-foreground group-hover:text-primary line-clamp-2 font-medium transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center gap-2">
            <p className="text-primary font-medium">
              {formatPrice(productStatus.displayPrice)}
              {productStatus.variablePricing && (
                <span className="ml-1 text-base">+</span>
              )}
            </p>
            {productStatus.isOnSale && productStatus.displayCompareAtPrice && (
              <p className="text-muted-foreground text-sm line-through">
                {formatPrice(productStatus.displayCompareAtPrice)}
              </p>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
