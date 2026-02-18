"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../types";
import { useCart } from "~/providers/cart-context";

import { ElegantCartDrawer } from "./elegant-cart-drawer";

export function ElegantHeader({ business }: DefaultHeaderTemplateProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { setIsOpen, itemCount } = useCart();

  return (
    <>
      <header className="fixed top-0 right-0 left-0 z-50 px-4 pt-4">
        <nav
          className="animate-scale-fade-in mx-auto my-0 max-w-7xl rounded-lg border border-[rgba(255,255,255,0.32)] bg-[rgba(255,255,255,0.4)] px-6 py-0 backdrop-blur-md lg:px-8"
          style={{ boxShadow: "rgba(0, 0, 0, 0.1) 0px 10px 50px" }}
        >
          <div className="flex h-[68px] items-center justify-between">
            {/* Mobile menu button */}
            <button
              type="button"
              className="text-foreground/80 hover:text-foreground boty-transition p-2 lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            {/* Desktop Navigation - Left */}
            <div className="hidden items-center gap-8 lg:flex">
              <Link
                href="/shop"
                className="text-foreground/70 hover:text-foreground boty-transition text-sm tracking-wide"
              >
                Shop
              </Link>
              <Link
                href="/about"
                className="text-foreground/70 hover:text-foreground boty-transition text-sm tracking-wide"
              >
                About
              </Link>
              <Link
                href="/contact"
                className="text-foreground/70 hover:text-foreground boty-transition text-sm tracking-wide"
              >
                Contact
              </Link>
            </div>

            {/* Logo */}
            <Link href="/" className="absolute left-1/2 -translate-x-1/2">
              {business?.siteContent?.logoUrl ? (
                <Image
                  src={business.siteContent.logoUrl}
                  alt={business.name}
                  width={40}
                  height={40}
                  className="bg-primary rounded-full"
                />
              ) : (
                <h1 className="text-foreground font-serif text-3xl tracking-wider">
                  {business?.name}
                </h1>
              )}
            </Link>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="text-foreground/70 hover:text-foreground boty-transition p-2"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
              <Link
                href="/cart"
                className="text-foreground/70 hover:text-foreground boty-transition hidden p-2 sm:block"
                aria-label="Cart page"
              >
                <User className="h-5 w-5" />
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="text-foreground/70 hover:text-foreground boty-transition relative p-2"
                aria-label="Cart"
              >
                <ShoppingBag className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="bg-primary text-primary-foreground absolute -top-0 -right-0 flex h-4 w-4 items-center justify-center rounded-full text-[10px]">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <ElegantCartDrawer />

          {/* Mobile Navigation */}
          <div
            className={`boty-transition overflow-hidden lg:hidden ${
              isMenuOpen ? "max-h-64 pb-6" : "max-h-0"
            }`}
          >
            <div className="border-border/50 flex flex-col gap-4 border-t pt-4">
              <Link
                href="/shop"
                className="text-foreground/70 hover:text-foreground boty-transition text-sm tracking-wide"
              >
                Shop
              </Link>
              <Link
                href="/about"
                className="text-foreground/70 hover:text-foreground boty-transition text-sm tracking-wide"
              >
                About
              </Link>
              <Link
                href="/ingredients"
                className="text-foreground/70 hover:text-foreground boty-transition text-sm tracking-wide"
              >
                Ingredients
              </Link>
              <Link
                href="/cart"
                className="text-foreground/70 hover:text-foreground boty-transition text-sm tracking-wide"
              >
                Cart
              </Link>
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}
