"use client";

import Image from "next/image";

import type { ShippingConfig } from "~/lib/shipping-utils";
import { formatPrice } from "~/lib/prices";
import { calculateShipping } from "~/lib/shipping-utils";
import { Separator } from "~/components/ui/separator";
import { useCart } from "~/providers/cart-context";

type OrderSummaryProps = {
  shippingConfig: ShippingConfig;
  deliveryMethod: "ship" | "pickup";
  discountAmount: number;
};

export function NoiseOrderSummary({
  shippingConfig,
  deliveryMethod,
  discountAmount,
}: OrderSummaryProps) {
  const { items, subtotal } = useCart();
  const shipping =
    deliveryMethod === "pickup" ? 0 : calculateShipping(subtotal, shippingConfig);
  const afterDiscount = subtotal - discountAmount;
  const estimatedTotal = afterDiscount + shipping;

  return (
    <div className="border border-border p-6">
      <h2 className="font-sans text-[10px] tracking-[0.3em] uppercase text-foreground">
        Order Summary
      </h2>
      <div className="mt-5 flex flex-col gap-3">
        {items.map((item) => (
          <div
            key={`${item.productId}-${item.variantId ?? "base"}`}
            className="flex items-center gap-3"
          >
            <div className="relative size-12 shrink-0 overflow-hidden bg-secondary">
              <Image
                src={item.imageUrl ?? "/placeholder.svg"}
                alt={item.productName}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
            <div className="flex-1">
              <p className="font-sans text-sm text-foreground">{item.productName}</p>
              <p className="font-sans text-xs text-muted-foreground">Qty: {item.quantity}</p>
            </div>
            <span className="font-sans text-sm text-foreground">
              {formatPrice(item.price * item.quantity)}
            </span>
          </div>
        ))}

        <Separator />

        <div className="flex justify-between font-sans text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-foreground">{formatPrice(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between font-sans text-sm text-green-600">
            <span>Discount</span>
            <span>-{formatPrice(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between font-sans text-sm">
          <span className="text-muted-foreground">Shipping</span>
          <span className="text-foreground">
            {deliveryMethod === "pickup"
              ? "In-store pickup (free)"
              : shipping === 0
                ? "Free"
                : formatPrice(shipping)}
          </span>
        </div>

        <Separator />

        <div className="flex justify-between">
          <span className="font-sans text-sm font-medium text-foreground">Estimated total</span>
          <span className="font-sans text-lg font-semibold text-foreground">
            {formatPrice(estimatedTotal)}
          </span>
        </div>
        <p className="font-sans text-xs text-muted-foreground">
          Tax and final total confirmed at Stripe Checkout.
        </p>
      </div>
    </div>
  );
}
