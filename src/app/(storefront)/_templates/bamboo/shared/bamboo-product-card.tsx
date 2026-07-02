"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye } from "lucide-react";

import type { Product } from "~/types";
import { formatPrice } from "~/lib/prices";
import { checkProductStatus } from "~/lib/products/check-product-status";
import { Badge } from "~/components/ui/badge";
import { WishlistButton } from "~/app/(storefront)/_components/wishlist/wishlist-button";

type Props = {
  product: Product;
  index: number;
};

export function BambooProductCard({ product }: Props) {
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
    // Relative wrapper so the wishlist button is a sibling of the card link
    // (never a <button> inside an <a>) while overlaying the image corner.
    <div className="relative h-full">
      <Link
        href={`/shop/${product.slug}`}
        className="group border-border bg-card flex h-full flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-lg"
      >
        <div className="bg-secondary relative aspect-square overflow-hidden">
          <Image
            src={productImage}
            alt={product.name ?? "Product Image"}
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
        <div className="flex flex-1 flex-col gap-4 p-5">
          <div>
            <h3 className="text-card-foreground group-hover:text-primary font-heading text-lg font-semibold transition-colors">
              {product.name}
            </h3>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {product.description?.slice(0, 100)}...
            </p>
          </div>

          <div className="mt-auto flex items-center justify-between gap-4 pt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-foreground items-center text-xl font-bold">
                {formatPrice(productStatus.displayPrice)}{" "}
                {productStatus.variablePricing && (
                  <span className="text-muted-foreground text-sm">+</span>
                )}
              </span>
              {productStatus.isOnSale &&
                productStatus.displayCompareAtPrice && (
                  <span className="text-muted-foreground text-sm line-through">
                    <span className="sr-only">Original price: </span>
                    {formatPrice(productStatus.displayCompareAtPrice)}
                  </span>
                )}
            </div>
            <span
              aria-hidden="true"
              className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium"
            >
              <Eye className="size-4" />
              View Product
            </span>
          </div>
        </div>
      </Link>
      <WishlistButton
        item={{
          productId: product.id,
          name: product.name,
          slug: product.slug,
          price: productStatus.displayPrice,
          imageUrl: product.images[0]?.url ?? null,
        }}
        className="absolute top-3 right-3 z-10"
      />
    </div>
  );
}

export function BambooHorizontalProductCard({ product }: Props) {
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
      className="group border-border bg-card relative flex gap-4 rounded-xl border p-4 transition-shadow hover:shadow-lg"
    >
      <div className="bg-secondary relative size-24 shrink-0 overflow-hidden rounded-lg">
        <Image
          src={productImage}
          alt={product.name ?? "Product Image"}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="96px"
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="relative">
          <h3 className="text-card-foreground group-hover:text-primary font-heading text-base font-semibold transition-colors">
            {product.name}
          </h3>
          <p className="text-muted-foreground line-clamp-1 text-sm">
            {product.description?.slice(0, 50)}...
          </p>
        </div>

        <div className="mt-auto flex items-baseline gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-foreground items-center text-xl font-bold">
              {formatPrice(productStatus.displayPrice)}{" "}
              {productStatus.variablePricing && (
                <span className="text-muted-foreground text-sm">+</span>
              )}
            </span>
            {productStatus.isOnSale && productStatus.displayCompareAtPrice && (
              <span className="text-muted-foreground text-sm line-through">
                <span className="sr-only">Original price: </span>
                {formatPrice(productStatus.displayCompareAtPrice)}
              </span>
            )}
          </div>
          {/* <Button
            onClick={() => router.push(`/shop/${product.slug}`)}
            className="gap-2"
          >
            <Eye className="size-4" />
            View Product
          </Button> */}
        </div>
      </div>

      {productStatus?.badgeLabel && (
        <Badge className="bg-primary text-primary-foreground absolute top-3 right-3">
          {productStatus.badgeLabel}
        </Badge>
      )}
    </Link>
  );
}
