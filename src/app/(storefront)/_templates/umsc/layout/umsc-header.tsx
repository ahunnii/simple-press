"use client";

import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import {
  ChevronDown,
  Heart,
  Menu,
  Settings,
  ShoppingBag,
  User,
} from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { NavChild, NavItem } from "~/app/(storefront)/_components/nav";
import type { UserButtonLink } from "~/components/auth/user/user-button";
import { AUTH_BASE_PATHS, AUTH_VIEW_PATHS } from "~/lib/auth-paths";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { useReducedMotion } from "~/hooks/use-reduced-motion";
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

import { resolveFields } from "../index";
import { resolveUmscContactDetails } from "../shared/umsc-contact-details";
import {
  resolveUmscNav,
  UMSC_QUICK_ACCOUNT_KEYS,
  umscActiveItemIndex,
  umscHrefAllowed,
} from "./umsc-nav";
import { UmscNavDialog } from "./umsc-nav-dialog";

/** Icons for the desktop `UserButton` menu, keyed by `getAccountNavLinks` key. */
const ACCOUNT_LINK_ICONS: Record<string, ReactNode> = {
  orders: <IconPackage className="size-4" />,
  settings: <Settings className="size-4" />,
  admin: <IconLayoutDashboard className="size-4" />,
};

/** Screen-reader hint on links that open in a new tab. */
function externalHint(external?: boolean) {
  return external ? <span className="sr-only"> (opens in new tab)</span> : null;
}

const NAV_TEXT =
  "umsc-nav-link umsc-sans inline-flex items-center gap-1 py-2 text-[12px] font-semibold tracking-[0.13em] text-[var(--umsc-cream)] uppercase no-underline";

/**
 * Solid black sticky header (design.md "Chrome → Header").
 *
 * Nav: the owner's (Admin → Content → Navigation) or `UMSC_DEFAULT_NAV`,
 * flag-filtered once here (`resolveUmscNav`, P-NAV-FLAGS) and handed as the
 * same array to the mobile dialog. A parent with children is a dropdown whose
 * trigger is a button — it never navigates; the parent's own href (when set)
 * is the panel's first entry (`navGroupEntries`), so an empty-href group is a
 * label, not a dead link. Dropdowns open on hover AND focus, Enter/Space
 * toggles, ArrowDown opens and moves into the panel, Esc closes and returns
 * focus to the trigger. One current item across the bar (longest match,
 * `umscActiveItemIndex`); inside a panel one entry carries `aria-current`.
 */
export function UmscHeader({
  business,
  initialSession,
}: DefaultHeaderTemplateProps) {
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { data: session, isPending } = useHydratedSession(initialSession);
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  /** Index (into `links`) of the open desktop dropdown, if any. */
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [cartBump, setCartBump] = useState(false);
  const prevItemCount = useRef(itemCount);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (itemCount > prevItemCount.current) {
      setCartBump(true);
      const t = setTimeout(() => setCartBump(false), 320);
      prevItemCount.current = itemCount;
      return () => clearTimeout(t);
    }
    prevItemCount.current = itemCount;
  }, [itemCount]);

  // Close the dropdown on route change.
  useEffect(() => {
    passiveOpenRef.current = null;
    setOpenIndex(null);
  }, [pathname]);

  // Escape closes the open dropdown and returns focus to its trigger.
  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const trigger = triggerRefs.current.get(openIndex);
      passiveOpenRef.current = null;
      setOpenIndex(null);
      suppressFocusOpenRef.current = true;
      trigger?.focus();
      suppressFocusOpenRef.current = false;
    };
    // A pointer press outside closes it (hover-out alone misses tap-to-open).
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target?.closest("[data-umsc-dropdown]")) {
        passiveOpenRef.current = null;
        setOpenIndex(null);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [openIndex]);

  const { isEnabled } = useFeatureFlags({
    flags: (business?.featureFlags as Record<string, boolean>) ?? {},
  });
  const { isEnabled: isStorefrontEnabled } = useStorefrontFlags();
  const accountsEnabled = isStorefrontEnabled("customerAccounts");
  // `cart` depends on `products`, so this is off whenever products is.
  const cartEnabled = isEnabled("cart");

  // Owner nav (or the shipped default) minus links to flag-disabled routes.
  // Saved `[]` = no links (`resolveNav` never falls back on an empty list).
  const navigationItems = business?.siteContent?.navigationItems;
  const links = useMemo(
    () => resolveUmscNav(navigationItems, isEnabled),
    [navigationItems, isEnabled],
  );
  const activeIndex = umscActiveItemIndex(pathname, links);

  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const g = resolveFields(customFields, [
    "umsc.global.header-tagline",
    "umsc.global.nav-cta-label",
    "umsc.global.nav-cta-url",
  ]);
  const tagline = g["umsc.global.header-tagline"] ?? "Home essentials";
  // Settings → General phone; the retired `umsc.global.customer-service-phone`
  // field is only a silent legacy fallback (see `resolveUmscContactDetails`).
  const { phone } = resolveUmscContactDetails(business);

  // Mobile-menu pill. `resolveFields` already trims and falls back to the
  // declared default, so an owner-cleared label arrives as "" and hides the
  // pill; an unsafe/cleared URL collapses to "" and falls back to contact.
  // A URL pointing at a flag-disabled route hides the pill (B2.5) rather
  // than swapping in another destination.
  const navCtaUrl =
    (g["umsc.global.nav-cta-url"] ?? "") || "/contact?type=custom";
  const navCtaLabel = umscHrefAllowed(navCtaUrl, isEnabled)
    ? (g["umsc.global.nav-cta-label"] ?? "")
    : "";

  const businessName = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl;
  const logoAlt = resolveLogoAlt(
    business?.siteContent?.logoAltText,
    businessName,
  );
  const showAdminLink =
    session?.user?.platformRole === "PLATFORM_ADMIN" ||
    !!session?.session?.membershipId;

  // Avatar menu: the quick-access subset (Orders / Settings / Admin) of the
  // flag-gated account links (B4.3, decision 2026-09-28), then UserButton's
  // own Sign out. Its built-in Settings item is hidden so Settings comes from
  // the same shared list as everything else.
  const userButtonLinks: UserButtonLink[] = getAccountNavLinks({
    isEnabled,
    includeAdmin: showAdminLink,
  })
    .filter((link) => UMSC_QUICK_ACCOUNT_KEYS.has(link.key))
    .map((link) => ({
      label: link.label,
      href: link.href,
      icon: ACCOUNT_LINK_ICONS[link.key],
    }));

  const closeMobile = useCallback(() => setMobileOpen(false), []);

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

  /** Hover + focus-within handling for a dropdown group. */
  const dropdownWrapperProps = (index: number) => ({
    "data-umsc-dropdown": true,
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

  const brand = (
    <span className="flex items-center gap-3">
      <span className="relative size-[52px] shrink-0 overflow-hidden rounded-full border border-[var(--umsc-line-gold)]">
        <Image
          src={logoUrl ?? "/placeholder.svg"}
          alt={logoAlt}
          fill
          sizes="52px"
          className="object-cover"
        />
      </span>
      <span className="flex flex-col items-start">
        <span className="umsc-serif text-[24px] leading-none text-[var(--umsc-gold-soft)]">
          {businessName}
        </span>
        {tagline && (
          <span
            {...fieldAttr("umsc.global.header-tagline")}
            className="umsc-sans mt-1 text-[11px] tracking-[0.08em] text-[var(--umsc-cream-on-black)] uppercase"
          >
            {tagline}
          </span>
        )}
      </span>
    </span>
  );

  const renderGroup = (item: NavItem, index: number, current: boolean) => {
    const isOpen = openIndex === index;
    const entries: NavChild[] = navGroupEntries(item);
    const activeEntry = current ? activeEntryIndex(pathname, entries) : -1;

    return (
      <div
        key={`${index}-${item.label}`}
        className="relative flex items-center"
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
          data-current={current ? "true" : undefined}
          onClick={() => onTriggerClick(index, isOpen)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              openWithFocus(index);
            }
          }}
          className={cn(NAV_TEXT, "cursor-pointer border-0 bg-transparent")}
        >
          {item.label}
          <ChevronDown
            className={cn(
              "size-3",
              !reduced && "transition-transform duration-200",
              isOpen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>

        {isOpen ? (
          // `pt-2` bridges the gap so the pointer can travel into the panel
          // without leaving the hover group.
          <div
            id={panelIdFor(index)}
            className="absolute top-full left-0 z-10 pt-2"
          >
            <ul className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 m-0 min-w-[200px] list-none border border-[var(--umsc-line-gold)] bg-[var(--umsc-black)] p-0 py-2 motion-safe:duration-200">
              {entries.map((entry, j) => (
                <li key={`${j}-${entry.href}-${entry.label}`}>
                  <Link
                    href={entry.href}
                    {...externalLinkProps(entry.external)}
                    aria-current={j === activeEntry ? "page" : undefined}
                    data-current={j === activeEntry ? "true" : undefined}
                    onClick={closeDropdown}
                    className="umsc-sans flex min-h-[44px] items-center px-4 text-[12px] tracking-[0.1em] whitespace-nowrap text-[var(--umsc-cream-on-black)] uppercase no-underline transition-colors duration-200 hover:text-[var(--umsc-gold-soft)] focus-visible:text-[var(--umsc-gold-soft)] data-[current=true]:text-[var(--umsc-gold-soft)]"
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
  };

  const renderDesktopLink = (item: NavItem, index: number) => {
    const current = index === activeIndex;
    if (item.children?.length) return renderGroup(item, index, current);

    return (
      <Link
        key={`${index}-${item.label}`}
        href={item.href}
        {...externalLinkProps(item.external)}
        aria-current={current ? "page" : undefined}
        data-current={current ? "true" : undefined}
        className={NAV_TEXT}
      >
        {item.label}
        {externalHint(item.external)}
      </Link>
    );
  };

  return (
    <>
      <header
        {...sectionGroupAttr("global", "branding")}
        className="umsc-header sticky top-0 z-50 w-full bg-[var(--umsc-black)]"
      >
        <div
          className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-6 px-6 transition-[padding] duration-[250ms] sm:px-8"
          style={{ paddingBlock: scrolled ? "10px" : "18px" }}
        >
          <div className="flex items-center gap-3">
            <button
              ref={hamburgerRef}
              type="button"
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={mobileOpen}
              aria-controls={mobileMenuId}
              onClick={() => setMobileOpen(true)}
              className="flex size-[44px] items-center justify-center text-[var(--umsc-cream)] min-[960px]:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <Link
              href="/"
              aria-label={`${businessName} — Home`}
              className="shrink-0"
            >
              {brand}
            </Link>
          </div>

          {links.length > 0 ? (
            <nav
              className="hidden items-center gap-8 min-[960px]:flex"
              aria-label="Primary navigation"
            >
              {links.map(renderDesktopLink)}
            </nav>
          ) : null}

          <div className="flex items-center gap-5">
            {accountsEnabled && (
              <div className="hidden min-[960px]:block">
                {isPending ? (
                  <div className="size-7 animate-pulse rounded-full bg-[var(--umsc-line-gold)]" />
                ) : session?.user ? (
                  <UserButton
                    size="icon"
                    className="h-auto w-auto rounded-full p-0"
                    avatarClassName="size-7 ring-1 ring-[var(--umsc-gold)] ring-offset-1 ring-offset-transparent"
                    links={userButtonLinks}
                    hideSettings
                  />
                ) : (
                  <Link
                    href={`${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signIn}`}
                    aria-label="Sign in to your account"
                    className="-m-2 flex items-center justify-center p-2 text-[var(--umsc-cream)]"
                  >
                    <User
                      className="size-[18px]"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </Link>
                )}
              </div>
            )}

            {isStorefrontEnabled("wishlist") && (
              <Link
                href="/wishlist"
                aria-label={
                  wishlistCount > 0
                    ? `View wishlist, ${wishlistCount} items`
                    : "View wishlist"
                }
                className="relative -m-2 hidden items-center justify-center p-2 text-[var(--umsc-cream)] min-[960px]:flex"
              >
                <Heart
                  className="size-[18px]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                {wishlistCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="umsc-sans absolute top-0 right-0 flex size-4 items-center justify-center rounded-full bg-[var(--umsc-gold)] text-[9px] font-semibold text-[var(--umsc-black)]"
                  >
                    {wishlistCount}
                  </span>
                )}
              </Link>
            )}

            {cartEnabled && (
              <Link
                href="/cart"
                aria-label={
                  itemCount > 0 ? `View cart, ${itemCount} items` : "View cart"
                }
                className="relative -m-2 flex items-center justify-center p-2 text-[var(--umsc-cream)]"
              >
                <ShoppingBag
                  className="size-[18px]"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                {itemCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="umsc-cart-badge umsc-sans absolute top-0 right-0 flex size-4 items-center justify-center rounded-full bg-[var(--umsc-gold)] text-[9px] font-semibold text-[var(--umsc-black)]"
                    data-bump={cartBump || undefined}
                  >
                    {itemCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      <UmscNavDialog
        id={mobileMenuId}
        open={mobileOpen}
        onClose={closeMobile}
        links={links}
        activeIndex={activeIndex}
        businessName={businessName}
        brand={brand}
        phone={phone}
        triggerRef={hamburgerRef}
        initialSession={initialSession}
        accountsEnabled={accountsEnabled}
        isEnabled={isEnabled}
        wishlistEnabled={isStorefrontEnabled("wishlist")}
        wishlistCount={wishlistCount}
        ctaLabel={navCtaLabel}
        ctaUrl={navCtaUrl}
      />
    </>
  );
}
