"use client";

import Image from "next/image";

import type { ShippingConfig } from "~/lib/shipping-utils";
import { cn } from "~/lib/utils";
import { formatPrice } from "~/lib/prices";
import { calculateShipping } from "~/lib/shipping-utils";
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
    <div className="sl-card-shadow overflow-hidden rounded-sm bg-white">
      <div className="border-b border-[var(--sl-border)] px-5 pt-5 pb-4">
        <h3 className="sl-tab-heading uppercase text-[var(--sl-coral)] tracking-[0.04em] leading-none">
          Order Summary
        </h3>
      </div>

      <div className="flex flex-col gap-3 border-b border-[var(--sl-border)] px-5 py-4">
        {items.map((item) => (
          <div
            key={`${item.productId}-${item.variantId ?? "base"}`}
            className="flex items-center gap-3"
          >
            <div className="relative h-14 w-11 flex-shrink-0 overflow-hidden rounded-sm bg-[var(--sl-green)]">
              <Image
                src={item.imageUrl ?? "/placeholder.svg"}
                alt={item.productName}
                fill
                className="object-cover"
                sizes="44px"
              />
              {item.quantity > 1 && (
                <span className="absolute right-0.5 bottom-0.5 rounded-sm bg-[var(--sl-coral)] px-1 font-sans text-[8px] text-white">
                  ×{item.quantity}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-sans text-sm tracking-[0.04em] text-[var(--sl-ink)] uppercase">
                {item.productName}
              </p>
              {item.variantName && (
                <p className="mt-0.5 font-sans text-[10px] tracking-[0.12em] text-[var(--sl-ink-soft)] uppercase">
                  {item.variantName}
                </p>
              )}
              <p className="mt-0.5 font-sans text-[10px] tracking-[0.12em] text-[var(--sl-ink-soft)] uppercase">
                Qty: {item.quantity}
              </p>
            </div>

            <span className="flex-shrink-0 font-sans text-sm tracking-[0.04em] text-[var(--sl-ink)]">
              {formatPrice(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2.5 border-b border-[var(--sl-border)] px-5 py-4">
        <div className="flex items-baseline justify-between">
          <span className="font-sans text-xs tracking-[0.14em] text-[var(--sl-ink-soft)] uppercase">
            Subtotal
          </span>
          <span className="font-sans text-sm tracking-[0.04em] text-[var(--sl-ink)]">
            {formatPrice(subtotal)}
          </span>
        </div>

        {discountAmount > 0 && (
          <div className="flex items-baseline justify-between">
            <span className="font-sans text-xs tracking-[0.14em] uppercase text-green-600">
              Discount
            </span>
            <span className="font-sans text-sm tracking-[0.04em] text-green-600">
              −{formatPrice(discountAmount)}
            </span>
          </div>
        )}

        <div className="flex items-baseline justify-between">
          <span className="font-sans text-xs tracking-[0.14em] text-[var(--sl-ink-soft)] uppercase">
            Shipping
          </span>
          <span
            className={cn(
              "font-sans text-sm tracking-[0.04em]",
              shipping === 0
                ? "text-[var(--sl-ink-soft)]"
                : "text-[var(--sl-ink)]",
            )}
          >
            {deliveryMethod === "pickup"
              ? "Studio pickup"
              : shipping === 0
                ? "Free"
                : formatPrice(shipping)}
          </span>
        </div>
      </div>

      <div className="flex items-baseline justify-between bg-[var(--sl-cream)] px-5 py-4">
        <span className="font-sans text-xs tracking-[0.18em] text-[var(--sl-ink-soft)] uppercase">
          Est. total
        </span>
        <div className="font-sans text-xl tracking-[0.02em] text-[var(--sl-ink)] uppercase md:text-2xl">
          {formatPrice(estimatedTotal)}
        </div>
      </div>

      <div className="px-5 pb-4">
        <p className="font-sans text-[10px] leading-relaxed tracking-[0.1em] text-[var(--sl-ink-soft)] uppercase">
          Tax and final total confirmed at Stripe Checkout.
        </p>
      </div>
    </div>
  );
}
