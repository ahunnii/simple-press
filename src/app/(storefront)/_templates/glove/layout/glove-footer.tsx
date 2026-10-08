"use client";

import Image from "next/image";
import Link from "next/link";
import { Headset } from "lucide-react";

import type { DefaultFooterTemplateProps } from "../../types";
import type { RouterOutputs } from "~/trpc/react";
import {
  AUTH_BASE_PATHS,
  AUTH_VIEW_PATHS,
  SETTINGS_VIEW_PATHS,
} from "~/lib/auth-paths";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { resolveSocialLinks } from "~/lib/social-links";
import {
  externalLinkProps,
  resolveFooterQuickLinks,
} from "~/app/(storefront)/_components/nav";

import { GLOVE_DEFAULT_FOOTER_LINKS, GLOVE_FALLBACK_LOGO } from "./glove-nav";
import { GLOVE_FIELD_KEYS } from "./index";

type PolicyPage = RouterOutputs["content"]["getSimplifiedPages"][number];

const SIGN_IN_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signIn}`;
const SIGN_UP_HREF = `${AUTH_BASE_PATHS.auth}/${AUTH_VIEW_PATHS.signUp}`;
const ACCOUNT_HREF = `${AUTH_BASE_PATHS.settings}/${SETTINGS_VIEW_PATHS.account}`;
const ORDERS_HREF = `${AUTH_BASE_PATHS.settings}/orders`;

export type GloveFooterFields = {
  badge: string;
  blurb: string;
  quickLinksHeading: string;
  customerHeading: string;
  contactHeading: string;
  contactIntro: string;
  questionLabel: string;
  paymentImage: string;
  trackLabel: string;
  trackHref: string;
};

type GloveFooterProps = DefaultFooterTemplateProps & {
  /** Published policy Pages, resolved server-side by the layout. */
  policyPages?: PolicyPage[];
  fields: GloveFooterFields;
};

/**
 * White footer with four columns (brand, quick links, customer area, contact)
 * and a dark bottom bar carrying the copyright, payment logos and the
 * mandatory platform policy links (B10.1).
 */
export function GloveFooter({
  business,
  policyPages = [],
  fields,
}: GloveFooterProps) {
  const { isEnabled } = resolveFlags(business.featureFlags);
  const { data: session, isPending } = useHydratedSession();
  const user = session?.user;
  const signedOut = !isPending && !user;

  const accountsEnabled = isEnabled("customerAccounts");
  const phone = business.phoneNumber?.trim();
  const address = business.businessAddress?.trim();
  const socialLinks = resolveSocialLinks(business.siteContent?.socialLinks);
  const logo = business.siteContent?.logoUrl ?? GLOVE_FALLBACK_LOGO;

  // Owner's footer quick links; falls back to the main nav's top level when
  // unset, then to the shipped defaults. Login / Sign Up only make sense for
  // visitors who can still sign in.
  const quickLinks = resolveFooterQuickLinks({
    footerItems: business.siteContent?.footerNavigationItems,
    navigationItems: business.siteContent?.navigationItems,
    navDefaults: GLOVE_DEFAULT_FOOTER_LINKS,
    isEnabled,
  }).filter((link) => {
    const isAuthLink = link.href === SIGN_IN_HREF || link.href === SIGN_UP_HREF;
    if (!isAuthLink) return true;
    return accountsEnabled && !user;
  });

  // Mandatory policy row (B10.1): privacy and terms fall back to the platform
  // pages; shipping and refund only when the merchant published them.
  const bySlug = (slug: string) => policyPages.find((p) => p.slug === slug);
  const privacy = bySlug("privacy-policy");
  const terms = bySlug("terms-of-service");
  const shipping = bySlug("shipping-policy");
  const refund = bySlug("refund-policy");
  const privacyHref = privacy
    ? `/${privacy.slug}`
    : "/platform/policies/privacy-policy";
  const termsHref = terms
    ? `/${terms.slug}`
    : "/platform/policies/terms-of-service";
  const policyLinks: { label: string; href: string }[] = [
    { label: "Privacy Policy", href: privacyHref },
    { label: "Terms of Service", href: termsHref },
    ...(shipping
      ? [{ label: "Shipping Policy", href: `/${shipping.slug}` }]
      : []),
    ...(refund ? [{ label: "Refund Policy", href: `/${refund.slug}` }] : []),
    { label: "Platform Policies", href: "/platform/policies/" },
  ];

  const showTrack = fields.trackLabel.trim().length > 0;

  return (
    <footer
      className="glove-footer border-t border-[var(--glove-line)] bg-[var(--glove-paper)]"
      {...sectionGroupAttr("global", "footer")}
    >
      <div className="glove-container py-12 md:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.15fr_0.7fr_0.9fr_1.5fr] lg:gap-8">
          {/* 1. Brand */}
          <div className="flex flex-col items-center text-center">
            <Link href="/" className="inline-block">
              <Image
                src={logo}
                alt={resolveLogoAlt(
                  business.siteContent?.logoAltText,
                  business.name,
                )}
                width={160}
                height={80}
                className="h-[88px] w-auto max-w-[200px] object-contain"
              />
            </Link>
            {fields.badge ? (
              <Image
                src={fields.badge}
                alt="Women owned, certified by the Women's Business Enterprise National Council"
                width={225}
                height={126}
                className="mt-5 h-auto w-[170px] object-contain"
              />
            ) : null}
            {fields.blurb ? (
              <p
                className="mt-4 max-w-[280px] text-[14px] leading-relaxed text-[var(--glove-text)]"
                {...fieldAttr(GLOVE_FIELD_KEYS.footerBlurb)}
              >
                {fields.blurb}
              </p>
            ) : null}
            {socialLinks.length > 0 ? (
              <ul
                className="m-0 mt-5 flex list-none items-center gap-2 p-0"
                aria-label={`Follow ${business.name}`}
              >
                {socialLinks.map(({ key, ariaLabel, Icon, url }) => (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glove-social-btn"
                    >
                      <Icon className="size-[18px]" />
                      <span className="sr-only">
                        {ariaLabel} (opens in new tab)
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* 2. Quick links */}
          {quickLinks.length > 0 ? (
            <nav aria-labelledby="glove-footer-quick">
              <h2
                id="glove-footer-quick"
                className="glove-footer-heading"
                {...fieldAttr(GLOVE_FIELD_KEYS.footerQuickLinksHeading)}
              >
                {fields.quickLinksHeading}
              </h2>
              <ul className="m-0 mt-5 flex list-none flex-col gap-3 p-0">
                {quickLinks.map((link, i) => (
                  <li key={i}>
                    <Link
                      href={link.href}
                      {...externalLinkProps(link.external)}
                      className="glove-footer-link"
                    >
                      {link.label}
                      {link.external && (
                        <span className="sr-only"> (opens in new tab)</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : (
            <div className="hidden lg:block" aria-hidden="true" />
          )}

          {/* 3. Customer area */}
          <nav aria-labelledby="glove-footer-customer">
            <h2
              id="glove-footer-customer"
              className="glove-footer-heading"
              {...fieldAttr(GLOVE_FIELD_KEYS.footerCustomerHeading)}
            >
              {fields.customerHeading}
            </h2>
            <ul className="m-0 mt-5 flex list-none flex-col gap-3 p-0">
              {accountsEnabled && !signedOut ? (
                <li>
                  <Link href={ACCOUNT_HREF} className="glove-footer-link">
                    My Account
                  </Link>
                </li>
              ) : null}
              {accountsEnabled && signedOut ? (
                <>
                  <li>
                    <Link href={SIGN_IN_HREF} className="glove-footer-link">
                      Sign in
                    </Link>
                  </li>
                  <li>
                    <Link href={SIGN_UP_HREF} className="glove-footer-link">
                      Create account
                    </Link>
                  </li>
                </>
              ) : null}
              {accountsEnabled && user && isEnabled("orders") ? (
                <li>
                  <Link href={ORDERS_HREF} className="glove-footer-link">
                    Orders
                  </Link>
                </li>
              ) : null}
              {showTrack ? (
                <li>
                  <Link href={fields.trackHref} className="glove-footer-link">
                    {fields.trackLabel}
                  </Link>
                </li>
              ) : null}
              <li>
                <Link href={termsHref} className="glove-footer-link">
                  Terms and Conditions
                </Link>
              </li>
              <li>
                <Link href={privacyHref} className="glove-footer-link">
                  Privacy Policy
                </Link>
              </li>
              {isEnabled("cart") ? (
                <li>
                  <Link href="/cart" className="glove-footer-link">
                    My Cart
                  </Link>
                </li>
              ) : null}
            </ul>
          </nav>

          {/* 4. Contact */}
          <div>
            <h2
              className="glove-footer-heading"
              {...fieldAttr(GLOVE_FIELD_KEYS.footerContactHeading)}
            >
              {fields.contactHeading}
            </h2>
            {fields.contactIntro ? (
              <p
                className="mt-5 max-w-[420px] text-[14px] leading-relaxed text-[var(--glove-text)]"
                {...fieldAttr(GLOVE_FIELD_KEYS.footerContactIntro)}
              >
                {fields.contactIntro}
              </p>
            ) : null}
            {phone ? (
              <div className="mt-4 flex items-center gap-4">
                <Headset
                  className="size-11 shrink-0 text-[var(--glove-muted)]"
                  strokeWidth={1.25}
                  aria-hidden="true"
                />
                <div>
                  {fields.questionLabel ? (
                    <p
                      className="glove-display text-[15px] font-medium text-[var(--glove-ink)]"
                      {...fieldAttr(GLOVE_FIELD_KEYS.footerQuestionLabel)}
                    >
                      {fields.questionLabel}
                    </p>
                  ) : null}
                  <a
                    href={`tel:${phone}`}
                    className="glove-display text-[20px] font-medium text-[var(--glove-primary)] transition-colors hover:text-[var(--glove-primary-hover)]"
                  >
                    {phone}
                  </a>
                </div>
              </div>
            ) : null}
            {address ? (
              <p className="mt-4 text-[14px] text-[var(--glove-text)]">
                {address}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="glove-on-dark bg-[var(--glove-footer-bar)] text-[13px] text-white">
        <div className="glove-container flex flex-col items-center gap-4 py-5 md:flex-row md:justify-between">
          <p className="m-0 text-center md:text-left">
            {business.name.toUpperCase()} - &copy; {new Date().getFullYear()}{" "}
            All Rights Reserved
          </p>
          {fields.paymentImage ? (
            <Image
              src={fields.paymentImage}
              alt="Accepted payment methods"
              width={255}
              height={22}
              className="h-[22px] w-auto object-contain"
            />
          ) : null}
        </div>
        <div className="border-t border-white/10">
          <ul
            aria-label="Policies"
            className="glove-container m-0 flex list-none flex-wrap items-center justify-center gap-x-5 gap-y-1 py-3 md:justify-start"
          >
            {policyLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-6 items-center text-[var(--glove-footer-bar-text)] underline-offset-2 transition-colors hover:text-white hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
