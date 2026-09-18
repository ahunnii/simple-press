"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { ChevronDown, Menu } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { DreamNavItem } from "../lib/nav";
import { AUTH_BASE_PATHS, AUTH_VIEW_PATHS } from "~/lib/auth-paths";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { UserButton } from "~/components/auth/user/user-button";

import { isDreamNavActive, resolveDreamNav } from "../lib/nav";
import { resolveDreamFields } from "../lib/resolve-fields";
import { DreamNavOverlay } from "./dream-nav-overlay";

/**
 * Sticky translucent header (design.md "Chrome › Header"). Desktop is a single
 * flex row: logo then the Admin → Content → Navigation links on the left, and
 * — pushed right by `margin-left:auto` — the account slot ("Sign in" when
 * logged out, `UserButton` when signed in) followed by the Estimate Quote CTA
 * pill. Nav entries with children open a hover/click dropdown.
 *
 * Below 960px only the logo and the hamburger show; the hamburger opens
 * `DreamNavOverlay`. The breakpoint and the mobile/desktop flex switch live in
 * the scoped `.dream-header-*` CSS in globals.css, not Tailwind responsive
 * classes, so the 960px number lives in exactly one place.
 */
export function DreamHeader({
  business,
  initialSession,
}: DefaultHeaderTemplateProps) {
  const [open, setOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const { data: session, isPending } = useHydratedSession(
    initialSession ?? null,
  );

  const { isEnabled } = useFeatureFlags({
    flags: (business?.featureFlags as Record<string, boolean>) ?? {},
  });
  const accountsEnabled = isEnabled("customerAccounts");
  const ordersEnabled = isEnabled("orders");

  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const f = resolveDreamFields(customFields, [
    "dream.global.header-cta-label",
    "dream.global.header-cta-url",
  ]);
  const ctaLabel = f["dream.global.header-cta-label"] ?? "Estimate Quote";
  const ctaUrl = f["dream.global.header-cta-url"] ?? "/contact";

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

  const navItems = resolveDreamNav(business?.siteContent?.navigationItems);

  const renderNavItem = (item: DreamNavItem, i: number) => {
    if (item.children?.length) {
      const childActive = item.children.some((child) =>
        isDreamNavActive(pathname, child.href),
      );
      const active = childActive || isDreamNavActive(pathname, item.href);
      const dropdownId = `dream-nav-dropdown-${i}`;
      const isOpen = openDropdown === i;

      return (
        <div
          key={item.href + item.label}
          className="dream-header-dropdown-wrap"
          onMouseEnter={() => setOpenDropdown(i)}
          onMouseLeave={() => setOpenDropdown(null)}
          onBlur={(e) => {
            // Close once focus has left the wrapper entirely.
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setOpenDropdown(null);
            }
          }}
          onKeyDown={(e) => {
            // Escape closes but leaves focus on the trigger inside the wrapper.
            if (e.key === "Escape" && openDropdown === i) {
              e.stopPropagation();
              setOpenDropdown(null);
            }
          }}
        >
          <button
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
              {item.children.map((child) => {
                const childIsActive = isDreamNavActive(pathname, child.href);
                return (
                  <Link
                    key={child.href + child.label}
                    href={child.href}
                    target={child.external ? "_blank" : undefined}
                    rel={child.external ? "noopener noreferrer" : undefined}
                    aria-current={childIsActive ? "page" : undefined}
                    onClick={() => setOpenDropdown(null)}
                    className="dream-header-dropdown-link"
                  >
                    {child.label}
                    {child.external ? (
                      <span className="sr-only"> (opens in new tab)</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      );
    }

    const active = isDreamNavActive(pathname, item.href);
    return (
      <Link
        key={item.href + item.label}
        href={item.href}
        target={item.external ? "_blank" : undefined}
        rel={item.external ? "noopener noreferrer" : undefined}
        aria-current={active ? "page" : undefined}
        data-active={active ? "true" : undefined}
        className="dream-header-link"
      >
        {item.label}
        {item.external ? (
          <span className="sr-only"> (opens in new tab)</span>
        ) : null}
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
                links={[
                  ...(ordersEnabled
                    ? [
                        {
                          icon: <IconPackage className="h-4 w-4" />,
                          label: "Orders",
                          href: "/account/orders",
                        },
                      ]
                    : []),
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
            ) : null}

            {accountsEnabled && !isPending && !session?.user ? (
              <Link
                href={`${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signIn}`}
                className="dream-header-link dream-header-signin"
              >
                Sign in
              </Link>
            ) : null}

            <Link
              href={ctaUrl}
              className="dream-btn dream-btn--secondary dream-header-cta"
            >
              {ctaLabel}
            </Link>
          </div>

          {/* Mobile-only: a direct child of the inner bar so it survives the
              right cell being display:none below 960px. */}
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
        ordersEnabled={ordersEnabled}
      />
    </>
  );
}
