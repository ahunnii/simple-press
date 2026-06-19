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
      <div className="relative mb-4 aspect-3/4 overflow-hidden rounded-[var(--radius)] bg-[#f6f6f6]">
        {productImage ? (
          <Image
            src={productImage}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#6b6b6b]">
            <ShoppingBag className="h-10 w-10" aria-hidden="true" />
          </div>
        )}

        {/* Sale badge */}
        {productStatus.isOnSale && productStatus.displayCompareAtPrice && (
          <div className="absolute top-3 left-3 rounded-[2px] bg-[#0a0a0a] px-2 py-1 text-[10px] font-medium tracking-[0.14em] text-white uppercase">
            {computeSavingsLabel(
              productStatus.displayPrice,
              productStatus.displayCompareAtPrice,
            )}
          </div>
        )}

        {/* Out of stock badge */}
        {productStatus.isOutOfStock && (
          <div className="absolute top-3 left-3 rounded-[2px] bg-[#0a0a0a] px-2 py-1 text-[10px] font-medium tracking-[0.14em] text-white uppercase">
            Sold Out
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-0.5">
        <h3 className="line-clamp-1 font-serif text-[15px] font-medium tracking-[-0.005em] transition-opacity group-hover:opacity-70">
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          <p className="text-[14px] text-[#6b6b6b]">
            {formatPrice(productStatus.displayPrice)}
            {productStatus.variablePricing && <span className="ml-0.5">+</span>}
          </p>
          {productStatus.isOnSale && productStatus.displayCompareAtPrice && (
            <p className="text-[13px] text-[#6b6b6b] line-through">
              {formatPrice(productStatus.displayCompareAtPrice)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
