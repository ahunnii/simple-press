"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Plus } from "lucide-react";

import type { Product } from "~/types";
import { formatPrice } from "~/lib/prices";
import { checkProductStatus } from "~/lib/products/check-product-status";
import { Badge } from "~/components/ui/badge";
import { useCart } from "~/providers/cart-context";

type Props = {
  product: Product;
  index: number;
};
export function ModernProductCard({ product }: Props) {
  const { addItem } = useCart();
  const router = useRouter();

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
    <div className="group">
      <Link href={`/shop/${product.slug}`} className="block">
        <div className="bg-muted relative aspect-square overflow-hidden rounded-sm">
          <Image
            src={productImage}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
          {productStatus?.badgeLabel && (
            <Badge className="bg-accent text-accent-foreground absolute top-3 left-3">
              {productStatus.badgeLabel}
            </Badge>
          )}
        </div>
      </Link>
      <div className="mt-4 flex items-start justify-between">
        <div>
          <Link href={`/shop/${product.id}`}>
            <h3 className="text-foreground group-hover:text-muted-foreground text-sm font-medium transition-colors">
              {product.name}
            </h3>
          </Link>
          <p className="text-muted-foreground mt-1 text-sm">
            {formatPrice(product.price)}
          </p>
        </div>

        {productStatus.hasVariants ? (
          <button
            type="button"
            onClick={() => router.push(`/shop/${product.slug}`)}
            aria-label={`View ${product.name}`}
            className="border-border text-foreground hover:bg-primary hover:text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full border transition-colors"
          >
            <Eye className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            className="border-border text-foreground hover:bg-primary hover:text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full border transition-colors"
            onClick={handleAddToCart}
            disabled={productStatus.disableCart}
            aria-label="Add to cart"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
