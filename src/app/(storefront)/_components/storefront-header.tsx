"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useCart } from "~/providers/cart-context";

type Business = {
  name: string;
  siteContent: {
    logoUrl: string | null;
  } | null;
};

type StorefrontHeaderProps = {
  business: Business;
};

export function StorefrontHeader({ business }: StorefrontHeaderProps) {
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-2">
            {business.siteContent?.logoUrl ? (
              <img
                src={business.siteContent.logoUrl}
                alt={business.name}
                className="h-8 w-auto"
              />
            ) : (
              <span className="text-xl font-bold text-gray-900">
                {business.name}
              </span>
            )}
          </Link>

          {/* Navigation */}
          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="/"
              className="text-gray-600 transition-colors hover:text-gray-900"
            >
              Home
            </Link>
            <Link
              href="/products"
              className="text-gray-600 transition-colors hover:text-gray-900"
            >
              Products
            </Link>
            <Link
              href="/about"
              className="text-gray-600 transition-colors hover:text-gray-900"
            >
              About
            </Link>
          </nav>

          {/* Cart */}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/cart" className="relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="ml-2">Cart</span>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                  {itemCount}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
