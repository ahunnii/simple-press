"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { ShippingConfig } from "~/lib/shipping-utils";
import { formatPrice } from "~/lib/prices";
import {
  calculateShipping,
  getAmountUntilFreeShipping,
  getFreeShippingProgress,
  SHIPPING_TYPES,
} from "~/lib/shipping-utils";
import { Progress } from "~/components/ui/progress";
import { useCart } from "~/providers/cart-context";

type Props = {
  shippingConfig: ShippingConfig;
};

export function ModernCartSummary({ shippingConfig }: Props) {
  const { subtotal } = useCart();
  // Zone+weight rates depend on the destination address, which isn't known in
  // the cart — defer to checkout rather than showing a misleading "Free".
  const isZoneWeight =
    shippingConfig.shippingType === SHIPPING_TYPES.ZONE_WEIGHT;
  const shipping = isZoneWeight
    ? 0
    : calculateShipping(subtotal, shippingConfig);
  const estimatedOrderTotal = subtotal + shipping;
  const untilFree = getAmountUntilFreeShipping(subtotal, shippingConfig);
  const progress = getFreeShippingProgress(subtotal, shippingConfig);
  const showProgress =
    shippingConfig.shippingType === SHIPPING_TYPES.FLAT_RATE_WITH_THRESHOLD &&
    progress !== null &&
    untilFree !== null;

  return (
    <div>
      <div className="border-border bg-card rounded-sm border p-8">
        <h2 className="text-foreground text-xs font-semibold tracking-widest uppercase">
          Order Summary
        </h2>

        <div className="mt-6 flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span className="text-foreground">
              {isZoneWeight
                ? "Calculated at checkout"
                : shipping === 0
                  ? "Free"
                  : formatPrice(shipping)}
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
        </div>

        <div className="border-border mt-6 border-t pt-6">
          <div className="flex items-center justify-between">
            <span className="text-foreground font-medium">Total</span>
            <span
              role="status"
              aria-live="polite"
              className="text-foreground text-lg font-medium"
            >
              {formatPrice(estimatedOrderTotal)}
            </span>
          </div>
        </div>

        <Link
          href="/checkout"
          className="bg-primary text-primary-foreground mt-8 flex w-full items-center justify-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
        >
          Proceed to Checkout
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
