"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import {
  ChevronDown,
  Heart,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { NavItem } from "~/app/(storefront)/_components/nav";
import { AUTH_BASE_PATHS, AUTH_VIEW_PATHS } from "~/lib/auth-paths";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { formatPrice } from "~/lib/prices";
import { useCartEnabled } from "~/hooks/use-cart-enabled";
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
  getQuickAccountNavLinks,
  isNavItemActive,
  navGroupEntries,
  resolveNav,
  withDonateLink,
} from "~/app/(storefront)/_components/nav";
import { useNavDropdown } from "~/app/(storefront)/_components/nav/use-nav-dropdown";
import { useSiteSearch } from "~/app/(storefront)/_components/search";

const externalHint = <span className="sr-only"> (opens in new tab)</span>;

const SIGN_OUT_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signOut}`;

const NAV_LINKS: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

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
  const { data: session, isPending } = useHydratedSession();
  const { itemCount, total } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { isEnabled } = useStorefrontFlags();
  const cartEnabled = useCartEnabled();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dd = useNavDropdown(pathname, "dark-trend-nav");
  // Site search (flag `siteSearch`): when on, the search icon opens the
  // shared dialog instead of this header's inline `/shop?q=` row.
  const siteSearch = useSiteSearch();

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

  // Owner nav (or the shipped default) through the shared resolver + route→
  // flag filter; the Donations "show in header" switch appends a last /donate
  // unless one is already in the list or nested in a group. Groups render as
  // desktop dropdowns and a mobile accordion — both read this same list.
  const links = withDonateLink(
    filterNavByFlags(
      resolveNav(business?.siteContent?.navigationItems, NAV_LINKS),
      isEnabled,
    ),
    donateLinkOptions(business, isEnabled, "header"),
  );

  // Mobile accordion: one group open at a time. Opening the menu re-syncs it
  // to the group holding the current route (null if none).
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);

  function toggleMobileMenu() {
    if (!mobileMenuOpen) {
      const idx = links.findIndex(
        (item) => !!item.children?.length && isNavItemActive(pathname, item),
      );
      setExpandedGroup(idx === -1 ? null : idx);
    }
    setMobileMenuOpen(!mobileMenuOpen);
  }

  const authActions = (
    <>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/auth/sign-in">Log in</Link>
      </Button>
    </>
  );

  const isAdminUser =
    session?.user?.platformRole === "PLATFORM_ADMIN" ||
    !!session?.session?.membershipId;
  // Quick-access subset (`getQuickAccountNavLinks`, B4.3) shared with the
  // mobile panel below. Business members reach /admin too, not just platform
  // admins; Orders drops with the `orders` flag. Settings is dropped because
  // `UserButton` renders its own built-in Settings item.
  const quickAccountLinks = getQuickAccountNavLinks({
    isEnabled,
    includeAdmin: isAdminUser,
  });
  const accountLinkIcons: Record<string, ReactNode> = {
    orders: <IconPackage className="h-4 w-4" />,
    admin: <IconLayoutDashboard className="h-4 w-4" />,
  };

  const userMenu = session?.user && (
    <UserButton
      size="icon"
      className="border-primary border"
      avatarClassName="size-10"
      links={quickAccountLinks
        .filter((link) => link.key !== "settings")
        .map((link) => ({
          label: link.label,
          href: link.href,
          icon: accountLinkIcons[link.key],
        }))}
    />
  );

  // Account block for the mobile panel (the bar's control is lg+ only). Plain
  // links, not UserButton — its Radix dropdown portals behind the dark surface.
  const mobileLinkClass =
    "text-sm text-white/70 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6A5ACD]";
  const accountUser = session?.user;
  const accountName = accountUser?.name?.trim() ?? "";
  const accountLinks = accountUser ? quickAccountLinks : [];

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#1F1F1F]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:gap-8 lg:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="shrink-0 text-lg font-bold tracking-widest text-white md:text-xl"
          aria-label={`${business.name} home`}
        >
          {business.siteContent?.logoUrl ? (
            <div className="relative aspect-video h-14 w-full rounded-sm sm:h-20">
              <Image
                src={business.siteContent.logoUrl}
                alt={resolveLogoAlt(
                  business.siteContent?.logoAltText,
                  business.name,
                )}
                sizes="(max-width: 768px) 100vw, 55px"
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <LogoTwoLine name={business.name} />
          )}
        </Link>

        {/* Center nav - hidden below lg */}
        <div className="hidden flex-1 justify-center lg:flex">
          <ul
            ref={dd.containerRef as React.RefObject<HTMLUListElement | null>}
            className="flex items-center gap-8"
          >
            {links.map((item, i) => {
              if (item.children?.length) {
                const isOpen = dd.openIndex === i;
                const entries = navGroupEntries(item);
                const activeEntry = activeEntryIndex(pathname, entries);
                const groupActive = isNavItemActive(pathname, item);
                return (
                  <li key={i} className="relative" {...dd.groupProps(i)}>
                    {/* The trigger never navigates — a non-empty parent href
                        is the panel's first entry. Active styling, but no
                        aria-current. */}
                    <button
                      {...dd.triggerProps(i)}
                      className={`relative inline-flex cursor-pointer items-center gap-1 py-1 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6A5ACD] ${
                        groupActive || isOpen
                          ? "text-white"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      {item.label}
                      <ChevronDown
                        aria-hidden="true"
                        className={`h-3.5 w-3.5 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                      {groupActive && (
                        <span
                          className="absolute -right-1 -bottom-0.5 -left-1 border-b-2 border-[#6A5ACD]"
                          aria-hidden
                        />
                      )}
                    </button>

                    {isOpen && (
                      // pt-3 is the hover bridge: the pointer stays inside
                      // this wrapper on its way down to the panel.
                      <div
                        id={dd.panelId(i)}
                        className="absolute top-full left-1/2 z-20 -translate-x-1/2 pt-3"
                      >
                        <ul className="min-w-48 rounded-sm border border-white/10 bg-[#1F1F1F] py-2 shadow-[0_16px_32px_-12px_rgba(0,0,0,0.7)]">
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
                                  className={`block border-l-2 px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#6A5ACD] ${
                                    childActive
                                      ? "border-[#6A5ACD] text-white"
                                      : "border-transparent text-white/70"
                                  }`}
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
                  </li>
                );
              }

              const isActive = isNavItemActive(pathname, item);
              return (
                <li key={i}>
                  <Link
                    href={item.href}
                    {...externalLinkProps(item.external)}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative py-1 text-sm font-semibold transition-colors ${
                      isActive ? "text-white" : "text-white/60 hover:text-white"
                    }`}
                  >
                    {item.label}
                    {item.external && externalHint}
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
        <div className="flex shrink-0 items-center gap-4 sm:gap-6">
          {/* Search toggle — ≥44px hit area via p-3 -m-3 (WCAG 2.5.5) */}
          <button
            ref={searchButtonRef}
            type="button"
            onClick={(e) => {
              if (siteSearch.enabled) {
                siteSearch.open({ trigger: e.currentTarget });
                return;
              }
              setSearchOpen(!searchOpen);
            }}
            onPointerEnter={siteSearch.prefetch}
            aria-label={
              siteSearch.enabled
                ? "Search"
                : searchOpen
                  ? "Close search"
                  : "Search products"
            }
            aria-haspopup={siteSearch.enabled ? "dialog" : undefined}
            aria-expanded={siteSearch.enabled ? undefined : searchOpen}
            aria-controls={siteSearch.enabled ? undefined : "header-search"}
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
          {/* Catalog mode (B6.11): no cart link when `cart` is off */}
          {cartEnabled && (
            <Link
              href="/cart"
              className="flex items-center gap-2 text-white/90 transition-colors hover:text-white"
              aria-label={`Cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}, total ${formatPrice(total)}`}
            >
              <span
                className="hidden text-sm font-medium sm:inline"
                aria-hidden="true"
              >
                {formatPrice(total)}
              </span>
              {itemCount > 0 && (
                <span
                  className="text-sm font-medium sm:hidden"
                  aria-hidden="true"
                >
                  {itemCount}
                </span>
              )}
              <ShoppingBag aria-hidden="true" className="h-5 w-5" />
            </Link>
          )}
          {/* Below lg the account control lives in the mobile panel */}
          {isEnabled("customerAccounts") && (
            <div className="hidden items-center lg:flex">
              {isPending ? (
                <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
              ) : session?.user ? (
                userMenu
              ) : (
                authActions
              )}
            </div>
          )}

          {/* Hamburger — ≥44px hit area via p-3 -m-3 (WCAG 2.5.5) */}
          <button
            ref={hamburgerRef}
            type="button"
            className="-m-3 p-3 text-white/80 lg:hidden"
            onClick={toggleMobileMenu}
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
        className={`border-t border-white/10 transition-all duration-300 lg:hidden ${
          mobileMenuOpen
            ? "max-h-[calc(100dvh-80px)] overflow-y-auto"
            : "max-h-0 overflow-hidden border-t-0"
        }`}
        inert={!mobileMenuOpen || undefined}
      >
        <ul className="flex flex-col gap-1 px-6 py-4">
          {links.map((item, i) => {
            if (item.children?.length) {
              const isOpen = expandedGroup === i;
              const sublistId = `mobile-nav-group-${i}`;
              const entries = navGroupEntries(item);
              const activeEntry = activeEntryIndex(pathname, entries);
              const groupActive = isNavItemActive(pathname, item);
              return (
                <li key={i}>
                  {/* Never navigates — a non-empty parent href is the
                      sublist's first entry. No aria-current. */}
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={sublistId}
                    onClick={() => setExpandedGroup(isOpen ? null : i)}
                    className={`flex w-full cursor-pointer items-center justify-between py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#6A5ACD] ${
                      groupActive
                        ? "text-white"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    {item.label}
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <ul
                      id={sublistId}
                      className="mb-1 ml-1 flex flex-col border-l border-white/10 pl-4"
                    >
                      {entries.map((child, j) => {
                        const childActive = j === activeEntry;
                        return (
                          <li key={j}>
                            <Link
                              href={child.href}
                              {...externalLinkProps(child.external)}
                              aria-current={childActive ? "page" : undefined}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`block py-2 text-sm transition-colors hover:text-white ${
                                childActive ? "text-white" : "text-white/60"
                              }`}
                            >
                              {child.label}
                              {child.external && externalHint}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            const isActive = isNavItemActive(pathname, item);
            return (
              <li key={i}>
                <Link
                  href={item.href}
                  {...externalLinkProps(item.external)}
                  aria-current={isActive ? "page" : undefined}
                  className={`block py-2 text-sm ${
                    isActive ? "text-white" : "text-white/70 hover:text-white"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                  {item.external && externalHint}
                </Link>
              </li>
            );
          })}
        </ul>

        {isEnabled("customerAccounts") && (
          <div className="border-t border-white/10 px-6 py-4">
            {isPending ? (
              <div
                className="h-8 w-24 animate-pulse rounded-sm bg-white/10"
                aria-hidden="true"
              />
            ) : !accountUser ? (
              <Link
                href="/auth/sign-in"
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 ${mobileLinkClass}`}
              >
                Log in
              </Link>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <div className="grid min-w-0 flex-1 leading-tight">
                    <span className="truncate text-sm text-white">
                      {accountName || accountUser.email}
                    </span>
                    {accountName && (
                      <span className="truncate text-xs text-white/60">
                        {accountUser.email}
                      </span>
                    )}
                  </div>
                  <Link
                    href={SIGN_OUT_HREF}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`inline-flex shrink-0 items-center gap-1.5 py-2 ${mobileLinkClass}`}
                  >
                    <LogOut aria-hidden="true" className="size-4" />
                    Sign out
                  </Link>
                </div>
                <nav aria-label="Account">
                  <ul className="flex flex-col">
                    {accountLinks.map((link) => (
                      <li key={link.key}>
                        <Link
                          href={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`block py-2 ${mobileLinkClass}`}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
