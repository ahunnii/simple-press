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

export function HappyBambooCartSummary({ shippingConfig }: CartSummaryProps) {
  const { subtotal, itemCount } = useCart();
  const shipping = calculateShipping(subtotal, shippingConfig);
  const estimatedOrderTotal = subtotal + shipping;
  const untilFree = getAmountUntilFreeShipping(subtotal, shippingConfig);
  const progress = getFreeShippingProgress(subtotal, shippingConfig);
  const showProgress =
    shippingConfig.shippingType === SHIPPING_TYPES.FLAT_RATE_WITH_THRESHOLD &&
    progress !== null &&
    untilFree !== null;

  return (
    <div className="p-6">
      <h2 className="text-card-foreground font-heading text-lg font-semibold">
        Order Summary
      </h2>
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
          </span>
          <span className="text-foreground font-medium">
            {formatPrice(subtotal)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Shipping</span>
          <span className="text-foreground font-medium">
            {shipping === 0 ? "Free" : formatPrice(shipping)}
          </span>
        </div>
        {showProgress && untilFree !== null && (
          <div className="space-y-2">
            <Progress value={progress * 100} className="h-2" />
            <p className="text-muted-foreground text-xs">
              Add {formatPrice(untilFree)} more for free shipping
            </p>
          </div>
        )}
        {shipping > 0 &&
          shippingConfig.shippingType === SHIPPING_TYPES.FLAT_RATE && (
            <p className="text-muted-foreground text-xs">
              Flat rate shipping on all orders
            </p>
          )}
        <Separator />
        <div className="flex justify-between">
          <span className="text-foreground font-semibold">Estimated total</span>
          <span className="text-foreground text-lg font-bold">
            {formatPrice(estimatedOrderTotal)}
          </span>
        </div>
      </div>
      <Button className="mt-6 w-full" size="lg" asChild>
        <Link href="/checkout">Proceed to Checkout</Link>
      </Button>
    </div>
  );
}
