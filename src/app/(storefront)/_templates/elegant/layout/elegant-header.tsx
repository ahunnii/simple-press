"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  Heart,
  LayoutDashboardIcon,
  Menu,
  Package,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { NavItem } from "~/app/(storefront)/_components/nav";
import type { UserButtonLink } from "~/components/auth/user/user-button";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { useCartEnabled } from "~/hooks/use-cart-enabled";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
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

import { resolveFields } from "..";
import { ElegantCartDrawer } from "../cart-checkout/elegant-cart-drawer";

const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

/** Icons for the `UserButton` menu, keyed by `getQuickAccountNavLinks` key. */
const ACCOUNT_LINK_ICONS: Record<string, React.ReactNode> = {
  orders: <Package className="h-4 w-4" />,
  admin: <LayoutDashboardIcon className="h-4 w-4" />,
};

const externalHint = <span className="sr-only"> (opens in new tab)</span>;

/** Index of the group (item with children) holding the current route, or null. */
function activeGroupIndex(links: NavItem[], pathname: string) {
  const idx = links.findIndex(
    (item) => !!item.children?.length && isNavItemActive(pathname, item),
  );
  return idx === -1 ? null : idx;
}

export function ElegantHeader({ business }: DefaultHeaderTemplateProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { setIsOpen, itemCount } = useCart();
  const cartEnabled = useCartEnabled();
  const { count: wishlistCount } = useWishlist();
  const { data: session, isPending } = useHydratedSession();
  const user = session?.user;
  const pathname = usePathname();
  const router = useRouter();
  const dd = useNavDropdown(pathname, "el-nav");
  // Mobile accordion: one group open at a time; reset to the group holding the
  // current route each time the menu opens.
  const [mobileExpanded, setMobileExpanded] = useState<number | null>(null);

  const { isEnabled } = useFeatureFlags({
    flags: (business?.featureFlags as Record<string, boolean>) ?? {},
  });

  const { isEnabled: isStorefrontEnabled } = useStorefrontFlags();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on Escape and return focus to hamburger button
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        hamburgerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  function openSearch() {
    setSearchOpen(true);
    setSearchValue("");
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchValue("");
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchValue.trim();
    closeSearch();
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  }

  const DEFAULT_NAV_LINKS = [
    { href: "/shop", label: "Shop" },
    ...(isEnabled("collections")
      ? [{ href: "/collections", label: "Collections" }]
      : []),
    ...(isEnabled("blog") ? [{ href: "/blog", label: "Journal" }] : []),
    { href: "/about", label: "About" },
    ...(isEnabled("services")
      ? [{ href: "/services", label: "Services" }]
      : []),
  ];

  // Owner nav (or the starter menu above) through the shared resolver + route→
  // flag filter; the Donations "show in header" switch appends a last /donate.
  // Groups render as desktop dropdowns / mobile accordions, so withDonateLink
  // sees a /donate nested in a group and doesn't duplicate it. Desktop and
  // mobile read the same list.
  const links = withDonateLink(
    filterNavByFlags(
      resolveNav(business?.siteContent?.navigationItems, DEFAULT_NAV_LINKS),
      isStorefrontEnabled,
    ),
    donateLinkOptions(business, isStorefrontEnabled, "header"),
  );

  const cartFields = resolveFields(business?.siteContent?.customFields, [
    "elegant.global.cart-title",
    "elegant.global.cart-drawer-empty-heading",
    "elegant.global.cart-empty-body",
    "elegant.global.cart-browse-button",
    "elegant.global.cart-drawer-note",
  ]);

  const navLinkStyle = (active: boolean): React.CSSProperties => ({
    position: "relative",
    fontSize: 13.5,
    letterSpacing: "0.04em",
    color: active ? "var(--el-ink, #1c1a17)" : "var(--el-ink-soft, #6b6659)",
    padding: "6px 2px",
    textDecoration: "none",
    fontFamily: "var(--font-sans, Manrope, sans-serif)",
    whiteSpace: "nowrap",
  });

  const navUnderline = (active: boolean) => (
    <span
      aria-hidden={true}
      className="el-nav-underline"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 1,
        background: "var(--el-ink, #1c1a17)",
        display: "block",
        transform: active ? "scaleX(1)" : "scaleX(0)",
        transformOrigin: "left",
        transition: `transform 0.4s ${ease}`,
      }}
    />
  );

  const renderDesktopItem = (item: NavItem, i: number) => {
    if (item.children?.length) {
      const isOpen = dd.openIndex === i;
      const entries = navGroupEntries(item);
      const activeEntry = activeEntryIndex(pathname, entries);
      const groupActive = isNavItemActive(pathname, item);
      const lit = groupActive || isOpen;
      return (
        <div
          key={i}
          {...dd.groupProps(i)}
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          {/* Trigger never navigates — a non-empty parent href is the panel's
              first entry. Active styling, but no aria-current. */}
          <button
            {...dd.triggerProps(i)}
            className="el-nav-link"
            data-active={lit ? "true" : undefined}
            style={{
              ...navLinkStyle(lit),
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              lineHeight: "inherit",
            }}
          >
            {item.label}
            <ChevronDown
              aria-hidden={true}
              style={{
                width: 13,
                height: 13,
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: `transform 0.4s ${ease}`,
              }}
            />
            {navUnderline(lit)}
          </button>

          {/* Panel wrapper: top padding is the hover bridge from the trigger
              down past the pill's bottom edge to the card. */}
          <div
            id={dd.panelId(i)}
            className="el-nav-panel"
            style={{
              position: "absolute",
              top: "100%",
              left: -22,
              paddingTop: 22,
              zIndex: 10,
              pointerEvents: isOpen ? "auto" : "none",
              visibility: isOpen ? "visible" : "hidden",
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? "translateY(0)" : "translateY(-6px)",
              transition: isOpen
                ? `opacity 0.3s ${ease}, transform 0.4s ${ease}, visibility 0s`
                : `opacity 0.2s ${ease}, transform 0.3s ${ease}, visibility 0s linear 0.3s`,
            }}
          >
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 8,
                minWidth: 210,
                background: "rgba(251, 248, 242, 0.97)",
                border: "1px solid rgba(28, 26, 23, 0.08)",
                borderRadius: 18,
                boxShadow:
                  "0 1px 0 rgba(255,255,255,0.5) inset, 0 24px 48px -24px rgba(28,26,23,0.28)",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {entries.map((child, j) => {
                const childActive = j === activeEntry;
                return (
                  <li key={j}>
                    <Link
                      href={child.href}
                      {...externalLinkProps(child.external)}
                      aria-current={childActive ? "page" : undefined}
                      onClick={() => dd.close()}
                      className="el-nav-panel-link"
                      data-active={childActive ? "true" : undefined}
                      style={{
                        display: "block",
                        padding: "9px 14px",
                        borderRadius: 12,
                        fontSize: 13.5,
                        letterSpacing: "0.04em",
                        fontFamily: "var(--font-sans, Manrope, sans-serif)",
                        fontWeight: childActive ? 500 : 400,
                        color: childActive
                          ? "var(--el-ink, #1c1a17)"
                          : "var(--el-ink-soft, #6b6659)",
                        background: childActive
                          ? "rgba(28, 26, 23, 0.05)"
                          : "transparent",
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                        transition: `background 0.3s ${ease}, color 0.3s ${ease}`,
                      }}
                    >
                      {child.label}
                      {child.external && externalHint}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      );
    }

    const active = isNavItemActive(pathname, item);
    return (
      <Link
        key={i}
        href={item.href}
        {...externalLinkProps(item.external)}
        className="el-nav-link"
        aria-current={active ? "page" : undefined}
        style={navLinkStyle(active)}
        data-active={active ? "true" : undefined}
      >
        {item.label}
        {item.external && externalHint}
        {navUnderline(active)}
      </Link>
    );
  };

  const mobileLinkStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 16,
    letterSpacing: "0.04em",
    color: active ? "var(--el-ink, #1c1a17)" : "var(--el-ink-soft, #6b6659)",
    textDecoration: "none",
    fontFamily: "var(--font-sans, sans-serif)",
    fontWeight: active ? 500 : 400,
  });

  // Quick-access subset (B4.3: Orders, Settings, Admin). Settings is dropped:
  // `UserButton` renders its own built-in Settings item. Business members
  // reach /admin too, not just platform admins.
  const userButtonLinks: UserButtonLink[] = getQuickAccountNavLinks({
    isEnabled: isStorefrontEnabled,
    includeAdmin:
      user?.platformRole === "PLATFORM_ADMIN" ||
      !!session?.session?.membershipId,
  })
    .filter((link) => link.key !== "settings")
    .map((link) => ({
      label: link.label,
      href: link.href,
      icon: ACCOUNT_LINK_ICONS[link.key],
    }));

  const iconBtnStyle: React.CSSProperties = {
    width: 34,
    height: 34,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "var(--el-ink, #1c1a17)",
    flexShrink: 0,
  };

  return (
    <>
      {/* Sticky shell — zero-height and in normal flow, so it sits directly
          below the announcement bar (when one renders) and pins to the top
          of the viewport once scrolled. The floating pill hangs from it;
          <main>'s top padding provides the clearance. */}
      <div
        style={{
          position: "sticky",
          top: 0,
          height: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            right: 16,
            pointerEvents: "none",
          }}
        >
          {/* ── Pill nav ──
            Exactly 3 grid children: [left-col] [logo] [right-col]
            Left col contains both the desktop nav list and the mobile
            hamburger — only one is visible at a time via CSS, but they
            share the same grid cell so the logo always stays centred. */}
          <nav
            ref={dd.containerRef}
            aria-label="Main navigation"
            className="el-pill"
            style={{
              pointerEvents: "auto",
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              padding: "12px 24px",
              background: scrolled
                ? "rgba(251, 248, 242, 0.95)"
                : "rgba(251, 248, 242, 0.80)",
              backdropFilter: "blur(20px) saturate(1.4)",
              WebkitBackdropFilter: "blur(20px) saturate(1.4)",
              border: "1px solid rgba(28, 26, 23, 0.08)",
              borderRadius: 999,
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.5) inset, 0 20px 40px -24px rgba(28,26,23,0.18)",
              transition: `background 0.5s ${ease}`,
            }}
          >
            {/* ── Column 1: nav links (desktop) OR hamburger (mobile) ── */}
            <div style={{ display: "flex", alignItems: "center" }}>
              {/* Desktop nav links */}
              <div
                className="el-desktop-nav"
                style={{ display: "flex", alignItems: "center", gap: 24 }}
              >
                {links.map(renderDesktopItem)}
              </div>

              {/* Mobile hamburger (hidden on desktop) */}
              <button
                ref={hamburgerRef}
                type="button"
                className="el-hamburger"
                style={{ ...iconBtnStyle, display: "none" }}
                onClick={() => {
                  if (!menuOpen) {
                    setMobileExpanded(activeGroupIndex(links, pathname));
                  }
                  setMenuOpen(!menuOpen);
                }}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                aria-controls="el-mobile-nav"
              >
                {menuOpen ? (
                  <X aria-hidden={true} style={{ width: 18, height: 18 }} />
                ) : (
                  <Menu aria-hidden={true} style={{ width: 18, height: 18 }} />
                )}
              </button>
            </div>

            {/* ── Column 2 (center): wordmark / logo ── */}
            <Link
              href="/"
              style={{
                fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                fontSize: 26,
                fontStyle: "italic",
                fontWeight: 500,
                letterSpacing: "0.01em",
                lineHeight: 1,
                textAlign: "center",
                color: "var(--el-ink, #1c1a17)",
                textDecoration: "none",
                display: "block",
                whiteSpace: "nowrap",
              }}
            >
              {business?.siteContent?.logoUrl ? (
                <Image
                  src={business.siteContent.logoUrl}
                  alt={resolveLogoAlt(
                    business.siteContent?.logoAltText,
                    business.name,
                  )}
                  width={32}
                  height={32}
                  style={{ borderRadius: "50%", margin: "0 auto" }}
                />
              ) : (
                <em>{business?.name}</em>
              )}
            </Link>

            {/* ── Column 3 (right): icons ── */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 2,
              }}
            >
              {searchOpen ? (
                <form
                  onSubmit={handleSearchSubmit}
                  style={{ display: "flex", alignItems: "center", gap: 4 }}
                >
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && closeSearch()}
                    aria-label="Search products"
                    placeholder="Search…"
                    style={{
                      width: 140,
                      height: 30,
                      padding: "0 10px",
                      fontSize: 13,
                      fontFamily: "var(--font-sans, Manrope, sans-serif)",
                      letterSpacing: "0.02em",
                      color: "var(--el-ink, #1c1a17)",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--el-ink, #1c1a17)",
                      outline: "none",
                      borderRadius: 0,
                    }}
                  />
                  <button
                    type="button"
                    onClick={closeSearch}
                    aria-label="Close search"
                    style={iconBtnStyle}
                    className="el-icon-btn"
                  >
                    <X aria-hidden={true} style={{ width: 16, height: 16 }} />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={openSearch}
                  aria-label="Search products"
                  style={iconBtnStyle}
                  className="el-icon-btn"
                >
                  <Search
                    aria-hidden={true}
                    style={{ width: 17, height: 17 }}
                  />
                </button>
              )}

              {isStorefrontEnabled("customerAccounts") && (
                <>
                  {isPending ? (
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 999,
                        background: "rgba(28,26,23,0.06)",
                      }}
                    />
                  ) : user ? (
                    <UserButton
                      size="icon"
                      className="h-[34px] w-[34px] rounded-full"
                      avatarClassName="w-[34px] h-[34px]"
                      links={userButtonLinks}
                    />
                  ) : (
                    <Link
                      href="/auth/sign-in"
                      style={iconBtnStyle}
                      className="el-icon-btn"
                      aria-label="Sign in"
                    >
                      <User
                        aria-hidden={true}
                        style={{ width: 17, height: 17 }}
                      />
                    </Link>
                  )}
                </>
              )}

              {isStorefrontEnabled("wishlist") && (
                <Link
                  href="/wishlist"
                  aria-label={
                    wishlistCount > 0
                      ? `Wishlist (${wishlistCount} item${wishlistCount === 1 ? "" : "s"})`
                      : "Wishlist"
                  }
                  style={{ ...iconBtnStyle, position: "relative" }}
                  className="el-icon-btn"
                >
                  <Heart aria-hidden={true} style={{ width: 17, height: 17 }} />
                  <span
                    aria-hidden={true}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      minWidth: 16,
                      height: 16,
                      padding: "0 4px",
                      background: "var(--el-sage, #4a5240)",
                      color: "var(--el-paper, #fbf8f2)",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-sans, sans-serif)",
                      transform: wishlistCount > 0 ? "scale(1)" : "scale(0)",
                      transition: `transform 0.35s ${ease}`,
                    }}
                  >
                    {wishlistCount}
                  </span>
                </Link>
              )}

              {/* Catalog mode (B6.11): no bag button when `cart` is off */}
              {cartEnabled && (
                <button
                  type="button"
                  onClick={() => setIsOpen(true)}
                  aria-label={
                    itemCount > 0
                      ? `Cart (${itemCount} item${itemCount === 1 ? "" : "s"})`
                      : "Cart"
                  }
                  style={{ ...iconBtnStyle, position: "relative" }}
                  className="el-icon-btn"
                >
                  <ShoppingBag
                    aria-hidden={true}
                    style={{ width: 17, height: 17 }}
                  />
                  <span
                    aria-hidden={true}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      minWidth: 16,
                      height: 16,
                      padding: "0 4px",
                      background: "var(--el-sage, #4a5240)",
                      color: "var(--el-paper, #fbf8f2)",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-sans, sans-serif)",
                      transform: itemCount > 0 ? "scale(1)" : "scale(0)",
                      transition: `transform 0.35s ${ease}`,
                    }}
                  >
                    {itemCount}
                  </span>
                </button>
              )}
            </div>
          </nav>

          {/* ── Mobile dropdown ── */}
          <div
            id="el-mobile-nav"
            aria-hidden={!menuOpen}
            style={{
              pointerEvents: menuOpen ? "auto" : "none",
              // Viewport cap (not a fixed 500px) so an expanded accordion
              // scrolls inside the panel instead of clipping.
              maxHeight: menuOpen ? "calc(100dvh - 120px)" : 0,
              overflowX: "hidden",
              overflowY: menuOpen ? "auto" : "hidden",
              overscrollBehavior: "contain",
              borderRadius: 20,
              transition: `max-height 0.4s ${ease}`,
              marginTop: 8,
            }}
          >
            <div
              style={{
                background: "rgba(251, 248, 242, 0.97)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(28, 26, 23, 0.08)",
                borderRadius: 20,
                padding: "20px 28px",
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              {links.map((item, i) => {
                if (item.children?.length) {
                  const isOpen = mobileExpanded === i;
                  const sublistId = `el-mobile-nav-group-${i}`;
                  const entries = navGroupEntries(item);
                  const activeEntry = activeEntryIndex(pathname, entries);
                  return (
                    <div key={i}>
                      {/* Group trigger — never navigates; a non-empty parent
                          href is the sub-list's first entry. No aria-current. */}
                      <button
                        type="button"
                        className="el-mobile-group-btn"
                        tabIndex={menuOpen ? undefined : -1}
                        aria-expanded={isOpen}
                        aria-controls={sublistId}
                        onClick={() => setMobileExpanded(isOpen ? null : i)}
                        style={{
                          ...mobileLinkStyle(isNavItemActive(pathname, item)),
                          display: "flex",
                          width: "100%",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: 0,
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          lineHeight: "inherit",
                        }}
                      >
                        {item.label}
                        <ChevronDown
                          aria-hidden={true}
                          style={{
                            width: 16,
                            height: 16,
                            flexShrink: 0,
                            transform: isOpen
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                            transition: `transform 0.4s ${ease}`,
                          }}
                        />
                      </button>
                      {isOpen && (
                        <ul
                          id={sublistId}
                          style={{
                            listStyle: "none",
                            margin: "12px 0 0 2px",
                            padding: "2px 0 2px 16px",
                            borderLeft: "1px solid rgba(28, 26, 23, 0.12)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                          }}
                        >
                          {entries.map((child, j) => {
                            const childActive = j === activeEntry;
                            return (
                              <li key={j}>
                                <Link
                                  href={child.href}
                                  {...externalLinkProps(child.external)}
                                  className="el-mobile-sublink"
                                  tabIndex={menuOpen ? undefined : -1}
                                  aria-current={
                                    childActive ? "page" : undefined
                                  }
                                  onClick={() => setMenuOpen(false)}
                                  style={{
                                    ...mobileLinkStyle(childActive),
                                    fontSize: 14.5,
                                    display: "block",
                                  }}
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
                    tabIndex={menuOpen ? undefined : -1}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    style={mobileLinkStyle(active)}
                  >
                    {item.label}
                    {item.external && externalHint}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Cart drawer — not mounted in catalog mode (B6.11) */}
      {cartEnabled && (
        <ElegantCartDrawer
          cartTitle={cartFields["elegant.global.cart-title"] ?? ""}
          emptyHeading={
            cartFields["elegant.global.cart-drawer-empty-heading"] ?? ""
          }
          emptyBody={cartFields["elegant.global.cart-empty-body"] ?? ""}
          browseButtonText={
            cartFields["elegant.global.cart-browse-button"] ?? ""
          }
          checkoutNote={cartFields["elegant.global.cart-drawer-note"] ?? ""}
        />
      )}
    </>
  );
}
