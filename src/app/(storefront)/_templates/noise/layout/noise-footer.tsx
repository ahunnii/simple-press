import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import type { Session } from "~/server/better-auth/config";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { getRawCustomFieldString } from "~/lib/template-fields";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/server";
import {
  externalLinkProps,
  filterNavByFlags,
  getAccountNavLinks,
  resolveFooterNav,
} from "~/app/(storefront)/_components/nav";

import { resolveNoiseLocationTag } from "../shared/noise-location-tag";
import { nonBlank } from "../shared/noise-non-blank";
import {
  hasNoiseSocialLinks,
  NoiseSocialLinks,
} from "../shared/noise-social-links";
import { NoiseFooterAccount } from "./noise-footer-account";

type FooterLink = { href: string; label: string; external?: boolean };

type NoiseFooterProps = DefaultFooterTemplateProps & {
  /** The layout's server-side session, seeding the account rows. */
  initialSession?: Session | null;
};

/** Desktop column template by how many link columns survive (brand and
 *  contact always render), so a hidden column never leaves an empty track. */
const LG_GRID_COLS: Record<number, string> = {
  0: "lg:grid-cols-[1.4fr_1.2fr]",
  1: "lg:grid-cols-[1.4fr_1fr_1.2fr]",
  2: "lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]",
};

export async function NoiseFooter({
  business,
  initialSession,
}: NoiseFooterProps) {
  const email = business?.supportEmail;
  const phone = business?.phoneNumber;
  const address = business?.businessAddress;
  const name = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl;
  const logoAlt = resolveLogoAlt(business?.siteContent?.logoAltText, name);

  const { isEnabled } = await getBusinessFlags();

  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const locationTag = resolveNoiseLocationTag(business, customFields);

  // Tagline: Content → Branding → Footer tagline wins; else the legacy
  // `noise.global.footer-tagline` field (retired 2026-09-25, a read-only
  // fallback — never written or cleared from here); else hidden.
  const footerTagline =
    nonBlank(business?.siteContent?.footerText) ??
    nonBlank(
      getRawCustomFieldString(customFields, "noise.global.footer-tagline"),
    );

  const socialLinks = business?.siteContent?.socialLinks;

  // Same gating as before, kept as the fallback so an unset footer list
  // renders identically to today; `filterNavByFlags` below is then a no-op
  // on this list and only matters for an owner-saved footer list. No
  // "Shop All" here: the Shop column already carries it (B10.4, no dupes).
  const quickLinksFallback = [
    { href: "/about", label: "About Us" },
    ...(isEnabled("blog") ? [{ href: "/blog", label: "Blog" }] : []),
    ...(isEnabled("testimonials")
      ? [{ href: "/testimonials", label: "Testimonials" }]
      : []),
    { href: "/contact", label: "Contact" },
  ];

  const quickLinks = filterNavByFlags(
    resolveFooterNav(
      business?.siteContent?.footerNavigationItems,
      quickLinksFallback,
    ),
    isEnabled,
  );

  // Shop column: the whole column rides on `products` (its links all point
  // into the shop), and hides, heading included, when it ends up empty.
  const shopLinks: FooterLink[] = isEnabled("products")
    ? [
        { href: "/shop", label: "Shop All" },
        ...(isEnabled("collections")
          ? [{ href: "/collections", label: "Collections" }]
          : []),
        { href: "/shop?sort_by=newest", label: "New arrivals" },
      ]
    : [];

  // Account rows at the foot of Quick Links (B10.3), gated on
  // `customerAccounts`. Signed in: "My account" (settings) and "Orders" only
  // while `orders` is on, both from the flag-gated account links.
  const accountsEnabled = isEnabled("customerAccounts");
  const accountLinks = getAccountNavLinks({ isEnabled });
  const settingsLink = accountLinks.find((link) => link.key === "settings");
  const ordersLink = accountLinks.find((link) => link.key === "orders");
  const signedInLinks = [
    ...(settingsLink ? [{ label: "My account", href: settingsLink.href }] : []),
    ...(ordersLink ? [{ label: "Orders", href: ordersLink.href }] : []),
  ];

  const showShopCol = shopLinks.length > 0;
  const showQuickCol = quickLinks.length > 0 || accountsEnabled;
  const linkColCount = Number(showShopCol) + Number(showQuickCol);

  const policies = await api.content.getSimplifiedPages({ type: "policy" });

  // Legal strip (B10.1): exactly the four standard slugs Admin → Policies
  // creates, never any other policy-type page (imports, QA data). Privacy
  // and terms fall back to the platform's own policy when unpublished;
  // shipping and returns have no platform equivalent, so they show once
  // published. The platform policies index is always last.
  const bySlug = (slug: string) => policies.find((p) => p.slug === slug);
  const privacyPolicy = bySlug("privacy-policy");
  const termsOfService = bySlug("terms-of-service");
  const shippingPolicy = bySlug("shipping-policy");
  const refundPolicy = bySlug("refund-policy");

  const legalLinks: FooterLink[] = [
    {
      href: privacyPolicy
        ? `/${privacyPolicy.slug}`
        : "/platform/policies/privacy-policy",
      label: "Privacy Policy",
    },
    {
      href: termsOfService
        ? `/${termsOfService.slug}`
        : "/platform/policies/terms-of-service",
      label: "Terms of Service",
    },
    ...(shippingPolicy
      ? [{ href: `/${shippingPolicy.slug}`, label: "Shipping Policy" }]
      : []),
    ...(refundPolicy
      ? [{ href: `/${refundPolicy.slug}`, label: "Returns & Refunds" }]
      : []),
    { href: "/platform/policies", label: "Platform Policies" },
  ];

  return (
    <footer
      style={{
        borderTop: "1px solid var(--vn-rule)",
        // background: "var(--vn-bone)",
        color: "var(--vn-ink)",
        marginTop: 80,
      }}
      {...sectionGroupAttr("global", "branding")}
    >
      {/* ── Main grid ── */}
      <div
        className="mx-auto grid gap-12 px-7 pt-16 pb-10"
        style={{
          maxWidth: "1320px",
          gridTemplateColumns: "repeat(1, 1fr)",
        }}
      >
        <div
          className="grid gap-12"
          style={{
            gridTemplateColumns: "repeat(1, 1fr)",
          }}
        >
          {/* Small-screen: single column; md: 2 cols; lg: 4 cols */}
          <div
            className={cn(
              "grid grid-cols-1 gap-12 md:grid-cols-2",
              LG_GRID_COLS[linkColCount],
            )}
          >
            {/* ── Col 1: Wordmark + tagline + newsletter ── */}
            <div className="flex flex-col gap-5">
              {/* Wordmark */}
              <div style={{ lineHeight: 1 }}>
                {logoUrl ? (
                  <div className="relative mb-3 h-14 w-28">
                    <Image
                      src={logoUrl}
                      alt={logoAlt}
                      fill
                      sizes="112px"
                      className="object-contain object-left"
                    />
                  </div>
                ) : (
                  <>
                    <div
                      className="font-serif"
                      style={{
                        fontSize: "26px",
                        letterSpacing: "0.16em",
                        fontWeight: 500,
                        color: "var(--vn-ink)",
                      }}
                    >
                      {name.toUpperCase()}
                    </div>
                    {locationTag && (
                      <div
                        className="mt-2 font-mono"
                        style={{
                          fontSize: "10px",
                          letterSpacing: "0.46em",
                          color: "var(--vn-steel-mist)",
                          fontWeight: 500,
                        }}
                      >
                        {locationTag}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Tagline */}
              {footerTagline && (
                <p
                  className="font-sans leading-[1.7]"
                  style={{
                    fontSize: "13px",
                    color: "var(--vn-steel-mist)",
                    maxWidth: "280px",
                  }}
                >
                  {footerTagline}
                </p>
              )}

              {/* Social icons */}
              {hasNoiseSocialLinks(socialLinks) && (
                <NoiseSocialLinks socialLinks={socialLinks} />
              )}
            </div>

            {/* ── Col 2: Shop — gated on `products`, hidden when empty ── */}
            {showShopCol && <FooterCol title="Shop" links={shopLinks} />}

            {/* ── Col 3: Quick links + account rows — hidden (heading
                included) when the resolved list is empty and accounts are
                off ── */}
            {showQuickCol && (
              <FooterCol
                title="Quick Links"
                links={quickLinks}
                extra={
                  accountsEnabled ? (
                    <NoiseFooterAccount
                      initialSession={initialSession}
                      signedInLinks={signedInLinks}
                    />
                  ) : null
                }
              />
            )}

            {/* ── Col 4: Contact info ── */}
            <div>
              {(!!address || !!email || !!phone) && (
                <>
                  <h2
                    className="mb-5 font-mono"
                    style={{
                      fontSize: "10.5px",
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: "var(--vn-steel-mist)",
                    }}
                  >
                    Contact
                  </h2>
                </>
              )}

              {address && (
                <div className="mb-4">
                  <p
                    className="mb-0.5 font-sans font-semibold"
                    style={{ fontSize: "13px", color: "var(--vn-ink)" }}
                  >
                    Location
                  </p>
                  <p
                    className="font-sans leading-[1.8]"
                    style={{ fontSize: "13px", color: "var(--vn-steel-mist)" }}
                  >
                    {address}
                  </p>
                </div>
              )}

              {(!!email || !!phone) && (
                <div>
                  <p
                    className="mb-0.5 font-sans font-semibold"
                    style={{ fontSize: "13px", color: "var(--vn-ink)" }}
                  >
                    Reach out to us
                  </p>
                  <div
                    className="font-sans leading-[1.8]"
                    style={{ fontSize: "13px", color: "var(--vn-steel-mist)" }}
                  >
                    {email && (
                      <a
                        href={`mailto:${email}`}
                        className="block transition-opacity hover:opacity-80"
                      >
                        {email}
                      </a>
                    )}
                    {phone && <span className="block">{phone}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div
        className="mx-auto flex flex-col gap-3 px-7 py-6 sm:flex-row sm:items-center sm:justify-between"
        style={{
          maxWidth: "1320px",
          borderTop: "1px solid var(--vn-line-soft)",
        }}
      >
        {/* Copyright */}
        <span
          className="font-mono"
          style={{
            fontSize: "11px",
            letterSpacing: "0.1em",
            color: "var(--vn-steel-mist)",
          }}
        >
          © {new Date().getFullYear()} {name}
        </span>

        {/* Legal strip (B10.1): mandatory, never hidden */}
        <nav aria-label="Policies">
          <ul
            className="m-0 flex list-none flex-wrap gap-x-4 gap-y-2 p-0 font-mono"
            style={{
              fontSize: "11px",
              letterSpacing: "0.1em",
              color: "var(--vn-steel-mist)",
            }}
          >
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-[var(--vn-ink)]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
  extra,
  className,
}: {
  title: string;
  links: FooterLink[];
  /** Extra `<li>` rows after the links (Quick Links' account rows). */
  extra?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h2
        className="mb-5 font-mono"
        style={{
          fontSize: "10.5px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--vn-steel-mist)",
        }}
      >
        {title}
      </h2>
      <ul className="flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link
              href={link.href}
              {...externalLinkProps(link.external)}
              className="vn-footer-link font-sans"
              style={{ fontSize: "13px" }}
            >
              {link.label}
              {link.external && (
                <span className="sr-only"> (opens in new tab)</span>
              )}
            </Link>
          </li>
        ))}
        {extra}
      </ul>
    </div>
  );
}
