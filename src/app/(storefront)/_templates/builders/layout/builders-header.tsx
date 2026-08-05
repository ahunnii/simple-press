"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "~/components/auth/user/user-button";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { ArrowRight, Heart, Menu, ShoppingBag, User, X } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { cn } from "~/lib/utils";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useWishlist } from "~/providers/wishlist-context";

type NavLink = { label: string; href: string; external?: boolean };

const DEFAULT_NAV: NavLink[] = [
  { href: "/about", label: "The Coop" },
  { href: "/contact", label: "Work With Us" },
  { href: "/blog", label: "Journal" },
];

export function BuildersHeader({
  business,
  session,
}: DefaultHeaderTemplateProps) {
  const { itemCount } = useCart();
  const { count: wishlistCount, isHydrated: wishlistHydrated } = useWishlist();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mobileDialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);

  // Scroll-aware: switch from transparent to solid on scroll
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll while mobile menu is open
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // Focus management: open → close button; close → hamburger
  useEffect(() => {
    if (mobileOpen) {
      const id = setTimeout(() => closeButtonRef.current?.focus(), 0);
      return () => clearTimeout(id);
    } else {
      hamburgerButtonRef.current?.focus();
    }
  }, [mobileOpen]);

  // Inert siblings when mobile menu is open
  useEffect(() => {
    const siblings: Element[] = [];
    const main = document.querySelector("main");
    const footer = document.querySelector("footer");
    if (main) siblings.push(main);
    if (footer) siblings.push(footer);
    if (mobileOpen) {
      siblings.forEach((el) => el.setAttribute("inert", ""));
    } else {
      siblings.forEach((el) => el.removeAttribute("inert"));
    }
    return () => {
      siblings.forEach((el) => el.removeAttribute("inert"));
    };
  }, [mobileOpen]);

  // Keyboard tab trap in mobile menu
  useEffect(() => {
    if (!mobileOpen) return;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const dialog = mobileDialogRef.current;
      if (!dialog) return;
      const focusableSelectors =
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
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
  }, [mobileOpen]);

  // Escape key closes mobile menu
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const { isEnabled } = useFeatureFlags({
    flags: (business?.featureFlags as Record<string, boolean>) ?? {},
  });

  const { isEnabled: isStorefrontEnabled } = useStorefrontFlags();

  const customNav = business?.siteContent?.navigationItems as
    | NavLink[]
    | undefined;

  const navLinks: NavLink[] = customNav ?? [
    ...(isEnabled("products") ? [{ href: "/shop", label: "Our Work" }] : []),
    ...DEFAULT_NAV.filter((l) => l.href !== "/blog" || isEnabled("blog")),
  ];

  const businessName = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl;

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  // The transparent/white-on-hero treatment is only valid on the homepage,
  // which has a dark hero behind the header. On every other route (inner pages
  // rendered with default bodies under the builders chrome) there is no hero,
  // so the header must be solid from the top to stay legible and in-flow.
  const solid = scrolled || pathname !== "/";

  const showAdminLink =
    session?.user?.platformRole === "PLATFORM_ADMIN" ||
    !!session?.session?.membershipId;

  const closeMobileMenu = () => setMobileOpen(false);

  const brand = logoUrl ? (
    <div className="relative h-[3.125rem] w-[7.5rem]">
      <Image
        src={logoUrl}
        alt={businessName}
        fill
        sizes="120px"
        className="object-contain object-left"
      />
    </div>
  ) : (
    <span
      className="text-sm font-bold tracking-[0.2em] uppercase"
      style={{ fontFamily: "var(--font-builders-display, 'Jost', sans-serif)" }}
    >
      {businessName || "Builders"}
    </span>
  );

  const userMenu = session?.user && (
    <UserButton
      size="icon"
      className="rounded-none w-auto h-auto p-0 border border-gray-200"
      avatarClassName="size-7"
      links={[
        {
          icon: <IconPackage className="h-4 w-4" />,
          label: "Orders",
          href: "/account/orders",
        },
        ...(showAdminLink
          ? [
              {
                icon: <IconLayoutDashboard className="h-4 w-4" />,
                label: "Admin",
                href: "/admin",
              },
            ]
          : []),
      ]}
    />
  );

  const authLink = !session?.user && (
    <Link href="/auth/sign-in" aria-label="Account">
      <User
        className="h-[18px] w-[18px] text-gray-600 transition-opacity hover:opacity-60"
        strokeWidth={1.4}
      />
    </Link>
  );

  // Header is transparent + absolute when at top of page (for hero overlap),
  // solid white + sticky when scrolled
  const headerBase = "w-full z-50 transition-all duration-300";
  const headerScrolled = solid
    ? "sticky top-0 bg-white border-b border-gray-200 shadow-none"
    : "absolute top-0 left-0 bg-transparent border-b border-white/20";

  return (
    <>
      <header
        className={cn(headerBase, headerScrolled, !solid && "builders-on-dark")}
      >
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-4 py-5 md:px-12">
          {/* Brand / logo */}
          <Link
            href="/"
            aria-label="Home"
            className={cn(
              "flex items-center transition-opacity hover:opacity-80",
              solid ? "text-[var(--builders-ink)]" : "text-white",
            )}
          >
            {brand}
          </Link>

          {/* Desktop nav */}
          <nav
            className="hidden items-center gap-8 md:flex"
            aria-label="Primary navigation"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "text-sm font-bold tracking-widest uppercase transition-colors",
                  solid
                    ? isActive(link.href)
                      ? "text-[var(--builders-ink)]"
                      : "text-gray-600 hover:text-[var(--builders-ink)]"
                    : isActive(link.href)
                      ? "text-white"
                      : "text-white/80 hover:text-white",
                )}
                style={{
                  fontFamily:
                    "var(--font-builders-body, 'Agdasima', sans-serif)",
                  letterSpacing: "0.1em",
                }}
              >
                {link.label}
                {link.external && (
                  <span className="sr-only">(opens in new tab)</span>
                )}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-4">
            {/* Desktop auth */}
            {isStorefrontEnabled("customerAccounts") && (
              <div className="hidden md:flex md:items-center md:gap-4">
                {session?.user ? userMenu : authLink}
              </div>
            )}

            {/* Wishlist */}
            {isStorefrontEnabled("wishlist") && (
              <Link
                href="/wishlist"
                aria-label="Open wishlist"
                className={cn(
                  "relative -m-3 flex items-center p-3 transition-opacity hover:opacity-60",
                  solid ? "text-gray-700" : "text-white",
                )}
              >
                <Heart className="h-[18px] w-[18px]" strokeWidth={1.4} />
                {wishlistHydrated && wishlistCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center text-[9px] font-bold"
                    style={{
                      background: "var(--builders-accent, #FFC5B6)",
                      color: "var(--builders-accent-ink, #31130A)",
                      minWidth: "16px",
                    }}
                  >
                    {wishlistCount}
                  </span>
                )}
              </Link>
            )}

            {/* Cart */}
            {isEnabled("cart") && (
              <Link
                href="/cart"
                aria-label={
                  itemCount > 0
                    ? `View cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`
                    : "View cart"
                }
                className={cn(
                  "relative -m-3 flex items-center p-3 transition-opacity hover:opacity-60",
                  solid ? "text-gray-700" : "text-white",
                )}
              >
                <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.4} />
                {itemCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center text-[9px] font-bold"
                    style={{
                      background: "var(--builders-accent, #FFC5B6)",
                      color: "var(--builders-accent-ink, #31130A)",
                      minWidth: "16px",
                    }}
                  >
                    {itemCount}
                  </span>
                )}
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              ref={hamburgerButtonRef}
              type="button"
              className={cn(
                "flex h-11 w-11 items-center justify-center border transition-opacity hover:opacity-70 md:hidden",
                solid
                  ? "border-gray-200 text-gray-700"
                  : "border-white/40 text-white",
              )}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="builders-mobile-menu"
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Menu className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen mobile navigation */}
      {mobileOpen ? (
        <div
          ref={mobileDialogRef}
          id="builders-mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          className="fixed inset-0 z-[60] flex flex-col md:hidden"
          style={{
            background: "var(--builders-surface, #ffffff)",
            color: "var(--builders-ink, #131313)",
          }}
        >
          {/* Mobile header */}
          <div
            className="flex shrink-0 items-center justify-between border-b px-5 py-4"
            style={{ borderColor: "var(--builders-rule, #e5e7eb)" }}
          >
            <Link
              href="/"
              onClick={closeMobileMenu}
              aria-label="Home"
              className="flex items-center text-[var(--builders-ink)] transition-opacity hover:opacity-80"
            >
              {brand}
            </Link>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeMobileMenu}
              aria-label="Close menu"
              className="p-3 text-[var(--builders-ink)] transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--builders-ink)]"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Mobile nav links */}
          <nav
            className="flex flex-1 flex-col overflow-y-auto overscroll-contain px-8"
            aria-label="Mobile navigation"
          >
            <ul className="flex flex-1 flex-col items-start gap-6 pt-10">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      onClick={closeMobileMenu}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-4 text-4xl leading-tight transition-all",
                        active
                          ? "border-b-2 pb-1 font-bold text-[var(--builders-ink)]"
                          : "text-[var(--builders-ink)]/70 hover:text-[var(--builders-ink)]",
                      )}
                      style={{
                        fontFamily:
                          "var(--font-builders-display, 'Jost', sans-serif)",
                        fontWeight: active ? 700 : 300,
                        ...(active
                          ? { borderColor: "var(--builders-accent)" }
                          : {}),
                      }}
                    >
                      {link.label}
                      {link.external && (
                        <span className="sr-only">(opens in new tab)</span>
                      )}
                      <ArrowRight
                        aria-hidden
                        className="h-7 w-7 -translate-x-4 text-[var(--builders-accent-hover)] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Mobile footer */}
          <div
            className="shrink-0 border-t px-5 py-6"
            style={{ borderColor: "var(--builders-rule, #e5e7eb)" }}
          >
            <div className="flex flex-col gap-6">
              {/* Contact CTA */}
              <Link
                href="/contact"
                onClick={closeMobileMenu}
                className="flex h-12 items-center justify-center rounded-none border border-transparent bg-[var(--builders-accent)] transition-colors hover:border-[var(--builders-ink)] hover:bg-[var(--builders-accent-hover)]"
                style={{
                  color: "var(--builders-accent-ink)",
                  fontFamily:
                    "var(--font-builders-body, 'Agdasima', sans-serif)",
                }}
              >
                <span className="text-xs font-bold tracking-widest uppercase">
                  Contact
                </span>
              </Link>

              {/* Wishlist + cart + account row */}
              <div className="flex items-center justify-center gap-4">
                {isStorefrontEnabled("wishlist") && (
                  <>
                    <Link
                      href="/wishlist"
                      onClick={closeMobileMenu}
                      aria-label="Open wishlist"
                      className="flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase transition-colors hover:text-[var(--builders-ink)]"
                      style={{
                        color:
                          "color-mix(in srgb, var(--builders-ink) 60%, transparent)",
                        fontFamily:
                          "var(--font-builders-body, 'Agdasima', sans-serif)",
                      }}
                    >
                      <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                      Wishlist
                      {wishlistHydrated && wishlistCount > 0
                        ? ` (${wishlistCount})`
                        : ""}
                    </Link>

                    <span
                      aria-hidden="true"
                      className="h-4 w-px bg-[var(--builders-rule)]"
                    />
                  </>
                )}

                {isEnabled("cart") && (
                  <>
                    <Link
                      href="/cart"
                      onClick={closeMobileMenu}
                      aria-label={
                        itemCount > 0
                          ? `View cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`
                          : "View cart"
                      }
                      className="flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase transition-colors hover:text-[var(--builders-ink)]"
                      style={{
                        color:
                          "color-mix(in srgb, var(--builders-ink) 60%, transparent)",
                        fontFamily:
                          "var(--font-builders-body, 'Agdasima', sans-serif)",
                      }}
                    >
                      <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                      Cart{itemCount > 0 ? ` (${itemCount})` : ""}
                    </Link>

                    <span
                      aria-hidden="true"
                      className="h-4 w-px bg-[var(--builders-rule)]"
                    />
                  </>
                )}

                {isStorefrontEnabled("customerAccounts") && (
                  <>
                    {session?.user ? (
                      <div className="flex items-center justify-center">
                        {userMenu}
                      </div>
                    ) : (
                      <Link
                        href="/auth/sign-in"
                        onClick={closeMobileMenu}
                        className="flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase transition-colors hover:text-[var(--builders-ink)]"
                        style={{
                          color:
                            "color-mix(in srgb, var(--builders-ink) 60%, transparent)",
                          fontFamily:
                            "var(--font-builders-body, 'Agdasima', sans-serif)",
                        }}
                      >
                        <User className="h-3.5 w-3.5" aria-hidden="true" />
                        Login
                      </Link>
                    )}
                  </>
                )}
              </div>

              {/* Business name / location label */}
              <div
                className="text-center text-xs font-bold tracking-[0.2em] uppercase"
                style={{
                  color:
                    "color-mix(in srgb, var(--builders-ink) 50%, transparent)",
                  fontFamily:
                    "var(--font-builders-body, 'Agdasima', sans-serif)",
                }}
              >
                {business?.name ?? ""}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
