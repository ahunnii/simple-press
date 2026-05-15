"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, ShoppingBag } from "lucide-react";

import type { Product } from "~/types";
import { computeSavingsLabel, formatPrice } from "~/lib/prices";
import { checkProductStatus } from "~/lib/products/check-product-status";
import { Badge } from "~/components/ui/badge";
import { useCart } from "~/providers/cart-context";

type Props = {
  product: Product;
  index: number;
  isVisible: boolean;
  saleBadgeFormat?: string;
};

export function ElegantProductCard({ product, index, isVisible }: Props) {
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const productImage = product.images[0]?.url ?? "/placeholder.svg";
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
  const router = useRouter();

  return (
    <Link
      href={`/shop/${product.slug}`}
      className={`group transition-all duration-700 ease-out ${
        isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
      }`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className="bg-card boty-shadow boty-transition overflow-hidden rounded-3xl group-hover:scale-[1.02]">
        {/* Image */}
        <div className="bg-muted relative aspect-square overflow-hidden">
          {/* Skeleton */}
          <div
            className={`from-muted via-muted/50 to-muted absolute inset-0 animate-pulse bg-linear-to-br transition-opacity duration-500 ${
              imageLoaded ? "opacity-0" : "opacity-100"
            }`}
          />

          <Image
            src={product.images[0]?.url ?? "/placeholder.svg"}
            alt={product.name}
            fill
            className={`boty-transition object-cover transition-opacity duration-500 group-hover:scale-105 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImageLoaded(true)}
          />
          {productStatus?.badgeLabel && (
            <Badge className="bg-accent text-accent-foreground absolute top-4 left-4 rounded-full px-3 py-1 text-xs tracking-wide">
              {productStatus.badgeLabel}
            </Badge>
          )}

          {/* Quick add button */}
          {productStatus.hasVariants ? (
            <button
              type="button"
              aria-label="View product"
              onClick={() => router.push(`/shop/${product.slug}`)}
              className="boty-shadow bg-background/90 hover:bg-primary hover:text-primary-foreground absolute right-4 bottom-4 flex h-12 w-12 translate-y-2 cursor-pointer items-center justify-center rounded-full opacity-0 backdrop-blur-sm transition-colors group-hover:translate-y-0 group-hover:opacity-100"
            >
              <Eye className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              className="boty-shadow bg-background/90 hover:bg-primary hover:text-primary-foreground absolute right-4 bottom-4 flex h-12 w-12 translate-y-2 cursor-pointer items-center justify-center rounded-full opacity-0 backdrop-blur-sm transition-colors group-hover:translate-y-0 group-hover:opacity-100"
              onClick={handleAddToCart}
              disabled={productStatus.disableCart}
              aria-label="Add to cart"
            >
              <ShoppingBag className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Info */}
        <div className="p-6">
          <h3 className="text-foreground mb-1 font-serif text-xl">
            {product.name}
          </h3>
          <p className="text-muted-foreground mb-4 line-clamp-2 min-h-[2.5em] text-sm">
            {product.description}
          </p>

          <div className="flex items-center gap-2">
            <span className="text-foreground text-lg font-medium">
              {formatPrice(productStatus.displayPrice)}
              {productStatus.variablePricing && (
                <span className="ml-1 text-base">+</span>
              )}
            </span>
            {productStatus.isOnSale && productStatus.displayCompareAtPrice && (
              <span className="text-muted-foreground text-sm line-through">
                {formatPrice(productStatus.displayCompareAtPrice)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
