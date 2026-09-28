"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Heart, Leaf, ShoppingCart, User } from "lucide-react";
import { motion } from "motion/react";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { NavItem } from "~/app/(storefront)/_components/nav";
import type { UserButtonLink } from "~/components/auth/user/user-button";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { isActiveNavLink } from "~/lib/nav-utils";
import { shippingConfigFromBusiness } from "~/lib/shipping-utils";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { UserButton } from "~/components/auth/user/user-button";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useWishlist } from "~/providers/wishlist-context";
import {
  activeEntryIndex,
  externalLinkProps,
  getAccountNavLinks,
  isNavItemActive,
  navGroupEntries,
} from "~/app/(storefront)/_components/nav";

import { resolveFields } from "..";
import { HappyBambooCartDrawer } from "../cart-checkout/happy-bamboo-cart-drawer";
import {
  HB_ACCOUNT_LINK_ICONS,
  HB_QUICK_ACCOUNT_KEYS,
} from "../lib/account-link-icons";
import { resolveHappyBambooNav } from "../lib/nav";
import {
  HappyBambooMenuToggle,
  HappyBambooMobileMenu,
} from "./happy-bamboo-mobile-nav";

export function HappyBambooHeader({
  business,
  initialSession,
}: DefaultHeaderTemplateProps) {
  const { itemCount, setIsOpen } = useCart();
  const { count: wishlistCount, isHydrated: wishlistHydrated } = useWishlist();
  const pathname = usePathname();
  const { isEnabled } = useStorefrontFlags();
  const { data: session, isPending } = useHydratedSession(initialSession);

  const [mobileOpen, setMobileOpen] = useState(false);
  // The mobile panel hangs off the header's bottom edge and hands focus back
  // to the toggle on Escape.
  const headerRef = useRef<HTMLElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);

  // Desktop sub-nav: index of the open dropdown group (one at a time). A
  // custom disclosure, not Radix — a portaled menu would escape the
  // `.happy-bamboo` scope and lose its tokens/fonts.
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const triggerRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const desktopNavRef = useRef<HTMLElement>(null);
  // Set when hover (or a touch tap's emulated mouseenter) opened the group,
  // so the click that usually follows doesn't immediately toggle it shut.
  const openedByHover = useRef(false);

  // Close on route change (back/forward, programmatic pushes). Adjusting
  // state during render on a changed input, per the React docs, rather than
  // a set-state-in-effect.
  const [dropdownPath, setDropdownPath] = useState(pathname);
  if (dropdownPath !== pathname) {
    setDropdownPath(pathname);
    setOpenDropdown(null);
  }

  // Escape closes the open dropdown and returns focus to its trigger;
  // a pointer-down outside the desktop nav closes it too.
  useEffect(() => {
    if (openDropdown === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const trigger = triggerRefs.current.get(openDropdown);
      setOpenDropdown(null);
      trigger?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (desktopNavRef.current?.contains(event.target as Node)) return;
      setOpenDropdown(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openDropdown]);

  // Announce cart changes to screen readers. Skip the initial hydration value
  // so we don't announce on every page load.
  const [cartAnnouncement, setCartAnnouncement] = useState("");
  const prevItemCount = useRef<number | null>(null);
  useEffect(() => {
    if (prevItemCount.current === null) {
      prevItemCount.current = itemCount;
      return;
    }
    if (itemCount !== prevItemCount.current) {
      setCartAnnouncement(
        itemCount === 0
          ? "Cart is now empty."
          : `Cart updated. ${itemCount} ${itemCount === 1 ? "item" : "items"} in cart.`,
      );
      prevItemCount.current = itemCount;
    }
  }, [itemCount]);

  const links = resolveHappyBambooNav(
    business?.siteContent?.navigationItems,
    isEnabled,
  );

  const f = resolveFields(business.siteContent?.customFields, [
    "happy-bamboo.global.cart-label",
    "happy-bamboo.global.cart-empty-text",
  ]);
  const cartLabel = f["happy-bamboo.global.cart-label"] ?? "";
  const cartEmptyText = f["happy-bamboo.global.cart-empty-text"] ?? "";

  // Desktop only — below md, "Log in" lives in the mobile panel so the bar
  // stays logo · wishlist · cart · menu.
  const authActions = (
    <>
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="text-background hover:bg-background/10 hidden hover:text-[var(--hb-gold)] md:inline-flex"
      >
        <Link href="/auth/sign-in">
          <User aria-hidden="true" className="h-4 w-4" />
          Log in
        </Link>
      </Button>
    </>
  );

  // Desktop avatar menu: the quick-access subset (B4.3 decision) of the same
  // flag-gated account links the mobile panel and Default's account sidebar
  // use — the full list lives in the account sidebar. Settings is dropped
  // because `UserButton` renders its own built-in Settings item.
  const userButtonLinks: UserButtonLink[] = getAccountNavLinks({
    isEnabled,
    includeAdmin:
      session?.user?.platformRole === "PLATFORM_ADMIN" ||
      !!session?.session?.membershipId,
  })
    .filter(
      (link) => HB_QUICK_ACCOUNT_KEYS.has(link.key) && link.key !== "settings",
    )
    .map((link) => ({
      label: link.label,
      href: link.href,
      icon: HB_ACCOUNT_LINK_ICONS[link.key],
    }));

  const userMenu = session?.user && (
    <UserButton
      size="icon"
      className="border-primary border"
      avatarClassName="size-10"
      links={userButtonLinks}
    />
  );

  const navLinkClass = (active: boolean) =>
    cn(
      "text-sm font-medium transition-colors hover:text-[var(--hb-gold)]",
      active ? "text-[var(--hb-gold)]" : "text-background",
    );

  const externalHint = <span className="sr-only"> (opens in new tab)</span>;

  const renderNavItem = (link: NavItem, i: number) => {
    if (link.children?.length) {
      const isOpen = openDropdown === i;
      const panelId = `hb-nav-dropdown-${i}`;
      const entries = navGroupEntries(link);
      const activeEntry = activeEntryIndex(pathname, entries);
      return (
        <div
          key={i}
          // Full bar height so the panel's `top-full` lands on the bar's
          // bottom edge; the panel's own pt-2 is the hover bridge.
          className="relative flex h-16 items-center"
          onMouseEnter={() => {
            if (openDropdown !== i) openedByHover.current = true;
            setOpenDropdown(i);
          }}
          onMouseLeave={() => {
            openedByHover.current = false;
            setOpenDropdown(null);
          }}
          onBlur={(event) => {
            // Close once focus leaves the trigger + panel entirely.
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setOpenDropdown((current) => (current === i ? null : current));
            }
          }}
        >
          {/* The trigger never navigates — a non-empty parent href is the
              panel's first entry. Active styling, but no aria-current. */}
          <button
            type="button"
            ref={(el) => {
              if (el) triggerRefs.current.set(i, el);
              else triggerRefs.current.delete(i);
            }}
            aria-haspopup="true"
            aria-expanded={isOpen}
            aria-controls={panelId}
            onClick={() => {
              const keepOpen = openedByHover.current;
              openedByHover.current = false;
              setOpenDropdown(isOpen && !keepOpen ? null : i);
            }}
            className={cn(
              navLinkClass(isNavItemActive(pathname, link)),
              "inline-flex cursor-pointer items-center gap-1",
            )}
          >
            {link.label}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-3.5 transition-transform duration-200",
                isOpen && "rotate-180",
              )}
            />
          </button>

          {isOpen && (
            <div
              id={panelId}
              className="absolute top-full left-1/2 z-20 -translate-x-1/2 pt-2"
            >
              <ul className="bg-background border-border min-w-48 rounded-xl border py-2 shadow-lg">
                {entries.map((child, j) => {
                  const childActive = j === activeEntry;
                  return (
                    <li key={j}>
                      <Link
                        href={child.href}
                        {...externalLinkProps(child.external)}
                        aria-current={childActive ? "page" : undefined}
                        onClick={() => setOpenDropdown(null)}
                        className={cn(
                          "hover:bg-muted hover:text-primary block px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                          childActive
                            ? "bg-muted text-[var(--hb-brand-deep)]"
                            : "text-foreground",
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

    const active = isActiveNavLink(pathname, link.href);
    return (
      <Link
        key={i}
        href={link.href}
        {...externalLinkProps(link.external)}
        aria-current={active ? "page" : undefined}
        className={navLinkClass(active)}
      >
        {link.label}
        {link.external && externalHint}
      </Link>
    );
  };

  return (
    // <FadeIn direction="down" duration={0.5}>
    <>
      <header
        ref={headerRef}
        className="border-border/40 sticky top-0 z-50 w-full border-b bg-[var(--hb-brand)] backdrop-blur supports-backdrop-filter:bg-[var(--hb-brand)]"
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2"
          >
            {business.siteContent?.logoUrl ? (
              <div className="relative aspect-video h-16 w-full rounded-sm">
                <Image
                  src={business.siteContent.logoUrl}
                  alt={resolveLogoAlt(
                    business.siteContent?.logoAltText,
                    business.name,
                  )}
                  sizes="(max-width: 768px) 100vw, 55px"
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <>
                <Leaf className="text-primary h-8 w-8" />
                <span className="text-foreground text-xl font-bold">
                  {business.name ?? "Business"}
                </span>
              </>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav
            ref={desktopNavRef}
            aria-label="Main navigation"
            className="hidden items-center gap-8 md:flex"
          >
            {links.map(renderNavItem)}
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
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
            {isEnabled("wishlist") && (
              <Button
                variant="ghost"
                size="icon"
                className="text-background hover:bg-background/10 relative hover:text-[var(--hb-gold)]"
                asChild
              >
                <Link href="/wishlist" aria-label="Open wishlist">
                  <Heart className="h-5 w-5" />
                  {wishlistHydrated && wishlistCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs"
                    >
                      {wishlistCount}
                    </motion.span>
                  )}
                </Link>
              </Button>
            )}
            {isEnabled("cart") && (
              <Button
                variant="ghost"
                size="icon"
                className="text-background hover:bg-background/10 relative hover:text-[var(--hb-gold)]"
                onClick={() => {
                  setMobileOpen(false);
                  setIsOpen(true);
                }}
                aria-label="Open cart"
              >
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-xs"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </Button>
            )}

            <HappyBambooMenuToggle
              ref={menuToggleRef}
              open={mobileOpen}
              onOpenChange={setMobileOpen}
            />
          </div>
        </div>

        {/* Mobile drop-down panel — inside <header> so it inherits the
            .happy-bamboo tokens/fonts and the header's sticky positioning. */}
        <HappyBambooMobileMenu
          open={mobileOpen}
          onOpenChange={setMobileOpen}
          business={business}
          session={session}
          isPending={isPending}
          isEnabled={isEnabled}
          headerRef={headerRef}
          toggleRef={menuToggleRef}
        />
      </header>
      <HappyBambooCartDrawer
        shippingConfig={shippingConfigFromBusiness(business)}
        cartLabel={cartLabel}
        cartEmptyText={cartEmptyText}
      />
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {cartAnnouncement}
      </span>
    </>
  );
}
