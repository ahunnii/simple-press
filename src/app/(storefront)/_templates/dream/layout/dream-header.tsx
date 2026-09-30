"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { ChevronDown, Menu, ShoppingBag } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { NavItem } from "~/app/(storefront)/_components/nav";
import type { UserButtonLink } from "~/components/auth/user/user-button";
import { AUTH_BASE_PATHS, AUTH_VIEW_PATHS } from "~/lib/auth-paths";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { isActiveNavLink } from "~/lib/nav-utils";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { UserButton } from "~/components/auth/user/user-button";
import { useCart } from "~/providers/cart-context";
import {
  activeEntryIndex,
  externalLinkProps,
  getAccountNavLinks,
  isNavItemActive,
  navGroupEntries,
} from "~/app/(storefront)/_components/nav";

import { resolveDreamFields } from "../lib/resolve-fields";
import {
  DREAM_QUICK_ACCOUNT_KEYS,
  dreamCtaHref,
  resolveDreamNav,
} from "./dream-nav";
import { DreamNavOverlay } from "./dream-nav-overlay";

type DreamHeaderProps = DefaultHeaderTemplateProps & {
  /** Owner nav (or dream's shipped defaults), already flag-filtered by the
   *  layout — the same array feeds the overlay and the footer. When omitted
   *  the header resolves the same list itself. */
  navItems?: NavItem[];
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
 * Sticky translucent header (design.md "Chrome › Header"). Desktop is a single
 * flex row: logo then the Admin → Content → Navigation links on the left, and
 * — pushed right by `margin-left:auto` — the account slot ("Sign in" when
 * logged out, `UserButton` when signed in) followed by the Estimate Quote CTA
 * pill. Nav entries with children open a hover/click dropdown whose first
 * entry is the parent's own href (`navGroupEntries` — the trigger never
 * navigates); Escape closes it and returns focus to its trigger.
 *
 * The cart link sits at the far right at every width. Dream has no cart
 * drawer, so it goes straight to `/cart`. It only shows while the `cart` flag
 * is on AND the store has a published product or the shopper already has
 * something in the cart, so a services-only store never gets an empty cart
 * icon.
 *
 * Below 960px only the logo, the cart link, and the hamburger show; the
 * hamburger opens
 * `DreamNavOverlay`. The breakpoint and the mobile/desktop flex switch live in
 * the scoped `.dream-header-*` CSS in globals.css, not Tailwind responsive
 * classes, so the 960px number lives in exactly one place.
 */
export function DreamHeader({
  business,
  initialSession,
  navItems: navItemsProp,
}: DreamHeaderProps) {
  const [open, setOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const pathname = usePathname();
  const { data: session, isPending } = useHydratedSession(
    initialSession ?? null,
  );

  const { isEnabled } = useFeatureFlags({
    flags: (business?.featureFlags as Record<string, boolean>) ?? {},
  });
  const accountsEnabled = isEnabled("customerAccounts");
  const { itemCount } = useCart();
  const showCart =
    isEnabled("cart") &&
    ((business?.products?.length ?? 0) > 0 || itemCount > 0);

  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const f = resolveDreamFields(customFields, [
    "dream.global.header-cta-label",
    "dream.global.header-cta-url",
  ]);
  // A blank label, an unsafe/blank link (resolved to ""), or a link into a
  // flag-disabled feature (B2.5) hides the pill.
  const ctaLabel = f["dream.global.header-cta-label"] ?? "";
  const ctaUrl = dreamCtaHref(
    f["dream.global.header-cta-url"] ?? "",
    isEnabled,
  );

  const businessName = business?.name ?? "";
  const logoUrl =
    business?.siteContent?.logoUrl ?? "/templates/dream/images/logo.webp";
  const logoAlt = resolveLogoAlt(
    business?.siteContent?.logoAltText,
    businessName,
  );

  const showAdminLink =
    session?.user?.platformRole === "PLATFORM_ADMIN" ||
    !!session?.session?.membershipId;

  // Desktop avatar menu: the quick-access subset of the flag-gated account
  // links (B4.3) — Orders only while `orders` is on. Settings is dropped
  // here because `UserButton` renders its own built-in Settings item.
  const userButtonLinks: UserButtonLink[] = getAccountNavLinks({
    isEnabled,
    includeAdmin: showAdminLink,
  })
    .filter(
      (link) =>
        DREAM_QUICK_ACCOUNT_KEYS.has(link.key) && link.key !== "settings",
    )
    .map((link) => ({
      label: link.label,
      href: link.href,
      icon: ACCOUNT_LINK_ICONS[link.key],
    }));

  const navItems =
    navItemsProp ??
    resolveDreamNav(
      business?.siteContent?.navigationItems,
      customFields,
      isEnabled,
    );

  // Escape closes the open dropdown and returns focus to its trigger — the
  // focused entry unmounts with the panel, which would otherwise drop focus
  // to <body>.
  useEffect(() => {
    if (openDropdown === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const trigger = triggerRefs.current.get(openDropdown);
      const wrapper = trigger?.parentElement;
      // Only steal focus back when it was inside this dropdown; a hover-open
      // closed with Escape leaves focus wherever the shopper had it.
      if (wrapper?.contains(document.activeElement)) trigger?.focus();
      setOpenDropdown(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openDropdown]);

  const renderNavItem = (item: NavItem, i: number) => {
    if (item.children?.length) {
      const active = isNavItemActive(pathname, item);
      const entries = navGroupEntries(item);
      const activeEntry = activeEntryIndex(pathname, entries);
      const dropdownId = `dream-nav-dropdown-${i}`;
      const isOpen = openDropdown === i;

      return (
        <div
          key={`${i}-${item.href}`}
          className="dream-header-dropdown-wrap"
          onMouseEnter={() => setOpenDropdown(i)}
          onMouseLeave={() => setOpenDropdown(null)}
          onBlur={(e) => {
            // Close once focus has left the wrapper entirely.
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setOpenDropdown((current) => (current === i ? null : current));
            }
          }}
        >
          {/* The trigger never navigates — a non-empty parent href is the
              panel's first entry. Active styling, but no aria-current. */}
          <button
            ref={(el) => {
              if (el) triggerRefs.current.set(i, el);
              else triggerRefs.current.delete(i);
            }}
            type="button"
            className="dream-header-link dream-header-dropdown-trigger"
            aria-haspopup="true"
            aria-expanded={isOpen}
            aria-controls={dropdownId}
            data-active={active ? "true" : undefined}
            onClick={() => setOpenDropdown(isOpen ? null : i)}
          >
            {item.label}
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          </button>

          {isOpen ? (
            <div id={dropdownId} className="dream-header-dropdown" role="group">
              {entries.map((entry, j) => (
                <Link
                  key={`${j}-${entry.href}`}
                  href={entry.href}
                  {...externalLinkProps(entry.external)}
                  aria-current={j === activeEntry ? "page" : undefined}
                  onClick={() => setOpenDropdown(null)}
                  className="dream-header-dropdown-link"
                >
                  {entry.label}
                  {externalHint(entry.external)}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      );
    }

    const active = isActiveNavLink(pathname, item.href);
    return (
      <Link
        key={`${i}-${item.href}`}
        href={item.href}
        {...externalLinkProps(item.external)}
        aria-current={active ? "page" : undefined}
        data-active={active ? "true" : undefined}
        className="dream-header-link"
      >
        {item.label}
        {externalHint(item.external)}
      </Link>
    );
  };

  return (
    <>
      <header
        className="dream-header"
        {...sectionGroupAttr("global", "branding")}
      >
        <div className="dream-header-inner">
          <Link
            href="/"
            aria-label={`${businessName} — Home`}
            className="dream-header-logo"
          >
            <img
              src={logoUrl}
              alt={logoAlt}
              className="dream-header-logo-img"
              decoding="async"
              fetchPriority="high"
            />
          </Link>

          <div className="dream-header-cell dream-header-cell--left">
            <nav className="dream-header-links" aria-label="Primary">
              {navItems.map(renderNavItem)}
            </nav>
          </div>

          <div className="dream-header-cell dream-header-cell--right">
            {!isPending && session?.user ? (
              <UserButton
                size="icon"
                className="dream-header-user"
                avatarClassName="size-8"
                links={userButtonLinks}
              />
            ) : null}

            {accountsEnabled && !isPending && !session?.user ? (
              <Link
                href={`${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signIn}`}
                className="dream-header-link dream-header-signin"
              >
                Sign in
              </Link>
            ) : null}

            {ctaLabel && ctaUrl ? (
              <Link
                href={ctaUrl}
                className="dream-btn dream-btn--secondary dream-header-cta"
                {...fieldAttr("dream.global.header-cta-label")}
              >
                {ctaLabel}
              </Link>
            ) : null}
          </div>

          {/* A direct child of the inner bar so it survives the right cell
              being display:none below 960px. The cart shows at every width;
              the hamburger is mobile-only. */}
          <div className="dream-header-actions">
            {showCart ? (
              <Link
                href="/cart"
                aria-label={
                  itemCount > 0
                    ? `Cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`
                    : "Cart"
                }
                aria-current={pathname === "/cart" ? "page" : undefined}
                className="dream-header-cart"
              >
                <ShoppingBag
                  className="h-5 w-5"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                {itemCount > 0 ? (
                  <span className="dream-header-cart-count" aria-hidden="true">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                ) : null}
              </Link>
            ) : null}

            <button
              ref={hamburgerRef}
              type="button"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className="dream-header-hamburger"
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <DreamNavOverlay
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={hamburgerRef}
        items={navItems}
        businessName={businessName}
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        ctaLabel={ctaLabel}
        ctaUrl={ctaUrl}
        socialLinks={business?.siteContent?.socialLinks}
        initialSession={initialSession}
        accountsEnabled={accountsEnabled}
        isEnabled={isEnabled}
      />
    </>
  );
}
