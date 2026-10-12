import Image from "next/image";
import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import type { Session } from "~/server/better-auth/config";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { resolveSocialLinks } from "~/lib/social-links";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/server";
import {
  donateLinkOptions,
  externalLinkProps,
  resolveFooterQuickLinks,
} from "~/app/(storefront)/_components/nav";

import { hasImpactPage } from "../lib/has-impact-page";
import { resolveWealthFields } from "../lib/resolve-fields";
import { WealthFooterAccount } from "./wealth-footer-account";
import { wealthNavDefaults } from "./wealth-nav";
import { WealthNewsletter } from "./wealth-newsletter";

/**
 * Wealth redesign footer (design.md Chrome "Redesign"): a forest block with
 * four columns — Contact · Follow · Subscribe · partner badge — stacking on
 * phones, then a quiet quick-links row (owner's Footer Quick Links, falling
 * back to the main nav's top level; Donate via the "show in footer" switch;
 * account links) and the policy row (© left, policies right, mono caps).
 * Columns with nothing to show (no socials; badge cleared + no note) drop
 * out and the grid closes up.
 */
export async function WealthFooter({
  business,
  initialSession,
}: DefaultFooterTemplateProps & { initialSession?: Session | null }) {
  const name = business?.name ?? "";
  const { isEnabled } = resolveFlags(business?.featureFlags);
  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const f = resolveWealthFields(customFields, [
    "wealth.global.footer-contact-heading",
    "wealth.global.footer-address-line1",
    "wealth.global.footer-address-line2",
    "wealth.global.footer-appointment-label",
    "wealth.global.footer-email",
    "wealth.global.footer-ein",
    "wealth.global.footer-follow-heading",
    "wealth.global.footer-farm-logo",
    "wealth.global.footer-farm-url",
    "wealth.global.footer-farm-alt",
    "wealth.global.footer-badge-note",
    "wealth.global.newsletter-heading",
    "wealth.global.newsletter-body",
    "wealth.global.newsletter-privacy",
    "wealth.global.nav-resources-url",
  ]);

  // `f` is keyed by the exact strings requested above, so every lookup here
  // is present — `?? ""` only satisfies `noUncheckedIndexedAccess`, not a
  // real fallback (resolveWealthFields already applies the real defaults).
  const contactHeading = f["wealth.global.footer-contact-heading"] ?? "";
  const addressLine1 = f["wealth.global.footer-address-line1"] ?? "";
  const addressLine2 = f["wealth.global.footer-address-line2"] ?? "";
  const appointmentLabel = f["wealth.global.footer-appointment-label"] ?? "";
  const generalEmail = f["wealth.global.footer-email"] ?? "";
  const ein = f["wealth.global.footer-ein"] ?? "";
  const followHeading = f["wealth.global.footer-follow-heading"] ?? "";
  const farmLogo = f["wealth.global.footer-farm-logo"] ?? "";
  const farmUrl = f["wealth.global.footer-farm-url"] ?? "";
  const farmAlt = f["wealth.global.footer-farm-alt"] ?? "";
  const newsletterHeading = f["wealth.global.newsletter-heading"] ?? "";
  const newsletterBody = f["wealth.global.newsletter-body"] ?? "";
  const newsletterPrivacy = f["wealth.global.newsletter-privacy"] ?? "";
  const resourcesUrl = f["wealth.global.nav-resources-url"] ?? "/resources";

  // Raw customFields values (not defaulted): an owner clearing these fields
  // hides them entirely, distinct from "unset" which shows the default.
  const farmLogoRaw = customFields?.["wealth.global.footer-farm-logo"];
  const showFarmLogo = farmLogoRaw?.trim() !== "" && !!farmLogo;
  const badgeNoteRaw = customFields?.["wealth.global.footer-badge-note"];
  const badgeNote =
    badgeNoteRaw?.trim() === ""
      ? ""
      : (f["wealth.global.footer-badge-note"] ?? "");
  const showBadgeCol = showFarmLogo || !!badgeNote;

  const social = resolveSocialLinks(business?.siteContent?.socialLinks);
  const showFollowCol = social.length > 0;

  const columnCount = 2 + (showFollowCol ? 1 : 0) + (showBadgeCol ? 1 : 0);

  // Owner's Footer Quick Links (falls back to the main nav's top level —
  // About Us, Contact & Office Hours — when unset; a saved [] means none),
  // flag-filtered; Donations "show in footer" appends /donate.
  const impactPageExists = await hasImpactPage();
  const quickLinks = resolveFooterQuickLinks({
    footerItems: business?.siteContent?.footerNavigationItems,
    navigationItems: business?.siteContent?.navigationItems,
    navDefaults: wealthNavDefaults(resourcesUrl, impactPageExists),
    isEnabled,
    donate: donateLinkOptions(business, isEnabled, "footer"),
  });

  const accountsEnabled = isEnabled("customerAccounts");
  const signedInAccountLinks = [
    { label: "My account", href: "/account" },
    ...(isEnabled("orders")
      ? [{ label: "Orders", href: "/account/orders" }]
      : []),
  ];

  // B10.1: exactly the four standard policies + the platform index. Privacy
  // and terms fall back to the platform's own when unpublished; shipping and
  // returns show only when published.
  const policies = await api.content.getSimplifiedPages({ type: "policy" });
  const bySlug = (slug: string) => policies.find((p) => p.slug === slug);
  const privacyPolicy = bySlug("privacy-policy");
  const termsOfService = bySlug("terms-of-service");
  const shippingPolicy = bySlug("shipping-policy");
  const refundPolicy = bySlug("refund-policy");
  const policyLinks = [
    {
      label: "Privacy Policy",
      href: privacyPolicy
        ? `/${privacyPolicy.slug}`
        : "/platform/policies/privacy-policy",
    },
    {
      label: "Terms of Service",
      href: termsOfService
        ? `/${termsOfService.slug}`
        : "/platform/policies/terms-of-service",
    },
    ...(shippingPolicy
      ? [{ label: "Shipping Policy", href: `/${shippingPolicy.slug}` }]
      : []),
    ...(refundPolicy
      ? [{ label: "Returns & Refunds", href: `/${refundPolicy.slug}` }]
      : []),
    { label: "Platform Policies", href: "/platform/policies" },
  ];

  return (
    <footer
      className="wealth-footer"
      {...sectionGroupAttr("global", "branding")}
    >
      <div
        className={cn(
          "wealth-container wealth-footer__grid",
          columnCount === 3 && "wealth-footer__grid--3",
          columnCount === 2 && "wealth-footer__grid--2",
        )}
      >
        {/* Contact */}
        <div className="wealth-footer__col">
          {contactHeading ? (
            <h2
              className="wealth-footer__title"
              {...fieldAttr("wealth.global.footer-contact-heading")}
            >
              {contactHeading}
            </h2>
          ) : null}
          {name ? (
            <p>
              <strong>{name}</strong>
            </p>
          ) : null}
          {addressLine1 || addressLine2 ? (
            <p>
              {addressLine1 ? (
                <span {...fieldAttr("wealth.global.footer-address-line1")}>
                  {addressLine1}
                </span>
              ) : null}
              {addressLine1 && addressLine2 ? <br /> : null}
              {addressLine2 ? (
                <span {...fieldAttr("wealth.global.footer-address-line2")}>
                  {addressLine2}
                </span>
              ) : null}
            </p>
          ) : null}
          {appointmentLabel ? (
            <p className="wealth-footer__appt">
              <Link
                href="/contact"
                {...fieldAttr("wealth.global.footer-appointment-label")}
              >
                {appointmentLabel}
              </Link>
            </p>
          ) : null}
          {generalEmail ? (
            <p>
              General Inquiries:
              <br />
              <a
                href={`mailto:${generalEmail}`}
                {...fieldAttr("wealth.global.footer-email")}
              >
                {generalEmail}
              </a>
            </p>
          ) : null}
          {ein ? <p>EIN: {ein}</p> : null}
        </div>

        {/* Follow */}
        {showFollowCol ? (
          <div className="wealth-footer__col">
            {followHeading ? (
              <h2
                className="wealth-footer__title"
                {...fieldAttr("wealth.global.footer-follow-heading")}
              >
                {followHeading}
              </h2>
            ) : null}
            <ul className="wealth-footer__social">
              {social.map(({ key, url, label, Icon }) => (
                <li key={key}>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <span className="wealth-footer__icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span>
                      {label}
                      <span className="sr-only"> (opens in new tab)</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Subscribe */}
        <div className="wealth-footer__col">
          <WealthNewsletter
            heading={newsletterHeading}
            body={newsletterBody}
            privacyNote={newsletterPrivacy}
            generalInquiriesEmail={generalEmail}
          />
        </div>

        {/* Partner badge + note (hideable: clear the logo and the note) */}
        {showBadgeCol ? (
          <div className="wealth-footer__col">
            {showFarmLogo ? (
              <a
                className="wealth-footer__badge"
                href={farmUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="wealth-footer__badge-img">
                  <Image src={farmLogo} alt={farmAlt} fill sizes="192px" />
                </span>
                <span className="sr-only"> (opens in new tab)</span>
              </a>
            ) : null}
            {badgeNote ? (
              <p
                className="wealth-footer__badge-note"
                {...fieldAttr("wealth.global.footer-badge-note")}
              >
                {badgeNote}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Quick links (B10.4/B10.5) + account (B10.3): one quiet flat row */}
      {quickLinks.length > 0 || accountsEnabled ? (
        <nav className="wealth-footer__links" aria-label="Footer">
          <div className="wealth-container">
            <ul>
              {quickLinks.map((link, i) => (
                <li key={`${link.href}-${i}`}>
                  <Link href={link.href} {...externalLinkProps(link.external)}>
                    {link.label}
                    {link.external ? (
                      <span className="sr-only"> (opens in new tab)</span>
                    ) : null}
                  </Link>
                </li>
              ))}
              {accountsEnabled ? (
                <WealthFooterAccount
                  initialSession={initialSession}
                  signedInLinks={signedInAccountLinks}
                />
              ) : null}
            </ul>
          </div>
        </nav>
      ) : null}

      {/* Policy row (B10.1): © left, policies right */}
      <div className="wealth-footer__policy">
        <div className="wealth-container wealth-footer__policy-inner">
          <span>
            &copy; {new Date().getFullYear()} {name}
          </span>
          <nav aria-label="Policies">
            <ul>
              {policyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
