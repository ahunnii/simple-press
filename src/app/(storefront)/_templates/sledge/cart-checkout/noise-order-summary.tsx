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
      className="overflow-hidden rounded-sm bg-white"
      style={{ boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)" }}
    >
      <div className="border-b px-5 pt-5 pb-4" style={{ borderColor: "#e8e8e8" }}>
        <h3
          className="uppercase"
          style={{
            fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)",
            color: "var(--sl-coral)",
            letterSpacing: "0.04em",
            lineHeight: 1,
          }}
        >
          Order Summary
        </h3>
      </div>

      <div
        className="flex flex-col gap-3 border-b px-5 py-4"
        style={{ borderColor: "#e8e8e8" }}
      >
        {items.map((item) => (
          <div
            key={`${item.productId}-${item.variantId ?? "base"}`}
            className="flex items-center gap-3"
          >
            <div
              className="relative flex-shrink-0 overflow-hidden rounded-sm"
              style={{
                width: "44px",
                height: "56px",
                background: "var(--sl-green)",
              }}
            >
              <Image
                src={item.imageUrl ?? "/placeholder.svg"}
                alt={item.productName}
                fill
                className="object-cover"
                sizes="44px"
              />
              {item.quantity > 1 && (
                <span
                  className="absolute right-0.5 bottom-0.5 rounded-sm px-1 font-sans text-[8px]"
                  style={{ background: "var(--sl-coral)", color: "#ffffff" }}
                >
                  ×{item.quantity}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p
                className="truncate font-sans text-sm tracking-[0.04em] uppercase"
                style={{ color: "var(--sl-ink)" }}
              >
                {item.productName}
              </p>
              {item.variantName && (
                <p
                  className="mt-0.5 font-sans text-[10px] tracking-[0.12em] uppercase"
                  style={{ color: "var(--sl-ink-soft)" }}
                >
                  {item.variantName}
                </p>
              )}
              <p
                className="mt-0.5 font-sans text-[10px] tracking-[0.12em] uppercase"
                style={{ color: "var(--sl-ink-soft)" }}
              >
                Qty: {item.quantity}
              </p>
            </div>

            <span
              className="flex-shrink-0 font-sans text-sm tracking-[0.04em]"
              style={{ color: "var(--sl-ink)" }}
            >
              {formatPrice(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <div
        className="flex flex-col gap-2.5 border-b px-5 py-4"
        style={{ borderColor: "#e8e8e8" }}
      >
        <div className="flex items-baseline justify-between">
          <span
            className="font-sans text-xs tracking-[0.14em] uppercase"
            style={{ color: "var(--sl-ink-soft)" }}
          >
            Subtotal
          </span>
          <span
            className="font-sans text-sm tracking-[0.04em]"
            style={{ color: "var(--sl-ink)" }}
          >
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
          <span
            className="font-sans text-xs tracking-[0.14em] uppercase"
            style={{ color: "var(--sl-ink-soft)" }}
          >
            Shipping
          </span>
          <span
            className="font-sans text-sm tracking-[0.04em]"
            style={{ color: shipping === 0 ? "var(--sl-ink-soft)" : "var(--sl-ink)" }}
          >
            {deliveryMethod === "pickup"
              ? "Studio pickup"
              : shipping === 0
                ? "Free"
                : formatPrice(shipping)}
          </span>
        </div>
      </div>

      <div
        className="flex items-baseline justify-between px-5 py-4"
        style={{ background: "var(--sl-cream)" }}
      >
        <span
          className="font-sans text-xs tracking-[0.18em] uppercase"
          style={{ color: "var(--sl-ink-soft)" }}
        >
          Est. total
        </span>
        <div
          className="font-sans text-xl tracking-[0.02em] uppercase md:text-2xl"
          style={{ color: "var(--sl-ink)" }}
        >
          {formatPrice(estimatedTotal)}
        </div>
      </div>

      <div className="px-5 pb-4">
        <p
          className="font-sans text-[10px] leading-relaxed tracking-[0.1em] uppercase"
          style={{ color: "var(--sl-ink-soft)" }}
        >
          Tax and final total confirmed at Stripe Checkout.
        </p>
      </div>
    </div>
  );
}
