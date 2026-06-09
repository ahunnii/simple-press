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

export function PollenCartItem({ item }: Props) {
  const { updateQuantity, removeItem } = useCart();
  const { productId, variantId, productName, variantName, price, quantity, imageUrl } =
    item;

  return (
    <div className="flex gap-4 rounded-md border border-[#2a351f]/10 bg-white p-4">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-[#f5f2ee] sm:size-24">
        <Image
          src={imageUrl ?? "/placeholder.svg"}
          alt=""
          fill
          className="object-cover"
          sizes="96px"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[#2a351f] sm:text-base">
              {productName}
            </h3>
            {variantName && (
              <p className="text-xs text-[#4c566a] sm:text-sm">{variantName}</p>
            )}
            <p className="text-xs text-[#4c566a] sm:text-sm">
              {formatPrice(price)} each
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-[#4c566a] hover:text-red-600"
            onClick={() => removeItem(productId, variantId)}
            aria-label={`Remove ${productName} from cart`}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <div
            role="group"
            aria-label={`Quantity for ${productName}`}
            className="flex items-center gap-1 rounded-md border border-[#2a351f]/20"
          >
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-[#2a351f] hover:bg-[#2a351f]/5"
              onClick={() => updateQuantity(productId, variantId, quantity - 1)}
              disabled={quantity <= 1}
              aria-label={`Decrease quantity of ${productName}`}
            >
              <Minus className="size-3" aria-hidden="true" />
            </Button>
            <span
              className="w-8 text-center text-sm font-medium text-[#2a351f]"
              aria-live="polite"
            >
              {quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-[#2a351f] hover:bg-[#2a351f]/5"
              onClick={() => updateQuantity(productId, variantId, quantity + 1)}
              aria-label={`Increase quantity of ${productName}`}
            >
              <Plus className="size-3" aria-hidden="true" />
            </Button>
          </div>
          <span className="text-sm font-bold text-[#215935]">
            {formatPrice(price * quantity)}
          </span>
        </div>
      </div>
    </div>
  );
}
