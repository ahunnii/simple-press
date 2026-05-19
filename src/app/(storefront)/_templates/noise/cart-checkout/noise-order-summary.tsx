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
    <div
      className="flex flex-col gap-0 border border-foreground"
      style={{ background: "var(--vn-paper)" }}
    >
      {/* Heading */}
      <div className="px-5 pt-5 pb-4 border-b border-foreground/15">
        <h3
          className="font-serif italic leading-none tracking-tight"
          style={{ fontSize: "22px", letterSpacing: "-0.02em" }}
        >
          Order summary.
        </h3>
      </div>

      {/* Line items */}
      <div className="px-5 py-4 flex flex-col gap-3 border-b border-foreground/15">
        {items.map((item) => (
          <div
            key={`${item.productId}-${item.variantId ?? "base"}`}
            className="flex items-center gap-3"
          >
            {/* Thumbnail */}
            <div
              className="relative flex-shrink-0 overflow-hidden border border-foreground/20"
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
                  className="absolute right-0.5 bottom-0.5 font-mono text-[8px] px-0.5"
                  style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
                >
                  ×{item.quantity}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p
                className="font-serif italic leading-tight truncate"
                style={{ fontSize: "15px", letterSpacing: "-0.005em" }}
              >
                {item.productName}
              </p>
              {item.variantName && (
                <p
                  className="font-mono text-[9px] tracking-[0.14em] uppercase mt-0.5"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  {item.variantName}
                </p>
              )}
              <p
                className="font-mono text-[9px] tracking-[0.14em] uppercase mt-0.5"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Qty: {item.quantity}
              </p>
            </div>

            <span
              className="font-mono text-[12px] tracking-[0.06em] flex-shrink-0"
            >
              {formatPrice(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="px-5 py-4 flex flex-col gap-2.5 border-b border-foreground/15">
        <div className="flex justify-between items-baseline">
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
          <div className="flex justify-between items-baseline">
            <span
              className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-green-600"
            >
              Discount
            </span>
            <span className="font-mono text-[12px] tracking-[0.06em] text-green-600">
              −{formatPrice(discountAmount)}
            </span>
          </div>
        )}

        <div className="flex justify-between items-baseline">
          <span
            className="font-mono text-[10.5px] tracking-[0.14em] uppercase"
            style={{ color: "var(--vn-steel)" }}
          >
            Shipping
          </span>
          <span
            className="font-mono text-[12px] tracking-[0.06em]"
            style={{ color: shipping === 0 ? "var(--vn-steel-mist)" : undefined }}
          >
            {deliveryMethod === "pickup"
              ? "Studio pickup"
              : shipping === 0
                ? "Free"
                : formatPrice(shipping)}
          </span>
        </div>
      </div>

      {/* Grand total */}
      <div
        className="px-5 py-4 flex justify-between items-baseline"
        style={{ background: "var(--vn-bone)" }}
      >
        <span
          className="font-mono text-[10.5px] tracking-[0.22em] uppercase"
          style={{ color: "var(--vn-steel)" }}
        >
          Est. total
        </span>
        <div
          className="font-serif italic leading-none"
          style={{ fontSize: "26px", letterSpacing: "-0.02em" }}
        >
          {formatPrice(estimatedTotal)}
        </div>
      </div>

      {/* Tax note */}
      <div className="px-5 pb-4">
        <p
          className="font-mono text-[9px] tracking-[0.14em] uppercase leading-relaxed"
          style={{ color: "var(--vn-steel-mist)" }}
        >
          Tax and final total confirmed at Stripe Checkout.
        </p>
      </div>
    </div>
  );
}
