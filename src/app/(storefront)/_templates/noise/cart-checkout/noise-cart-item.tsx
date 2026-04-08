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

export function NoiseCartItem({ item }: Props) {
  const { updateQuantity, removeItem } = useCart();
  const { productId, variantId, productName, price, quantity, imageUrl } = item;

  return (
    <div className="flex gap-4 border-b border-border py-5">
      <div className="relative size-20 shrink-0 overflow-hidden bg-secondary sm:size-24">
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
            <h3 className="font-serif text-base font-light text-foreground">
              {productName}
            </h3>
            <p className="font-sans text-xs text-muted-foreground">
              {formatPrice(price)} each
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-none text-muted-foreground hover:text-destructive"
            onClick={() => removeItem(productId, variantId)}
            aria-label={`Remove ${productName}`}
          >
            <X className="size-3.5" />
          </Button>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center border border-border">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-none"
              onClick={() => updateQuantity(productId, variantId, quantity - 1)}
              disabled={quantity <= 1}
            >
              <Minus className="size-3" />
            </Button>
            <span className="w-8 text-center font-sans text-sm text-foreground">
              {quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-none"
              onClick={() => updateQuantity(productId, variantId, quantity + 1)}
            >
              <Plus className="size-3" />
            </Button>
          </div>
          <span className="font-sans text-sm font-medium text-foreground">
            {formatPrice(price * quantity)}
          </span>
        </div>
      </div>
    </div>
  );
}
