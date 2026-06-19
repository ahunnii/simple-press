"use client";

import Image from "next/image";

import type { ShippingConfig } from "~/lib/shipping-utils";
import { formatPrice } from "~/lib/prices";
import { calculateShipping } from "~/lib/shipping-utils";
import { useCart } from "~/providers/cart-context";

type OrderSummaryProps = {
  shippingConfig: ShippingConfig;
  deliveryMethod: "ship" | "pickup";
  discountAmount: number;
  shippingPending?: boolean;
};

export function NoiseOrderSummary({
  shippingConfig,
  deliveryMethod,
  discountAmount,
  shippingPending,
}: OrderSummaryProps) {
  const { items, subtotal } = useCart();

  const shipping =
    deliveryMethod === "pickup"
      ? 0
      : calculateShipping(subtotal, shippingConfig);
  const afterDiscount = subtotal - discountAmount;
  const estimatedTotal = afterDiscount + shipping;

  return (
    <div
      className="border-foreground flex flex-col gap-0 border"
      style={{ background: "var(--vn-paper)" }}
    >
      {/* Heading */}
      <div className="border-foreground/15 border-b px-5 pt-5 pb-4">
        <h3
          className="font-serif leading-none tracking-tight italic"
          style={{ fontSize: "22px", letterSpacing: "-0.02em" }}
        >
          Order summary.
        </h3>
      </div>

      {/* Line items */}
      <div className="border-foreground/15 flex flex-col gap-3 border-b px-5 py-4">
        {items.map((item) => (
          <div
            key={`${item.productId}-${item.variantId ?? "base"}`}
            className="flex items-center gap-3"
          >
            {/* Thumbnail */}
            <div
              className="border-foreground/20 relative flex-shrink-0 overflow-hidden border"
              style={{
                width: "44px",
                height: "56px",
                background: "var(--vn-steel)",
              }}
            >
              <Image
                src={item.imageUrl ?? "/placeholder.svg"}
                alt={item.productName}
                fill
                className="object-cover"
                sizes="44px"
              />
              {/* Qty badge */}
              {item.quantity > 1 && (
                <span
                  className="absolute right-0.5 bottom-0.5 px-0.5 font-mono text-[8px]"
                  style={{
                    background: "var(--vn-ink)",
                    color: "var(--vn-bone)",
                  }}
                >
                  ×{item.quantity}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p
                className="truncate font-serif leading-tight italic"
                style={{ fontSize: "15px", letterSpacing: "-0.005em" }}
              >
                {item.productName}
              </p>
              {item.variantName && (
                <p
                  className="mt-0.5 font-mono text-[9px] tracking-[0.14em] uppercase"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  {item.variantName}
                </p>
              )}
              <p
                className="mt-0.5 font-mono text-[9px] tracking-[0.14em] uppercase"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Qty: {item.quantity}
              </p>
            </div>

            <span className="flex-shrink-0 font-mono text-[12px] tracking-[0.06em]">
              {formatPrice(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-foreground/15 flex flex-col gap-2.5 border-b px-5 py-4">
        <div className="flex items-baseline justify-between">
          <span
            className="font-mono text-[10.5px] tracking-[0.14em] uppercase"
            style={{ color: "var(--vn-steel)" }}
          >
            Subtotal
          </span>
          <span className="font-mono text-[12px] tracking-[0.06em]">
            {formatPrice(subtotal)}
          </span>
        </div>

        {discountAmount > 0 && (
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10.5px] tracking-[0.14em] text-green-600 uppercase">
              Discount
            </span>
            <span className="font-mono text-[12px] tracking-[0.06em] text-green-600">
              −{formatPrice(discountAmount)}
            </span>
          </div>
        )}

        <div className="flex items-baseline justify-between">
          <span
            className="font-mono text-[10.5px] tracking-[0.14em] uppercase"
            style={{ color: "var(--vn-steel)" }}
          >
            Shipping
          </span>
          <span
            className="font-mono text-[12px] tracking-[0.06em]"
            style={{
              color: shipping === 0 || shippingPending ? "var(--vn-steel-mist)" : undefined,
            }}
          >
            {deliveryMethod === "pickup"
              ? "Studio pickup"
              : shippingPending
                ? "Calculated at checkout"
                : shipping === 0
                  ? "Free"
                  : formatPrice(shipping)}
          </span>
        </div>
      </div>

      {/* Grand total */}
      <div
        className="flex items-baseline justify-between px-5 py-4"
        style={{ background: "var(--vn-bone)" }}
      >
        <span
          className="font-mono text-[10.5px] tracking-[0.22em] uppercase"
          style={{ color: "var(--vn-steel)" }}
        >
          Est. total
        </span>
        <div
          className="font-serif leading-none italic"
          style={{ fontSize: "26px", letterSpacing: "-0.02em" }}
        >
          {formatPrice(estimatedTotal)}
        </div>
      </div>

      {/* Tax note */}
      <div className="px-5 pb-4">
        <p
          className="font-mono text-[9px] leading-relaxed tracking-[0.14em] uppercase"
          style={{ color: "var(--vn-steel-mist)" }}
        >
          Tax and final total confirmed at Stripe Checkout.
        </p>
      </div>
    </div>
  );
}
