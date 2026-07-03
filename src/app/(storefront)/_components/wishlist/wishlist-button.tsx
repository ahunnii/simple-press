"use client";

import { Heart } from "lucide-react";

import type { WishlistItem } from "~/providers/wishlist-context";
import { cn } from "~/lib/utils";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useWishlist } from "~/providers/wishlist-context";

type WishlistButtonProps = {
  /** Snapshot of the product to save — `addedAt` is stamped on toggle. */
  item: Omit<WishlistItem, "addedAt">;
  /**
   * Extra classes for the button (positioning, palette, radius…). Defaults
   * are visually neutral — a translucent white chip with a dark icon — so
   * each template can override `bg-*` / `text-*` / `rounded-*` to blend in.
   */
  className?: string;
  /** Extra classes for the heart icon (e.g. size overrides). */
  iconClassName?: string;
};

/**
 * Small heart toggle for saving a product to the localStorage wishlist.
 *
 * Designed to be overlaid on product-card images: it stops propagation and
 * prevents default so clicking it never triggers the card's link navigation.
 * Keyboard-operable with a visible `currentColor` focus ring; state is
 * conveyed via `aria-pressed` (label stays stable) and a filled heart.
 */
export function WishlistButton({
  item,
  className,
  iconClassName,
}: WishlistButtonProps) {
  const { isEnabled } = useStorefrontFlags();
  const { has, toggle } = useWishlist();
  const saved = has(item.productId);

  if (!isEnabled("wishlist")) return null;

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={`Save ${item.name} to wishlist`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(item);
      }}
      className={cn(
        "inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/85 text-neutral-900 shadow-sm backdrop-blur-sm transition-transform duration-200 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current motion-reduce:transition-none motion-reduce:hover:scale-100",
        className,
      )}
    >
      <Heart
        className={cn("size-4", iconClassName)}
        fill={saved ? "currentColor" : "none"}
        aria-hidden="true"
      />
    </button>
  );
}
