"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Heart, Menu, Search, ShoppingBasket } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { NavItem } from "~/app/(storefront)/_components/nav";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useWishlist } from "~/providers/wishlist-context";
import {
  activeEntryIndex,
  externalLinkProps,
  navGroupEntries,
} from "~/app/(storefront)/_components/nav";

import { GloveAccountMenu } from "./glove-account-menu";
import { GloveCartDrawer } from "./glove-cart-drawer";
import { GloveMobileNav } from "./glove-mobile-nav";
import {
  activeTopIndex,
  GLOVE_FALLBACK_LOGO,
  resolveGloveNav,
} from "./glove-nav";
import { GloveTopBar } from "./glove-top-bar";

type GloveHeaderProps = DefaultHeaderTemplateProps & {
  /** `glove.global.track-label`; blank hides the tracking links. */
  trackLabel: string;
  /** `glove.global.track-link`. */
  trackHref: string;
  /** `glove.global.account-label`, already defaulted. */
  accountLabel: string;
};

const externalHint = <span className="sr-only"> (opens in new tab)</span>;

/**
 * Three-tier header (desktop): purple contact strip, white search-first row
 * with the bold account block, centered Poppins nav row. Below 1024px a
 * sticky 64px bar (burger, logo, search, cart) plus a left drawer replaces
 * all three. Only the mobile bar sticks; the desktop header scrolls away.
 */
export function GloveHeader({
  business,
  initialSession,
  trackLabel,
  trackHref,
  accountLabel,
}: GloveHeaderProps) {
  const pathname = usePathname();
  const { isEnabled } = useStorefrontFlags();
  const { data: session, isPending } = useHydratedSession(initialSession);
  const { itemCount, subtotal, setIsOpen } = useCart();
  const { count: wishlistCount, isHydrated: wishlistHydrated } = useWishlist();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const searchToggleRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Close the inline mobile search on route change (state adjusted in render).
  const [searchPath, setSearchPath] = useState(pathname);
  if (searchPath !== pathname) {
    setSearchPath(pathname);
    setSearchOpen(false);
  }

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const links = resolveGloveNav(
    business.siteContent?.navigationItems,
    isEnabled,
  );
  const activeIndex = activeTopIndex(pathname, links);

  const logo = business.siteContent?.logoUrl ?? GLOVE_FALLBACK_LOGO;
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    business.name,
  );
  const accountsEnabled = isEnabled("customerAccounts");
  const productsEnabled = isEnabled("products");
  const cartEnabled = isEnabled("cart");
  const wishlistEnabled = isEnabled("wishlist");
  const cartLabel = `Open cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}, subtotal ${formatPrice(subtotal)}`;
  const wishlistLabel =
    wishlistHydrated && wishlistCount > 0
      ? `Wishlist, ${wishlistCount} saved ${wishlistCount === 1 ? "item" : "items"}`
      : "Wishlist";

  const searchForm = (
    id: string,
    inputRef?: React.Ref<HTMLInputElement>,
    onEscape?: () => void,
  ) => (
    <form action="/shop" method="get" role="search" className="glove-search">
      <label htmlFor={id} className="sr-only">
        Search for products
      </label>
      <input
        ref={inputRef}
        id={id}
        type="search"
        name="q"
        placeholder="Search for products"
        autoComplete="off"
        onKeyDown={(e) => {
          if (e.key === "Escape" && onEscape) onEscape();
        }}
      />
      <button type="submit" aria-label="Search">
        <Search className="size-5" aria-hidden="true" />
      </button>
    </form>
  );

  const cartButton = (variant: "desktop" | "mobile") =>
    cartEnabled ? (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={cartLabel}
        className="glove-icon-btn"
      >
        <span className="glove-icon-wrap">
          <ShoppingBasket className="size-6" aria-hidden="true" />
          {itemCount > 0 ? (
            <span className="glove-count-badge" aria-hidden="true">
              {itemCount}
            </span>
          ) : null}
        </span>
        {variant === "desktop" ? (
          <span aria-hidden="true" className="min-w-[44px] text-left">
            {formatPrice(subtotal)}
          </span>
        ) : null}
      </button>
    ) : null;

  return (
    <header
      className="glove-header sticky top-0 z-40 bg-[var(--glove-paper)] lg:static"
      {...sectionGroupAttr("global", "header")}
    >
      {/* ─── Desktop: top strip ─── */}
      <div className="hidden lg:block">
        <GloveTopBar
          supportEmail={business.supportEmail}
          phoneNumber={business.phoneNumber}
          trackLabel={trackLabel}
          trackHref={trackHref}
        />
      </div>

      {/* ─── Desktop: main row ─── */}
      <div className="hidden border-b border-[var(--glove-line)] lg:block">
        <div className="glove-container flex h-[var(--glove-header-h)] items-center gap-8">
          <Link href="/" className="shrink-0">
            <Image
              src={logo}
              alt={logoAlt}
              width={180}
              height={90}
              priority
              className="h-[90px] w-auto max-w-[220px] object-contain"
            />
          </Link>

          <div className="mx-auto w-full max-w-[540px] flex-1">
            {productsEnabled ? searchForm("glove-header-search") : null}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {wishlistEnabled ? (
              <Link
                href="/wishlist"
                aria-label={wishlistLabel}
                className="glove-icon-btn"
              >
                <span className="glove-icon-wrap">
                  <Heart className="size-6" aria-hidden="true" />
                  {wishlistHydrated && wishlistCount > 0 ? (
                    <span className="glove-count-badge" aria-hidden="true">
                      {wishlistCount}
                    </span>
                  ) : null}
                </span>
              </Link>
            ) : null}
            {cartButton("desktop")}
            {accountsEnabled ? (
              <GloveAccountMenu
                session={session}
                isPending={isPending}
                isEnabled={isEnabled}
                label={accountLabel}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* ─── Desktop: nav row ─── */}
      {links.length > 0 ? (
        <nav
          aria-label="Main navigation"
          className="hidden h-[var(--glove-nav-h)] items-center justify-center lg:flex"
        >
          <DesktopNav
            links={links}
            pathname={pathname}
            activeIndex={activeIndex}
          />
        </nav>
      ) : null}

      {/* ─── Mobile bar ─── */}
      <div className="border-b border-[var(--glove-line)] lg:hidden">
        <div className="grid h-[var(--glove-mobile-bar-h)] grid-cols-[1fr_auto_1fr] items-center px-2">
          <div className="flex items-center">
            <button
              ref={burgerRef}
              type="button"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls={menuOpen ? "glove-mobile-menu" : undefined}
              onClick={() => setMenuOpen(true)}
              className="glove-icon-btn"
            >
              <Menu className="size-6" aria-hidden="true" />
            </button>
          </div>
          <Link href="/" className="flex items-center justify-center">
            <Image
              src={logo}
              alt={logoAlt}
              width={160}
              height={48}
              className="h-12 w-auto max-w-[160px] object-contain"
            />
          </Link>
          <div className="flex items-center justify-end">
            {productsEnabled ? (
              <button
                ref={searchToggleRef}
                type="button"
                aria-label={searchOpen ? "Close search" : "Search products"}
                aria-expanded={searchOpen}
                aria-controls="glove-mobile-search"
                onClick={() => setSearchOpen((o) => !o)}
                className="glove-icon-btn"
              >
                <Search className="size-6" aria-hidden="true" />
              </button>
            ) : null}
            {cartButton("mobile")}
          </div>
        </div>
        {searchOpen && productsEnabled ? (
          <div id="glove-mobile-search" className="px-4 pb-3">
            {searchForm("glove-mobile-search-input", searchInputRef, () => {
              setSearchOpen(false);
              searchToggleRef.current?.focus();
            })}
          </div>
        ) : null}
      </div>

      <GloveMobileNav
        open={menuOpen}
        onClose={closeMenu}
        business={business}
        links={links}
        session={session}
        isPending={isPending}
        isEnabled={isEnabled}
        accountsEnabled={accountsEnabled}
        accountLabel={accountLabel}
        trackLabel={trackLabel}
        trackHref={trackHref}
        toggleRef={burgerRef}
      />

      {cartEnabled ? <GloveCartDrawer /> : null}
    </header>
  );
}

type DesktopNavProps = {
  links: NavItem[];
  pathname: string;
  activeIndex: number;
};

/** Desktop nav row: flat links plus one-level hover/focus dropdown groups. */
function DesktopNav({ links, pathname, activeIndex }: DesktopNavProps) {
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const triggerRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const navRef = useRef<HTMLUListElement>(null);
  // Set when hover (or a touch tap's emulated mouseenter) opened the group,
  // so the click that usually follows doesn't immediately toggle it shut.
  const openedByHover = useRef(false);

  // Close on route change (state adjusted during render, per the React docs).
  const [dropdownPath, setDropdownPath] = useState(pathname);
  if (dropdownPath !== pathname) {
    setDropdownPath(pathname);
    setOpenDropdown(null);
  }

  useEffect(() => {
    if (openDropdown === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const trigger = triggerRefs.current.get(openDropdown);
      setOpenDropdown(null);
      trigger?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (navRef.current?.contains(event.target as Node)) return;
      setOpenDropdown(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openDropdown]);

  return (
    <ul
      ref={navRef}
      className="m-0 flex h-full list-none items-center gap-[30px] p-0"
    >
      {links.map((item, i) => {
        const isTopActive = i === activeIndex;
        if (item.children?.length) {
          const isOpen = openDropdown === i;
          const panelId = `glove-nav-dropdown-${i}`;
          const entries = navGroupEntries(item);
          const activeEntry = isTopActive
            ? activeEntryIndex(pathname, entries)
            : -1;
          return (
            <li
              key={i}
              className="relative flex h-full items-center"
              onMouseEnter={() => {
                if (openDropdown !== i) openedByHover.current = true;
                setOpenDropdown(i);
              }}
              onMouseLeave={() => {
                openedByHover.current = false;
                setOpenDropdown(null);
              }}
              onBlur={(event) => {
                if (
                  !event.currentTarget.contains(event.relatedTarget as Node)
                ) {
                  setOpenDropdown((current) =>
                    current === i ? null : current,
                  );
                }
              }}
            >
              {/* The trigger never navigates: a non-empty parent href is the
                  panel's first entry. Active styling, but no aria-current. */}
              <button
                type="button"
                ref={(el) => {
                  if (el) triggerRefs.current.set(i, el);
                  else triggerRefs.current.delete(i);
                }}
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-controls={isOpen ? panelId : undefined}
                data-active={isTopActive ? "true" : undefined}
                onClick={() => {
                  const keepOpen = openedByHover.current;
                  openedByHover.current = false;
                  setOpenDropdown(isOpen && !keepOpen ? null : i);
                }}
                className="glove-nav-link"
              >
                {item.label}
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "size-3.5 transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
              {isOpen ? (
                <div
                  id={panelId}
                  className="absolute top-full left-1/2 z-30 -translate-x-1/2"
                >
                  <ul className="glove-dropdown-panel m-0 min-w-52 list-none py-2">
                    {entries.map((child, j) => (
                      <li key={j}>
                        <Link
                          href={child.href}
                          {...externalLinkProps(child.external)}
                          aria-current={j === activeEntry ? "page" : undefined}
                          onClick={() => setOpenDropdown(null)}
                          className="glove-dropdown-link"
                        >
                          {child.label}
                          {child.external && externalHint}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          );
        }

        return (
          <li key={i} className="flex h-full items-center">
            <Link
              href={item.href}
              {...externalLinkProps(item.external)}
              aria-current={isTopActive ? "page" : undefined}
              className="glove-nav-link"
            >
              {item.label}
              {item.external && externalHint}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
