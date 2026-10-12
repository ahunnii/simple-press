"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, UserRound } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { UserButtonLink } from "~/components/auth/user/user-button";
import type { BannerConfig } from "~/lib/validators/site-banner";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { resolveSocialLinks } from "~/lib/social-links";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { UserButton } from "~/components/auth/user/user-button";
import {
  activeEntryIndex,
  donateLinkOptions,
  externalLinkProps,
  filterNavByFlags,
  getAccountNavLinks,
  isNavItemActive,
  navGroupEntries,
  resolveNav,
} from "~/app/(storefront)/_components/nav";
import { useNavDropdown } from "~/app/(storefront)/_components/nav/use-nav-dropdown";

import { resolveWealthFields } from "../lib/resolve-fields";
import { wealthLedgeButtonClasses } from "../shared/wealth-ledge-button";
import { WealthAnnouncementBar } from "./wealth-announcement-bar";
import { wealthNavDefaults } from "./wealth-nav";
import { WEALTH_NAV_OVERLAY_ID, WealthNavOverlay } from "./wealth-nav-overlay";

const DEFAULT_LOGO = "/templates/wealth/images/logo.png";

/** Icons for the desktop `UserButton` menu, keyed by `getAccountNavLinks` key. */
const ACCOUNT_LINK_ICONS: Record<string, React.ReactNode> = {
  orders: <Package className="h-4 w-4" />,
  admin: <LayoutDashboard className="h-4 w-4" />,
};

const externalHint = <span className="sr-only"> (opens in new tab)</span>;

function Chevron() {
  return (
    <svg
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M1.5 3.5L5 7l3.5-3.5" />
    </svg>
  );
}

/**
 * Wealth redesign header (design.md Chrome "Redesign"): white, sticky,
 * 77px / 97px incl. hairline.
 * - ≥1100px: logo left · inline nav with dropdowns (shared `useNavDropdown`:
 *   hover + click + keyboard, Esc / outside-pointer / route-change close) ·
 *   account entry · DONATE ledge button.
 * - <1100px: hamburger left · logo centered · DONATE right; the hamburger
 *   opens `WealthNavOverlay`, fed from the same resolved nav.
 *
 * Nav = `filterNavByFlags(resolveNav(navigationItems, defaults), isEnabled)`.
 * Donate is a chrome CTA (Pink's pattern), never appended to the inline nav;
 * it hides when the owner already put /donate in their own menu.
 */
export function WealthHeader({
  business,
  initialSession,
  banner,
  hasImpactPage = true,
}: DefaultHeaderTemplateProps & {
  banner?: BannerConfig | null;
  /** Server-computed (layout): is there a published `/impact` page? Drives the
   *  default nav only; an owner-saved menu is never filtered by it. */
  hasImpactPage?: boolean;
}) {
  const pathname = usePathname();
  const dd = useNavDropdown(pathname, "wealth-nav");
  const [open, setOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const { data: session, isPending } = useHydratedSession(initialSession);

  // Same resolved flags every wealth chrome piece reads (business prop →
  // resolveFlags, dependsOn cascades applied).
  const { isEnabled } = useFeatureFlags({
    flags: (business?.featureFlags as Record<string, boolean>) ?? {},
  });

  const f = resolveWealthFields(business?.siteContent?.customFields, [
    "wealth.global.nav-resources-url",
  ]);
  const resourcesUrl = f["wealth.global.nav-resources-url"] ?? "/resources";

  const nav = filterNavByFlags(
    resolveNav(
      business?.siteContent?.navigationItems,
      wealthNavDefaults(resourcesUrl, hasImpactPage),
    ),
    isEnabled,
  );

  const donate = donateLinkOptions(business, isEnabled, "header");
  const navHasDonate = nav.some(
    (item) =>
      item.href === "/donate" ||
      (item.children?.some((c) => c.href === "/donate") ?? false),
  );
  const showDonate = donate.show && !navHasDonate;

  const businessName = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl ?? DEFAULT_LOGO;
  const logoAlt = resolveLogoAlt(
    business?.siteContent?.logoAltText,
    businessName,
  );
  const social = resolveSocialLinks(business?.siteContent?.socialLinks);

  const accountsEnabled = isEnabled("customerAccounts");
  const user = session?.user;
  const isAdmin =
    user?.platformRole === "PLATFORM_ADMIN" || !!session?.session?.membershipId;
  // Settings is dropped: `UserButton` renders its own built-in Settings item.
  const userButtonLinks: UserButtonLink[] = getAccountNavLinks({
    isEnabled,
    includeAdmin: isAdmin,
  })
    .filter((link) => link.key !== "settings")
    .map((link) => ({
      label: link.label,
      href: link.href,
      icon: ACCOUNT_LINK_ICONS[link.key],
    }));

  const logo = (
    <Link
      href="/"
      className="wealth-header__logo"
      aria-current={pathname === "/" ? "page" : undefined}
    >
      {logoUrl ? (
        <Image src={logoUrl} alt={logoAlt} fill sizes="176px" priority />
      ) : (
        <span className="wealth-header__logo-text">{businessName}</span>
      )}
    </Link>
  );

  return (
    <>
      {banner ? <WealthAnnouncementBar banner={banner} /> : null}

      <header
        className="wealth-header"
        {...sectionGroupAttr("global", "branding")}
      >
        <div className="wealth-container wealth-header__bar">
          <button
            ref={hamburgerRef}
            type="button"
            className="wealth-burger"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls={open ? WEALTH_NAV_OVERLAY_ID : undefined}
            onClick={() => setOpen(true)}
          >
            <svg
              viewBox="0 0 26 26"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M3 9h20M3 17h20" />
            </svg>
          </button>

          {logo}

          <nav className="wealth-nav" aria-label="Main">
            <ul
              ref={dd.containerRef as React.RefObject<HTMLUListElement | null>}
              className="wealth-nav__list"
            >
              {nav.map((item, i) => {
                if (item.children?.length) {
                  const isOpen = dd.openIndex === i;
                  const entries = navGroupEntries(item);
                  const activeEntry = activeEntryIndex(pathname, entries);
                  const groupActive = isNavItemActive(pathname, item);
                  return (
                    <li
                      key={`${item.label}-${i}`}
                      className="wealth-nav__item"
                      data-open={isOpen ? "true" : undefined}
                      {...dd.groupProps(i)}
                    >
                      {/* The trigger never navigates; a non-empty parent
                          href is the panel's first entry. */}
                      <button
                        {...dd.triggerProps(i)}
                        className="wealth-nav__trigger"
                        data-active={groupActive ? "true" : undefined}
                      >
                        {item.label}
                        <Chevron />
                      </button>
                      <ul id={dd.panelId(i)} className="wealth-nav__menu">
                        {entries.map((child, j) => (
                          <li key={`${child.href}-${j}`}>
                            <Link
                              href={child.href}
                              {...externalLinkProps(child.external)}
                              aria-current={
                                j === activeEntry ? "page" : undefined
                              }
                              onClick={() => dd.close()}
                            >
                              <span>
                                {child.label}
                                {child.external ? externalHint : null}
                              </span>
                              {child.external ? (
                                <span
                                  className="wealth-nav__ext"
                                  aria-hidden="true"
                                >
                                  &#8599;
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                }

                const active = isNavItemActive(pathname, item);
                return (
                  <li key={`${item.label}-${i}`} className="wealth-nav__item">
                    <Link
                      href={item.href}
                      {...externalLinkProps(item.external)}
                      aria-current={active ? "page" : undefined}
                      className="wealth-nav__link"
                    >
                      {item.label}
                      {item.external ? (
                        <>
                          <span className="wealth-nav__ext" aria-hidden="true">
                            &#8599;
                          </span>
                          {externalHint}
                        </>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="wealth-header__end">
            {/* Desktop account entry (B4); on phones it lives in the overlay. */}
            {accountsEnabled ? (
              <div className="wealth-header__account">
                {isPending ? (
                  <span
                    className="wealth-header__account-pending"
                    aria-hidden="true"
                  />
                ) : user ? (
                  <UserButton
                    size="icon"
                    avatarClassName="size-10"
                    links={userButtonLinks}
                  />
                ) : (
                  <Link
                    href="/auth/sign-in"
                    className="wealth-header__signin"
                    aria-label="Sign in"
                  >
                    <UserRound aria-hidden="true" strokeWidth={1.5} />
                  </Link>
                )}
              </div>
            ) : null}

            {showDonate ? (
              <Link
                href="/donate"
                className={wealthLedgeButtonClasses({
                  variant: "donate",
                  className: "wealth-header__donate",
                })}
                aria-current={pathname === "/donate" ? "page" : undefined}
              >
                {donate.label}
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <WealthNavOverlay
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={hamburgerRef}
        items={nav}
        donate={showDonate ? { label: donate.label, href: "/donate" } : null}
        businessName={businessName}
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        social={social}
        initialSession={initialSession}
        isEnabled={isEnabled}
        accountsEnabled={accountsEnabled}
      />
    </>
  );
}
