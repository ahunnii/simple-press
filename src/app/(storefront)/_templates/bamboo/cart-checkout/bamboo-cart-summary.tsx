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

export function BambooCartSummary({ shippingConfig }: CartSummaryProps) {
  const { subtotal, itemCount } = useCart();
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
    <div className="rounded-2xl border border-[var(--bam-hairline)] bg-[var(--bam-cream-deep)] p-6">
      <h2 className="font-heading text-[var(--bam-forest-deep)] text-lg font-semibold">
        Order Summary
      </h2>
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--bam-forest)]/75">
            Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
          </span>
          <span className="text-[var(--bam-forest-deep)] font-medium">
            {formatPrice(subtotal)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[var(--bam-forest)]/75">Shipping</span>
          <span className="text-[var(--bam-forest-deep)] font-medium">
            {isZoneWeight
              ? "Calculated at checkout"
              : shipping === 0
                ? "Free"
                : formatPrice(shipping)}
          </span>
        </div>
        {showProgress && untilFree !== null && (
          <div className="space-y-2">
            <Progress
              value={progress * 100}
              className="h-2"
              aria-label={`Free shipping progress: ${Math.round(progress * 100)}% of the way there`}
            />
            <p className="text-[var(--bam-forest)]/70 text-xs">
              Add {formatPrice(untilFree)} more for free shipping
            </p>
          </div>
        )}
        {shipping > 0 &&
          shippingConfig.shippingType === SHIPPING_TYPES.FLAT_RATE && (
            <p className="text-[var(--bam-forest)]/70 text-xs">
              Flat rate shipping on all orders
            </p>
          )}
        <Separator className="bg-[var(--bam-hairline)]" />
        <div className="flex justify-between">
          <span className="text-[var(--bam-forest-deep)] font-semibold">
            Estimated Total
          </span>
          <span className="font-heading text-[var(--bam-forest-deep)] text-lg">
            {formatPrice(estimatedOrderTotal)}
          </span>
        </div>
      </div>
      <Button
        className="mt-6 w-full rounded-full bg-[var(--bam-forest)] text-[var(--bam-cream)] hover:bg-[var(--bam-forest-deep)]"
        size="lg"
        asChild
      >
        <Link href="/checkout">Proceed to Checkout</Link>
      </Button>
    </div>
  );
}
