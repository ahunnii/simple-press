import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import type { OliveNavCollection } from "./olive-nav-overlay";
import type { Session } from "~/server/better-auth/config";
import { googleMapsUrls } from "~/lib/address/coordinates";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { resolveSocialLinks } from "~/lib/social-links";
import { getRawCustomFieldString } from "~/lib/template-fields";
import { api } from "~/trpc/server";
import {
  externalLinkProps,
  getAccountNavLinks,
  navHrefFlag,
  resolveFooterQuickLinks,
} from "~/app/(storefront)/_components/nav";

import { resolveFields } from "..";
import { OliveLeafMark } from "../shared/olive-leaf-mark";
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
 * The book cover. A sage field carrying the call-to-action card and three
 * dense link columns, then a deep leaf strip where the wordmark is set huge
 * and clipped by the page edge like the print on a shopping bag.
 *
 * Density courage on purpose: the link columns are tight (0.8125rem, 0.5rem
 * row gap), not airy — this is the index of the book, not another section.
 *
 * Columns: Shop (collections), Policies (the four standard policies + the
 * platform index, B10.1) and the owner's Quick links (`footerNavigationItems`,
 * falling back to the header's nav, flag-filtered — B10.4), then the
 * session-aware account rows, B10.3. When the owner has no quick links (an
 * empty list is a valid, deliberate choice) the account rows still need
 * somewhere to live, so that column's title becomes "Account" instead of
 * disappearing.
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

  // The business's own contact details, shown in the sage field next to the
  // CTA/tagline (B10 doesn't mandate this, but every other adopted template
  // surfaces it in the footer — olive had nowhere for it before). Each line
  // is independently optional.
  const address = nonBlank(business?.businessAddress);
  const phone = nonBlank(business?.phoneNumber);
  const email = nonBlank(business?.supportEmail);
  const addressMapUrl = address ? googleMapsUrls(address).viewUrl : null;
  const hasContact = Boolean(address ?? phone ?? email);

  const name = business?.name ?? "";
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

  // Policies column (B10.1): exactly the four standard slugs Admin → Policies
  // creates, never any other policy-type page (imports, QA data). Privacy and
  // terms fall back to the platform's own policy when unpublished; shipping
  // and returns have no platform equivalent, so they show once published.
  // The platform policies index is always last.
  const bySlug = (slug: string) => policies.find((page) => page.slug === slug);
  const shippingPolicy = bySlug("shipping-policy");
  const refundPolicy = bySlug("refund-policy");
  const privacyPolicy = bySlug("privacy-policy");
  const termsOfService = bySlug("terms-of-service");

  const policyLinks: FooterLink[] = [
    // Contact is kept here unless the owner's Quick links already have it.
    ...(quickLinkHrefs.has("/contact")
      ? []
      : [{ href: "/contact", label: "Contact" }]),
    ...(shippingPolicy
      ? [{ href: `/${shippingPolicy.slug}`, label: "Shipping policy" }]
      : []),
    ...(refundPolicy
      ? [{ href: `/${refundPolicy.slug}`, label: "Returns & refunds" }]
      : []),
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
  const ctaFlag = navHrefFlag(ctaLink);
  const showCta =
    ctaLink.length > 0 &&
    ctaLabel.length > 0 &&
    (ctaFlag === null || isEnabled(ctaFlag));

  // The sage field's left column (CTA/tagline, contact block, socials) is
  // only worth a grid cell when at least one of the three has content —
  // otherwise the link columns alone should fill the row, as before.
  const hasLeftColumn = showCta || Boolean(footerTagline) || hasContact || socials.length > 0;

  return (
    <footer {...sectionGroupAttr("global", "branding")}>
      {/* ── The cover: sage field ─────────────────────────────────────── */}
      <div className="olive-footer-field">
        <div
          className="mx-auto grid gap-10 px-[var(--olive-section-pad-x)] py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16 lg:py-16"
          style={{ maxWidth: "var(--olive-container)" }}
        >
          {hasLeftColumn ? (
            <div className="flex flex-col gap-8">
              {showCta ? (
                <div className="olive-card max-w-md p-7 sm:p-8">
                  <h2
                    className="olive-h3"
                    {...fieldAttr("olive.global.footer-cta-heading")}
                  >
                    {ctaHeading}
                  </h2>
                  {ctaBody ? (
                    <p
                      className="mt-2 text-[0.9375rem] leading-relaxed"
                      style={{ color: "var(--olive-ink-soft)" }}
                      {...fieldAttr("olive.global.footer-cta-body")}
                    >
                      {ctaBody}
                    </p>
                  ) : null}
                  {ctaIsExternal ? (
                    <a
                      href={ctaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="olive-btn olive-btn-primary mt-6"
                    >
                      <span {...fieldAttr("olive.global.footer-cta-label")}>
                        {ctaLabel}
                      </span>
                      <span className="sr-only"> (opens in new tab)</span>
                    </a>
                  ) : (
                    <Link
                      href={ctaLink}
                      className="olive-btn olive-btn-primary mt-6"
                      {...fieldAttr("olive.global.footer-cta-label")}
                    >
                      {ctaLabel}
                    </Link>
                  )}
                </div>
              ) : footerTagline ? (
                <p
                  className="max-w-[34ch] text-[1.0625rem] leading-relaxed"
                  style={{ color: "var(--olive-white)" }}
                >
                  {footerTagline}
                </p>
              ) : null}

              {hasContact ? (
                <address className="not-italic flex flex-col gap-1.5 text-[0.875rem] leading-relaxed">
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
                      className="olive-footer-link"
                    >
                      {phone}
                    </a>
                  ) : null}
                  {email ? (
                    <a
                      href={`mailto:${email}`}
                      className="olive-footer-link break-all"
                      style={{ overflowWrap: "anywhere" }}
                    >
                      {email}
                    </a>
                  ) : null}
                </address>
              ) : null}

              {socials.length > 0 ? (
                <ul className="-ml-[13px] m-0 flex list-none items-center gap-1 p-0">
                  {socials.map(({ key, url, ariaLabel, Icon }) => (
                    <li key={key}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${ariaLabel} (opens in new tab)`}
                        className="olive-icon-btn olive-icon-btn-invert"
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3">
            <OliveFooterColumn title="Shop" links={shopLinks} />
            <OliveFooterColumn title="Policies" links={policyLinks} />
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

      {/* ── The spine: deep leaf strip with the clipped wordmark ──────── */}
      <div className="olive-footer-strip">
        <div
          className="mx-auto flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-[var(--olive-section-pad-x)] pt-9"
          style={{ maxWidth: "var(--olive-container)" }}
        >
          <div className="flex items-center gap-2.5">
            <OliveLeafMark size={20} />
            {wordmarkTagline ? (
              <span
                className="text-[0.6875rem] tracking-[0.14em] uppercase"
                {...fieldAttr("olive.global.wordmark-tagline")}
              >
                {wordmarkTagline}
              </span>
            ) : null}
          </div>

          <p
            className="text-[0.6875rem] tracking-[0.06em]"
            style={{ color: "var(--olive-sage-tint)" }}
          >
            © {year} {name}
          </p>
        </div>

        {/* The wordmark as the bag's own print: huge, tracked, cut by the
            page edge. Decorative — the name is already in the copyright. */}
        <span aria-hidden="true" className="olive-footer-watermark mt-7">
          {name}
        </span>
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
      <ul className="m-0 mt-3.5 flex list-none flex-col gap-2 p-0">
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
