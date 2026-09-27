"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  FileText,
  Gift,
  Heart,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Package,
  Repeat,
  Shield,
  ShoppingBag,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { NavItem } from "~/app/(storefront)/_components/nav";
import type { UserButtonLink } from "~/components/auth/user/user-button";
import type { BannerConfig } from "~/lib/validators/site-banner";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { HamburgerIcon } from "~/components/layout/hamburger-icon";
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
  resolveNav,
} from "~/app/(storefront)/_components/nav";

import { PollenAnnouncementBar } from "./pollen-announcement-bar";
import { PollenNavOverlayAccount } from "./pollen-nav-overlay-account";

/** Shipped nav when the owner hasn't saved one (Admin → Content → Navigation). */
const POLLEN_DEFAULT_NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

/**
 * Stable id for the mobile overlay. A constant (not `useId`) so server and
 * client can never disagree, and the hamburger only references it while the
 * overlay is actually mounted.
 */
const MOBILE_MENU_ID = "pollen-mobile-menu";

/** Icons for the desktop `UserButton` menu, keyed by `getAccountNavLinks` key. */
const ACCOUNT_LINK_ICONS: Record<string, ReactNode> = {
  orders: <Package className="h-4 w-4" />,
  "address-book": <MapPin className="h-4 w-4" />,
  subscriptions: <Repeat className="h-4 w-4" />,
  invoices: <FileText className="h-4 w-4" />,
  rewards: <Gift className="h-4 w-4" />,
  security: <Shield className="h-4 w-4" />,
  preferences: <SlidersHorizontal className="h-4 w-4" />,
  admin: <LayoutDashboard className="h-4 w-4" />,
};

const externalHint = <span className="sr-only"> (opens in new tab)</span>;

/** Returns all keyboard-focusable elements inside `container`. */
function getFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.closest("[inert]"));
}

type PollenHeaderProps = DefaultHeaderTemplateProps & {
  /** Resolved platform announcement bar, or null when off/empty. */
  banner?: BannerConfig | null;
  /** `pollen.global.header-button-text` — blank hides the button. */
  buttonText?: string;
  /** `pollen.global.header-button-link`, already defaulted to /contact. */
  buttonLink?: string;
};

export function PollenHeader({
  business,
  banner = null,
  buttonText = "",
  buttonLink = "/contact",
}: PollenHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { data: session, isPending } = useHydratedSession();
  const { isEnabled } = useFeatureFlags({
    flags: (business?.featureFlags as Record<string, boolean>) ?? {},
  });
  const { isEnabled: isStorefrontEnabled } = useStorefrontFlags();
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const user = session?.user;
  const shouldReduceMotion = useReducedMotion();

  // Refs for focus management
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const overlayCloseRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Desktop sub-nav: index of the open dropdown group (one at a time). A
  // custom disclosure, not Radix — a portaled menu would escape the `.pollen`
  // scope (and its focus-visible styling). Ported from happy-bamboo-header.
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const triggerRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const desktopNavRef = useRef<HTMLElement>(null);
  // Set when hover (or a touch tap's emulated mouseenter) opened the group,
  // so the click that usually follows doesn't immediately toggle it shut.
  const openedByHover = useRef(false);

  // Close the dropdown on route change (back/forward, programmatic pushes).
  // Adjusting state during render on a changed input, per the React docs.
  const [dropdownPath, setDropdownPath] = useState(pathname);
  if (dropdownPath !== pathname) {
    setDropdownPath(pathname);
    setOpenDropdown(null);
  }

  // Escape closes the open dropdown and returns focus to its trigger; a
  // pointer-down outside the desktop nav closes it too.
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

  // Header button: hidden when its text is blank or the contact form is off.
  const showHeaderButton =
    buttonText.trim().length > 0 && isStorefrontEnabled("contactForm");

  // Owner nav (children + external preserved) or the shipped default, which
  // drops /services while the services feature is off.
  const links = resolveNav(
    business?.siteContent?.navigationItems,
    POLLEN_DEFAULT_NAV.filter(
      (l) => l.href !== "/services" || isEnabled("services"),
    ),
  );

  const accountsEnabled = isStorefrontEnabled("customerAccounts");
  const isAdmin =
    session?.user?.platformRole === "PLATFORM_ADMIN" ||
    !!session?.session?.membershipId;

  // --- Announcement bar collapses once the page scrolls (mirrors vii) ---
  useEffect(() => {
    if (!banner) return;
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [banner]);

  // --- Lock body scroll when menu is open ---
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // --- Focus management: move focus into overlay on open; restore on close ---
  const wasMobileOpenRef = useRef(false);
  useEffect(() => {
    if (mobileMenuOpen) {
      wasMobileOpenRef.current = true;
      // Small timeout so AnimatePresence has mounted the overlay
      const t = setTimeout(() => {
        overlayCloseRef.current?.focus();
      }, 50);
      return () => clearTimeout(t);
    } else if (wasMobileOpenRef.current) {
      // Only restore focus when the menu was actually open (not on mount)
      wasMobileOpenRef.current = false;
      hamburgerRef.current?.focus();
    }
  }, [mobileMenuOpen]);

  // --- Inert background while the mobile overlay is open ---
  // Scoped to this template's `.pollen` wrapper (like happy-bamboo) so a
  // stray `main`/`footer` elsewhere (editor chrome, previews) is untouched.
  // Uses the attribute so it round-trips cleanly and never clobbers an
  // element that was already inert.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const scope: ParentNode =
      hamburgerRef.current?.closest(".pollen") ?? document;
    const targets = [
      scope.querySelector<HTMLElement>("header.pollen-header"),
      scope.querySelector<HTMLElement>("#main-content"),
      scope.querySelector<HTMLElement>("#main-content ~ footer"),
    ].filter((el): el is HTMLElement => !!el);
    const hadInert = targets.map((el) => el.hasAttribute("inert"));
    targets.forEach((el) => el.setAttribute("inert", ""));
    return () => {
      targets.forEach((el, i) => {
        if (!hadInert[i]) el.removeAttribute("inert");
      });
    };
  }, [mobileMenuOpen]);

  // --- Tab trap inside the mobile overlay ---
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const overlay = overlayRef.current;
      if (!overlay) return;
      const focusables = getFocusables(overlay);
      if (!focusables.length) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
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
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  // --- Escape key: close mobile menu ---
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  const closeMenu = useCallback(() => setMobileMenuOpen(false), []);

  // --- Reduced-motion variants for overlay and per-link stagger ---
  const overlayTransitionDuration = shouldReduceMotion ? 0 : 0.2;
  const linkVariants = shouldReduceMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
  const staggerTransition = (i: number) =>
    shouldReduceMotion
      ? { duration: 0 }
      : { delay: 0.05 + Math.min(i, 8) * 0.05, duration: 0.25 };

  // Desktop avatar menu: the same flag-gated account links the overlay and
  // Default's account sidebar use. Settings is dropped because `UserButton`
  // renders its own built-in Settings item.
  const userButtonLinks: UserButtonLink[] = getAccountNavLinks({
    isEnabled: isStorefrontEnabled,
    includeAdmin: isAdmin,
  })
    .filter((link) => link.key !== "settings")
    .map((link) => ({
      label: link.label,
      href: link.href,
      icon: ACCOUNT_LINK_ICONS[link.key],
    }));

  const userMenu = user && (
    <UserButton
      size="icon"
      className="border-primary border"
      avatarClassName="size-10"
      links={userButtonLinks}
    />
  );

  const navLinkClass = (active: boolean) =>
    cn(
      "group relative px-1 text-sm font-semibold tracking-wide uppercase transition-colors",
      active ? "text-[#5e7747]" : "text-[#4c566a] hover:text-[#5e7747]",
    );

  const navUnderline = (active: boolean) => (
    <span
      aria-hidden="true"
      className={cn(
        "absolute right-[-2px] -bottom-1 left-[-2px] h-0.5 bg-[#5e7747]",
        !active &&
          "scale-x-0 transition-transform duration-300 group-hover:scale-x-100",
      )}
    />
  );

  const renderDesktopItem = (item: NavItem, i: number) => {
    if (item.children?.length) {
      const isOpen = openDropdown === i;
      const panelId = `pollen-nav-dropdown-${i}`;
      const entries = navGroupEntries(item);
      const activeEntry = activeEntryIndex(pathname, entries);
      const groupActive = isNavItemActive(pathname, item);
      return (
        <div
          key={i}
          // Full bar height so the panel's `top-full` lands on the bar's
          // bottom edge; the panel's own pt-2 is the hover bridge.
          className="relative flex h-28 items-center"
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
              navLinkClass(groupActive),
              "inline-flex cursor-pointer items-center gap-1",
            )}
          >
            {item.label}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "size-3.5 transition-transform duration-200",
                isOpen && "rotate-180",
              )}
            />
            {navUnderline(groupActive)}
          </button>

          {isOpen && (
            <div
              id={panelId}
              className="absolute top-full left-1/2 z-20 -translate-x-1/2 pt-2"
            >
              <ul className="min-w-52 rounded-xl border border-[#E5E8E0] bg-white py-2 shadow-[0_16px_32px_-12px_rgba(26,30,26,0.25)]">
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
                          "block px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors hover:bg-[#F7F9F4] hover:text-[#5E7747]",
                          childActive
                            ? "bg-[#F7F9F4] text-[#5E7747]"
                            : "text-[#374151]",
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
        className={navLinkClass(active)}
      >
        {item.label}
        {item.external && externalHint}
        {navUnderline(active)}
      </Link>
    );
  };

  return (
    <>
      {/* `pollen-header` class: the overlay's inert lookup targets it. */}
      <header className="pollen-header bg-background border-border fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-md">
        {/* Platform announcement bar — top row, hides once the page scrolls */}
        {banner && !scrolled && <PollenAnnouncementBar banner={banner} />}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-28 items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2"
              onClick={closeMenu}
            >
              {business?.siteContent?.logoUrl ? (
                <Image
                  src={business.siteContent.logoUrl}
                  alt={resolveLogoAlt(
                    business.siteContent?.logoAltText,
                    business.name,
                  )}
                  width={100}
                  height={100}
                />
              ) : (
                <span className="text-xl font-bold">{business.name}</span>
              )}
            </Link>

            <nav
              ref={desktopNavRef}
              aria-label="Main navigation"
              className="hidden items-center justify-center gap-12 md:flex"
            >
              {links.map(renderDesktopItem)}
            </nav>

            <div className="flex items-center gap-3">
              {/* Wishlist icon — gated on the storefront `wishlist` flag. */}
              {isStorefrontEnabled("wishlist") && (
                <Link
                  href="/wishlist"
                  className="relative flex items-center p-2 text-[#4c566a] transition-colors hover:text-[#215935]"
                  aria-label={`Wishlist with ${wishlistCount} items`}
                >
                  <Heart className="size-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-[#215935] text-[10px] font-bold text-white">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Cart icon */}
              {isEnabled("cart") && (
                <Link
                  href="/cart"
                  className="relative flex items-center p-2 text-[#4c566a] transition-colors hover:text-[#215935]"
                  aria-label={`Shopping cart with ${itemCount} items`}
                >
                  <ShoppingBag className="size-5" />
                  {itemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-[#215935] text-[10px] font-bold text-white">
                      {itemCount}
                    </span>
                  )}
                </Link>
              )}

              <div className="hidden items-center gap-5 md:flex">
                {/* #215935 on #F1F5EC = 7.47:1 (hover #1A4529 on #E3EBD8 =
                    8.89:1). Was green-700 on a 10% green wash. */}
                {showHeaderButton && (
                  <Link
                    href={buttonLink}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#5E7747]/40 bg-[#F1F5EC] px-4 text-sm font-medium text-[#215935] transition-colors hover:bg-[#E3EBD8] hover:text-[#1A4529]"
                  >
                    <MessageSquare className="h-4 w-4" aria-hidden="true" />
                    <span {...fieldAttr("pollen.global.header-button-text")}>
                      {buttonText}
                    </span>
                  </Link>
                )}

                {accountsEnabled &&
                  (isPending ? (
                    <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
                  ) : user ? (
                    userMenu
                  ) : (
                    <Link href="/auth/sign-in" className={navLinkClass(false)}>
                      Log in
                      {navUnderline(false)}
                    </Link>
                  ))}
              </div>

              {/* aria-controls only while the overlay is mounted, so it never
                  points at a missing id. */}
              <button
                ref={hamburgerRef}
                type="button"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls={mobileMenuOpen ? MOBILE_MENU_ID : undefined}
                className="flex touch-manipulation items-center justify-center p-2 md:hidden"
                onClick={() => setMobileMenuOpen((o) => !o)}
              >
                <HamburgerIcon open={mobileMenuOpen} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay — rendered only when open via AnimatePresence */}
      <AnimatePresence>
        {mobileMenuOpen ? (
          <motion.div
            ref={overlayRef}
            id={MOBILE_MENU_ID}
            key="pollen-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-60 overflow-y-auto overscroll-contain bg-[#1A1E1A] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: overlayTransitionDuration }}
          >
            {/* Receives focus on open via overlayCloseRef */}
            <button
              ref={overlayCloseRef}
              type="button"
              onClick={closeMenu}
              aria-label="Close menu"
              className="fixed top-4 right-4 z-10 rounded-full p-2 text-white transition-colors hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="flex min-h-full flex-col items-center justify-center px-6 pt-20 pb-12">
              {/* Owner logo unfiltered on a light chip (a CSS invert turned
                  colour logos purple/blue); no logo → the business name. */}
              <Link
                href="/"
                onClick={closeMenu}
                className="mb-10 flex shrink-0 items-center justify-center"
              >
                {business.siteContent?.logoUrl ? (
                  <span className="flex items-center justify-center rounded-2xl bg-[#F7F9F4] p-3">
                    <Image
                      src={business.siteContent.logoUrl}
                      alt={resolveLogoAlt(
                        business.siteContent?.logoAltText,
                        business.name,
                      )}
                      width={120}
                      height={120}
                      className="h-20 w-auto max-w-[10rem] object-contain"
                    />
                  </span>
                ) : (
                  <span className="text-center text-3xl font-semibold text-white">
                    {business.name}
                  </span>
                )}
              </Link>

              <PollenOverlayNav
                links={links}
                pathname={pathname}
                onClose={closeMenu}
                linkVariants={linkVariants}
                staggerTransition={staggerTransition}
              />

              {/* Contact pill + account block, below the links */}
              <motion.div
                variants={linkVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={staggerTransition(links.length)}
                className="mt-12 flex w-full flex-col items-center gap-6"
              >
                {/* White on #1A1E1A = 16.87:1; #A8D081 border = 9.65:1. */}
                {showHeaderButton && (
                  <Link
                    href={buttonLink}
                    onClick={closeMenu}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#A8D081] px-6 text-sm font-medium text-white transition-colors hover:bg-[#A8D081]/15"
                  >
                    <MessageSquare
                      className="h-4 w-4 text-[#A8D081]"
                      aria-hidden="true"
                    />
                    <span {...fieldAttr("pollen.global.header-button-text")}>
                      {buttonText}
                    </span>
                  </Link>
                )}

                {/* Same `customerAccounts` gate the desktop cluster uses. */}
                {accountsEnabled && (
                  <PollenNavOverlayAccount
                    session={session}
                    isPending={isPending}
                    isEnabled={isStorefrontEnabled}
                    onClose={closeMenu}
                  />
                )}
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

type LinkVariants = {
  hidden: { opacity: number; y: number };
  visible: { opacity: number; y: number };
};

type PollenOverlayNavProps = {
  links: NavItem[];
  pathname: string;
  onClose: () => void;
  linkVariants: LinkVariants;
  staggerTransition: (
    i: number,
  ) => { duration: number } | { delay: number; duration: number };
};

/**
 * The overlay's link list. Its own component so it mounts fresh with the
 * overlay: the `expanded` initializer auto-expands the group holding the
 * current route on every open. One group open at a time.
 */
function PollenOverlayNav({
  links,
  pathname,
  onClose,
  linkVariants,
  staggerTransition,
}: PollenOverlayNavProps) {
  const [expanded, setExpanded] = useState<number | null>(() => {
    const idx = links.findIndex(
      (item) => !!item.children?.length && isNavItemActive(pathname, item),
    );
    return idx === -1 ? null : idx;
  });

  // Active = #A8D081 on #1A1E1A (9.65:1); the desktop #5E7747 is only
  // 3.38:1 on this surface.
  const rowClass = (active: boolean) =>
    cn(
      "rounded-lg px-4 py-2 text-2xl font-light tracking-wide uppercase transition-colors active:bg-white/10",
      active
        ? "text-[#A8D081]"
        : "text-white hover:text-[#A8D081] active:text-[#A8D081]",
    );

  return (
    <nav aria-label="Mobile navigation" className="w-full max-w-sm">
      <ul className="flex flex-col items-center gap-6">
        {links.map((item, i) => {
          if (item.children?.length) {
            const isOpen = expanded === i;
            const sublistId = `${MOBILE_MENU_ID}-group-${i}`;
            const entries = navGroupEntries(item);
            const activeEntry = activeEntryIndex(pathname, entries);
            return (
              <motion.li
                key={i}
                variants={linkVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={staggerTransition(i)}
                className="flex w-full flex-col items-center"
              >
                {/* Group trigger — never navigates; a non-empty parent href
                    is the sublist's first entry. No aria-current. */}
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={sublistId}
                  onClick={() => setExpanded(isOpen ? null : i)}
                  className={cn(
                    rowClass(isNavItemActive(pathname, item)),
                    "inline-flex min-h-11 items-center gap-2",
                  )}
                >
                  {item.label}
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "size-5 shrink-0 transition-transform duration-300",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                {isOpen && (
                  <ul
                    id={sublistId}
                    className="mt-2 flex flex-col items-center gap-1"
                  >
                    {entries.map((child, j) => {
                      const childActive = j === activeEntry;
                      return (
                        <li key={j}>
                          <Link
                            href={child.href}
                            {...externalLinkProps(child.external)}
                            onClick={onClose}
                            aria-current={childActive ? "page" : undefined}
                            className={cn(
                              "flex min-h-11 items-center rounded-lg px-4 text-lg transition-colors hover:text-[#A8D081]",
                              childActive
                                ? "font-medium text-[#A8D081]"
                                : "text-white/80",
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
              </motion.li>
            );
          }

          const active = isNavItemActive(pathname, item);
          return (
            <motion.li
              key={i}
              variants={linkVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={staggerTransition(i)}
            >
              <Link
                href={item.href}
                {...externalLinkProps(item.external)}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(rowClass(active), "block")}
              >
                {item.label}
                {item.external && externalHint}
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </nav>
  );
}
