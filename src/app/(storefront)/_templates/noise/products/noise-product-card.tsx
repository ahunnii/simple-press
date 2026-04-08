"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { formatPrice } from "~/lib/prices";
import { useCart } from "~/providers/cart-context";

type NoiseProductCardProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  slug: string;
  additionalFields: unknown;
  trackInventory: boolean;
  inventoryQty: number | null;
  allowBackorders: boolean;
};

type NoiseProductCardProps = {
  product: NoiseProductCardProduct;
  index?: number;
};

function getAdditionalFields(raw: unknown) {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as { comingSoon?: boolean; productTagline?: string } | null;
}

export function NoiseProductCard({ product }: NoiseProductCardProps) {
  const { addItem } = useCart();
  const additional = getAdditionalFields(product.additionalFields);

  const isComingSoon = additional?.comingSoon === true;
  const isOutOfStock =
    product.trackInventory &&
    (product.inventoryQty ?? 0) === 0 &&
    !product.allowBackorders;
  const isBackorder =
    product.trackInventory &&
    (product.inventoryQty ?? 0) === 0 &&
    product.allowBackorders;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isComingSoon || isOutOfStock) return;
    addItem(
      {
        productId: product.id,
        variantId: null,
        productName: product.name,
        variantName: null,
        price: product.price,
        imageUrl: product.image,
        sku: null,
        maxInventory: product.trackInventory ? (product.inventoryQty ?? undefined) : undefined,
      },
      1,
    );
  };

  return (
    <Link href={`/shop/${product.slug}`} className="group block">
      {/* Image container */}
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Status badges */}
        {isComingSoon && (
          <div className="absolute top-3 left-3 bg-foreground px-2 py-1 font-sans text-[9px] tracking-[0.2em] uppercase text-background">
            Coming Soon
          </div>
        )}
        {isOutOfStock && !isComingSoon && (
          <div className="absolute top-3 left-3 bg-foreground/60 px-2 py-1 font-sans text-[9px] tracking-[0.2em] uppercase text-background">
            Sold Out
          </div>
        )}
        {isBackorder && (
          <div className="absolute top-3 left-3 bg-foreground/60 px-2 py-1 font-sans text-[9px] tracking-[0.2em] uppercase text-background">
            Pre-Order
          </div>
        )}

        {/* Hover Add to Cart overlay */}
        {!isComingSoon && !isOutOfStock && (
          <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
            <button
              onClick={handleAddToCart}
              className="flex w-full items-center justify-center gap-2 bg-foreground py-3 font-sans text-[10px] tracking-[0.25em] uppercase text-background transition-opacity hover:opacity-80"
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
          <h3 className="font-serif text-base font-light leading-tight text-foreground group-hover:opacity-70 transition-opacity truncate">
            {product.name}
          </h3>
          {additional?.productTagline && (
            <p className="mt-0.5 font-sans text-xs text-muted-foreground truncate">
              {additional.productTagline}
            </p>
          )}
        </div>
        <span className="shrink-0 font-sans text-sm font-medium text-foreground">
          {formatPrice(product.price)}
        </span>
      </div>
    </Link>
  );
}
