import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";

import type { DefaultFooterTemplateProps } from "../../types";
import type { NavChild } from "~/app/(storefront)/_components/nav";
import type { Session } from "~/server/better-auth/config";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveLogoAlt } from "~/lib/logo-alt";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
import { parseTemplateListRows } from "~/lib/template-fields";
import { api } from "~/trpc/server";
import { GoogleColorIcon } from "~/components/icons/google-icon";
import {
  externalLinkProps,
  filterNavByFlags,
  getAccountNavLinks,
  navHrefFlag,
  resolveFooterNav,
} from "~/app/(storefront)/_components/nav";

import { resolveFields } from "../index";
import { UmscButton } from "../shared/umsc-button";
import {
  resolveUmscContactDetails,
  umscTelHref,
} from "../shared/umsc-contact-details";
import { UmscSocialIcons } from "../shared/umsc-social-icons";
import { UmscFooterAccount } from "./umsc-footer-account";

/**
 * Help column defaults — today's hard-coded copy minus the retired policy
 * link (B10.1: policy links now live only in the bottom legal strip, PF19).
 * Overridden by an owner-saved footer quick-links list (Admin → Navigation →
 * Footer Quick Links), flag-filtered either way (B10.2/B10.4, PF21).
 */
const UMSC_HELP_DEFAULTS: NavChild[] = [
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
  { label: "Custom orders", href: "/contact?type=custom" },
];

type UmscFooterProps = DefaultFooterTemplateProps & {
  /** The layout's server-side session, seeding the account rows (B10.3) so
   *  they never flash. Optional — when the layout doesn't pass one, the
   *  account rows still render flash-free (they render nothing while the
   *  client-side session fetch is pending). */
  initialSession?: Session | null;
};

export async function UmscFooter({
  business,
  initialSession,
}: UmscFooterProps) {
  const name = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl;
  const logoAlt = resolveLogoAlt(business?.siteContent?.logoAltText, name);

  const { isEnabled } = await getBusinessFlags();

  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const g = resolveFields(customFields, [
    "umsc.global.google-review-url",
    "umsc.global.footer-shop-heading",
    "umsc.global.footer-review-heading",
    "umsc.global.footer-review-body",
    "umsc.global.footer-review-label",
  ]);
  const googleReviewUrl = g["umsc.global.google-review-url"] ?? "";
  const footerShopHeading = g["umsc.global.footer-shop-heading"] ?? "";
  const reviewHeading = g["umsc.global.footer-review-heading"] ?? "";
  const reviewBody = g["umsc.global.footer-review-body"] ?? "";
  const reviewLabel = g["umsc.global.footer-review-label"] ?? "";

  const shopLinkRows = parseTemplateListRows(
    customFields?.["umsc.global.footer-shop-links"],
  ) as { _id?: string; label?: string; url?: string }[];

  // No owner rows → the store's first four published collections (Admin →
  // Collections order), same source as the homepage "Shop by type" cards.
  // `getAllPublic` is featureGate("collections")'d, so the flag guard is
  // required. These aren't list rows, so no `itemIndex` (nothing to edit).
  const collections =
    shopLinkRows.length === 0 && isEnabled("collections")
      ? await api.collections.getAllPublic().catch(() => [])
      : [];

  // Owner list (else the collections above) + "All products", each row
  // filtered by its own route flag (PF21/B10.2) — the column stays gated on
  // `products` below, but a collection door must also drop out when
  // `collections` is off, independent of the column-level gate.
  const shopColLinks = [
    ...(shopLinkRows.length > 0
      ? shopLinkRows.map((row, i) => ({
          href: typeof row.url === "string" ? row.url : "",
          label: typeof row.label === "string" ? row.label : "",
          itemIndex: i,
        }))
      : collections.slice(0, 4).map((collection) => ({
          href: `/collections/${collection.slug}`,
          label: collection.name,
        }))),
    { href: "/shop", label: "All products" },
  ].filter((link) => {
    const flag = navHrefFlag(link.href);
    return flag === null || isEnabled(flag);
  });

  // Help column: owner-saved footer quick links (Admin → Navigation), else
  // UMSC_HELP_DEFAULTS, flag-filtered (B10.2/B10.4, PF21).
  const helpLinks = filterNavByFlags(
    resolveFooterNav(
      business?.siteContent?.footerNavigationItems,
      UMSC_HELP_DEFAULTS,
    ),
    isEnabled,
  );

  // Account rows appended to Help (B10.3, PF20): "My account" + "Orders"
  // (only while `orders` is on) signed in, "Sign in" signed out.
  const accountsEnabled = isEnabled("customerAccounts");
  const accountLinksAll = getAccountNavLinks({ isEnabled });
  const settingsLink = accountLinksAll.find((link) => link.key === "settings");
  const ordersLink = accountLinksAll.find((link) => link.key === "orders");
  const signedInLinks = [
    ...(settingsLink ? [{ label: "My account", href: settingsLink.href }] : []),
    ...(ordersLink ? [{ label: "Orders", href: ordersLink.href }] : []),
  ];
  // Column stays visible when only the account row would render (decision).
  const showHelpCol = helpLinks.length > 0 || accountsEnabled;

  // Settings (phone) and Content → Branding (footer tagline, social links)
  // own this data; saved values from the retired `umsc.global.*` fields are
  // read only as a silent fallback — see `resolveUmscContactDetails`.
  const { phone, footerTagline, socials } = resolveUmscContactDetails(business);

  // Bottom legal strip (B10.1, PF19): exactly the four standard policy
  // slugs Admin → Policies creates, plus the platform policies index last.
  // Privacy and terms fall back to the platform's own policy when
  // unpublished; shipping and returns have no platform equivalent, so they
  // show only once published. Never list any other policy-type page.
  const policies = await api.content.getSimplifiedPages({ type: "policy" });
  const bySlug = (slug: string) => policies.find((p) => p.slug === slug);
  const privacyPolicy = bySlug("privacy-policy");
  const termsOfService = bySlug("terms-of-service");
  const shippingPolicy = bySlug("shipping-policy");
  const refundPolicy = bySlug("refund-policy");
  const legalLinks: { href: string; label: string }[] = [
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
    { href: "/platform/policies/", label: "Platform Policies" },
  ];

  return (
    <footer
      {...sectionGroupAttr("global", "branding")}
      className="border-t-2 border-[var(--umsc-gold)] bg-[var(--umsc-black)] text-[var(--umsc-cream-on-black)]"
    >
      <div
        className="mx-auto grid gap-12 px-6 pt-16 pb-10 sm:px-8"
        style={{ maxWidth: "var(--umsc-container)" }}
      >
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Col 1: brand */}
          <div className="flex flex-col gap-4">
            <span className="relative size-[44px] shrink-0 overflow-hidden rounded-full border border-[var(--umsc-line-gold)]">
              <Image
                src={logoUrl ?? "/placeholder.svg"}
                alt={logoAlt}
                fill
                sizes="44px"
                className="object-cover"
              />
            </span>
            {footerShopHeading && (
              <p
                {...fieldAttr("umsc.global.footer-shop-heading")}
                className="umsc-serif m-0 text-[19px] leading-[1.2] text-[var(--umsc-gold-soft)]"
              >
                {footerShopHeading}
              </p>
            )}
            {footerTagline && (
              <p className="umsc-sans m-0 max-w-[280px] text-[13px] leading-[1.7] text-[var(--umsc-cream-on-black)]">
                {footerTagline}
              </p>
            )}
            {phone && (
              <a
                href={umscTelHref(phone)}
                className="umsc-sans text-[13px] text-[var(--umsc-cream-on-black)] no-underline hover:opacity-80"
              >
                Customer service: {phone}
              </a>
            )}
          </div>

          {/* Col 2: Shop — gated on `products`, each row also filtered by
              its own route flag (collections doors drop out on their own) */}
          {isEnabled("products") && shopColLinks.length > 0 && (
            <UmscFooterCol
              title="Shop"
              links={shopColLinks}
              fieldKey="umsc.global.footer-shop-links"
            />
          )}

          {/* Col 3: Help — owner quick links (else UMSC_HELP_DEFAULTS) +
              the account row (B10.3); hidden only when both are empty */}
          {showHelpCol && (
            <UmscFooterCol
              title="Help"
              links={helpLinks}
              extra={
                accountsEnabled ? (
                  <UmscFooterAccount
                    initialSession={initialSession}
                    signedInLinks={signedInLinks}
                  />
                ) : null
              }
            />
          )}

          {/* Col 4: Follow */}
          <div>
            <h2 className="umsc-sans mb-5 text-[10px] font-medium tracking-[0.28em] text-[var(--umsc-cream-on-black)] uppercase opacity-80">
              Follow
            </h2>
            <UmscSocialIcons
              links={socials}
              linkClassName="-m-3 flex items-center justify-center p-3 text-[var(--umsc-cream-on-black)] hover:text-[var(--umsc-gold-soft)]"
            />
          </div>
        </div>

        {/* Google review strip — only once the owner sets the review link */}
        {googleReviewUrl.trim() && reviewLabel && (
          <UmscFooterReview
            href={googleReviewUrl}
            heading={reviewHeading}
            body={reviewBody}
            label={reviewLabel}
          />
        )}
      </div>

      <div
        className="mx-auto flex flex-col gap-3 border-t border-[var(--umsc-line-gold)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8"
        style={{ maxWidth: "var(--umsc-container)" }}
      >
        <span className="umsc-sans text-[11px] tracking-[0.05em] text-[var(--umsc-cream-on-black)] opacity-80">
          © {new Date().getFullYear()} {name}
        </span>
        {/* Legal strip (B10.1): mandatory, never hidden — privacy, terms
            (platform fallbacks), shipping + returns (only when published),
            platform index last. */}
        <nav aria-label="Policies">
          <ul className="umsc-sans m-0 flex list-none flex-wrap gap-5 p-0 text-[10px] tracking-[0.1em] text-[var(--umsc-cream-on-black)] uppercase opacity-80">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-inherit no-underline hover:opacity-100"
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

/**
 * UmscFooterReview — the footer's Google review strip: gold stars + serif
 * heading + one line on the left, a gold pill on the right, framed by the
 * same gold hairline the legal strip uses. Stacks on mobile. The parent
 * renders it only when `umsc.global.google-review-url` is set. The pill
 * leads with Google's colour "G" on a white roundel (brand rule: the colour
 * mark sits on white); its padding is tightened so 28px roundel + 7px
 * top/bottom + 1px borders keeps the standard 44px pill height.
 */
function UmscFooterReview({
  href,
  heading,
  body,
  label,
}: {
  href: string;
  heading: string;
  body: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-6 border-t border-[var(--umsc-line-gold)] pt-10 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
      <div className="flex flex-col gap-3">
        <span aria-hidden="true" className="flex gap-1 text-[var(--umsc-gold)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className="size-4"
              fill="currentColor"
              strokeWidth={0}
            />
          ))}
        </span>
        {heading && (
          <p
            {...fieldAttr("umsc.global.footer-review-heading")}
            className="umsc-serif m-0 text-[26px] leading-[1.15] text-[var(--umsc-gold-soft)]"
          >
            {heading}
          </p>
        )}
        {body && (
          <p
            {...fieldAttr("umsc.global.footer-review-body")}
            className="umsc-sans m-0 max-w-[52ch] text-[14px] leading-[1.6] text-[var(--umsc-cream-on-black)] opacity-90"
          >
            {body}
          </p>
        )}
      </div>
      <UmscButton
        href={href}
        external
        variant="gold"
        fieldKey="umsc.global.footer-review-label"
        className="shrink-0 self-start sm:self-auto"
        style={{ padding: "7px 28px 7px 7px", gap: 12 }}
        leadingIcon={
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--umsc-white)]"
          >
            <GoogleColorIcon className="size-4" />
          </span>
        }
      >
        {label}
      </UmscButton>
    </div>
  );
}

function UmscFooterCol({
  title,
  links,
  fieldKey,
  extra,
}: {
  title: string;
  links: {
    href: string;
    label: string;
    itemIndex?: number;
    external?: boolean;
  }[];
  /** List field owning `itemIndex`-marked rows (e.g. `umsc.global.footer-shop-links`), for `data-sp-item`. */
  fieldKey?: string;
  /** Extra `<li>` rows after the links (Help's account rows, B10.3). */
  extra?: ReactNode;
}) {
  return (
    <div>
      <h2 className="umsc-sans mb-5 text-[10px] font-medium tracking-[0.28em] text-[var(--umsc-cream-on-black)] uppercase opacity-80">
        {title}
      </h2>
      <ul className="flex flex-col gap-3">
        {links
          .filter((link) => link.href)
          .map((link) => (
            <li
              key={link.href + link.label}
              {...(fieldKey && link.itemIndex !== undefined
                ? listItemAttr(fieldKey, link.itemIndex)
                : {})}
            >
              <Link
                href={link.href}
                {...externalLinkProps(link.external)}
                className="umsc-sans text-[13px] text-[var(--umsc-cream-on-black)] no-underline opacity-90 hover:opacity-100"
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
