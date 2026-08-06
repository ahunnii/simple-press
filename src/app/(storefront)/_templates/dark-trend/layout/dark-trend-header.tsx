"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserButton } from "~/components/auth/user/user-button";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { Heart, Menu, Search, ShoppingBag, X } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { formatPrice } from "~/lib/prices";
import { authClient } from "~/server/better-auth/client";
import { Button } from "~/components/ui/button";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useWishlist } from "~/providers/wishlist-context";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
] as const;

function LogoTwoLine({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const line1 = parts[0] ?? name;
  const line2 = parts.slice(1).join(" ") || (parts[0] ?? "");

  return (
    <span className="flex flex-col leading-tight">
      <span className="font-bold tracking-[0.2em] text-white uppercase">
        {line1}
      </span>
      <span className="ml-3 font-bold tracking-[0.2em] text-white uppercase">
        {line2}
      </span>
    </span>
  );
}

export function DarkTrendHeader({ business }: DefaultHeaderTemplateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const { itemCount, total } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { isEnabled } = useStorefrontFlags();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the search input when the search row opens
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchValue.trim();
    setSearchOpen(false);
    setSearchValue("");
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  }

  // Close on Escape and return focus to hamburger (WCAG 2.4.3)
  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        hamburgerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const links =
    (business?.siteContent?.navigationItems as {
      label: string;
      href: string;
    }[]) ?? NAV_LINKS;

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

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#1F1F1F]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-4 lg:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="shrink-0 text-lg font-bold tracking-widest text-white md:text-xl"
          aria-label={`${business.name} home`}
        >
          {business.siteContent?.logoUrl ? (
            <div className="relative aspect-video h-20 w-full rounded-sm">
              <Image
                src={business.siteContent.logoUrl}
                alt={business.name}
                sizes="(max-width: 768px) 100vw, 55px"
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <LogoTwoLine name={business.name} />
          )}
        </Link>

        {/* Center nav - hidden on small screens */}
        <div className="hidden flex-1 justify-center md:flex">
          <ul className="flex items-center gap-8">
            {links.map(({ href, label }) => {
              const isActive =
                href === "/"
                  ? pathname === "/"
                  : pathname === href || pathname.startsWith(href + "/");
              return (
                <li key={href + label}>
                  <Link
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative py-1 text-sm font-semibold transition-colors ${
                      isActive ? "text-white" : "text-white/60 hover:text-white"
                    }`}
                  >
                    {label}
                    {isActive && (
                      <span
                        className="absolute -right-1 -bottom-0.5 -left-1 border-b-2 border-[#6A5ACD]"
                        aria-hidden
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Right: search + cart total + cart icon */}
        <div className="flex shrink-0 items-center gap-6">
          {/* Search toggle — ≥44px hit area via p-3 -m-3 (WCAG 2.5.5) */}
          <button
            ref={searchButtonRef}
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label={searchOpen ? "Close search" : "Search products"}
            aria-expanded={searchOpen}
            aria-controls="header-search"
            className="-m-3 p-3 text-white/90 transition-colors hover:text-white"
          >
            <Search aria-hidden="true" className="h-5 w-5" />
          </button>
          {isEnabled("wishlist") && (
            <Link
              href="/wishlist"
              className="flex items-center gap-2 text-white/90 transition-colors hover:text-white"
              aria-label={
                wishlistCount > 0
                  ? `Wishlist, ${wishlistCount} saved ${wishlistCount === 1 ? "item" : "items"}`
                  : "Wishlist"
              }
            >
              {wishlistCount > 0 && (
                <span className="text-sm font-medium" aria-hidden="true">
                  {wishlistCount}
                </span>
              )}
              <Heart aria-hidden="true" className="h-5 w-5" />
            </Link>
          )}
          <Link
            href="/cart"
            className="flex items-center gap-2 text-white/90 transition-colors hover:text-white"
            aria-label={`Cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}, total ${formatPrice(total)}`}
          >
            <span className="text-sm font-medium" aria-hidden="true">
              {formatPrice(total)}
            </span>
            <ShoppingBag aria-hidden="true" className="h-5 w-5" />
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

          {/* Hamburger — ≥44px hit area via p-3 -m-3 (WCAG 2.5.5) */}
          <button
            ref={hamburgerRef}
            type="button"
            className="-m-3 p-3 text-white/80 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav"
          >
            {mobileMenuOpen ? (
              <X aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Menu aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
        </div>
      </nav>

      {/* Search row — inert when closed so the hidden input is removed from
          tab order and SR reading order (WCAG 2.4.3 / 4.1.2) */}
      <div
        id="header-search"
        className={`overflow-hidden border-t border-white/10 transition-all duration-300 ${
          searchOpen ? "max-h-16" : "max-h-0 border-t-0"
        }`}
        inert={!searchOpen || undefined}
      >
        <form
          onSubmit={handleSearchSubmit}
          className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:px-6"
          role="search"
        >
          <Search
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-white/40"
          />
          <input
            ref={searchInputRef}
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && searchValue === "") {
                setSearchOpen(false);
                searchButtonRef.current?.focus();
              }
            }}
            placeholder="Search products…"
            aria-label="Search products"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
          <button
            type="submit"
            className="text-xs font-semibold tracking-wider text-white/60 uppercase transition-colors hover:text-white"
          >
            Search
          </button>
        </form>
      </div>

      {/* Mobile menu — inert when closed so hidden links are removed from tab
          order and SR reading order (WCAG 2.4.3 / 4.1.2) */}
      <div
        id="mobile-nav"
        className={`overflow-hidden border-t border-white/10 transition-all duration-300 md:hidden ${
          mobileMenuOpen ? "max-h-[320px]" : "max-h-0 border-t-0"
        }`}
        inert={!mobileMenuOpen || undefined}
      >
        <ul className="flex flex-col gap-1 px-6 py-4">
          {links.map(({ href, label }) => {
            const isActive =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href + label}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`block py-2 text-sm ${
                    isActive ? "text-white" : "text-white/70 hover:text-white"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </header>
  );
}
