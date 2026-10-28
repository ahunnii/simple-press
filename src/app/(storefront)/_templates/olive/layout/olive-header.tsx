"use client";

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { ChevronDown, Heart, Menu, Search, User } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { OliveNavCollection } from "./olive-nav-overlay";
import type { NavChild, NavItem } from "~/app/(storefront)/_components/nav";
import type { UserButtonLink } from "~/components/auth/user/user-button";
import { AUTH_BASE_PATHS, AUTH_VIEW_PATHS } from "~/lib/auth-paths";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { cn } from "~/lib/utils";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { UserButton } from "~/components/auth/user/user-button";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useWishlist } from "~/providers/wishlist-context";
import {
  activeEntryIndex,
  externalLinkProps,
  getQuickAccountNavLinks,
  navGroupEntries,
} from "~/app/(storefront)/_components/nav";
import { useSiteSearch } from "~/app/(storefront)/_components/search";

import { OliveCartButton } from "./olive-cart-button";
import { oliveActiveItemIndex, oliveShopPanelIndex } from "./olive-nav";
import { OliveNavOverlay } from "./olive-nav-overlay";

type OliveHeaderProps = DefaultHeaderTemplateProps & {
  /** Published collections, resolved once by the layout. */
  collections?: OliveNavCollection[];
  /** Owner nav (or `OLIVE_DEFAULT_NAV`), already flag-filtered by the
   *  layout. The same array feeds the overlay and the footer. */
  navItems: NavItem[];
  /** `olive.global.logo-size-width/height` (px), resolved by the layout.
   *  The uploaded logo's box; capped by `.olive-header-logo` so an
   *  oversized value can never blow out the header row. */
  logoWidth?: number;
  logoHeight?: number;
};

/** Icons for the desktop `UserButton` menu, keyed by `getAccountNavLinks` key. */
const ACCOUNT_LINK_ICONS: Record<string, ReactNode> = {
  orders: <IconPackage className="h-4 w-4" />,
  admin: <IconLayoutDashboard className="h-4 w-4" />,
};

/** Screen-reader hint on links that open in a new tab. */
function externalHint(external?: boolean) {
  return external ? <span className="sr-only"> (opens in new tab)</span> : null;
}

/**
 * Ivory, sticky, one hairline at the bottom (design.md § First viewport). One
 * row: the wordmark left, the tracked-caps nav straight after it from 1024px
 * up, the icon cluster (search, account, wishlist, bag) far right. Below
 * 1024px the nav collapses into a hamburger, left of the wordmark, that opens
 * `OliveNavOverlay`.
 *
 * The nav is the owner's (Admin → Content → Navigation) or olive's shipped
 * default, flag-filtered once by the layout. The item whose href is `/shop`
 * keeps olive's collections panel; any other parent with children gets a
 * plain dropdown. Both open on hover AND focus, Enter/Space toggles, ArrowDown
 * opens and moves into the panel, Esc closes and returns focus to the
 * trigger. A trigger never navigates — a parent's own href is its panel's
 * first entry (`navGroupEntries`).
 *
 * The announcement bar is rendered by the layout ABOVE this element, not
 * inside it, so the bar scrolls away and only the nav row pins.
 */
export function OliveHeader({
  business,
  initialSession,
  collections = [],
  navItems,
  logoWidth = 120,
  logoHeight = 40,
}: OliveHeaderProps) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const { data: session, isPending } = useHydratedSession(initialSession);
  const { count: wishlistCount } = useWishlist();

  const { isEnabled } = useFeatureFlags({
    flags: (business?.featureFlags as Record<string, boolean>) ?? {},
  });
  const { isEnabled: isStorefrontEnabled } = useStorefrontFlags();

  const productsEnabled = isEnabled("products");
  // Site search (flag `siteSearch`): the existing icon opens the dialog.
  // Flag off ⇒ it is the same "Search products" link as before.
  const siteSearch = useSiteSearch();
  const collectionsEnabled = isEnabled("collections");
  // `cart` depends on `products`, so this is off whenever products is.
  const cartEnabled = isEnabled("cart");
  const accountsEnabled = isStorefrontEnabled("customerAccounts");
  const wishlistEnabled = isStorefrontEnabled("wishlist");

  const [menuOpen, setMenuOpen] = useState(false);
  /** Index (into `navItems`) of the open desktop dropdown, if any. */
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef(new Map<number, HTMLButtonElement>());
  /** Set when hover/focus opened a dropdown, so the click that follows
   *  (mouse press, or Enter/Space right after tabbing in) keeps it open
   *  instead of toggling it straight shut. */
  const passiveOpenRef = useRef<number | null>(null);
  /** Set while Esc hands focus back to a trigger, so that focus doesn't
   *  immediately re-open the dropdown it just closed. */
  const suppressFocusOpenRef = useRef(false);
  const menuBaseId = useId();
  const mobileMenuId = useId();
  const panelIdFor = (index: number) => `${menuBaseId}-panel-${index}`;

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // ── Close everything on route change ────────────────────────────────────
  useEffect(() => {
    setMenuOpen(false);
    setOpenIndex(null);
  }, [pathname]);

  // ── Escape closes the open dropdown and returns focus to its trigger ────
  useEffect(() => {
    if (openIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const trigger = triggerRefs.current.get(openIndex);
      setOpenIndex(null);
      passiveOpenRef.current = null;
      suppressFocusOpenRef.current = true;
      trigger?.focus();
      suppressFocusOpenRef.current = false;
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openIndex]);

  // ── Pointer outside closes it (hover-out alone misses tap-to-open) ──────
  useEffect(() => {
    if (openIndex === null) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest("[data-olive-dropdown]")) setOpenIndex(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openIndex]);

  const businessName = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl;
  const logoAlt = resolveLogoAlt(
    business?.siteContent?.logoAltText,
    businessName,
  );

  // ── Nav model ───────────────────────────────────────────────────────────
  const navCollections = collectionsEnabled ? collections : [];
  const shopIndex = oliveShopPanelIndex(navItems);
  // One current item across the whole bar (longest match wins; the Shop
  // panel item wins ties and owns /collections) — never two underlines.
  const activeIndex = oliveActiveItemIndex(
    pathname,
    navItems,
    shopIndex,
    collectionsEnabled,
  );

  const showAdminLink =
    session?.user?.platformRole === "PLATFORM_ADMIN" ||
    !!session?.session?.membershipId;

  // Desktop avatar menu: the quick-access subset (`getQuickAccountNavLinks`,
  // B4.3) of the flag-gated account links — Orders only while `orders` is on.
  // Settings is dropped here because `UserButton` renders its own built-in
  // Settings item.
  const userButtonLinks: UserButtonLink[] = getQuickAccountNavLinks({
    isEnabled,
    includeAdmin: showAdminLink,
  })
    .filter((link) => link.key !== "settings")
    .map((link) => ({
      label: link.label,
      href: link.href,
      icon: ACCOUNT_LINK_ICONS[link.key],
    }));

  const closeDropdown = () => {
    passiveOpenRef.current = null;
    setOpenIndex(null);
  };

  const openWithFocus = (index: number) => {
    passiveOpenRef.current = null;
    setOpenIndex(index);
    requestAnimationFrame(() => {
      document
        .getElementById(panelIdFor(index))
        ?.querySelector<HTMLAnchorElement>("a[href]")
        ?.focus();
    });
  };

  const onTriggerClick = (index: number, isOpen: boolean) => {
    if (isOpen && passiveOpenRef.current === index) {
      passiveOpenRef.current = null;
      return;
    }
    passiveOpenRef.current = null;
    setOpenIndex(isOpen ? null : index);
  };

  /** Hover + focus handling shared by the Shop panel and every dropdown. */
  const dropdownWrapperProps = (index: number) => ({
    "data-olive-dropdown": true,
    onMouseEnter: () => {
      if (openIndex === index) return;
      passiveOpenRef.current = index;
      setOpenIndex(index);
    },
    onMouseLeave: () => {
      passiveOpenRef.current = null;
      setOpenIndex((current) => (current === index ? null : current));
    },
    onFocus: (event: React.FocusEvent<HTMLDivElement>) => {
      // Only when focus arrives from outside the group.
      if (suppressFocusOpenRef.current) return;
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
        return;
      }
      if (openIndex === index) return;
      passiveOpenRef.current = index;
      setOpenIndex(index);
    },
    onBlur: (event: React.FocusEvent<HTMLDivElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setOpenIndex((current) => (current === index ? null : current));
      }
    },
  });

  const renderTrigger = (item: NavItem, index: number, current: boolean) => {
    const isOpen = openIndex === index;
    return (
      <button
        type="button"
        ref={(el) => {
          if (el) triggerRefs.current.set(index, el);
          else triggerRefs.current.delete(index);
        }}
        className="olive-nav-link"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelIdFor(index) : undefined}
        data-current={current ? "true" : undefined}
        onClick={() => onTriggerClick(index, isOpen)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openWithFocus(index);
          }
        }}
      >
        {item.label}
        <ChevronDown
          strokeWidth={1.5}
          className={cn(
            "h-3 w-3",
            !reduced && "transition-transform duration-200",
            isOpen && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
    );
  };

  const renderDropdownLink = (
    entry: NavChild,
    key: string,
    active: boolean,
  ) => (
    <li key={key}>
      <Link
        href={entry.href}
        {...externalLinkProps(entry.external)}
        className="olive-dropdown-link"
        data-current={active ? "true" : undefined}
        aria-current={active ? "page" : undefined}
        onClick={closeDropdown}
      >
        {entry.label}
        {externalHint(entry.external)}
      </Link>
    </li>
  );

  /** The `/shop` item: olive's collections panel (plus any owner children). */
  const renderShopItem = (item: NavItem, index: number, current: boolean) => {
    const collectionEntries: NavChild[] = navCollections.map((collection) => ({
      label: collection.name,
      href: `/collections/${collection.slug}`,
    }));
    const footEntries: NavChild[] = [
      { label: "All products", href: "/shop" },
      ...(navCollections.length === 0
        ? [{ label: "New arrivals", href: "/shop" }]
        : []),
      ...(collectionsEnabled
        ? [{ label: "All collections", href: "/collections" }]
        : []),
      ...(item.children ?? []),
    ];
    const panelEntries = [...collectionEntries, ...footEntries];
    const activeEntry = current ? activeEntryIndex(pathname, panelEntries) : -1;
    const offset = collectionEntries.length;

    return (
      <div
        key={`${index}-${item.label}`}
        className="relative flex items-center"
        {...dropdownWrapperProps(index)}
      >
        {renderTrigger(item, index, current)}

        {openIndex === index ? (
          <div
            id={panelIdFor(index)}
            className="olive-dropdown-anchor absolute top-full left-0 z-20"
          >
            <div className="olive-dropdown">
              {collectionEntries.length > 0 ? (
                <>
                  <p className="olive-dropdown-title">Collections</p>
                  <ul className="m-0 grid list-none grid-cols-2 gap-x-6 p-0">
                    {collectionEntries.map((entry, j) =>
                      renderDropdownLink(
                        entry,
                        navCollections[j]!.id,
                        j === activeEntry,
                      ),
                    )}
                  </ul>
                  <div className="olive-dropdown-divider" />
                </>
              ) : null}

              <ul className="m-0 grid list-none grid-cols-2 gap-x-6 p-0">
                {footEntries.map((entry, j) =>
                  renderDropdownLink(
                    entry,
                    `${j}-${entry.href}-${entry.label}`,
                    j + offset === activeEntry,
                  ),
                )}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  /** Any other parent with children: a single-column dropdown. */
  const renderGroupItem = (item: NavItem, index: number, current: boolean) => {
    const entries = navGroupEntries(item);
    const activeEntry = current ? activeEntryIndex(pathname, entries) : -1;
    return (
      <div
        key={`${index}-${item.label}`}
        className="relative flex items-center"
        {...dropdownWrapperProps(index)}
      >
        {renderTrigger(item, index, current)}

        {openIndex === index ? (
          <div
            id={panelIdFor(index)}
            className="olive-dropdown-anchor absolute top-full left-0 z-20"
          >
            <div className="olive-dropdown olive-dropdown-narrow">
              <ul className="m-0 flex list-none flex-col p-0">
                {entries.map((entry, j) =>
                  renderDropdownLink(
                    entry,
                    `${j}-${entry.href}-${entry.label}`,
                    j === activeEntry,
                  ),
                )}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const renderNavItem = (item: NavItem, index: number) => {
    const current = index === activeIndex;
    if (index === shopIndex) return renderShopItem(item, index, current);
    if (item.children?.length) return renderGroupItem(item, index, current);
    return (
      <Link
        key={`${index}-${item.label}`}
        href={item.href}
        {...externalLinkProps(item.external)}
        className="olive-nav-link"
        data-current={current ? "true" : undefined}
        aria-current={current ? "page" : undefined}
      >
        {item.label}
        {externalHint(item.external)}
      </Link>
    );
  };

  // Uploaded logo wins; its box is the owner's logo size (capped in CSS).
  // Otherwise the business name as the Bodoni caps wordmark, truncated
  // rather than wrapped so a long name can't push the icons off a phone.
  const logoBoxStyle = {
    "--olive-logo-w": `${logoWidth}px`,
    "--olive-logo-h": `${logoHeight}px`,
  } as CSSProperties;

  const wordmark = logoUrl ? (
    <span className="olive-header-logo" style={logoBoxStyle}>
      <Image
        src={logoUrl}
        alt={logoAlt}
        fill
        sizes={`${Math.min(logoWidth, 320)}px`}
        className="object-contain object-left"
        priority
      />
    </span>
  ) : (
    <span className="olive-wordmark block min-w-0 truncate">
      {businessName}
    </span>
  );

  return (
    <>
      <header className="olive-header">
        <div
          className="mx-auto flex w-full items-center gap-2 px-[var(--olive-section-pad-x)] lg:gap-10 xl:gap-14"
          style={{
            maxWidth: "var(--olive-container)",
            minHeight: "var(--olive-header-h)",
          }}
        >
          {/* ── Hamburger (below 1024px) ── */}
          <button
            ref={burgerRef}
            type="button"
            onClick={() => setMenuOpen(true)}
            className="olive-icon-btn olive-d-hide -ml-3 shrink-0 lg:hidden"
            aria-label="Menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? mobileMenuId : undefined}
          >
            <Menu className="h-5 w-5" strokeWidth={1.25} aria-hidden="true" />
          </button>

          {/* ── Wordmark, left ── */}
          <Link
            href="/"
            aria-label={`${businessName} — Home`}
            className="flex min-w-0 shrink items-center"
          >
            {wordmark}
          </Link>

          {/* ── Nav, straight after the wordmark (desktop) ── */}
          <nav
            className="hidden min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-1 lg:flex xl:gap-x-8"
            aria-label="Primary navigation"
          >
            {navItems.map(renderNavItem)}
          </nav>

          {/* ── Right: search, account, wishlist, bag ── */}
          <div className="-mr-3 ml-auto flex shrink-0 items-center justify-end">
            {productsEnabled || siteSearch.enabled ? (
              <Link
                href="/shop"
                className="olive-icon-btn olive-sm-hide hidden sm:inline-flex"
                aria-label={siteSearch.enabled ? "Search" : "Search products"}
                onClick={(e) => {
                  if (!siteSearch.enabled) return;
                  e.preventDefault();
                  siteSearch.open({ trigger: e.currentTarget });
                }}
                onPointerEnter={
                  siteSearch.enabled ? siteSearch.prefetch : undefined
                }
              >
                <Search
                  className="h-[18px] w-[18px]"
                  strokeWidth={1.25}
                  aria-hidden="true"
                />
              </Link>
            ) : null}

            {accountsEnabled ? (
              <div className="hidden items-center sm:flex">
                {isPending ? (
                  // Holds the account slot while the session settles: the
                  // same 44px square and a faded icon, so nothing shifts.
                  <span
                    className="olive-icon-btn opacity-40"
                    aria-hidden="true"
                  >
                    <User className="h-[18px] w-[18px]" strokeWidth={1.25} />
                  </span>
                ) : session?.user ? (
                  // A 44px square trigger around the 28px avatar.
                  <UserButton
                    size="icon"
                    className="flex size-11 items-center justify-center rounded-none p-0"
                    avatarClassName="size-7"
                    links={userButtonLinks}
                  />
                ) : (
                  <Link
                    href={`${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signIn}`}
                    className="olive-icon-btn"
                    aria-label="Sign in to your account"
                  >
                    <User
                      className="h-[18px] w-[18px]"
                      strokeWidth={1.25}
                      aria-hidden="true"
                    />
                  </Link>
                )}
              </div>
            ) : null}

            {wishlistEnabled ? (
              <Link
                href="/wishlist"
                className="olive-icon-btn olive-sm-hide hidden sm:inline-flex"
                aria-label={
                  wishlistCount > 0
                    ? `View wishlist, ${wishlistCount} ${wishlistCount === 1 ? "item" : "items"}`
                    : "View wishlist"
                }
              >
                <Heart
                  className="h-[18px] w-[18px]"
                  strokeWidth={1.25}
                  aria-hidden="true"
                />
                {wishlistCount > 0 ? (
                  <span className="olive-cart-badge" aria-hidden="true">
                    {wishlistCount > 99 ? "99+" : wishlistCount}
                  </span>
                ) : null}
              </Link>
            ) : null}

            {cartEnabled ? <OliveCartButton /> : null}
          </div>
        </div>
      </header>

      <OliveNavOverlay
        id={mobileMenuId}
        open={menuOpen}
        onClose={closeMenu}
        triggerRef={burgerRef}
        navItems={navItems}
        shopIndex={shopIndex}
        activeIndex={activeIndex}
        collections={navCollections}
        businessName={businessName}
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        initialSession={initialSession}
        accountsEnabled={accountsEnabled}
        wishlistEnabled={wishlistEnabled}
        productsEnabled={productsEnabled}
        collectionsEnabled={collectionsEnabled}
        cartEnabled={cartEnabled}
        isEnabled={isEnabled}
      />
    </>
  );
}
