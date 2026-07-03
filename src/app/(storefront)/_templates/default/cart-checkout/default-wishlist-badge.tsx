"use client";

import Link from "next/link";
import { Heart } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { useWishlist } from "~/providers/wishlist-context";

export function DefaultWishlistBadge() {
  const { count, isHydrated } = useWishlist();

  // Don't show count until hydrated (prevents flash)
  if (!isHydrated) {
    return (
      <Link href="/wishlist" aria-label="Wishlist">
        <Heart className="h-6 w-6" aria-hidden="true" />
      </Link>
    );
  }

  return (
    <Link
      href="/wishlist"
      aria-label={
        count > 0
          ? `Wishlist, ${count} item${count !== 1 ? "s" : ""}`
          : "Wishlist"
      }
      className="relative"
    >
      <Heart className="h-6 w-6" aria-hidden="true" />
      {count > 0 && (
        <Badge
          aria-hidden="true"
          className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center p-0 text-xs"
        >
          {count}
        </Badge>
      )}
    </Link>
  );
}
