"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { useCart } from "~/providers/cart-context";

export function DefaultCartBadge() {
  const { itemCount, isHydrated } = useCart();

  // Don't show count until hydrated (prevents flash)
  if (!isHydrated) {
    return (
      <Link href="/cart" className="relative">
        <ShoppingCart className="h-6 w-6" />
      </Link>
    );
  }

  return (
    <Link href="/cart" className="relative">
      <ShoppingCart className="h-6 w-6" />
      {itemCount > 0 && (
        <Badge className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center p-0 text-xs">
          {itemCount}
        </Badge>
      )}
    </Link>
  );
}
