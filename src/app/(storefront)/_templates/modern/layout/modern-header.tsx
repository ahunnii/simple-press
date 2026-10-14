"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { ChevronDown, Heart, Menu, ShoppingBag, X } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { cn } from "~/lib/utils";
import { useCartEnabled } from "~/hooks/use-cart-enabled";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { Button } from "~/components/ui/button";
import { UserButton } from "~/components/auth/user/user-button";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useWishlist } from "~/providers/wishlist-context";
import {
  activeEntryIndex,
  donateLinkOptions,
  externalLinkProps,
  filterNavByFlags,
  isNavItemActive,
  navGroupEntries,
  resolveNav,
  withDonateLink,
} from "~/app/(storefront)/_components/nav";
import { useNavDropdown } from "~/app/(storefront)/_components/nav/use-nav-dropdown";

const externalHint = <span className="sr-only"> (opens in new tab)</span>;

export function ModernHeader({ business }: DefaultHeaderTemplateProps) {
  const pathname = usePathname();
  const dd = useNavDropdown(pathname, "modern-nav");
  const { itemCount } = useCart();
  const cartEnabled = useCartEnabled();
  const { count: wishlistCount } = useWishlist();
  const { data: session, isPending } = useHydratedSession();
  const { isEnabled } = useStorefrontFlags();
  const { isEnabled: isBusinessFeatureEnabled } = useFeatureFlags({
    flags: (business?.featureFlags as Record<string, boolean>) ?? {},
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Mobile accordion: one group open at a time.
  const [expanded, setExpanded] = useState<number | null>(null);

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

  // Owner nav (or the starter menu above) through the shared resolver + route→
  // flag filter; the Donations "show in header" switch appends a last /donate.
  // Groups (one level of children) render as hover/keyboard dropdowns on
  // desktop and an accordion in the drawer; withDonateLink sees a /donate
  // nested in a group and doesn't duplicate it.
  const links = withDonateLink(
    filterNavByFlags(
      resolveNav(business?.siteContent?.navigationItems, defaultNavLinks),
      isEnabled,
    ),
    donateLinkOptions(business, isEnabled, "header"),
  );

  // Opening the drawer expands the group holding the current route.
  const openMobileMenu = () => {
    const idx = links.findIndex(
      (item) => !!item.children?.length && isNavItemActive(pathname, item),
    );
    setExpanded(idx === -1 ? null : idx);
    setMobileMenuOpen(true);
  };

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
          <div
            ref={dd.containerRef as React.RefObject<HTMLDivElement | null>}
            className="hidden items-center gap-8 md:flex"
          >
            {links.map((item, i) => {
              if (item.children?.length) {
                const isOpen = dd.openIndex === i;
                const entries = navGroupEntries(item);
                const activeEntry = activeEntryIndex(pathname, entries);
                const groupActive = isNavItemActive(pathname, item);
                return (
                  <div key={i} className="relative" {...dd.groupProps(i)}>
                    {/* Trigger never navigates; a non-empty parent href is the
                        panel's first entry. Active styling, no aria-current. */}
                    <button
                      {...dd.triggerProps(i)}
                      className={cn(
                        "hover:text-foreground focus-visible:ring-ring inline-flex cursor-pointer items-center gap-1 rounded-sm text-sm tracking-wide transition-colors focus-visible:ring-2 focus-visible:outline-none",
                        groupActive || isOpen
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {item.label}
                      <ChevronDown
                        aria-hidden="true"
                        className={cn(
                          "size-3.5 transition-transform duration-200 motion-reduce:transition-none",
                          isOpen && "rotate-180",
                        )}
                      />
                    </button>

                    {isOpen && (
                      <div
                        id={dd.panelId(i)}
                        className="absolute top-full left-0 z-50 pt-2"
                      >
                        <ul className="bg-background border-border min-w-48 rounded-md border py-1 shadow-lg">
                          {entries.map((child, j) => {
                            const childActive = j === activeEntry;
                            return (
                              <li key={j}>
                                <Link
                                  href={child.href}
                                  {...externalLinkProps(child.external)}
                                  aria-current={
                                    childActive ? "page" : undefined
                                  }
                                  onClick={() => dd.close()}
                                  className={cn(
                                    "hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground block px-4 py-2 text-sm whitespace-nowrap transition-colors focus-visible:outline-none",
                                    childActive
                                      ? "text-foreground bg-muted"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {child.label}
                                  {child.external && externalHint}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              }

              const active = isNavItemActive(pathname, item);
              return (
                <Link
                  key={i}
                  href={item.href}
                  {...externalLinkProps(item.external)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "hover:text-foreground text-sm tracking-wide transition-colors",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                  {item.external && externalHint}
                </Link>
              );
            })}
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

            {/* Catalog mode (B6.11): no cart icon when `cart` is off */}
            {cartEnabled && (
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
            )}

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
              onClick={openMobileMenu}
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

        <nav
          aria-label="Mobile navigation"
          className="flex flex-1 flex-col overflow-y-auto px-4 py-6"
        >
          {links.map((item, i) => {
            if (item.children?.length) {
              const isOpen = expanded === i;
              const sublistId = `mobile-menu-group-${i}`;
              const entries = navGroupEntries(item);
              const activeEntry = activeEntryIndex(pathname, entries);
              return (
                <div key={i}>
                  {/* Never navigates; a non-empty parent href is the sublist's
                      first entry. Active styling, no aria-current. */}
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={sublistId}
                    onClick={() => setExpanded(isOpen ? null : i)}
                    className={cn(
                      "hover:bg-muted flex w-full cursor-pointer items-center justify-between rounded-sm px-4 py-4 text-left text-base tracking-wide transition-colors",
                      isNavItemActive(pathname, item)
                        ? "text-foreground font-medium"
                        : "text-foreground",
                    )}
                  >
                    {item.label}
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        "size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {isOpen && (
                    <ul id={sublistId} className="flex flex-col pb-2">
                      {entries.map((child, j) => {
                        const childActive = j === activeEntry;
                        return (
                          <li key={j}>
                            <Link
                              href={child.href}
                              {...externalLinkProps(child.external)}
                              aria-current={childActive ? "page" : undefined}
                              onClick={closeMenu}
                              className={cn(
                                "hover:bg-muted hover:text-foreground block rounded-sm py-3 pr-4 pl-8 text-sm tracking-wide transition-colors",
                                childActive
                                  ? "text-foreground font-medium"
                                  : "text-muted-foreground",
                              )}
                            >
                              {child.label}
                              {child.external && externalHint}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            }

            const active = isNavItemActive(pathname, item);
            return (
              <Link
                key={i}
                href={item.href}
                {...externalLinkProps(item.external)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-foreground hover:bg-muted rounded-sm px-4 py-4 text-base tracking-wide transition-colors",
                  active && "font-medium",
                )}
                onClick={closeMenu}
              >
                {item.label}
                {item.external && externalHint}
              </Link>
            );
          })}
        </nav>

        {/* Catalog mode (B6.11): drop the block when nothing is left in it */}
        {(isEnabled("wishlist") || cartEnabled) && (
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

            {cartEnabled && (
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
            )}
          </div>
        )}
      </div>
    </>
  );
}
