"use client";

import Image from "next/image";
import Link from "next/link";

import type { Product } from "~/types";
import { formatPrice } from "~/lib/prices";
import { checkProductStatus } from "~/lib/products/check-product-status";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";

type Props = {
  product: Product;
  saleBadgeFormat?: string;
  index: number;
};

export function PollenProductCard({ product }: Props) {
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
    <Link
      href={`/shop/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-md border border-[#2a351f]/20 bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-[#f5f2ee]">
        {/* M-6: alt="" — name is already visible text in the link */}
        <Image
          src={productImage}
          alt=""
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {productStatus?.badgeLabel && (
          <Badge className="bg-primary text-primary-foreground absolute top-3 left-3">
            {productStatus.badgeLabel}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-lg font-semibold text-[#2a351f] transition-colors group-hover:text-[#5e7747]">
            {product.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[#4c566a]">
            {product.description}
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-xl font-bold text-[#215935]">
            {formatPrice(productStatus.displayPrice)}
            {productStatus.variablePricing && (
              <span className="ml-1 text-base">+</span>
            )}
            {productStatus.isOnSale && productStatus.displayCompareAtPrice && (
              <span className="text-muted-foreground text-sm line-through">
                {formatPrice(productStatus.displayCompareAtPrice)}
              </span>
            )}
          </span>
          {/* S-10: replace <Button> with styled <span> to avoid <button> inside <a> */}
          <span
            aria-hidden="true"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-[#215935] text-white hover:bg-[#1a4729]",
            )}
          >
            View Product
          </span>
        </div>
      </div>
    </Link>
  );
}
