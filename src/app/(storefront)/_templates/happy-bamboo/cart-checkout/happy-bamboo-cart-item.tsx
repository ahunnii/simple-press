"use client";

import Image from "next/image";
import { Minus, Plus, X } from "lucide-react";

import type { CartItem as CartItemType } from "~/providers/cart-context";
import { formatPrice } from "~/lib/prices";
import { Button } from "~/components/ui/button";
import { useCart } from "~/providers/cart-context";

type Props = {
  item: CartItemType;
};

export function HappyBambooCartItem({ item }: Props) {
  const { updateQuantity, removeItem } = useCart();
  const {
    productId,
    variantId,
    productName,
    variantName,
    price,
    quantity,
    imageUrl,
  } = item;

  return (
    <div className="border-border bg-card flex gap-4 rounded-lg border p-4">
      <div className="bg-secondary relative size-20 shrink-0 overflow-hidden rounded-md sm:size-24">
        <Image
          src={imageUrl ?? "/placeholder.svg"}
          alt={productName}
          fill
          className="object-cover"
          sizes="96px"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-card-foreground font-heading text-sm font-semibold sm:text-base">
              {productName}
            </h3>
            {variantName && (
              <p className="text-muted-foreground text-xs sm:text-sm">
                {variantName}
              </p>
            )}
            <p className="text-muted-foreground text-xs sm:text-sm">
              {formatPrice(price)} each
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive size-8 shrink-0"
            onClick={() => removeItem(productId, variantId)}
            aria-label={`Remove ${productName} from cart`}
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <div className="border-border flex items-center gap-1 rounded-lg border">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => updateQuantity(productId, variantId, quantity - 1)}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              <Minus className="size-3" />
            </Button>
            <span className="text-foreground w-8 text-center text-sm font-medium">
              {quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => updateQuantity(productId, variantId, quantity + 1)}
              aria-label="Increase quantity"
            >
              <Plus className="size-3" />
            </Button>
          </div>
          <span className="text-foreground text-sm font-bold">
            {formatPrice(price * quantity)}
          </span>
        </div>
      </div>
    </div>
  );
}
