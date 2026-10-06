import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import type { NavItem } from "~/app/(storefront)/_components/nav";
import type { Session } from "~/server/better-auth/config";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";
import {
  externalLinkProps,
  filterNavByFlags,
  getAccountNavLinks,
  resolveFooterNav,
  topLevelNav,
} from "~/app/(storefront)/_components/nav";

import { resolveDreamFields } from "../lib/resolve-fields";
import {
  dreamTelHref,
  resolveDreamContactDetails,
} from "../shared/dream-contact-details";
import { DreamSocialLinks } from "../shared/dream-social-links";
import { DreamFooterAccount } from "./dream-footer-account";
import { dreamCtaHref, resolveDreamNav } from "./dream-nav";

const FIELD_KEYS = [
  "dream.global.footer-signoff",
  "dream.global.footer-signoff-accent",
  "dream.global.service-area",
  "dream.global.header-cta-label",
  "dream.global.header-cta-url",
];

type DreamFooterProps = DefaultFooterTemplateProps & {
  /** The header's nav, resolved + flag-filtered once by the layout. When
   *  omitted the footer resolves the same list itself. */
  navItems?: NavItem[];
  /** The layout's server-side session — seeds the account links. */
  initialSession?: Session | null;
};

/**
 * Paper footer, hairline top rule, three columns (design.md "Chrome ›
 * Footer"): brand (mini logo + script sign-off + service area), links
 * (the owner's footer quick links, falling back to the header nav's top
 * level; flag-filtered — then the header CTA, then the account entries:
 * "Sign in" signed out, "My account" + "Orders" signed in, gated on
 * `customerAccounts`), contact (Settings email, phone, hours, then the
 * Branding social icon row — each hidden when blank/unset; see
 * `resolveDreamContactDetails` for the legacy-field fallback).
 *
 * Policy links row (B10.1): exactly the four standard slugs Admin → Policies
 * creates. Privacy and terms fall back to `/platform/policies/*` when no
 * merchant Page exists; shipping and refund have no platform equivalent, so
 * they show only once published. The platform policies index is last.
 */
export async function DreamFooter({
  business,
  navItems,
  initialSession,
}: DreamFooterProps) {
  const name = business?.name ?? "";
  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const f = resolveDreamFields(customFields, FIELD_KEYS);
  const signoff = f["dream.global.footer-signoff"] ?? "";
  const signoffAccent = f["dream.global.footer-signoff-accent"] ?? "";
  const serviceArea = f["dream.global.service-area"] ?? "";
  const ctaLabel = f["dream.global.header-cta-label"] ?? "";

  const { isEnabled } = await getBusinessFlags();
  // Same flag rule as the header pill (B2.5): hidden, never re-pointed.
  const ctaUrl = dreamCtaHref(
    f["dream.global.header-cta-url"] ?? "",
    isEnabled,
  );

  // Owner's footer quick links, else the header nav's top level — gated
  // again after the owner list replaces the fallback (P-NAV-FLAGS).
  const headerNav =
    navItems ??
    resolveDreamNav(
      business?.siteContent?.navigationItems,
      customFields,
      isEnabled,
    );
  const quickLinks = filterNavByFlags(
    resolveFooterNav(
      business?.siteContent?.footerNavigationItems,
      topLevelNav(headerNav),
    ),
    isEnabled,
  );

  // Signed-in account entries from the flag-gated account links: "My
  // account" (settings) and "Orders" only while `orders` is on.
  const accountsEnabled = isEnabled("customerAccounts");
  const accountLinks = getAccountNavLinks({ isEnabled });
  const settingsLink = accountLinks.find((link) => link.key === "settings");
  const ordersLink = accountLinks.find((link) => link.key === "orders");
  const signedInLinks = [
    ...(settingsLink ? [{ label: "My account", href: settingsLink.href }] : []),
    ...(ordersLink ? [{ label: "Orders", href: ordersLink.href }] : []),
  ];

  const {
    email,
    phone,
    address,
    hoursRows,
    legacyHours,
    footerTagline: tagline,
  } = resolveDreamContactDetails(business);

  const logoUrl =
    business?.siteContent?.logoUrl ?? "/templates/dream/images/logo.webp";
  const logoAlt = resolveLogoAlt(business?.siteContent?.logoAltText, name);

  const policies = await api.content.getSimplifiedPages({ type: "policy" });
  const bySlug = (slug: string) => policies.find((p) => p.slug === slug);
  const privacyPolicy = bySlug("privacy-policy");
  const termsOfService = bySlug("terms-of-service");
  const shippingPolicy = bySlug("shipping-policy");
  const refundPolicy = bySlug("refund-policy");

  return (
    <footer
      className="dream-footer"
      {...sectionGroupAttr("global", "branding")}
    >
      <div className="dream-footer-inner">
        {/* Brand column */}
        <div className="dream-footer-col dream-footer-col--brand">
          <img
            src={logoUrl}
            alt={logoAlt}
            className="dream-footer-logo"
            decoding="async"
            loading="lazy"
          />
          {signoff || signoffAccent ? (
            <p className="dream-footer-signoff">
              {signoff ? (
                <span {...fieldAttr("dream.global.footer-signoff")}>
                  {signoff}
                </span>
              ) : null}
              {signoffAccent ? (
                <>
                  {" "}
                  <span
                    className="dream-script"
                    {...fieldAttr("dream.global.footer-signoff-accent")}
                  >
                    {signoffAccent}
                  </span>
                </>
              ) : null}
            </p>
          ) : null}
          {tagline ? <p className="dream-footer-tagline">{tagline}</p> : null}
          {serviceArea ? (
            <p
              className="dream-footer-service-area"
              {...fieldAttr("dream.global.service-area")}
            >
              {serviceArea}
            </p>
          ) : null}
        </div>

        {/* Links column */}
        <nav
          className="dream-footer-col dream-footer-col--links"
          aria-label="Footer"
        >
          {quickLinks.map((item, i) => (
            <Link
              key={`${i}-${item.href}`}
              href={item.href}
              className="dream-footer-link"
              {...externalLinkProps(item.external)}
            >
              {item.label}
              {item.external ? (
                <span className="sr-only"> (opens in new tab)</span>
              ) : null}
            </Link>
          ))}
          {ctaLabel && ctaUrl ? (
            <Link
              href={ctaUrl}
              className="dream-footer-link"
              {...fieldAttr("dream.global.header-cta-label")}
            >
              {ctaLabel}
            </Link>
          ) : null}
          {accountsEnabled ? (
            <DreamFooterAccount
              initialSession={initialSession}
              signedInLinks={signedInLinks}
            />
          ) : null}
        </nav>

        {/* Contact column — every line hidden when blank */}
        <div className="dream-footer-col dream-footer-col--contact">
          {address ? <address className="not-italic">{address}</address> : null}
          {email ? (
            <p>
              <a href={`mailto:${email}`} className="dream-link">
                {email}
              </a>
            </p>
          ) : null}
          {phone ? (
            <p>
              <a href={dreamTelHref(phone)} className="dream-link">
                {phone}
              </a>
            </p>
          ) : null}
          {hoursRows.length > 0 ? (
            <dl className="m-0 flex flex-col gap-1">
              {hoursRows.map((row, i) => (
                <div
                  key={`${row.label}-${i}`}
                  className="flex flex-wrap gap-x-2"
                >
                  <dt>{row.label}</dt>
                  <dd className="m-0">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : legacyHours ? (
            <p>{legacyHours}</p>
          ) : null}
          <DreamSocialLinks
            socialLinks={business?.siteContent?.socialLinks}
            className="dream-footer-social"
          />
        </div>
      </div>

      {/* Policy links row */}
      <div className="dream-footer-policies">
        {privacyPolicy ? (
          <Link
            href={`/${privacyPolicy.slug}`}
            className="dream-footer-policy-link"
          >
            Privacy Policy
          </Link>
        ) : (
          <Link
            href="/platform/policies/privacy-policy"
            className="dream-footer-policy-link"
          >
            Privacy Policy
          </Link>
        )}

        {termsOfService ? (
          <Link
            href={`/${termsOfService.slug}`}
            className="dream-footer-policy-link"
          >
            Terms of Service
          </Link>
        ) : (
          <Link
            href="/platform/policies/terms-of-service"
            className="dream-footer-policy-link"
          >
            Terms of Service
          </Link>
        )}

        {shippingPolicy ? (
          <Link
            href={`/${shippingPolicy.slug}`}
            className="dream-footer-policy-link"
          >
            Shipping Policy
          </Link>
        ) : null}

        {refundPolicy ? (
          <Link
            href={`/${refundPolicy.slug}`}
            className="dream-footer-policy-link"
          >
            Refund Policy
          </Link>
        ) : null}

        <Link href="/platform/policies/" className="dream-footer-policy-link">
          Platform Policies
        </Link>
      </div>

      <p className="dream-footer-copyright">
        © {new Date().getFullYear()} {name}
      </p>
    </footer>
  );
}
