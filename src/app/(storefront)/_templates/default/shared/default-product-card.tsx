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

export function DefaultProductCard({ product }: Props) {
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
    <Link href={`/shop/${product.slug}`} className="group block">
      {/* Image */}
      <div className="relative mb-4 aspect-3/4 overflow-hidden bg-[#f6f6f6] rounded-[var(--radius)]">
        {productImage ? (
          <Image
            src={productImage}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="text-[#a3a3a3] flex h-full w-full items-center justify-center">
            <ShoppingBag className="h-10 w-10" />
          </div>
        )}

        {/* Sale badge */}
        {productStatus.isOnSale && productStatus.displayCompareAtPrice && (
          <div className="absolute top-3 left-3 bg-[#0a0a0a] text-white text-[10px] font-medium tracking-[0.14em] uppercase px-2 py-1 rounded-[2px]">
            {computeSavingsLabel(
              productStatus.displayPrice,
              productStatus.displayCompareAtPrice,
            )}
          </div>
        )}

        {/* Out of stock badge */}
        {productStatus.isOutOfStock && (
          <div className="absolute top-3 left-3 bg-[#0a0a0a] text-white text-[10px] font-medium tracking-[0.14em] uppercase px-2 py-1 rounded-[2px]">
            Sold Out
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-0.5">
        <h3 className="font-serif text-[15px] font-medium tracking-[-0.005em] line-clamp-1 group-hover:opacity-70 transition-opacity">
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          <p className="text-[14px] text-[#6b6b6b]">
            {formatPrice(productStatus.displayPrice)}
            {productStatus.variablePricing && (
              <span className="ml-0.5">+</span>
            )}
          </p>
          {productStatus.isOnSale && productStatus.displayCompareAtPrice && (
            <p className="text-[13px] text-[#a3a3a3] line-through">
              {formatPrice(productStatus.displayCompareAtPrice)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
