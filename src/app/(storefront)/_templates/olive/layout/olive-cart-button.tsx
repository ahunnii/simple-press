"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { cn } from "~/lib/utils";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { useCart } from "~/providers/cart-context";

type OliveCartButtonProps = {
  className?: string;
  /** Called after navigation starts — used by the mobile overlay to close. */
  onNavigate?: () => void;
};

/**
 * Cart link with the leaf-green count badge. The badge pulses once whenever
 * the count goes up, which is the header's half of the add-to-bag
 * confirmation (`OliveToast` is the other half).
 *
 * Split out of the header because the mobile nav overlay renders it too, and
 * because `useCart` should not force a re-render of the whole header tree on
 * every cart mutation.
 */
export function OliveCartButton({
  className,
  onNavigate,
}: OliveCartButtonProps) {
  const { itemCount } = useCart();
  const reduced = useReducedMotion();
  const [pulse, setPulse] = useState(false);
  const previousCount = useRef(itemCount);

  useEffect(() => {
    if (itemCount > previousCount.current && !reduced) {
      setPulse(true);
      previousCount.current = itemCount;
      const timer = setTimeout(() => setPulse(false), 460);
      return () => clearTimeout(timer);
    }
    previousCount.current = itemCount;
  }, [itemCount, reduced]);

  return (
    <Link
      href="/cart"
      onClick={onNavigate}
      className={cn("olive-icon-btn", className)}
      aria-label={
        itemCount > 0
          ? `View bag, ${itemCount} ${itemCount === 1 ? "item" : "items"}`
          : "View bag"
      }
    >
      <ShoppingBag
        className="h-[18px] w-[18px]"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      {itemCount > 0 ? (
        <span
          className="olive-cart-badge"
          data-pulse={pulse ? "true" : undefined}
          aria-hidden="true"
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      ) : null}
    </Link>
  );
}
