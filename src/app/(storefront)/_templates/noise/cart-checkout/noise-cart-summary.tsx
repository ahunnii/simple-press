"use client";

import Link from "next/link";

import type { ShippingConfig } from "~/lib/shipping-utils";
import { formatPrice } from "~/lib/prices";
import {
  calculateShipping,
  getAmountUntilFreeShipping,
  getFreeShippingProgress,
  SHIPPING_TYPES,
} from "~/lib/shipping-utils";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Separator } from "~/components/ui/separator";
import { useCart } from "~/providers/cart-context";

type CartSummaryProps = {
  shippingConfig: ShippingConfig;
};

export function NoiseCartSummary({ shippingConfig }: CartSummaryProps) {
  const { subtotal, itemCount, setIsOpen } = useCart();
  const shipping = calculateShipping(subtotal, shippingConfig);
  const estimatedTotal = subtotal + shipping;
  const untilFree = getAmountUntilFreeShipping(subtotal, shippingConfig);
  const progress = getFreeShippingProgress(subtotal, shippingConfig);
  const showProgress =
    shippingConfig.shippingType === SHIPPING_TYPES.FLAT_RATE_WITH_THRESHOLD &&
    progress !== null &&
    untilFree !== null;

  return (
    <div className="border border-border p-6">
      <h2 className="font-sans text-[10px] tracking-[0.3em] uppercase text-foreground">
        Order Summary
      </h2>
      <div className="mt-5 flex flex-col gap-3">
        <div className="flex justify-between font-sans text-sm">
          <span className="text-muted-foreground">
            Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
          </span>
          <span className="text-foreground font-medium">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between font-sans text-sm">
          <span className="text-muted-foreground">Shipping</span>
          <span className="text-foreground font-medium">
            {shipping === 0 ? "Free" : formatPrice(shipping)}
          </span>
        </div>
        {showProgress && untilFree !== null && (
          <div className="space-y-1.5">
            <Progress value={(progress ?? 0) * 100} className="h-1.5" />
            <p className="font-sans text-xs text-muted-foreground">
              Add {formatPrice(untilFree)} for free shipping
            </p>
          </div>
        )}
        <Separator />
        <div className="flex justify-between">
          <span className="font-sans text-sm font-medium text-foreground">Estimated total</span>
          <span className="font-sans text-lg font-semibold text-foreground">
            {formatPrice(estimatedTotal)}
          </span>
        </div>
      </div>
      <Button
        className="mt-6 w-full rounded-none font-sans text-[10px] tracking-[0.25em] uppercase"
        size="lg"
        asChild
        onClick={() => setIsOpen(false)}
      >
        <Link href="/checkout">Proceed to Checkout</Link>
      </Button>
    </div>
  );
}
