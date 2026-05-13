"use client";

import type {
  BaseInventoryUnit,
  Product,
  Image as ProductImage,
  ProductVariant,
} from "generated/prisma";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, ShoppingBag } from "lucide-react";

import { computeSavingsLabel, formatPrice } from "~/lib/prices";
import { useProductCard } from "~/hooks/use-product-card";
import { Badge } from "~/components/ui/badge";
import { useCart } from "~/providers/cart-context";

type Props = {
  product: Product & { variants: ProductVariant[] } & {
    baseInventoryUnit: Partial<BaseInventoryUnit> | null;
  } & { images: ProductImage[] };
  index: number;
  isVisible: boolean;
  saleBadgeFormat?: string;
};

export function ElegantProductCard({
  product,
  index,
  isVisible,
  saleBadgeFormat = "true",
}: Props) {
  const { addItem } = useCart();
  const {
    isOnSale,
    isOutOfStock,
    isBackorder,
    comingSoon,
    disableCart,
    hasVariants,
    poolEffectiveMaxQty,
    displayPrice,
    displayCompareAtPrice,
  } = useProductCard(product);

  const [imageLoaded, setImageLoaded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disableCart) return;
    addItem({
      productId: product.id,
      variantId: null,
      productName: product.name,
      variantName: null,
      price: displayPrice,
      compareAtPrice: isOnSale ? displayCompareAtPrice : null,
      imageUrl: product.images[0]?.url ?? "/placeholder.svg",
      sku: null,
      maxInventory: poolEffectiveMaxQty ?? undefined,
    });
  };

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

          {comingSoon && (
            <Badge className="absolute top-4 left-4 rounded-full bg-amber-500 px-3 py-1 text-xs tracking-wide text-white hover:bg-amber-600">
              Coming Soon
            </Badge>
          )}
          {!comingSoon && isOnSale && (
            <Badge className="absolute top-4 left-4 rounded-full bg-black px-3 py-1 text-xs tracking-wide text-white hover:bg-black/90">
              {computeSavingsLabel(
                product.price,
                product.compareAtPrice!,
                saleBadgeFormat,
              )}
            </Badge>
          )}
          {!comingSoon && !isOnSale && isOutOfStock && (
            <Badge
              variant="secondary"
              className="absolute top-4 left-4 rounded-full bg-black/60 px-3 py-1 text-xs tracking-wide text-white"
            >
              Out of Stock
            </Badge>
          )}
          {!comingSoon && !isOnSale && isBackorder && (
            <Badge className="absolute top-4 left-4 rounded-full bg-blue-500 px-3 py-1 text-xs tracking-wide text-white hover:bg-blue-600">
              Pre-order
            </Badge>
          )}
          {/* Quick add button */}
          {hasVariants ? (
            <Link
              href={`/shop/${product.slug}`}
              className="bg-background/90 boty-transition boty-shadow absolute right-4 bottom-4 flex h-12 w-12 translate-y-2 items-center justify-center rounded-full opacity-0 backdrop-blur-sm group-hover:translate-y-0 group-hover:opacity-100"
            >
              <Eye className="text-foreground h-5 w-5" />
            </Link>
          ) : (
            <button
              type="button"
              className="bg-background/90 boty-transition boty-shadow absolute right-4 bottom-4 flex h-12 w-12 translate-y-2 items-center justify-center rounded-full opacity-0 backdrop-blur-sm group-hover:translate-y-0 group-hover:opacity-100"
              onClick={handleAddToCart}
              disabled={disableCart}
              aria-label="Add to cart"
            >
              <ShoppingBag className="text-foreground h-5 w-5" />
            </button>
          )}
        </div>

        {/* Info */}
        <div className="p-6">
          <h3 className="text-foreground mb-1 font-serif text-xl">
            {product.name}
          </h3>
          <p className="text-muted-foreground mb-4 text-sm">
            {product.description}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-foreground text-lg font-medium">
              {formatPrice(displayPrice)}
            </span>
            {isOnSale && (
              <span className="text-muted-foreground text-sm line-through">
                {formatPrice(displayCompareAtPrice!)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
