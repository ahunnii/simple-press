"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "~/components/auth/user/user-button";
import {
  IconLayoutDashboard,
  IconLogout,
  IconPackage,
} from "@tabler/icons-react";
import {
  Bell,
  BookUser,
  ChevronDown,
  ChevronUp,
  Heart,
  Lock,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { DefaultHeaderTemplateProps } from "../../types";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { shippingConfigFromBusiness } from "~/lib/shipping-utils";
import { cn } from "~/lib/utils";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { Button } from "~/components/ui/button";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useWishlist } from "~/providers/wishlist-context";

import { NoiseCartDrawer } from "../cart-checkout/noise-cart-drawer";
import { resolveFields } from "../index";

type NavChild = { label: string; href: string; external?: boolean };
type NavLink = {
  label: string;
  href: string;
  external?: boolean;
  children?: NavChild[];
};

const MOBILE_ACCOUNT_LINKS = [
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/settings", label: "Settings", icon: Settings },
  { href: "/account/security", label: "Security", icon: Lock },
  { href: "/account/address-book", label: "Address Book", icon: BookUser },
  { href: "/account/preferences", label: "Preferences", icon: Bell },
] as const;

// Mobile nav animation variants are computed inside the component
// to respond to the user's reduced-motion preference.

export function NoiseHeader({ business }: DefaultHeaderTemplateProps) {
  const { itemCount, setIsOpen } = useCart();
  const { count: wishlistCount, isHydrated: wishlistHydrated } = useWishlist();
  const { data: session, isPending } = useHydratedSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [expandedMobile, setExpandedMobile] = useState<Set<number>>(new Set());
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuId = useId();
  const mobileSubmenuId = useId();
  const mobileDialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();

  // S-4: Reduced-motion-aware variants for mobile nav stagger
  const mobileNavItemVariants = {
    closed: { opacity: reduce ? 1 : 0, y: reduce ? 0 : 16 },
    open: { opacity: 1, y: 0 },
  };
  const mobileNavListVariants = {
    closed: {},
    open: {
      transition: reduce ? {} : { staggerChildren: 0.05, delayChildren: 0.08 },
    },
  };

  useEffect(() => {
    if (openDropdown === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenDropdown(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openDropdown]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (accountMenuOpen) {
        setAccountMenuOpen(false);
      } else {
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen, accountMenuOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // C-1: Focus management for mobile menu dialog
  // On open: focus the close button; on close: return focus to hamburger
  useEffect(() => {
    if (mobileOpen) {
      // Defer by one tick so the dialog is mounted in the DOM
      const id = setTimeout(() => closeButtonRef.current?.focus(), 0);
      return () => clearTimeout(id);
    } else {
      hamburgerButtonRef.current?.focus();
    }
  }, [mobileOpen]);

  // C-1: Set inert on page content siblings while mobile menu is open
  useEffect(() => {
    const siblings: Element[] = [];
    const main = document.querySelector("main");
    const footer = document.querySelector("footer");
    // Announcement bar renders above the header — target it by its role/class
    const announcementBar = document.querySelector("[data-announcement-bar]");
    if (main) siblings.push(main);
    if (footer) siblings.push(footer);
    if (announcementBar) siblings.push(announcementBar);

    if (mobileOpen) {
      siblings.forEach((el) => el.setAttribute("inert", ""));
    } else {
      siblings.forEach((el) => el.removeAttribute("inert"));
    }
    return () => {
      siblings.forEach((el) => el.removeAttribute("inert"));
    };
  }, [mobileOpen]);

  // C-1: Tab focus trap inside the mobile menu dialog
  useEffect(() => {
    if (!mobileOpen) return;
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
  }, [mobileOpen]);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(e.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [accountMenuOpen]);

  useEffect(() => {
    setMobileOpen(false);
    setAccountMenuOpen(false);
    setOpenDropdown(null);
    setExpandedMobile(new Set());
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) setAccountMenuOpen(false);
  }, [mobileOpen]);

  const { isEnabled } = useFeatureFlags({
    flags: (business?.featureFlags as Record<string, boolean>) ?? {},
  });

  const { isEnabled: isStorefrontEnabled } = useStorefrontFlags();

  const LEFT_NAV: NavLink[] = [
    ...(isEnabled("products") ? [{ href: "/shop", label: "Shop" }] : []),
    ...(isEnabled("collections")
      ? [{ href: "/collections", label: "Collections" }]
      : []),
  ];

  const RIGHT_NAV: NavLink[] = [
    { href: "/about", label: "About" },
    ...(isEnabled("blog") ? [{ href: "/blog", label: "Blog" }] : []),
    ...(isEnabled("testimonials")
      ? [{ href: "/testimonials", label: "Reviews" }]
      : []),
    { href: "/contact", label: "Contact" },
  ];

  const customNav = business?.siteContent?.navigationItems as
    | NavLink[]
    | undefined;

  const links = customNav ?? RIGHT_NAV;
  const mobileNavItems: NavLink[] = customNav ?? [...LEFT_NAV, ...RIGHT_NAV];

  const toggleMobileExpanded = (index: number) => {
    setExpandedMobile((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const closeMobileMenu = () => {
    setAccountMenuOpen(false);
    setMobileOpen(false);
  };

  const openCart = () => {
    closeMobileMenu();
    setIsOpen(true);
  };

  const businessName = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl;
  const logoAlt = resolveLogoAlt(
    business?.siteContent?.logoAltText,
    businessName,
  );
  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const g = resolveFields(customFields, ["noise.global.location-tag"]);
  const locationTag = g["noise.global.location-tag"] ?? "";

  const isLinkActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  const isParentActive = (link: NavLink) =>
    link.children?.some((c) => isLinkActive(c.href)) ?? false;

  const showAdminLink =
    session?.user?.platformRole === "PLATFORM_ADMIN" ||
    !!session?.session?.membershipId;

  const userMenu = session?.user && (
    <UserButton
      size="icon"
      className="rounded-full w-auto h-auto p-0 border border-foreground/30"
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
        className="h-[18px] w-[18px] transition-opacity hover:opacity-60"
        style={{ color: "var(--vn-ink-soft)" }}
        strokeWidth={1.4}
      />
    </Link>
  );

  const brand = logoUrl ? (
    <div className="relative h-14 w-28">
      <Image
        src={logoUrl}
        alt={logoAlt}
        fill
        sizes="112px"
        className="object-contain"
      />
    </div>
  ) : (
    <>
      <span>{businessName.toUpperCase()}</span>
      {locationTag ? (
        <span
          className="vn-wordmark-sub"
          {...fieldAttr("noise.global.location-tag")}
        >
          {locationTag}
        </span>
      ) : null}
    </>
  );

  const mobileBrand = logoUrl ? (
    <div className="relative h-14 w-28">
      <Image
        src={logoUrl}
        alt={logoAlt}
        fill
        sizes="112px"
        className="object-contain object-left"
      />
    </div>
  ) : (
    <span>{businessName.toUpperCase()}</span>
  );

  const dropdownKey = (side: "left" | "right", index: number) =>
    `${side}-${index}`;

  const renderDesktopNavLink = (
    link: NavLink,
    index: number,
    side: "left" | "right",
  ) => {
    const key = dropdownKey(side, index);
    const active = isLinkActive(link.href);
    const parentActive = isParentActive(link);
    const inactiveColor = "var(--vn-ink-soft)";
    const activeColor = "var(--vn-ink)";

    if (link.children?.length) {
      const isOpen = openDropdown === key;

      return (
        <div
          key={link.href + link.label}
          className="relative"
          onMouseEnter={() => setOpenDropdown(key)}
          onMouseLeave={() => setOpenDropdown(null)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setOpenDropdown(null);
            }
          }}
        >
          <button
            type="button"
            aria-haspopup="true"
            aria-expanded={isOpen}
            onClick={() => setOpenDropdown(isOpen ? null : key)}
            className={cn(
              "vn-nav-link flex cursor-pointer items-center gap-1 border-none bg-transparent font-mono text-[10.5px] tracking-[0.22em] uppercase transition-colors",
              parentActive
                ? "text-foreground vn-active"
                : "hover:text-foreground",
            )}
            style={{
              color: parentActive ? activeColor : inactiveColor,
            }}
          >
            {link.label}
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform duration-200",
                isOpen ? "rotate-180" : "",
              )}
              aria-hidden="true"
            />
          </button>

          {isOpen ? (
            <div className="absolute top-full left-0 z-10 pt-2">
              <div className="vn-dropdown-panel min-w-[180px] overflow-hidden rounded-none py-1">
                {link.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    target={child.external ? "_blank" : undefined}
                    rel={child.external ? "noopener noreferrer" : undefined}
                    aria-current={isLinkActive(child.href) ? "page" : undefined}
                    onClick={() => setOpenDropdown(null)}
                    className={cn(
                      "vn-nav-dropdown-link",
                      isLinkActive(child.href) ? "vn-active" : "",
                    )}
                  >
                    {child.label}
                    {child.external && (
                      <span className="sr-only">(opens in new tab)</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <Link
        key={link.href + link.label}
        href={link.href}
        target={link.external ? "_blank" : undefined}
        rel={link.external ? "noopener noreferrer" : undefined}
        aria-current={active ? "page" : undefined}
        className={cn(
          "vn-nav-link font-mono text-[10.5px] tracking-[0.22em] uppercase transition-colors",
          active ? "text-foreground vn-active" : "hover:text-foreground",
        )}
        style={{
          color: active ? activeColor : inactiveColor,
        }}
      >
        {link.label}
        {link.external && <span className="sr-only">(opens in new tab)</span>}
      </Link>
    );
  };

  const renderMobileNavLink = (link: NavLink, i: number) => {
    const submenuId = `${mobileSubmenuId}-${i}`;

    if (link.children?.length) {
      return (
        <motion.li
          key={link.href + link.label}
          variants={mobileNavItemVariants}
          className="border-b"
          style={{ borderColor: "var(--vn-line-soft)" }}
        >
          <button
            type="button"
            onClick={() => toggleMobileExpanded(i)}
            aria-expanded={expandedMobile.has(i)}
            aria-controls={submenuId}
            className={cn(
              "vn-mobile-nav-link justify-between transition-colors",
              isParentActive(link)
                ? "vn-mobile-nav-active"
                : "vn-mobile-nav-inactive",
            )}
          >
            {link.label}
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 transition-transform duration-200",
                expandedMobile.has(i) ? "rotate-180" : "",
              )}
              aria-hidden="true"
            />
          </button>
          <AnimatePresence initial={false}>
            {expandedMobile.has(i) ? (
              <motion.div
                id={submenuId}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <ul className="vn-mobile-nav-list pb-2">
                  {link.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        target={child.external ? "_blank" : undefined}
                        rel={child.external ? "noopener noreferrer" : undefined}
                        onClick={closeMobileMenu}
                        aria-current={
                          isLinkActive(child.href) ? "page" : undefined
                        }
                        className={cn(
                          "vn-mobile-nav-link vn-mobile-nav-link-child transition-colors",
                          isLinkActive(child.href)
                            ? "vn-mobile-nav-active"
                            : "vn-mobile-nav-inactive",
                        )}
                      >
                        {child.label}
                        {child.external && (
                          <span className="sr-only">(opens in new tab)</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.li>
      );
    }

    return (
      <motion.li
        key={link.href + link.label}
        variants={mobileNavItemVariants}
        className="border-b"
        style={{ borderColor: "var(--vn-line-soft)" }}
      >
        <Link
          href={link.href}
          target={link.external ? "_blank" : undefined}
          rel={link.external ? "noopener noreferrer" : undefined}
          onClick={closeMobileMenu}
          aria-current={isLinkActive(link.href) ? "page" : undefined}
          className={cn(
            "vn-mobile-nav-link transition-colors",
            isLinkActive(link.href)
              ? "vn-mobile-nav-active"
              : "vn-mobile-nav-inactive",
          )}
        >
          {link.label}
          {link.external && <span className="sr-only">(opens in new tab)</span>}
        </Link>
      </motion.li>
    );
  };

  return (
    <>
      <header
        className="bg-background sticky top-0 z-50 w-full"
        style={{ borderBottom: "1px solid var(--vn-line-soft)" }}
        {...sectionGroupAttr("global", "branding")}
      >
        <div
          className="mx-auto grid w-full max-w-[1440px] items-center gap-6 px-4 py-4 sm:px-6 sm:py-[18px]"
          style={{ gridTemplateColumns: "1fr auto 1fr" }}
        >
          {/* ── Left: mobile menu + shop/collection links ── */}
          <div className="flex items-center gap-6">
            <Button
              ref={hamburgerButtonRef}
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-none md:hidden"
              style={{
                border: "1px solid var(--vn-rule)",
                color: "var(--vn-ink-soft)",
              }}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="noise-mobile-menu"
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>

            <nav
              className="hidden items-center gap-6 md:flex"
              aria-label="Shop navigation"
            >
              {LEFT_NAV.map((link, i) => renderDesktopNavLink(link, i, "left"))}
            </nav>
          </div>

          {/* ── Center: wordmark ── */}
          <Link href="/" className="vn-wordmark" aria-label="Home">
            {brand}
          </Link>

          {/* ── Right: editorial links + account + bag ── */}
          <div className="flex items-center justify-end gap-6">
            <nav
              className="hidden items-center gap-6 md:flex"
              aria-label="Primary navigation"
            >
              {links.map((link, i) => renderDesktopNavLink(link, i, "right"))}
            </nav>

            {isStorefrontEnabled("customerAccounts") && (
              <div className="hidden md:block">
                {isPending ? (
                  <div className="bg-foreground/10 h-7 w-7 animate-pulse rounded-full" />
                ) : session?.user ? (
                  userMenu
                ) : (
                  authLink
                )}
              </div>
            )}

            {isStorefrontEnabled("wishlist") && (
              <Link
                href="/wishlist"
                aria-label="Open wishlist"
                className="relative -m-3 flex items-center p-3 transition-opacity hover:opacity-60"
                style={{ color: "var(--vn-ink-soft)" }}
              >
                <Heart className="h-[18px] w-[18px]" strokeWidth={1.4} />
                {wishlistHydrated && wishlistCount > 0 && (
                  <motion.span
                    aria-hidden="true"
                    initial={{ scale: reduce ? 1 : 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: reduce ? 0 : 0.2 }}
                    className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full font-mono text-[9px] font-semibold"
                    style={{
                      background: "var(--vn-accent)",
                      color: "#fff",
                      minWidth: "16px",
                    }}
                  >
                    {wishlistCount}
                  </motion.span>
                )}
              </Link>
            )}

            <button
              onClick={() => setIsOpen(true)}
              aria-label={
                itemCount > 0
                  ? `Open cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`
                  : "Open cart"
              }
              className="relative -m-3 flex items-center p-3 transition-opacity hover:opacity-60"
              style={{ color: "var(--vn-ink-soft)" }}
            >
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.4} />
              {itemCount > 0 && (
                <motion.span
                  aria-hidden="true"
                  initial={{ scale: reduce ? 1 : 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: reduce ? 0 : 0.2 }}
                  className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full font-mono text-[9px] font-semibold"
                  style={{
                    background: "var(--vn-accent)",
                    color: "#fff",
                    minWidth: "16px",
                  }}
                >
                  {itemCount}
                </motion.span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen mobile navigation */}
      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            ref={mobileDialogRef}
            key="mobile-menu"
            id="noise-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="vn-mobile-menu fixed inset-0 z-[60] flex flex-col md:hidden"
            initial={{ opacity: reduce ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: reduce ? 1 : 0 }}
            transition={{ duration: reduce ? 0 : 0.25 }}
          >
            <motion.div
              className="flex min-h-0 flex-1 flex-col"
              initial={{ y: reduce ? 0 : 24 }}
              animate={{ y: 0 }}
              exit={{ y: reduce ? 0 : 16 }}
              transition={{
                duration: reduce ? 0 : 0.3,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div
                className="flex shrink-0 items-center justify-between border-b px-5 py-4 sm:px-6"
                style={{ borderColor: "var(--vn-rule)" }}
              >
                <Link
                  href="/"
                  onClick={closeMobileMenu}
                  aria-label="Home"
                  className="vn-wordmark min-w-0 flex-1 justify-start"
                  style={{ alignItems: "flex-start" }}
                >
                  {mobileBrand}
                </Link>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closeMobileMenu}
                  aria-label="Close menu"
                  className="ml-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-none transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    border: "1px solid var(--vn-rule)",
                    color: "var(--vn-ink-soft)",
                    outlineColor: "var(--vn-ink)",
                  }}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <nav
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-6"
                aria-label="Mobile navigation"
              >
                <motion.ul
                  className="vn-mobile-nav-list"
                  initial="closed"
                  animate="open"
                  exit="closed"
                  variants={mobileNavListVariants}
                >
                  {mobileNavItems.map((link, i) =>
                    renderMobileNavLink(link, i),
                  )}
                </motion.ul>
              </nav>

              <div
                className="relative shrink-0 border-t px-5 py-4 sm:px-6"
                style={{ borderColor: "var(--vn-rule)" }}
              >
                <AnimatePresence>
                  {accountMenuOpen && session?.user ? (
                    <motion.nav
                      ref={accountMenuRef}
                      id={accountMenuId}
                      aria-label="Account menu"
                      initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 12 }}
                      transition={{ duration: reduce ? 0 : 0.2 }}
                      className="vn-mobile-account-panel absolute right-5 bottom-full left-5 mb-2 overflow-hidden rounded-none shadow-lg sm:right-6 sm:left-6"
                    >
                      <div
                        className="border-b px-4 py-3"
                        style={{ borderColor: "var(--vn-line-soft)" }}
                      >
                        <p className="font-mono text-[9px] tracking-[0.3em] text-[var(--vn-steel-mist)] uppercase">
                          Signed in as
                        </p>
                        <p
                          className="mt-1 truncate font-sans text-sm"
                          style={{ color: "var(--vn-ink-soft)" }}
                        >
                          {session.user.name ?? session.user.email}
                        </p>
                      </div>
                      <ul className="py-1">
                        {MOBILE_ACCOUNT_LINKS.map(
                          ({ href, label, icon: Icon }) => (
                            <li key={href}>
                              <Link
                                href={href}
                                onClick={closeMobileMenu}
                                className={cn(
                                  "vn-mobile-nav-link vn-mobile-nav-link-child gap-3 px-4 transition-colors",
                                  isLinkActive(href)
                                    ? "text-[var(--vn-accent)]"
                                    : "text-[var(--vn-ink-soft)] hover:text-[var(--vn-ink)]",
                                )}
                                style={{
                                  background: isLinkActive(href)
                                    ? "var(--vn-line-soft)"
                                    : undefined,
                                }}
                              >
                                <Icon
                                  className="h-4 w-4 shrink-0"
                                  aria-hidden
                                />
                                {label}
                              </Link>
                            </li>
                          ),
                        )}
                        {showAdminLink ? (
                          <li>
                            <Link
                              href="/admin"
                              onClick={closeMobileMenu}
                              className="vn-mobile-nav-link vn-mobile-nav-link-child gap-3 px-4 text-[var(--vn-ink-soft)] transition-colors hover:text-[var(--vn-ink)]"
                            >
                              <IconLayoutDashboard
                                className="h-4 w-4 shrink-0"
                                aria-hidden
                              />
                              Admin
                            </Link>
                          </li>
                        ) : null}
                        <li
                          className="border-t"
                          style={{ borderColor: "var(--vn-line-soft)" }}
                        >
                          <Link
                            href="/auth/sign-out"
                            onClick={closeMobileMenu}
                            className="vn-mobile-nav-link vn-mobile-nav-link-child gap-3 px-4 text-[var(--vn-ink-soft)] transition-colors hover:text-[var(--vn-ink)]"
                          >
                            <IconLogout
                              className="h-4 w-4 shrink-0"
                              aria-hidden
                            />
                            Sign out
                          </Link>
                        </li>
                      </ul>
                    </motion.nav>
                  ) : null}
                </AnimatePresence>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={openCart}
                    aria-label={
                      itemCount > 0
                        ? `Open cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`
                        : "Open cart"
                    }
                    className="vn-mobile-action-btn relative rounded-none transition-opacity hover:opacity-80"
                    style={{
                      border: "1px solid var(--vn-rule)",
                      color: "var(--vn-ink-soft)",
                    }}
                  >
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                    <span aria-hidden="true">Cart</span>
                    {itemCount > 0 ? (
                      <span
                        aria-hidden="true"
                        className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-semibold"
                        style={{
                          background: "var(--vn-accent)",
                          color: "#fff",
                        }}
                      >
                        {itemCount}
                      </span>
                    ) : null}
                  </button>

                  {isStorefrontEnabled("wishlist") && (
                    <Link
                      href="/wishlist"
                      onClick={closeMobileMenu}
                      aria-label="Open wishlist"
                      className="vn-mobile-action-btn relative rounded-none transition-opacity hover:opacity-80"
                      style={{
                        border: "1px solid var(--vn-rule)",
                        color: "var(--vn-ink-soft)",
                      }}
                    >
                      <Heart className="h-4 w-4" aria-hidden="true" />
                      <span aria-hidden="true">Wishlist</span>
                      {wishlistHydrated && wishlistCount > 0 ? (
                        <span
                          aria-hidden="true"
                          className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-semibold"
                          style={{
                            background: "var(--vn-accent)",
                            color: "#fff",
                          }}
                        >
                          {wishlistCount}
                        </span>
                      ) : null}
                    </Link>
                  )}

                  {session?.user ? (
                    <button
                      type="button"
                      id={`${accountMenuId}-trigger`}
                      aria-haspopup="true"
                      aria-expanded={accountMenuOpen}
                      aria-controls={
                        accountMenuOpen ? accountMenuId : undefined
                      }
                      onClick={() => setAccountMenuOpen((open) => !open)}
                      className={cn(
                        "vn-mobile-action-btn rounded-none border transition-opacity hover:opacity-80",
                        accountMenuOpen
                          ? "border-[var(--vn-accent)] text-[var(--vn-accent)]"
                          : "border-[var(--vn-rule)] text-[var(--vn-ink-soft)]",
                      )}
                    >
                      <User className="h-4 w-4" aria-hidden="true" />
                      Account
                      <ChevronUp
                        className={cn(
                          "h-3.5 w-3.5 transition-transform duration-200",
                          accountMenuOpen ? "rotate-180" : "",
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  ) : (
                    <Link
                      href="/auth/sign-in"
                      onClick={closeMobileMenu}
                      className="vn-mobile-action-btn rounded-none border transition-opacity hover:opacity-80"
                      style={{
                        borderColor: "var(--vn-rule)",
                        color: "var(--vn-ink-soft)",
                      }}
                    >
                      <User className="h-4 w-4" aria-hidden="true" />
                      Login
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <NoiseCartDrawer shippingConfig={shippingConfigFromBusiness(business)} />
    </>
  );
}
