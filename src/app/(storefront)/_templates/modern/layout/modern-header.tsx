"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { Heart, Menu, ShoppingBag, X } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { cn } from "~/lib/utils";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { Button } from "~/components/ui/button";
import { UserButton } from "~/components/auth/user/user-button";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useWishlist } from "~/providers/wishlist-context";

export function ModernHeader({ business }: DefaultHeaderTemplateProps) {
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { data: session, isPending } = useHydratedSession();
  const { isEnabled } = useStorefrontFlags();
  const { isEnabled: isBusinessFeatureEnabled } = useFeatureFlags({
    flags: (business?.featureFlags as Record<string, boolean>) ?? {},
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Refs for focus management (C-2)
  const mobileDialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);

  // Escape key scoped to when the menu is open (C-2)
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  // Scroll-lock while open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // C-2: On open move focus to Close button; on close return focus to hamburger.
  // wasOpenRef guards the close branch so focus isn't stolen on initial mount.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (mobileMenuOpen) {
      wasOpenRef.current = true;
      const id = setTimeout(() => closeButtonRef.current?.focus(), 0);
      return () => clearTimeout(id);
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      hamburgerButtonRef.current?.focus();
    }
  }, [mobileMenuOpen]);

  // C-2: Tab focus trap inside the drawer
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const dialog = mobileDialogRef.current;
      if (!dialog) return;
      const focusableSelectors =
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelectors),
      ).filter((el) => !el.closest("[inert]"));
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [mobileMenuOpen]);

  const defaultNavLinks = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    { href: "/about", label: "About Us" },
    ...(isBusinessFeatureEnabled("services")
      ? [{ href: "/services", label: "Services" }]
      : []),
    { href: "/contact", label: "Contact" },
  ];

  const links =
    (business?.siteContent?.navigationItems as {
      label: string;
      href: string;
    }[]) ?? defaultNavLinks;

  const authActions = (
    <>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/auth/sign-in">Log in</Link>
      </Button>
    </>
  );

  const userMenu = session?.user && (
    <UserButton
      size="icon"
      className="border-primary border"
      avatarClassName="size-10"
      links={[
        // Business members reach /admin too, not just platform admins — this
        // matches the gate the other templates already use.
        ...(session?.user?.platformRole === "PLATFORM_ADMIN" ||
        session?.session?.membershipId
          ? [
              {
                icon: <IconLayoutDashboard className="h-4 w-4" />,
                label: "Admin",
                href: "/admin",
              },
            ]
          : []),
        // /account/orders 404s when the owner disables the `orders` feature.
        ...(isEnabled("orders")
          ? [
              {
                icon: <IconPackage className="h-4 w-4" />,
                label: "Orders",
                href: "/account/orders",
              },
            ]
          : []),
      ]}
    />
  );

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <header className="bg-background/95 supports-backdrop-filter:bg-background/80 border-border sticky top-0 z-50 border-b backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link
            href="/"
            className="text-foreground text-xl font-semibold tracking-tight"
          >
            {business.siteContent?.logoUrl ? (
              <Image
                src={business.siteContent.logoUrl}
                alt={resolveLogoAlt(
                  business.siteContent?.logoAltText,
                  business.name,
                )}
                width={50}
                height={50}
                className="bg-primary rounded-full"
              />
            ) : (
              <span className="text-xl font-bold text-gray-900">
                {business.name}
              </span>
            )}
          </Link>

          {/* Desktop navigation */}
          <div className="hidden items-center gap-8 md:flex">
            {links.map(({ href, label }) => (
              <Link
                key={href + label}
                href={href}
                className="text-muted-foreground hover:text-foreground text-sm tracking-wide transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {isEnabled("wishlist") && (
              <Link
                href="/wishlist"
                className="text-foreground hover:text-muted-foreground relative flex items-center transition-colors"
                aria-label={`Wishlist with ${wishlistCount} items`}
              >
                {/* M-2: decorative icon inside an aria-labeled link */}
                <Heart className="h-5 w-5" aria-hidden="true" />
                {wishlistCount > 0 && (
                  <span className="bg-accent text-accent-foreground absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium">
                    {wishlistCount}
                  </span>
                )}
              </Link>
            )}

            <Link
              href="/cart"
              className="text-foreground hover:text-muted-foreground relative flex items-center transition-colors"
              aria-label={`Shopping cart with ${itemCount} items`}
            >
              {/* M-2: decorative icon inside an aria-labeled link */}
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              {itemCount > 0 && (
                <span className="bg-accent text-accent-foreground absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium">
                  {itemCount}
                </span>
              )}
            </Link>

            {isEnabled("customerAccounts") && (
              <>
                {isPending ? (
                  <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
                ) : session?.user ? (
                  userMenu
                ) : (
                  authActions
                )}
              </>
            )}

            {/* Mobile menu toggle — C-2: aria-controls + ref */}
            <button
              ref={hamburgerButtonRef}
              type="button"
              className="text-foreground md:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {/* M-2: decorative icon inside a labeled button */}
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </nav>
      </header>

      {/* Backdrop — M-11: motion-reduce:transition-none */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 motion-reduce:transition-none md:hidden",
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeMenu}
        aria-hidden="true"
      />

      {/* Drawer — C-2: inert when closed, id, role/aria-modal/aria-label */}
      {/* M-11: motion-reduce:transition-none on the slide transform */}
      <div
        ref={mobileDialogRef}
        id="mobile-menu"
        className={cn(
          "bg-background fixed inset-y-0 right-0 z-50 flex w-72 flex-col shadow-xl transition-transform duration-300 ease-in-out motion-reduce:transition-none md:hidden",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full",
        )}
        role="dialog"
        aria-label="Navigation menu"
        aria-modal="true"
        // C-2: inert (React 19 boolean prop) hides contents from AT and tab order when closed
        inert={!mobileMenuOpen ? true : undefined}
      >
        <div className="border-border flex items-center justify-between border-b px-6 py-5">
          <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            Menu
          </span>
          {/* C-2: close button ref so focus can be moved here on open */}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeMenu}
            aria-label="Close menu"
            className="text-foreground"
          >
            {/* M-2: decorative icon inside a labeled button */}
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col px-4 py-6">
          {links.map(({ href, label }) => (
            <Link
              key={href + label}
              href={href}
              className="text-foreground hover:bg-muted rounded-sm px-4 py-4 text-base tracking-wide transition-colors"
              onClick={closeMenu}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-border flex flex-col gap-4 border-t px-6 py-5">
          {isEnabled("wishlist") && (
            <Link
              href="/wishlist"
              className="text-foreground flex items-center gap-3"
              onClick={closeMenu}
            >
              {/* M-2: decorative icon, link text "Wishlist (n)" provides the name */}
              <Heart className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-medium">
                Wishlist{wishlistCount > 0 ? ` (${wishlistCount})` : ""}
              </span>
            </Link>
          )}

          <Link
            href="/cart"
            className="text-foreground flex items-center gap-3"
            onClick={closeMenu}
          >
            {/* M-2: decorative icon, link text "Cart (n)" provides the name */}
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-medium">
              Cart{itemCount > 0 ? ` (${itemCount})` : ""}
            </span>
          </Link>
        </div>
      </div>
    </>
  );
}
