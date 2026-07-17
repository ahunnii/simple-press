"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, Eye, ShoppingCart } from "lucide-react";

import type { Product } from "~/types";
import { computeSavingsLabel, formatPrice } from "~/lib/prices";
import { parseCardAdditionalFields } from "~/lib/products";
import { checkProductStatus } from "~/lib/products/check-product-status";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { useCart } from "~/providers/cart-context";
import { WishlistButton } from "~/app/(storefront)/_components/wishlist/wishlist-button";

type Props = {
  product: Product;
  saleBadgeFormat?: string;
  index: number;
};

export function HappyBambooProductCard({
  product,
  saleBadgeFormat = "true",
}: Props) {
  const { addItem } = useCart();
  const { productTagline } = parseCardAdditionalFields(
    product.additionalFields,
  );

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
  };

  const productHref = `/shop/${product.slug}`;

  return (
    <Card className="group border-border/80 bg-card hover:border-primary/25 h-full overflow-hidden rounded-xl border py-0 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex h-full flex-col sm:flex-row sm:items-stretch">
        {/* Image — wrapper div holds layout so the wishlist heart can sit as
            a sibling of the link (no <button> inside <a>) */}
        <div className="bg-secondary relative aspect-5/3 w-full flex-none shrink-0 overflow-hidden rounded-t-xl sm:aspect-auto sm:min-h-[160px] sm:w-44 sm:rounded-t-none sm:rounded-l-xl md:w-52 md:flex-1">
          <Link
            href={productHref}
            className="absolute inset-0 block"
            aria-label={`View ${product.name}`}
            tabIndex={-1}
          >
            <Image
              src={productImage}
              alt={product.name ?? "Product"}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, 208px"
            />
            {productStatus.comingSoon && (
              <Badge className="absolute top-2 left-2 bg-amber-500 text-white hover:bg-amber-600">
                <Clock className="mr-1 h-3 w-3" />
                Coming Soon
              </Badge>
            )}
            {!productStatus.comingSoon &&
              productStatus.isOnSale &&
              productStatus.displayCompareAtPrice && (
                <Badge className="absolute top-2 left-2 bg-black text-white hover:bg-black/90">
                  {computeSavingsLabel(
                    productStatus.displayPrice,
                    productStatus.displayCompareAtPrice,
                    saleBadgeFormat,
                  )}
                </Badge>
              )}
            {!productStatus.comingSoon &&
              !productStatus.isOnSale &&
              productStatus.isOutOfStock && (
                <Badge
                  variant="secondary"
                  className="absolute top-2 left-2 bg-black/60 text-white"
                >
                  Out of Stock
                </Badge>
              )}
            {!productStatus.comingSoon &&
              !productStatus.isOnSale &&
              productStatus.isBackorder && (
                <Badge className="absolute top-2 left-2 bg-blue-500 text-white hover:bg-blue-600">
                  Pre-order
                </Badge>
              )}
          </Link>
          <WishlistButton
            item={{
              productId: product.id,
              name: product.name,
              slug: product.slug,
              price: productStatus.displayPrice,
              imageUrl: product.images[0]?.url ?? null,
            }}
            className="absolute top-2 right-2 z-10"
          />
        </div>

        {/* Content */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-3 px-4 py-8">
          <div className="min-w-0 space-y-1">
            <Link
              href={productHref}
              className="text-foreground font-heading hover:text-primary focus-visible:ring-ring block font-semibold tracking-tight transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <h3 className="line-clamp-2 text-base leading-snug sm:text-lg">
                {product.name}
              </h3>
            </Link>
            <div className="min-h-6">
              {productTagline && (
                <p className="text-muted-foreground text-base font-medium">
                  {productTagline}
                </p>
              )}
            </div>
            <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
              {product.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex items-baseline gap-2">
              <p className="text-primary text-lg font-bold tabular-nums">
                {formatPrice(productStatus.displayPrice)}
              </p>
              {productStatus.isOnSale &&
                productStatus.displayCompareAtPrice && (
                  <p className="text-muted-foreground text-sm tabular-nums line-through">
                    {formatPrice(productStatus.displayCompareAtPrice)}
                  </p>
                )}
            </div>
            <div className="flex flex-wrap gap-2">
              {!productStatus.hasVariants && (
                <Button
                  type="button"
                  size="sm"
                  className={`gap-1.5 ${productStatus.disableCart ? "aria-disabled:cursor-not-allowed aria-disabled:opacity-50" : ""}`}
                  onClick={handleAddToCart}
                  aria-disabled={productStatus.disableCart}
                  aria-label={
                    productStatus.comingSoon
                      ? `${product.name} — coming soon`
                      : productStatus.isOutOfStock
                        ? `${product.name} — out of stock`
                        : `Add ${product.name} to cart`
                  }
                >
                  <ShoppingCart
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  {productStatus.comingSoon
                    ? "Coming Soon"
                    : productStatus.isOutOfStock
                      ? "Out of stock"
                      : "Add to cart"}
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <Link href={productHref}>
                  <Eye className="size-4 shrink-0" aria-hidden />
                  Details
                  <ArrowRight className="size-3.5 opacity-60" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
