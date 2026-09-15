"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { ChevronDown, Heart, Menu, Search, User } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { OliveNavCollection, OliveNavLink } from "./olive-nav-overlay";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { cn } from "~/lib/utils";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { UserButton } from "~/components/auth/user/user-button";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useWishlist } from "~/providers/wishlist-context";

import { oliveChipToken } from "../shared/olive-color";
import { OliveCartButton } from "./olive-cart-button";
import { OliveNavOverlay } from "./olive-nav-overlay";

type OliveHeaderProps = DefaultHeaderTemplateProps & {
  /** Published collections, resolved once by the layout. */
  collections?: OliveNavCollection[];
};

/**
 * White, sticky, one hairline at the bottom — the counter the swatch book sits
 * on. Three columns from 1024px up: nav left, the tracked wordmark dead
 * centre, the icon cluster right. Below that the nav collapses into a
 * hamburger that opens `OliveNavOverlay`.
 *
 * The announcement bar is rendered by the layout ABOVE this element, not
 * inside it, so the bar scrolls away and only the nav row pins.
 */
export function OliveHeader({
  business,
  initialSession,
  collections = [],
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
  const blogEnabled = isEnabled("blog");
  const collectionsEnabled = isEnabled("collections");
  const accountsEnabled = isStorefrontEnabled("customerAccounts");
  const wishlistEnabled = isStorefrontEnabled("wishlist");

  const [menuOpen, setMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const shopWrapRef = useRef<HTMLDivElement>(null);
  const shopPanelRef = useRef<HTMLDivElement>(null);
  const shopMenuId = useId();
  const mobileMenuId = useId();

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // ── Close everything on route change ────────────────────────────────────
  useEffect(() => {
    setMenuOpen(false);
    setShopOpen(false);
  }, [pathname]);

  // ── Escape closes the Shop dropdown ─────────────────────────────────────
  useEffect(() => {
    if (!shopOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShopOpen(false);
        shopWrapRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [shopOpen]);

  // ── Pointer outside closes it (hover-out alone misses tap-to-open) ──────
  useEffect(() => {
    if (!shopOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest("[data-olive-dropdown]")) setShopOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [shopOpen]);

  const businessName = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl;
  const logoAlt = resolveLogoAlt(
    business?.siteContent?.logoAltText,
    businessName,
  );

  const isActive = (href: string) => {
    if (!href || href === "#") return false;
    return href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");
  };

  // ── Nav model ───────────────────────────────────────────────────────────
  const leadLinks: OliveNavLink[] = productsEnabled
    ? [{ label: "New arrivals", href: "/shop" }]
    : [];

  const trailLinks: OliveNavLink[] = [
    { label: "About", href: "/about" },
    ...(blogEnabled ? [{ label: "Journal", href: "/blog" }] : []),
    { label: "Contact", href: "/contact" },
  ];

  const shopLink: OliveNavLink | null = productsEnabled
    ? { label: "Shop", href: "/shop" }
    : null;

  const overlayLinks: OliveNavLink[] = [
    ...leadLinks,
    ...(shopLink ? [shopLink] : []),
    ...trailLinks,
  ];

  const navCollections = collectionsEnabled ? collections : [];
  const shopActive =
    isActive("/shop") ||
    (collectionsEnabled && pathname.startsWith("/collections"));

  const showAdminLink =
    session?.user?.platformRole === "PLATFORM_ADMIN" ||
    !!session?.session?.membershipId;

  const openShopWithFocus = () => {
    setShopOpen(true);
    requestAnimationFrame(() => {
      shopPanelRef.current
        ?.querySelector<HTMLAnchorElement>("a[href]")
        ?.focus();
    });
  };

  const renderNavLink = (link: OliveNavLink) => {
    const active = isActive(link.href);
    return (
      <Link
        key={link.href + link.label}
        href={link.href}
        className="olive-nav-link"
        data-current={active ? "true" : undefined}
        aria-current={active ? "page" : undefined}
      >
        {link.label}
      </Link>
    );
  };

  const wordmark = logoUrl ? (
    <span className="relative block h-9 w-32 lg:h-11 lg:w-40">
      <Image
        src={logoUrl}
        alt={logoAlt}
        fill
        sizes="(min-width: 1024px) 160px, 128px"
        className="object-contain"
        priority
      />
    </span>
  ) : (
    <span className="olive-wordmark text-[0.8125rem] lg:text-[1rem]">
      {businessName}
    </span>
  );

  return (
    <>
      <header className="olive-header">
        <div
          className="mx-auto grid w-full [grid-template-columns:minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-[var(--olive-section-pad-x)]"
          style={{
            maxWidth: "var(--olive-container)",
            minHeight: "var(--olive-header-h)",
          }}
        >
          {/* ── Left: hamburger (mobile) / nav (desktop) ── */}
          <div className="flex min-w-0 items-center">
            <button
              ref={burgerRef}
              type="button"
              onClick={() => setMenuOpen(true)}
              className="olive-icon-btn olive-d-hide -ml-2 lg:hidden"
              aria-label="Menu"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-controls={mobileMenuId}
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </button>

            <nav
              className="hidden items-center gap-7 lg:flex"
              aria-label="Primary navigation"
            >
              {leadLinks.map(renderNavLink)}

              {shopLink ? (
                <div
                  ref={shopWrapRef}
                  className="relative flex items-center"
                  data-olive-dropdown
                  onMouseEnter={() => setShopOpen(true)}
                  onMouseLeave={() => setShopOpen(false)}
                  onBlur={(event) => {
                    if (
                      !event.currentTarget.contains(
                        event.relatedTarget as Node | null,
                      )
                    ) {
                      setShopOpen(false);
                    }
                  }}
                >
                  <button
                    type="button"
                    className="olive-nav-link"
                    aria-haspopup="true"
                    aria-expanded={shopOpen}
                    aria-controls={shopMenuId}
                    data-current={shopActive ? "true" : undefined}
                    onClick={() => setShopOpen((prev) => !prev)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        openShopWithFocus();
                      }
                    }}
                  >
                    {shopLink.label}
                    <ChevronDown
                      className={cn(
                        "h-3 w-3",
                        !reduced && "transition-transform duration-200",
                        shopOpen && "rotate-180",
                      )}
                      aria-hidden="true"
                    />
                  </button>

                  {shopOpen ? (
                    <div
                      id={shopMenuId}
                      ref={shopPanelRef}
                      className="absolute top-full left-0 z-20 pt-3"
                    >
                      <div className="olive-dropdown">
                        {navCollections.length > 0 ? (
                          <>
                            <ul className="m-0 grid list-none grid-cols-2 gap-x-3 p-0">
                              {navCollections.map((collection, index) => {
                                const href = `/collections/${collection.slug}`;
                                const active = isActive(href);
                                return (
                                  <li key={collection.id}>
                                    <Link
                                      href={href}
                                      className="olive-dropdown-link"
                                      data-current={active ? "true" : undefined}
                                      aria-current={active ? "page" : undefined}
                                      onClick={() => setShopOpen(false)}
                                    >
                                      <span
                                        className="olive-chip"
                                        style={{
                                          backgroundColor:
                                            oliveChipToken(index),
                                          width: "0.75rem",
                                          height: "0.75rem",
                                        }}
                                        aria-hidden="true"
                                      />
                                      {collection.name}
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                            <div className="olive-dropdown-divider" />
                          </>
                        ) : null}

                        <ul className="m-0 grid list-none grid-cols-2 gap-x-3 p-0">
                          <li>
                            <Link
                              href="/shop"
                              className="olive-dropdown-link"
                              onClick={() => setShopOpen(false)}
                            >
                              All products
                            </Link>
                          </li>
                          {navCollections.length === 0 ? (
                            <li>
                              <Link
                                href="/shop"
                                className="olive-dropdown-link"
                                onClick={() => setShopOpen(false)}
                              >
                                New arrivals
                              </Link>
                            </li>
                          ) : null}
                          {collectionsEnabled ? (
                            <li>
                              <Link
                                href="/collections"
                                className="olive-dropdown-link"
                                onClick={() => setShopOpen(false)}
                              >
                                All collections
                              </Link>
                            </li>
                          ) : null}
                        </ul>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {trailLinks.map(renderNavLink)}
            </nav>
          </div>

          {/* ── Centre: wordmark ── */}
          <Link
            href="/"
            aria-label={`${businessName} — Home`}
            className="flex items-center justify-self-center"
          >
            {wordmark}
          </Link>

          {/* ── Right: search, account, wishlist, bag ── */}
          <div className="flex items-center justify-end">
            {productsEnabled ? (
              <Link
                href="/shop"
                className="olive-icon-btn olive-sm-hide hidden sm:inline-flex"
                aria-label="Search products"
              >
                <Search
                  className="h-[18px] w-[18px]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </Link>
            ) : null}

            {accountsEnabled ? (
              <div className="hidden items-center sm:flex">
                {isPending ? (
                  <span
                    className="mx-3 h-7 w-7 animate-pulse rounded-full"
                    style={{ background: "var(--olive-paper)" }}
                  />
                ) : session?.user ? (
                  <UserButton
                    size="icon"
                    className="mx-2 h-auto w-auto rounded-full p-0"
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
                ) : (
                  <Link
                    href="/auth/sign-in"
                    className="olive-icon-btn"
                    aria-label="Sign in to your account"
                  >
                    <User
                      className="h-[18px] w-[18px]"
                      strokeWidth={1.5}
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
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                {wishlistCount > 0 ? (
                  <span className="olive-cart-badge" aria-hidden="true">
                    {wishlistCount > 99 ? "99+" : wishlistCount}
                  </span>
                ) : null}
              </Link>
            ) : null}

            {productsEnabled ? <OliveCartButton className="-mr-2" /> : null}
          </div>
        </div>
      </header>

      <OliveNavOverlay
        id={mobileMenuId}
        open={menuOpen}
        onClose={closeMenu}
        triggerRef={burgerRef}
        links={overlayLinks}
        collections={navCollections}
        businessName={businessName}
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        initialSession={initialSession}
        accountsEnabled={accountsEnabled}
        wishlistEnabled={wishlistEnabled}
        productsEnabled={productsEnabled}
        collectionsEnabled={collectionsEnabled}
      />
    </>
  );
}
