"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Eye, Plus } from "lucide-react";

import type { Product } from "~/types";
import { formatPrice } from "~/lib/prices";
import { checkProductStatus } from "~/lib/products/check-product-status";
import { Badge } from "~/components/ui/badge";
import { useCart } from "~/providers/cart-context";
import { WishlistButton } from "~/app/(storefront)/_components/wishlist/wishlist-button";

type Props = {
  product: Product;
  index: number;
};
export function ModernProductCard({ product }: Props) {
  const { addItem } = useCart();
  const [isAdded, setIsAdded] = useState(false);

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
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="group relative">
      <Link href={`/shop/${product.slug}`} className="block">
        <div className="bg-muted relative aspect-square overflow-hidden rounded-sm">
          <Image
            src={productImage}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
          {productStatus?.badgeLabel && (
            <Badge className="bg-accent text-accent-foreground absolute top-3 left-3">
              {productStatus.badgeLabel}
            </Badge>
          )}
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
        className="border-border absolute top-3 right-3 z-10 border bg-white/85"
      />
      <div className="mt-4 flex items-start justify-between">
        <div>
          <Link href={`/shop/${product.slug}`}>
            <h3 className="text-foreground group-hover:text-muted-foreground text-sm font-medium transition-colors">
              {product.name}
            </h3>
          </Link>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground text-sm">
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

        {productStatus.hasVariants ? (
          <Link
            href={`/shop/${product.slug}`}
            aria-label={`View ${product.name}`}
            className="border-border text-foreground hover:bg-primary hover:text-primary-foreground flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <>
            <button
              type="button"
              className="border-border text-foreground hover:bg-primary hover:text-primary-foreground flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
              onClick={handleAddToCart}
              aria-disabled={productStatus.disableCart ? "true" : undefined}
              aria-label={`Add ${product.name} to cart`}
            >
              {isAdded ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            <span className="sr-only" aria-live="polite" aria-atomic="true">
              {isAdded ? `${product.name} added to cart` : ""}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
