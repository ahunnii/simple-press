"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { IconLayoutDashboard, IconPackage } from "@tabler/icons-react";
import { Menu } from "lucide-react";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { DreamNavItem } from "./dream-nav-overlay";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { UserButton } from "~/components/auth/user/user-button";

import { resolveDreamFields } from "../lib/resolve-fields";
import { DreamNavOverlay } from "./dream-nav-overlay";

/**
 * Sticky translucent header (design.md "Chrome › Header"): desktop grid
 * `1fr auto 1fr` — Services · Gallery left, mini logo centered, About +
 * Estimate Quote pill right (UserButton before the pill when signed in).
 * Below 960px collapses to logo left / hamburger right, opening
 * `DreamNavOverlay`. The breakpoint and grid/flex switch live in the scoped
 * `.dream-header-*` CSS in globals.css, not Tailwind responsive classes, so
 * the 960px number lives in exactly one place.
 */
export function DreamHeader({
  business,
  initialSession,
}: DefaultHeaderTemplateProps) {
  const [open, setOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
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
    "dream.global.gallery-link-url",
    "dream.global.header-cta-label",
    "dream.global.header-cta-url",
  ]);
  const galleryUrl = f["dream.global.gallery-link-url"] ?? "/#gallery";
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

  const navItems: DreamNavItem[] = [
    { label: "Services", href: "/services" },
    { label: "Gallery", href: galleryUrl },
    { label: "About", href: "/about" },
  ];

  return (
    <>
      <header
        className="dream-header"
        {...sectionGroupAttr("global", "branding")}
      >
        <div className="dream-header-inner">
          <div className="dream-header-cell dream-header-cell--left">
            <nav className="dream-header-links" aria-label="Primary">
              <Link href="/services" className="dream-header-link">
                Services
              </Link>
              <Link href={galleryUrl} className="dream-header-link">
                Gallery
              </Link>
            </nav>
          </div>

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

          <div className="dream-header-cell dream-header-cell--right">
            <nav className="dream-header-links" aria-label="Secondary">
              <Link href="/about" className="dream-header-link">
                About
              </Link>
            </nav>

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
        initialSession={initialSession}
        accountsEnabled={accountsEnabled}
        ordersEnabled={ordersEnabled}
      />
    </>
  );
}
