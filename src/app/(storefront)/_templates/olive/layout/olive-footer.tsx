import Image from "next/image";
import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import type { OliveNavCollection } from "./olive-nav-overlay";
import type { Session } from "~/server/better-auth/config";
import { googleMapsUrls } from "~/lib/address/coordinates";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { resolveSocialLinks } from "~/lib/social-links";
import { getRawCustomFieldString } from "~/lib/template-fields";
import { api } from "~/trpc/server";
import {
  donateLinkOptions,
  externalLinkProps,
  getAccountNavLinks,
  navHrefOffFlag,
  resolveFooterQuickLinks,
} from "~/app/(storefront)/_components/nav";

import { resolveFields } from "..";
import { OliveButton } from "../shared/olive-button";
import { OliveFooterAccount } from "./olive-footer-account";
import { OLIVE_DEFAULT_NAV } from "./olive-nav";

type FooterLink = { href: string; label: string; external?: boolean };

type OliveFooterProps = DefaultFooterTemplateProps & {
  /** Published collections, resolved once by the layout. */
  collections?: OliveNavCollection[];
  /** The layout's server-side session, seeding the account rows. */
  initialSession?: Session | null;
};

/** How many collections the Shop column will list before it stops. */
const MAX_COLLECTION_LINKS = 5;

/** Drop repeat hrefs, keeping the first occurrence. */
function uniqueByHref(links: FooterLink[], taken = new Set<string>()) {
  return links.filter((link) => {
    if (taken.has(link.href)) return false;
    taken.add(link.href);
    return true;
  });
}

/** Retired per-template social URL keys, read only as a legacy fallback. */
const LEGACY_SOCIAL_KEYS = [
  "instagram",
  "tiktok",
  "facebook",
  "pinterest",
] as const;

function nonBlank(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed?.length ? trimmed : undefined;
}

/**
 * Minimal editorial footer on the ivory ground, one hairline on top
 * (design.md § Story → "minimal footer"). Three bands:
 *
 * 1. The masthead row — wordmark (uploaded logo, else the business name in
 *    Bodoni caps) with the `wordmark-tagline` under it, and the social icons
 *    (square, outlined) on the right.
 * 2. The index — on the left a quiet text block (the owner's footer
 *    call-to-action as Bodoni h3 + body + link button, else the Branding
 *    footer tagline) and the contact block; on the right compact link groups:
 *    Shop (collections), Customer care (contact, shipping, returns) and the
 *    owner's Quick links (`footerNavigationItems`, falling back to the
 *    header's nav, flag-filtered — B10.4) followed by the session-aware
 *    account rows (B10.3). When the owner has no quick links (an empty list
 *    is a valid, deliberate choice) the account rows still need somewhere to
 *    live, so that group's title becomes "Account" instead of disappearing.
 * 3. The legal row — hairline, the copyright, then Privacy, Terms and the
 *    platform policies index (B10.1: together with Customer care, all four
 *    standard policies + the index, always visible).
 */
export async function OliveFooter({
  business,
  collections = [],
  initialSession,
}: OliveFooterProps) {
  const { isEnabled } = await getBusinessFlags();

  const policies = await api.content
    .getSimplifiedPages({ type: "policy" })
    .catch(() => [] as { id: string; title: string; slug: string }[]);

  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const f = resolveFields(customFields, [
    "olive.global.footer-cta-heading",
    "olive.global.footer-cta-body",
    "olive.global.footer-cta-label",
    "olive.global.footer-cta-link",
    "olive.global.wordmark-tagline",
  ]);

  // Tagline: Content → Branding → Footer tagline wins; else the legacy
  // `olive.global.footer-tagline` field (retired 2026-09-26, a read-only
  // fallback — never written or cleared from here); else hidden.
  const footerTagline =
    nonBlank(business?.siteContent?.footerText) ??
    nonBlank(
      getRawCustomFieldString(customFields, "olive.global.footer-tagline"),
    );
  const ctaHeading = f["olive.global.footer-cta-heading"] ?? "";
  const ctaBody = f["olive.global.footer-cta-body"] ?? "";
  const ctaLabel = f["olive.global.footer-cta-label"] ?? "";
  const ctaLink = (f["olive.global.footer-cta-link"] ?? "").trim();
  const wordmarkTagline = f["olive.global.wordmark-tagline"] ?? "";

  // The business's own contact details, in small type under the CTA/tagline
  // (B10 doesn't mandate this, but every other adopted template surfaces it
  // in the footer). Each line is independently optional.
  const address = nonBlank(business?.businessAddress);
  const phone = nonBlank(business?.phoneNumber);
  const email = nonBlank(business?.supportEmail);
  const addressMapUrl = address ? googleMapsUrls(address).viewUrl : null;
  const hasContact = Boolean(address ?? phone ?? email);

  const name = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl;
  const logoAlt = resolveLogoAlt(business?.siteContent?.logoAltText, name);
  const year = new Date().getFullYear();

  const productsEnabled = isEnabled("products");
  const collectionsEnabled = isEnabled("collections");
  const accountsEnabled = isEnabled("customerAccounts");

  // Owner's flat footer Quick Links (B10.4): `SiteContent.footerNavigationItems`,
  // falling back to the header's own nav (owner-saved or OLIVE_DEFAULT_NAV) when
  // unset; an explicit `[]` means "no quick links". Already flat (no children)
  // and flag-filtered, so it's rendered verbatim — the Shop and Policies
  // columns below dedupe against it instead of the other way around.
  const quickLinks = resolveFooterQuickLinks({
    footerItems: business?.siteContent?.footerNavigationItems,
    navigationItems: business?.siteContent?.navigationItems,
    navDefaults: OLIVE_DEFAULT_NAV,
    isEnabled,
    // Donations "show in footer" switch (before the dedupe set below).
    donate: donateLinkOptions(business, isEnabled, "footer"),
  });
  const quickLinkHrefs = new Set(quickLinks.map((link) => link.href));

  const listedCollections = collectionsEnabled
    ? collections.slice(0, MAX_COLLECTION_LINKS)
    : [];

  // Shop column: collections (or the flag-gated defaults), deduped against
  // whatever the owner's Quick links already list — `uniqueByHref` also
  // dedupes within this column itself, which matters when there are no
  // collections: "All products" and "New arrivals" are both `/shop`, so only
  // the first survives.
  const shopLinks: FooterLink[] = uniqueByHref(
    listedCollections.length > 0
      ? [
          ...listedCollections.map((collection) => ({
            href: `/collections/${collection.slug}`,
            label: collection.name,
          })),
          ...(productsEnabled
            ? [{ href: "/shop", label: "All products" }]
            : []),
          ...(collectionsEnabled
            ? [{ href: "/collections", label: "All collections" }]
            : []),
        ]
      : [
          ...(productsEnabled
            ? [
                { href: "/shop", label: "All products" },
                { href: "/shop", label: "New arrivals" },
              ]
            : []),
          ...(collectionsEnabled
            ? [{ href: "/collections", label: "Collections" }]
            : []),
        ],
    new Set(quickLinkHrefs),
  );

  // Signed-in account rows from the flag-gated account links: "My account"
  // (settings) and "Orders" only while `orders` is on.
  const accountLinks = getAccountNavLinks({ isEnabled });
  const settingsLink = accountLinks.find((link) => link.key === "settings");
  const ordersLink = accountLinks.find((link) => link.key === "orders");
  const signedInLinks = [
    ...(settingsLink ? [{ label: "My account", href: settingsLink.href }] : []),
    ...(ordersLink ? [{ label: "Orders", href: ordersLink.href }] : []),
  ];

  // Policies (B10.1): exactly the four standard slugs Admin → Policies
  // creates, never any other policy-type page (imports, QA data).
  const bySlug = (slug: string) => policies.find((page) => page.slug === slug);
  const shippingPolicy = bySlug("shipping-policy");
  const refundPolicy = bySlug("refund-policy");
  const privacyPolicy = bySlug("privacy-policy");
  const termsOfService = bySlug("terms-of-service");

  // Customer care group: Contact (unless the owner's Quick links already
  // have it), then shipping and returns once published (no platform
  // equivalent). Privacy, terms and the platform index sit in the legal row.
  const careLinks: FooterLink[] = [
    ...(quickLinkHrefs.has("/contact")
      ? []
      : [{ href: "/contact", label: "Contact" }]),
    ...(shippingPolicy
      ? [{ href: `/${shippingPolicy.slug}`, label: "Shipping policy" }]
      : []),
    ...(refundPolicy
      ? [{ href: `/${refundPolicy.slug}`, label: "Returns & refunds" }]
      : []),
  ];

  // Legal row: privacy and terms fall back to the platform's own policy when
  // unpublished; the platform policies index is always last.
  const legalLinks: FooterLink[] = [
    {
      href: privacyPolicy
        ? `/${privacyPolicy.slug}`
        : "/platform/policies/privacy-policy",
      label: "Privacy policy",
    },
    {
      href: termsOfService
        ? `/${termsOfService.slug}`
        : "/platform/policies/terms-of-service",
      label: "Terms of service",
    },
    { href: "/platform/policies", label: "Platform policies" },
  ];

  // Social links: Content → Branding (`SiteContent.socialLinks`) wins; if it
  // resolves nothing, the legacy `olive.global.social-*` URLs (retired
  // 2026-09-26, read-only fallback) are run through the same resolver so they
  // get the same `safeHref` scheme allowlist and canonical icon/order.
  const brandingSocials = resolveSocialLinks(
    business?.siteContent?.socialLinks,
  );
  const socials =
    brandingSocials.length > 0
      ? brandingSocials
      : resolveSocialLinks(
          Object.fromEntries(
            LEGACY_SOCIAL_KEYS.map((network) => [
              network,
              getRawCustomFieldString(
                customFields,
                `olive.global.social-${network}`,
              ),
            ]),
          ),
        );

  const ctaIsExternal = /^https?:\/\//i.test(ctaLink);
  // B2.5: a CTA pointing at a flag-disabled route (e.g. /shop with products
  // off) is hidden, never re-pointed; the tagline shows in its place.
  const ctaFlag = navHrefOffFlag(ctaLink, isEnabled);
  const showCta =
    ctaLink.length > 0 &&
    ctaLabel.length > 0 &&
    (ctaFlag === null || isEnabled(ctaFlag));

  const hasIndexText = showCta || Boolean(footerTagline) || hasContact;

  const wordmark = logoUrl ? (
    <span className="olive-footer-logo">
      <Image
        src={logoUrl}
        alt={logoAlt}
        fill
        sizes="200px"
        className="object-contain object-left"
      />
    </span>
  ) : (
    <span className="olive-wordmark">{name}</span>
  );

  return (
    <footer
      className="olive-footer"
      {...sectionGroupAttr("global", "branding")}
    >
      <div
        className="mx-auto px-[var(--olive-section-pad-x)] pt-14 pb-12 lg:pt-20 lg:pb-16"
        style={{ maxWidth: "var(--olive-container)" }}
      >
        {/* ── Masthead: wordmark + tagline left, socials right ──────────── */}
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div className="flex min-w-0 flex-col items-start gap-3">
            <Link
              href="/"
              aria-label={`${name} — Home`}
              className="flex max-w-full min-w-0 items-center"
            >
              {wordmark}
            </Link>
            {wordmarkTagline ? (
              <p
                className="olive-eyebrow olive-footer-tagline"
                {...fieldAttr("olive.global.wordmark-tagline")}
              >
                {wordmarkTagline}
              </p>
            ) : null}
          </div>

          {socials.length > 0 ? (
            <ul
              className="m-0 flex list-none flex-wrap items-center gap-2 p-0"
              aria-label="Social media"
            >
              {socials.map(({ key, url, ariaLabel, Icon }) => (
                <li key={key}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${ariaLabel} (opens in new tab)`}
                    className="olive-footer-social"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* ── Index: quiet text block + contact left, link groups right ── */}
        <div
          className={
            hasIndexText
              ? "mt-12 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16"
              : "mt-12 lg:mt-16"
          }
        >
          {hasIndexText ? (
            <div className="flex max-w-md flex-col gap-8">
              {showCta ? (
                <div>
                  <h2
                    className="olive-h3"
                    {...fieldAttr("olive.global.footer-cta-heading")}
                  >
                    {ctaHeading}
                  </h2>
                  {ctaBody ? (
                    <p
                      className="olive-footer-body mt-3"
                      {...fieldAttr("olive.global.footer-cta-body")}
                    >
                      {ctaBody}
                    </p>
                  ) : null}
                  <OliveButton
                    href={ctaLink}
                    variant="link"
                    arrow
                    className="mt-4"
                    {...(ctaIsExternal
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    <span {...fieldAttr("olive.global.footer-cta-label")}>
                      {ctaLabel}
                    </span>
                    {ctaIsExternal ? (
                      <span className="sr-only"> (opens in new tab)</span>
                    ) : null}
                  </OliveButton>
                </div>
              ) : footerTagline ? (
                <p className="olive-footer-body max-w-[38ch]">
                  {footerTagline}
                </p>
              ) : null}

              {hasContact ? (
                <address className="olive-footer-address not-italic">
                  {address ? (
                    <a
                      href={addressMapUrl ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="olive-footer-link"
                    >
                      {address}
                      <span className="sr-only"> (opens in new tab)</span>
                    </a>
                  ) : null}
                  {phone ? (
                    <a
                      href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                      className="olive-footer-link olive-tabular"
                    >
                      {phone}
                    </a>
                  ) : null}
                  {email ? (
                    <a
                      href={`mailto:${email}`}
                      className="olive-footer-link"
                      style={{ overflowWrap: "anywhere" }}
                    >
                      {email}
                    </a>
                  ) : null}
                </address>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
            <OliveFooterColumn title="Shop" links={shopLinks} />
            <OliveFooterColumn title="Customer care" links={careLinks} />
            <OliveFooterColumn
              title={quickLinks.length > 0 ? "Quick links" : "Account"}
              links={quickLinks}
              extra={
                accountsEnabled ? (
                  <OliveFooterAccount
                    initialSession={initialSession}
                    signedInLinks={signedInLinks}
                  />
                ) : null
              }
            />
          </div>
        </div>
      </div>

      {/* ── Legal row: copyright + privacy, terms, platform policies ───── */}
      <div className="olive-footer-legal">
        <div
          className="mx-auto flex flex-col gap-3 px-[var(--olive-section-pad-x)] py-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-8"
          style={{ maxWidth: "var(--olive-container)" }}
        >
          <p className="m-0">
            © {year} {name}
          </p>
          <nav aria-label="Policies">
            <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-1 p-0">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="olive-footer-legal-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}

function OliveFooterColumn({
  title,
  links,
  extra,
}: {
  title: string;
  links: FooterLink[];
  /** Extra `<li>` rows after the links (the Quick links/Account column's
   *  account rows). */
  extra?: React.ReactNode;
}) {
  if (links.length === 0 && !extra) return null;
  return (
    <div>
      <h2 className="olive-footer-col-title">{title}</h2>
      <ul className="m-0 mt-4 flex list-none flex-col gap-2.5 p-0">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link
              href={link.href}
              {...externalLinkProps(link.external)}
              className="olive-footer-link"
            >
              {link.label}
              {link.external ? (
                <span className="sr-only"> (opens in new tab)</span>
              ) : null}
            </Link>
          </li>
        ))}
        {extra}
      </ul>
    </div>
  );
}
