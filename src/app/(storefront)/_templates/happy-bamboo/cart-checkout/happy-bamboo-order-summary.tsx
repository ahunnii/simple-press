"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";

import { formatPrice } from "~/lib/prices";
import { Separator } from "~/components/ui/separator";
import { useCart } from "~/providers/cart-context";

type OrderSummaryProps = {
  deliveryMethod: "ship" | "pickup";
  discountAmount: number;
  // Authoritative shipping cost from the checkout hook (a live zone+weight
  // quote when applicable). The summary must not recompute it.
  shipping: number;
  // True before a destination is known (show "Calculated at checkout").
  shippingPending?: boolean;
  // True while a live rate is actively being fetched for a known destination
  // (show a spinner so the customer knows the amount is loading).
  shippingCalculating?: boolean;
};

export function HappyBambooOrderSummary({
  deliveryMethod,
  discountAmount,
  shipping,
  shippingPending,
  shippingCalculating,
}: OrderSummaryProps) {
  const { items, subtotal } = useCart();
  const effectiveShipping = deliveryMethod === "pickup" ? 0 : shipping;
  const afterDiscount = subtotal - discountAmount;
  const estimatedTotal = afterDiscount + effectiveShipping;

  return (
    <div className="border-border bg-card rounded-xl border p-6">
      <h2 className="text-card-foreground font-heading text-lg font-semibold">
        Order Summary
      </h2>
      <div className="mt-4 flex flex-col gap-3">
        {items.map((item) => (
          <div
            key={`${item.productId}-${item.variantId ?? "base"}`}
            className="flex items-center gap-3"
          >
            <div className="bg-secondary relative size-12 shrink-0 overflow-hidden rounded-md">
              <Image
                src={item.imageUrl ?? "/placeholder.svg"}
                alt={item.productName}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
            <div className="flex-1">
              <p className="text-card-foreground text-sm font-medium">
                {item.productName}
              </p>
              <p className="text-muted-foreground text-xs">
                Qty: {item.quantity}
              </p>
            </div>
            <span className="text-foreground text-sm font-medium">
              {formatPrice(item.price * item.quantity)}
            </span>
          </div>
        ))}
        <Separator className="my-1" />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-foreground">{formatPrice(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount</span>
            <span>-{formatPrice(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Shipping</span>
          {deliveryMethod === "pickup" ? (
            <span className="text-foreground">In-store pickup (free)</span>
          ) : shippingCalculating ? (
            <span
              className="text-muted-foreground inline-flex items-center gap-1.5"
              aria-live="polite"
            >
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Calculating…
            </span>
          ) : shippingPending ? (
            <span className="text-foreground">Calculated at checkout</span>
          ) : shipping === 0 ? (
            <span className="text-foreground">Free</span>
          ) : (
            <span className="text-foreground">{formatPrice(shipping)}</span>
          )}
        </div>
        <Separator className="my-1" />
        <div className="flex justify-between">
          <span className="text-foreground font-semibold">Estimated total</span>
          <span className="text-foreground text-lg font-bold">
            {formatPrice(estimatedTotal)}
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          Tax and final total are confirmed on Stripe Checkout.
        </p>
      </div>
    </div>
  );
}
