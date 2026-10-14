"use client";

import Image from "next/image";
import { Minus, Plus, X } from "lucide-react";

import type { CartItem as CartItemType } from "~/providers/cart-context";
import { formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";
import { CartLineOptions } from "~/components/customizer/cart-line-options";
import { cartItemId, useCart } from "~/providers/cart-context";

type Props = {
  item: CartItemType;
};

/**
 * `.bamboo-qty-stepper button` is authored at 40px in the (unlayered) bamboo
 * block, which would beat a Tailwind `size-11`. The pre-redesign stepper used
 * 44px touch targets, so keep that parity with an inline override.
 */
const STEPPER_BUTTON_SIZE: React.CSSProperties = {
  width: "44px",
  height: "44px",
};

/**
 * Cart line item as a slim white "roll panel" — `.bamboo-torn-card` with a
 * tightened padding (inline, because the bamboo block in globals.css is
 * unlayered and therefore beats any Tailwind padding utility) so the
 * perforation dash still reads at the top edge of a compact row.
 *
 * Behavior is unchanged from the pre-redesign component: same `useCart`
 * calls, same aria-labels, same `aria-live` quantity readout.
 */
export function BambooCartItem({ item }: Props) {
  const { updateLineQuantity, removeLine } = useCart();
  // Line-id APIs: each configured build is its own line.
  const lineId = cartItemId(item);
  const { productName, variantName, price, quantity, imageUrl } = item;

  return (
    <div
      className="bamboo-torn-card flex gap-4"
      style={{ padding: "28px 20px 20px" }}
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-[var(--bamboo-paper)] ring-2 ring-[var(--bamboo-outline)] sm:size-24">
        <Image
          src={imageUrl ?? "/placeholder.svg"}
          alt={productName}
          fill
          className="object-cover"
          sizes="96px"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-heading text-base leading-snug font-semibold text-[var(--bamboo-pine)] sm:text-lg">
              {productName}
            </h2>
            {variantName && (
              <p className="text-sm text-[var(--bamboo-ink-soft)]">
                {variantName}
              </p>
            )}
            <CartLineOptions
              item={item}
              className="mt-0.5 text-[0.86rem] text-[var(--bamboo-ink-soft)]"
            />
            <p className="text-sm text-[var(--bamboo-muted)]">
              {formatPrice(price)} each
            </p>
          </div>
          <button
            type="button"
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full",
              "text-[var(--bamboo-muted)] transition-colors",
              "hover:bg-[var(--bamboo-paper)] hover:text-[var(--bamboo-terracotta-deep)]",
            )}
            onClick={() => removeLine(lineId)}
            aria-label={`Remove ${productName} from cart`}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <div className="bamboo-qty-stepper">
            <button
              type="button"
              style={STEPPER_BUTTON_SIZE}
              onClick={() => updateLineQuantity(lineId, quantity - 1)}
              disabled={quantity <= 1}
              aria-label={`Decrease quantity of ${productName}`}
            >
              <Minus className="size-3.5" aria-hidden="true" />
            </button>
            <span aria-live="polite" aria-atomic="true">
              {quantity}
            </span>
            <button
              type="button"
              style={STEPPER_BUTTON_SIZE}
              onClick={() => updateLineQuantity(lineId, quantity + 1)}
              aria-label={`Increase quantity of ${productName}`}
            >
              <Plus className="size-3.5" aria-hidden="true" />
            </button>
          </div>
          <span className="bamboo-price">{formatPrice(price * quantity)}</span>
        </div>
      </div>
    </div>
  );
}
