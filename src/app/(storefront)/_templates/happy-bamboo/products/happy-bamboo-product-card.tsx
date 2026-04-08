"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock, Eye, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
import { formatPrice } from "~/lib/prices";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { useCart } from "~/providers/cart-context";

type Props = {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    originalPrice: number | null;
    image: string;
    badge: string | null;
    category: string;
    slug: string;
    additionalFields?: unknown;
    trackInventory?: boolean | null;
    inventoryQty?: number | null;
    allowBackorders?: boolean | null;
  };
  index: number;
};

function parseCardAdditionalFields(raw: unknown): {
  comingSoon?: boolean;
  productTagline?: string;
} {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  return {
    comingSoon:
      typeof obj.comingSoon === "boolean" ? obj.comingSoon : undefined,
    productTagline:
      typeof obj.productTagline === "string" ? obj.productTagline : undefined,
  };
}

export function HappyBambooProductCard({ product }: Props) {
  const { addItem } = useCart();

  const { comingSoon, productTagline } = parseCardAdditionalFields(
    product.additionalFields,
  );
  const isOutOfStock =
    !!product.trackInventory &&
    !product.allowBackorders &&
    (product.inventoryQty ?? 0) === 0;
  const isBackorder =
    !!product.trackInventory &&
    !!product.allowBackorders &&
    (product.inventoryQty ?? 0) === 0;
  const disableCart = !!comingSoon || isOutOfStock;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disableCart) return;
    addItem({
      productId: product.id,
      variantId: null,
      productName: product.name,
      variantName: null,
      price: product.price,
      imageUrl: product.image,
      sku: null,
    });
    toast.success(`${product.name} added to cart`);
  };

  const router = useRouter();
  return (
    <Link href={`/shop/${product.slug}`}>
      <Card className="group h-full overflow-hidden transition-all hover:shadow-lg">
        <div className="bg-muted relative aspect-square overflow-hidden">
          <Image
            src={product.image ?? "/placeholder.svg"}
            alt={product.name ?? "Product Image"}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {comingSoon && (
            <Badge className="absolute top-3 left-3 bg-amber-500 text-white hover:bg-amber-600">
              <Clock className="mr-1 h-3 w-3" />
              Coming Soon
            </Badge>
          )}
          {!comingSoon && isOutOfStock && (
            <Badge
              variant="secondary"
              className="absolute top-3 left-3 bg-black/60 text-white"
            >
              Out of Stock
            </Badge>
          )}
          {!comingSoon && isBackorder && (
            <Badge className="absolute top-3 left-3 bg-blue-500 text-white hover:bg-blue-600">
              Pre-order
            </Badge>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="text-foreground group-hover:text-primary mb-1 font-semibold transition-colors">
            {product.name}
          </h3>
          {productTagline && (
            <p className="text-muted-foreground mt-0.5 mb-1 text-base font-medium">
              {productTagline}
            </p>
          )}
          <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">
            {product.description}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-primary text-xl font-bold">
              {formatPrice(product.price)}
            </span>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <Button
            className="gap-2"
            onClick={handleAddToCart}
            disabled={disableCart}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {comingSoon
              ? "Coming Soon"
              : isOutOfStock
                ? "Out of Stock"
                : "Add to Cart"}
          </Button>

          <Button
            onClick={() => router.push(`/shop/${product.slug}`)}
            className="gap-2"
          >
            <Eye className="size-4" />
            View Product
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}

export function HappyBambooHorizontalProductCard({ product }: Props) {
  const { addItem } = useCart();

  const { comingSoon, productTagline } = parseCardAdditionalFields(
    product.additionalFields,
  );
  const isOutOfStock =
    !!product.trackInventory &&
    !product.allowBackorders &&
    (product.inventoryQty ?? 0) === 0;
  const isBackorder =
    !!product.trackInventory &&
    !!product.allowBackorders &&
    (product.inventoryQty ?? 0) === 0;
  const disableCart = !!comingSoon || isOutOfStock;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disableCart) return;
    addItem({
      productId: product.id,
      variantId: null,
      productName: product.name,
      variantName: null,
      price: product.price,
      imageUrl: product.image,
      sku: null,
    });
    toast.success(`${product.name} added to cart`);
  };

  const productHref = `/shop/${product.slug}`;

  return (
    <Card className="group border-border/80 bg-card hover:border-primary/25 h-full overflow-hidden rounded-xl border py-0 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-stretch">
        {/* Image */}
        <Link
          href={productHref}
          className="bg-secondary relative aspect-5/3 w-full shrink-0 overflow-hidden rounded-t-xl sm:aspect-auto sm:min-h-[160px] sm:w-44 sm:rounded-t-none sm:rounded-l-xl md:w-52"
          aria-label={`View ${product.name}`}
          tabIndex={-1}
        >
          <Image
            src={product.image ?? "/placeholder.svg"}
            alt={product.name ?? "Product"}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, 208px"
          />
          {comingSoon && (
            <Badge className="absolute top-2 left-2 bg-amber-500 text-white hover:bg-amber-600">
              <Clock className="mr-1 h-3 w-3" />
              Coming Soon
            </Badge>
          )}
          {!comingSoon && isOutOfStock && (
            <Badge
              variant="secondary"
              className="absolute top-2 left-2 bg-black/60 text-white"
            >
              Out of Stock
            </Badge>
          )}
          {!comingSoon && isBackorder && (
            <Badge className="absolute top-2 left-2 bg-blue-500 text-white hover:bg-blue-600">
              Pre-order
            </Badge>
          )}
        </Link>

        {/* Content */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-3 px-4 py-10">
          <div className="min-w-0 space-y-1">
            <Link
              href={productHref}
              className="text-foreground font-heading hover:text-primary focus-visible:ring-ring block font-semibold tracking-tight transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <h3 className="line-clamp-2 text-base leading-snug sm:text-lg">
                {product.name}
              </h3>
            </Link>
            {productTagline && (
              <p className="text-muted-foreground text-base font-medium">
                {productTagline}
              </p>
            )}
            <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
              {product.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="text-primary text-lg font-bold tabular-nums">
              {formatPrice(product.price)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                onClick={handleAddToCart}
                disabled={disableCart}
                aria-label={`Add ${product.name} to cart`}
              >
                <ShoppingCart className="h-4 w-4 shrink-0" />
                {comingSoon
                  ? "Coming Soon"
                  : isOutOfStock
                    ? "Out of Stock"
                    : "Add to cart"}
              </Button>
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

export function HappyBambooFeaturedProductCard({
  product,
}: {
  product: NonNullable<
    NonNullable<RouterOutputs["business"]["getHomepage"]>["products"]
  >[number];
}) {
  const { addItem } = useCart();

  const { comingSoon, productTagline } = parseCardAdditionalFields(
    product.additionalFields,
  );
  const isOutOfStock =
    !!product.trackInventory &&
    !product.allowBackorders &&
    (product.inventoryQty ?? 0) === 0;
  const isBackorder =
    !!product.trackInventory &&
    !!product.allowBackorders &&
    (product.inventoryQty ?? 0) === 0;
  const disableCart = !!comingSoon || isOutOfStock;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disableCart) return;
    addItem({
      productId: product.id,
      variantId: null,
      productName: product.name,
      variantName: null,
      price: product.price,
      imageUrl: product.images[0]?.url ?? "/placeholder.svg",
      sku: null,
    });
    toast.success(`${product.name} added to cart`);
  };

  const productHref = `/shop/${product.slug}`;

  return (
    <Card className="group border-border/80 bg-card hover:border-primary/25 h-full overflow-hidden rounded-xl border py-0 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-stretch">
        {/* Image */}
        <Link
          href={productHref}
          className="bg-secondary relative aspect-5/3 w-full shrink-0 overflow-hidden rounded-t-xl sm:aspect-auto sm:min-h-[160px] sm:w-44 sm:rounded-t-none sm:rounded-l-xl md:w-52"
          aria-label={`View ${product.name}`}
          tabIndex={-1}
        >
          <Image
            src={product.images[0]?.url ?? "/placeholder.svg"}
            alt={product.name ?? "Product"}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, 208px"
          />
          {comingSoon && (
            <Badge className="absolute top-2 left-2 bg-amber-500 text-white hover:bg-amber-600">
              <Clock className="mr-1 h-3 w-3" />
              Coming Soon
            </Badge>
          )}
          {!comingSoon && isOutOfStock && (
            <Badge
              variant="secondary"
              className="absolute top-2 left-2 bg-black/60 text-white"
            >
              Out of Stock
            </Badge>
          )}
          {!comingSoon && isBackorder && (
            <Badge className="absolute top-2 left-2 bg-blue-500 text-white hover:bg-blue-600">
              Pre-order
            </Badge>
          )}
        </Link>

        {/* Content */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-3 px-4 py-10">
          <div className="min-w-0 space-y-1">
            <Link
              href={productHref}
              className="text-foreground font-heading hover:text-primary focus-visible:ring-ring block font-semibold tracking-tight transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <h3 className="line-clamp-2 text-base leading-snug sm:text-lg">
                {product.name}
              </h3>
            </Link>
            {productTagline && (
              <p className="text-muted-foreground text-base font-medium">
                {productTagline}
              </p>
            )}
            <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
              {product.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="text-primary text-lg font-bold tabular-nums">
              {formatPrice(product.price)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                onClick={handleAddToCart}
                disabled={disableCart}
                aria-label={`Add ${product.name} to cart`}
              >
                <ShoppingCart className="h-4 w-4 shrink-0" />
                {comingSoon
                  ? "Coming Soon"
                  : isOutOfStock
                    ? "Out of Stock"
                    : "Add to cart"}
              </Button>
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
