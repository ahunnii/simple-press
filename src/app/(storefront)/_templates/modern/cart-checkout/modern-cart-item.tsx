"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";

import type { CartItem as CartItemType } from "~/providers/cart-context";
import { formatPrice } from "~/lib/prices";
import { useCart } from "~/providers/cart-context";

type Props = {
  item: CartItemType;
};

export function ModernCartItem({ item }: Props) {
  const { updateQuantity, removeItem } = useCart();

  const {
    productId,
    variantId,
    productName,
    variantName,
    price,
    compareAtPrice,
    quantity,
    imageUrl,
  } = item;

  const isOnSale =
    compareAtPrice != null && compareAtPrice > 0 && compareAtPrice > price;

  return (
    <div className="border-border flex gap-6 border-b py-8 first:pt-0 last:border-b-0">
      <Link
        href={`/shop/${productId}`}
        className="bg-muted relative h-28 w-28 shrink-0 overflow-hidden rounded-sm"
      >
        <Image
          src={imageUrl ?? "/placeholder.svg"}
          alt={productName}
          fill
          className="object-cover"
          sizes="112px"
        />
      </Link>

      <div className="flex flex-1 flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <Link
              href={`/shop/${productId}`}
              className="text-foreground hover:text-muted-foreground text-sm font-medium transition-colors"
            >
              {productName}
            </Link>
            {variantName && (
              <p className="text-muted-foreground mt-1 text-xs">
                {variantName}
              </p>
            )}

            <p className="text-muted-foreground text-xs sm:text-sm">
              {isOnSale ? (
                <>
                  <span className="text-muted-foreground/60 mr-1 line-through">
                    {formatPrice(compareAtPrice ?? 0)}
                  </span>
                  <span className="text-primary font-medium">
                    {formatPrice(price)}
                  </span>
                  {" each"}
                </>
              ) : (
                <>{formatPrice(price)} each</>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => removeItem(productId, variantId)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Remove ${productName} from cart`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="border-border flex items-center border">
            <button
              type="button"
              onClick={() => updateQuantity(productId, variantId, quantity - 1)}
              className="text-foreground hover:bg-muted flex h-8 w-8 items-center justify-center transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="border-border text-foreground flex h-8 w-10 items-center justify-center border-x text-xs font-medium">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => updateQuantity(productId, variantId, quantity + 1)}
              className="text-foreground hover:bg-muted flex h-8 w-8 items-center justify-center transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <p className="text-foreground text-sm font-medium">
            {formatPrice(price * quantity)}
          </p>
        </div>
      </div>
    </div>
  );
}
