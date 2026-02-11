"use client";

import type {
  Product,
  Image as ProductImage,
  ProductVariant,
} from "generated/prisma";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Plus } from "lucide-react";

import { useCart } from "~/providers/cart-context";

export type CardProduct = Product & { images: ProductImage[] } & {
  variants: ProductVariant[];
};

export function ModernProductCard({ product }: { product: CardProduct }) {
  const { addItem } = useCart();
  const router = useRouter();

  return (
    <div className="group">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="bg-muted relative aspect-square overflow-hidden rounded-sm">
          <Image
            src={product.images[0]?.url ?? "/placeholder.svg"}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </div>
      </Link>
      <div className="mt-4 flex items-start justify-between">
        <div>
          <Link href={`/products/${product.id}`}>
            <h3 className="text-foreground group-hover:text-muted-foreground text-sm font-medium transition-colors">
              {product.name}
            </h3>
          </Link>
          <p className="text-muted-foreground mt-1 text-sm">${product.price}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (product?.variants?.length > 0) {
              router.push(`/products/${product.slug}`);
            } else {
              addItem({
                productId: product.id,
                variantId: null,
                productName: product.name,
                variantName: null,
                price: product.price,
                imageUrl: product.images[0]?.url ?? null,
              });
            }
          }}
          className="border-border text-foreground hover:bg-primary hover:text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full border transition-colors"
          aria-label={
            product?.variants?.length > 0
              ? `View ${product.name}`
              : `Add ${product.name} to cart`
          }
        >
          {product?.variants?.length > 0 ? (
            <Eye className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
