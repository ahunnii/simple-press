"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, User, X } from "lucide-react";

import { Button } from "~/components/ui/button";

import { DefaultCartBadge } from "./default-cart-badge";

type Business = {
  name: string;
  siteContent: {
    logoUrl: string | null;
  } | null;
};

type Props = {
  business: Business;
};

export function DefaultHeader({ business }: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="bg-background sticky top-0 z-50 w-full border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-6 md:gap-10">
            <Link href="/" className="flex items-center gap-2">
              {business.siteContent?.logoUrl ? (
                <Image
                  src={business.siteContent.logoUrl}
                  alt={business.name}
                  width={40}
                  height={40}
                  className="bg-primary rounded-full"
                />
              ) : (
                <span className="text-xl font-bold">{business.name}</span>
              )}
            </Link>
            <nav className="hidden gap-6 md:flex">
              <Link
                href="/"
                className="hover:text-primary text-sm font-medium transition-colors"
              >
                Home
              </Link>
              <Link
                href="/products"
                className="hover:text-primary text-sm font-medium transition-colors"
              >
                Shop
              </Link>
              <Link
                href="/about"
                className="hover:text-primary text-sm font-medium transition-colors"
              >
                About
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link href="/login">
                <User className="h-5 w-5" />
                <span className="sr-only">Sign In</span>
              </Link>
            </Button>
            <DefaultCartBadge />
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
              <span className="sr-only">Menu</span>
            </Button>
          </div>
        </div>
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="bg-background space-y-4 border-t p-4 md:hidden">
            <nav className="flex flex-col space-y-4">
              <Link
                href="/"
                className="hover:text-primary text-sm font-medium transition-colors"
              >
                Home
              </Link>
              <Link
                href="/products"
                className="hover:text-primary text-sm font-medium transition-colors"
              >
                Shop
              </Link>

              <Link
                href="/about"
                className="hover:text-primary text-sm font-medium transition-colors"
              >
                About
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
