import type { CartItem } from "~/providers/cart-context";
import { cn } from "~/lib/utils";
import { CartLineOptions } from "~/components/customizer/cart-line-options";
import { OrderItemOptions } from "~/components/customizer/order-item-options";

/**
 * The chosen product options under a line - "Chain: Gold +$25.00",
 * "Charms: Heart (included), Star +$35.00", "Engraving: "Mom"" - in glove's
 * type. Thin wrappers over the shared `<CartLineOptions>` / `<OrderItemOptions>`
 * (a `dl` with `data-slot="customizer-line-option*"` hooks), styled through
 * their `classNames` so no global CSS is needed: Poppins label in ink,
 * Lato value in the body text, price in the primary purple (AA on white and
 * on the mist panel). Text only; the shared components never render HTML.
 */

type Size = "sm" | "md";

const SIZE: Record<Size, string> = {
  sm: "text-[12px]",
  md: "text-[13px]",
};

function optionClasses(size: Size, className?: string) {
  return {
    className: cn("mt-1 gap-y-0.5 leading-snug", SIZE[size], className),
    classNames: {
      label: "glove-display font-medium text-[var(--glove-ink)]",
      value: "glove-body text-[var(--glove-text)]",
      price: "font-bold text-[var(--glove-primary)]",
    },
  };
}

/** Options on a cart line (drawer, cart page, checkout summary, confirmation). */
export function GloveLineOptions({
  item,
  size = "md",
  className,
}: {
  item: Pick<CartItem, "customization">;
  size?: Size;
  className?: string;
}) {
  return <CartLineOptions item={item} {...optionClasses(size, className)} />;
}

/** Options on a placed order's line (account order detail). */
export function GloveOrderItemOptions({
  customization,
  size = "md",
  className,
}: {
  /** The raw `OrderItem.customization` JSON. */
  customization: unknown;
  size?: Size;
  className?: string;
}) {
  return (
    <OrderItemOptions
      customization={customization}
      {...optionClasses(size, className)}
    />
  );
}
