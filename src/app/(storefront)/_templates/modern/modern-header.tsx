"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, ShoppingBag, X } from "lucide-react";

import { cn } from "~/lib/utils";
import { useCart } from "~/providers/cart-context";

type Business = {
  name: string;
  siteContent: {
    logoUrl: string | null;
  } | null;
};

export function ModernHeader({ business }: { business: Business }) {
  const { itemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/80 border-border sticky top-0 z-50 border-b backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link
          href="/"
          className="text-foreground text-xl font-semibold tracking-tight"
        >
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

        {/* Desktop navigation */}
        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground text-sm tracking-wide transition-colors"
          >
            Home
          </Link>
          <Link
            href="/shop"
            className="text-muted-foreground hover:text-foreground text-sm tracking-wide transition-colors"
          >
            Shop
          </Link>
          <Link
            href="/about"
            className="text-muted-foreground hover:text-foreground text-sm tracking-wide transition-colors"
          >
            About
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/cart"
            className="text-foreground hover:text-muted-foreground relative flex items-center transition-colors"
            aria-label={`Shopping cart with ${itemCount} items`}
          >
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="bg-accent text-accent-foreground absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium">
                {itemCount}
              </span>
            )}
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="text-foreground md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile navigation */}
      <div
        className={cn(
          "border-border overflow-hidden border-t transition-all duration-300 ease-in-out md:hidden",
          mobileMenuOpen ? "max-h-48" : "max-h-0 border-t-0",
        )}
      >
        <div className="flex flex-col gap-4 px-6 py-4">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground text-sm tracking-wide transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            Home
          </Link>
          <Link
            href="/products"
            className="text-muted-foreground hover:text-foreground text-sm tracking-wide transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            Shop
          </Link>
          <Link
            href="/about"
            className="text-muted-foreground hover:text-foreground text-sm tracking-wide transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            About
          </Link>
        </div>
      </div>
    </header>
  );
}
