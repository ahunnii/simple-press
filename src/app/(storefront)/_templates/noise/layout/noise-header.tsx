"use client";

import type { LucideIcon } from "lucide-react";
import type {
  ComponentType,
  FocusEvent as ReactFocusEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";
import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  FileText,
  Gift,
  Heart,
  Lock,
  Menu,
  Package,
  Repeat,
  Settings,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { NavItem } from "~/app/(storefront)/_components/nav";
import type { UserButtonLink } from "~/components/auth/user/user-button";
import { AUTH_BASE_PATHS, AUTH_VIEW_PATHS } from "~/lib/auth-paths";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { shippingConfigFromBusiness } from "~/lib/shipping-utils";
import { cn } from "~/lib/utils";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
import { Button } from "~/components/ui/button";
import { UserButton } from "~/components/auth/user/user-button";
import { useCart } from "~/providers/cart-context";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { useWishlist } from "~/providers/wishlist-context";
import {
  activeEntryIndex,
  externalLinkProps,
  getAccountNavLinks,
  navGroupEntries,
} from "~/app/(storefront)/_components/nav";

import { resolveNoiseCartCopy } from "../cart-checkout/noise-cart-copy";
import { NoiseCartDrawer } from "../cart-checkout/noise-cart-drawer";
import { resolveNoiseLocationTag } from "../shared/noise-location-tag";
import { NOISE_QUICK_ACCOUNT_KEYS, noiseActiveItemIndex } from "./noise-nav";

type NoiseHeaderProps = DefaultHeaderTemplateProps & {
  /** Owner nav (or `NOISE_DEFAULT_NAV`), resolved and flag-filtered ONCE by
   *  the layout. The desktop bar splits it around the wordmark; the mobile
   *  menu lists it top to bottom. */
  navItems: NavItem[];
  /** How many of `navItems` sit left of the wordmark (`noiseNavLeftCount`). */
  navLeftCount: number;
};

const SIGN_IN_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signIn}`;
const SIGN_OUT_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signOut}`;

/** Desktop `UserButton` menu icons, keyed by `getAccountNavLinks` key. */
const QUICK_ACCOUNT_ICONS: Record<string, ReactNode> = {
  orders: <IconPackage className="h-4 w-4" />,
  admin: <IconLayoutDashboard className="h-4 w-4" />,
};

/** Mobile account-panel icons, keyed by `getAccountNavLinks` key (same set
 *  as the account sidebar). Unknown future keys fall back to `Settings`. */
const MOBILE_ACCOUNT_ICONS: Record<
  string,
  LucideIcon | ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  orders: Package,
  "address-book": BookUser,
  subscriptions: Repeat,
  invoices: FileText,
  rewards: Gift,
  settings: Settings,
  security: Lock,
  preferences: Bell,
  admin: IconLayoutDashboard,
};

/** Mobile tile grid, by how many tiles survive their flag gates. */
const TILE_GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
};

/** Screen-reader hint on links that open in a new tab. */
function externalHint(external?: boolean) {
  return external ? <span className="sr-only"> (opens in new tab)</span> : null;
}

// Mobile nav animation variants are computed inside the component
// to respond to the user's reduced-motion preference.

export function NoiseHeader({
  business,
  initialSession,
  navItems,
  navLeftCount,
}: NoiseHeaderProps) {
  const { itemCount, setIsOpen } = useCart();
  const { count: wishlistCount, isHydrated: wishlistHydrated } = useWishlist();
  const { data: session, isPending } = useHydratedSession(initialSession);
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  /** Index (into `navItems`) of the open desktop dropdown, if any. */
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [expandedMobile, setExpandedMobile] = useState<Set<number>>(new Set());
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuId = useId();
  const mobileSubmenuId = useId();
  const mobileDialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef(new Map<number, HTMLButtonElement>());
  /** Set when hover/focus opened a dropdown, so the click that follows
   *  (mouse press, or Enter/Space right after tabbing in) keeps it open
   *  instead of toggling it straight shut. */
  const passiveOpenRef = useRef<number | null>(null);
  /** Set while focus is handed back to a trigger, so that focus doesn't
   *  immediately re-open the dropdown that just closed. */
  const suppressFocusOpenRef = useRef(false);
  const dropdownBaseId = useId();
  const panelIdFor = (index: number) => `${dropdownBaseId}-panel-${index}`;
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

  /** Move focus back to a dropdown's trigger without re-opening it. */
  const focusTrigger = (index: number) => {
    const trigger = triggerRefs.current.get(index);
    if (!trigger) return;
    suppressFocusOpenRef.current = true;
    trigger.focus();
    suppressFocusOpenRef.current = false;
  };

  // Esc closes the open desktop dropdown and returns focus to its trigger
  // (B3.2), wherever focus was inside the group.
  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      passiveOpenRef.current = null;
      setOpenIndex(null);
      focusTrigger(openIndex);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openIndex]);

  // A pointer press outside closes it (hover-out alone misses tap-to-open).
  useEffect(() => {
    if (openIndex === null) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target?.closest("[data-vn-dropdown]")) {
        passiveOpenRef.current = null;
        setOpenIndex(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openIndex]);

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
    setOpenIndex(null);
    setExpandedMobile(new Set());
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) setAccountMenuOpen(false);
  }, [mobileOpen]);

  const { isEnabled } = useFeatureFlags({
    flags: (business?.featureFlags as Record<string, boolean>) ?? {},
  });

  const { isEnabled: isStorefrontEnabled } = useStorefrontFlags();

  // `cart` depends on `products`, so this is off whenever products is.
  const cartEnabled = isEnabled("cart");
  const wishlistEnabled = isStorefrontEnabled("wishlist");
  const accountsEnabled = isStorefrontEnabled("customerAccounts");

  // One current item across the whole bar (longest match wins), shared by
  // the desktop split and the mobile list — never two underlines.
  const activeIndex = noiseActiveItemIndex(pathname, navItems);
  const leftCount = Math.min(Math.max(navLeftCount, 0), navItems.length);

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
  const locationTag = resolveNoiseLocationTag(business, customFields);

  const showAdminLink =
    session?.user?.platformRole === "PLATFORM_ADMIN" ||
    !!session?.session?.membershipId;

  // Every account link, flag-gated (B4.3/B4.4): Orders needs `orders`,
  // Subscriptions/Invoices/Rewards their own flags, Admin only for staff.
  const accountLinks = getAccountNavLinks({
    isEnabled,
    includeAdmin: showAdminLink,
  });

  // Desktop avatar: the quick-access subset, filtered by key. Settings is
  // dropped because `UserButton` renders its own built-in Settings item.
  const userButtonLinks: UserButtonLink[] = accountLinks
    .filter(
      (link) =>
        NOISE_QUICK_ACCOUNT_KEYS.has(link.key) && link.key !== "settings",
    )
    .map((link) => ({
      label: link.label,
      href: link.href,
      icon: QUICK_ACCOUNT_ICONS[link.key],
    }));

  // Mobile account panel: the FULL list; one `aria-current` (longest match).
  const activeAccountIndex = activeEntryIndex(pathname, accountLinks);

  const userMenu = session?.user && (
    <UserButton
      size="icon"
      className="border-foreground/30 h-auto w-auto rounded-full border p-0"
      avatarClassName="size-7"
      links={userButtonLinks}
    />
  );

  const authLink = !session?.user && (
    <Link
      href={SIGN_IN_HREF}
      aria-label="Sign in"
      className="relative -m-3 flex items-center p-3 transition-opacity hover:opacity-60"
      style={{ color: "var(--vn-ink-soft)" }}
    >
      <User className="h-[18px] w-[18px]" strokeWidth={1.4} aria-hidden />
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
        <span className="vn-wordmark-sub">{locationTag}</span>
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

  const inactiveColor = "var(--vn-ink-soft)";
  const activeColor = "var(--vn-ink)";

  const closeDropdown = () => {
    passiveOpenRef.current = null;
    setOpenIndex(null);
  };

  /** Open a dropdown and move focus to its first entry (ArrowDown). */
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

  /** Hover + focus handling for a desktop dropdown group (B3.2). */
  const dropdownWrapperProps = (index: number) => ({
    "data-vn-dropdown": true,
    onMouseEnter: () => {
      if (openIndex === index) return;
      passiveOpenRef.current = index;
      setOpenIndex(index);
    },
    onMouseLeave: (e: ReactMouseEvent<HTMLDivElement>) => {
      passiveOpenRef.current = null;
      if (openIndex !== index) return;
      // Hover-out while keyboard focus sits on an entry inside the panel:
      // the panel unmounts, so hand focus back to the trigger instead of
      // dropping it on <body>.
      const active = document.activeElement;
      const trigger = triggerRefs.current.get(index);
      if (active && active !== trigger && e.currentTarget.contains(active)) {
        focusTrigger(index);
      }
      setOpenIndex(null);
    },
    onFocus: (e: ReactFocusEvent<HTMLDivElement>) => {
      // Only when focus arrives from outside the group.
      if (suppressFocusOpenRef.current) return;
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      if (openIndex === index) return;
      passiveOpenRef.current = index;
      setOpenIndex(index);
    },
    onBlur: (e: ReactFocusEvent<HTMLDivElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
        passiveOpenRef.current = null;
        setOpenIndex((current) => (current === index ? null : current));
      }
    },
  });

  const renderDesktopNavLink = (
    link: NavItem,
    index: number,
    side: "left" | "right",
  ) => {
    const current = index === activeIndex;

    if (link.children?.length) {
      const isOpen = openIndex === index;
      // The trigger never navigates: a parent's own href is the panel's
      // first entry (B3.2/B3.3).
      const entries = navGroupEntries(link);
      const activeEntry = current ? activeEntryIndex(pathname, entries) : -1;

      return (
        <div
          key={`${index}-${link.label}`}
          className="relative"
          {...dropdownWrapperProps(index)}
        >
          <button
            type="button"
            ref={(el) => {
              if (el) triggerRefs.current.set(index, el);
              else triggerRefs.current.delete(index);
            }}
            aria-haspopup="true"
            aria-expanded={isOpen}
            aria-controls={isOpen ? panelIdFor(index) : undefined}
            onClick={() => onTriggerClick(index, isOpen)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                openWithFocus(index);
              }
            }}
            className={cn(
              "vn-nav-link flex cursor-pointer items-center gap-1 border-none bg-transparent font-mono text-[10.5px] tracking-[0.22em] uppercase transition-colors",
              current ? "text-foreground vn-active" : "hover:text-foreground",
            )}
            style={{
              color: current ? activeColor : inactiveColor,
            }}
          >
            {link.label}
            <ChevronDown
              className={cn(
                "h-3 w-3",
                !reduce && "transition-transform duration-200",
                isOpen ? "rotate-180" : "",
              )}
              aria-hidden="true"
            />
          </button>

          {isOpen ? (
            <div
              id={panelIdFor(index)}
              className={cn(
                "absolute top-full z-10 pt-2",
                // Right-hand groups open leftward so the panel never runs
                // off the viewport edge.
                side === "right" ? "right-0" : "left-0",
              )}
            >
              <ul className="vn-dropdown-panel m-0 min-w-[180px] list-none overflow-hidden rounded-none p-0 py-1">
                {entries.map((entry, j) => (
                  <li key={`${j}-${entry.href}-${entry.label}`}>
                    <Link
                      href={entry.href}
                      {...externalLinkProps(entry.external)}
                      aria-current={j === activeEntry ? "page" : undefined}
                      onClick={closeDropdown}
                      className={cn(
                        "vn-nav-dropdown-link",
                        j === activeEntry ? "vn-active" : "",
                      )}
                    >
                      {entry.label}
                      {externalHint(entry.external)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <Link
        key={`${index}-${link.label}`}
        href={link.href}
        {...externalLinkProps(link.external)}
        aria-current={current ? "page" : undefined}
        className={cn(
          "vn-nav-link font-mono text-[10.5px] tracking-[0.22em] uppercase transition-colors",
          current ? "text-foreground vn-active" : "hover:text-foreground",
        )}
        style={{
          color: current ? activeColor : inactiveColor,
        }}
      >
        {link.label}
        {externalHint(link.external)}
      </Link>
    );
  };

  const renderMobileNavLink = (link: NavItem, i: number) => {
    const submenuId = `${mobileSubmenuId}-${i}`;
    const current = i === activeIndex;

    if (link.children?.length) {
      // The accordion button never navigates: a parent's own href is the
      // first entry of its sub-list (B3.3).
      const entries = navGroupEntries(link);
      const activeEntry = current ? activeEntryIndex(pathname, entries) : -1;

      return (
        <motion.li
          key={`${i}-${link.label}`}
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
              current ? "vn-mobile-nav-active" : "vn-mobile-nav-inactive",
            )}
          >
            {link.label}
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0",
                !reduce && "transition-transform duration-200",
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
                transition={{ duration: reduce ? 0 : 0.2 }}
                className="overflow-hidden"
              >
                <ul className="vn-mobile-nav-list pb-2">
                  {entries.map((entry, j) => (
                    <li key={`${j}-${entry.href}-${entry.label}`}>
                      <Link
                        href={entry.href}
                        {...externalLinkProps(entry.external)}
                        onClick={closeMobileMenu}
                        aria-current={j === activeEntry ? "page" : undefined}
                        className={cn(
                          "vn-mobile-nav-link vn-mobile-nav-link-child transition-colors",
                          j === activeEntry
                            ? "vn-mobile-nav-active"
                            : "vn-mobile-nav-inactive",
                        )}
                      >
                        {entry.label}
                        {externalHint(entry.external)}
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
        key={`${i}-${link.label}`}
        variants={mobileNavItemVariants}
        className="border-b"
        style={{ borderColor: "var(--vn-line-soft)" }}
      >
        <Link
          href={link.href}
          {...externalLinkProps(link.external)}
          onClick={closeMobileMenu}
          aria-current={current ? "page" : undefined}
          className={cn(
            "vn-mobile-nav-link transition-colors",
            current ? "vn-mobile-nav-active" : "vn-mobile-nav-inactive",
          )}
        >
          {link.label}
          {externalHint(link.external)}
        </Link>
      </motion.li>
    );
  };

  const leftNav = navItems.slice(0, leftCount);
  const rightNav = navItems.slice(leftCount);

  // Mobile tiles, each behind its own gate (B2.1/B7.4); the grid adapts to
  // however many survive. The account tile waits for the session so a
  // signed-in shopper never sees "Login" first.
  const showCartTile = cartEnabled;
  const showWishlistTile = wishlistEnabled;
  const showAccountTile = accountsEnabled && !isPending;
  const tileCount =
    Number(showCartTile) + Number(showWishlistTile) + Number(showAccountTile);

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
          {/* ── Left: mobile menu + the first half of the nav ── */}
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

            {leftNav.length > 0 ? (
              <nav
                className="hidden items-center gap-6 md:flex"
                aria-label="Primary navigation"
              >
                {leftNav.map((link, i) =>
                  renderDesktopNavLink(link, i, "left"),
                )}
              </nav>
            ) : null}
          </div>

          {/* ── Center: wordmark ── */}
          <Link href="/" className="vn-wordmark" aria-label="Home">
            {brand}
          </Link>

          {/* ── Right: the rest of the nav + account + wishlist + bag ── */}
          <div className="flex items-center justify-end gap-6">
            {rightNav.length > 0 ? (
              <nav
                className="hidden items-center gap-6 md:flex"
                aria-label={
                  leftNav.length > 0
                    ? "Secondary navigation"
                    : "Primary navigation"
                }
              >
                {rightNav.map((link, i) =>
                  renderDesktopNavLink(link, leftCount + i, "right"),
                )}
              </nav>
            ) : null}

            {accountsEnabled && (
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

            {wishlistEnabled && (
              <Link
                href="/wishlist"
                aria-label="Open wishlist"
                className="relative -m-3 flex items-center p-3 transition-opacity hover:opacity-60"
                style={{ color: "var(--vn-ink-soft)" }}
              >
                <Heart
                  className="h-[18px] w-[18px]"
                  strokeWidth={1.4}
                  aria-hidden
                />
                {wishlistHydrated && wishlistCount > 0 && (
                  <motion.span
                    aria-hidden="true"
                    initial={{ scale: reduce ? 1 : 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: reduce ? 0 : 0.2 }}
                    className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full font-mono text-[9px] font-semibold"
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

            {/* `cart` cascades off with `products` (B2.1/B7.4). */}
            {cartEnabled && (
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                aria-label={
                  itemCount > 0
                    ? `Open cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`
                    : "Open cart"
                }
                className="relative -m-3 flex items-center p-3 transition-opacity hover:opacity-60"
                style={{ color: "var(--vn-ink-soft)" }}
              >
                <ShoppingBag
                  className="h-[18px] w-[18px]"
                  strokeWidth={1.4}
                  aria-hidden
                />
                {itemCount > 0 && (
                  <motion.span
                    aria-hidden="true"
                    initial={{ scale: reduce ? 1 : 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: reduce ? 0 : 0.2 }}
                    className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full font-mono text-[9px] font-semibold"
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
            )}
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
                  {navItems.map((link, i) => renderMobileNavLink(link, i))}
                </motion.ul>
              </nav>

              {tileCount > 0 ? (
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
                        initial={{
                          opacity: reduce ? 1 : 0,
                          y: reduce ? 0 : 12,
                        }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 12 }}
                        transition={{ duration: reduce ? 0 : 0.2 }}
                        className="vn-mobile-account-panel absolute right-5 bottom-full left-5 mb-2 max-h-[calc(100dvh-12rem)] overflow-y-auto overscroll-contain rounded-none shadow-lg sm:right-6 sm:left-6"
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
                          {/* The FULL flag-gated list (B4.4), Admin last when
                            the shopper is staff, then Sign out. */}
                          {accountLinks.map((link, j) => {
                            const Icon =
                              MOBILE_ACCOUNT_ICONS[link.key] ?? Settings;
                            const active = j === activeAccountIndex;
                            return (
                              <li key={link.key}>
                                <Link
                                  href={link.href}
                                  onClick={closeMobileMenu}
                                  aria-current={active ? "page" : undefined}
                                  className={cn(
                                    "vn-mobile-nav-link vn-mobile-nav-link-child gap-3 px-4 transition-colors",
                                    active
                                      ? "text-[var(--vn-accent)]"
                                      : "text-[var(--vn-ink-soft)] hover:text-[var(--vn-ink)]",
                                  )}
                                  style={{
                                    background: active
                                      ? "var(--vn-line-soft)"
                                      : undefined,
                                  }}
                                >
                                  <Icon
                                    className="h-4 w-4 shrink-0"
                                    aria-hidden
                                  />
                                  {link.label}
                                </Link>
                              </li>
                            );
                          })}
                          <li
                            className="border-t"
                            style={{ borderColor: "var(--vn-line-soft)" }}
                          >
                            <Link
                              href={SIGN_OUT_HREF}
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

                  <div
                    className={cn(
                      "grid gap-3",
                      TILE_GRID_COLS[tileCount] ?? "grid-cols-3",
                    )}
                  >
                    {showCartTile && (
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
                    )}

                    {showWishlistTile && (
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

                    {/* Same `customerAccounts` gate as the desktop cluster, plus
                      a pending guard — this row is either the account menu or
                      a "Login" link, so rendering it before the session lands
                      shows a signed-in shopper the wrong one. */}
                    {showAccountTile &&
                      (session?.user ? (
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
                              "h-3.5 w-3.5",
                              !reduce && "transition-transform duration-200",
                              accountMenuOpen ? "rotate-180" : "",
                            )}
                            aria-hidden="true"
                          />
                        </button>
                      ) : (
                        <Link
                          href={SIGN_IN_HREF}
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
                      ))}
                  </div>
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <NoiseCartDrawer
        shippingConfig={shippingConfigFromBusiness(business)}
        copy={resolveNoiseCartCopy(customFields)}
      />
    </>
  );
}
