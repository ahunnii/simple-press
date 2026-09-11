"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import type { DefaultHeaderTemplateProps } from "../../types";
import type { BannerConfig } from "~/lib/validators/site-banner";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";

import { resolveWealthFields } from "../lib/resolve-fields";
import { WealthAnnouncementBar } from "./wealth-announcement-bar";
import type { WealthNavItem } from "./wealth-nav-overlay";
import { WealthNavOverlay } from "./wealth-nav-overlay";

export function WealthHeader({
  business,
  initialSession,
  banner,
}: DefaultHeaderTemplateProps & { banner?: BannerConfig | null }) {
  const [open, setOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // Flags come from `business.featureFlags` — already loaded with the
  // business prop, so gating donate/services links here is free (no extra
  // fetch), following the same client-side pattern `vii-header.tsx` uses
  // for its `products`/`blog` nav gates.
  const { isEnabled } = useFeatureFlags({
    flags: (business?.featureFlags as Record<string, boolean>) ?? {},
  });

  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const f = resolveWealthFields(customFields, ["wealth.global.nav-resources-url"]);
  const resourcesUrl = f["wealth.global.nav-resources-url"] ?? "/resources";

  const businessName = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl ?? "/templates/wealth/images/logo.png";
  const logoAlt = resolveLogoAlt(business?.siteContent?.logoAltText, businessName);

  const socialLinks = business?.siteContent?.socialLinks as
    | { facebook?: string; instagram?: string }
    | undefined;

  const navItems: WealthNavItem[] = [
    { type: "link", label: "Home", href: "/" },
    { type: "link", label: "About Us", href: "/about" },
    {
      type: "group",
      label: "News & Resources",
      children: [
        { label: "Resources", href: resourcesUrl },
        { label: "News", href: "/blog" },
      ],
    },
    ...(isEnabled("services")
      ? [
          {
            type: "group" as const,
            label: "Programs",
            children: [
              { label: "All Programs", href: "/services" },
              {
                label: "CEND",
                href: "https://www.cendetroit.com",
                external: true,
              },
            ],
          },
        ]
      : [
          {
            type: "group" as const,
            label: "Programs",
            children: [
              {
                label: "CEND",
                href: "https://www.cendetroit.com",
                external: true,
              },
            ],
          },
        ]),
    { type: "link", label: "Contact & Office Hours", href: "/contact" },
    ...(isEnabled("donations")
      ? [{ type: "link" as const, label: "Support DCWF", href: "/donate" }]
      : []),
  ];

  return (
    <>
      <header
        className="relative z-50 w-full bg-[var(--wealth-paper)]"
        {...sectionGroupAttr("global", "branding")}
      >
        {banner ? <WealthAnnouncementBar banner={banner} /> : null}

        <div
          className="mx-auto flex w-full items-center justify-between gap-4 px-[var(--wealth-gutter)] [height:var(--wealth-header-h-mobile)] md:[height:var(--wealth-header-h)]"
          style={{ maxWidth: "var(--wealth-container)" }}
        >
          {/* Left: hamburger */}
          <button
            ref={hamburgerRef}
            type="button"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="flex flex-col justify-center gap-[5px] p-2"
            style={{ background: "transparent", border: "none", cursor: "pointer" }}
          >
            <span
              aria-hidden="true"
              className="block h-px w-6"
              style={{ background: "var(--wealth-ink)" }}
            />
            <span
              aria-hidden="true"
              className="block h-px w-6"
              style={{ background: "var(--wealth-ink)" }}
            />
          </button>

          {/* Center: logo */}
          <Link
            href="/"
            aria-label={`${businessName} — Home`}
            className="relative h-10 w-32 shrink-0 md:h-14 md:w-44"
          >
            <Image
              src={logoUrl}
              alt={logoAlt}
              fill
              sizes="176px"
              className="object-contain"
              priority
            />
          </Link>

          {/* Right: social icons */}
          <div className="flex items-center justify-end gap-4">
            {socialLinks?.facebook ? (
              <a
                href={socialLinks.facebook}
                aria-label="Facebook"
                className="-m-2 flex items-center justify-center p-2"
                style={{ color: "var(--wealth-ink)" }}
              >
                <FacebookIcon className="h-4 w-4" />
              </a>
            ) : null}
            {socialLinks?.instagram ? (
              <a
                href={socialLinks.instagram}
                aria-label="Instagram"
                className="-m-2 flex items-center justify-center p-2"
                style={{ color: "var(--wealth-ink)" }}
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <WealthNavOverlay
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={hamburgerRef}
        items={navItems}
        businessName={businessName}
        logoUrl={business?.siteContent?.logoUrl}
        logoAlt={logoAlt}
        socialLinks={socialLinks}
        initialSession={initialSession}
      />
    </>
  );
}
