import Image from "next/image";
import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import type { NavItem } from "~/app/(storefront)/_components/nav";
import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { getRawCustomFieldString } from "~/lib/template-fields";
import { api } from "~/trpc/server";
import {
  externalLinkProps,
  filterNavByFlags,
  resolveNav,
} from "~/app/(storefront)/_components/nav";

import { resolveViiLocationTag } from "../shared/vii-location-tag";
import { nonBlank } from "../shared/vii-non-blank";
import { hasViiSocialLinks, ViiSocialLinks } from "../shared/vii-social-links";
import { ViiFooterAccount } from "./vii-footer-account";

/** Same shipped default as `vii-header.tsx`'s `DEFAULT_NAV_LINKS` — the two
 *  files each keep their own copy (server vs. client component; no shared
 *  `lib/nav.ts` here yet) rather than reaching across the boundary, same as
 *  pollen's footer/header pair. */
const DEFAULT_NAV_LINKS: NavItem[] = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

const columnHeadingStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "10px",
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  color: "var(--vii-ink-soft)",
  fontWeight: 500,
  marginBottom: "20px",
};

const columnLinkStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: "13px",
  color: "var(--vii-navy)",
  textDecoration: "none",
  lineHeight: 1.5,
  transition: "opacity 0.4s var(--vii-ease)",
  opacity: 0.85,
};

export async function ViiFooter({ business }: DefaultFooterTemplateProps) {
  const email = business?.supportEmail?.trim();
  const phone = business?.phoneNumber?.trim();
  const address = business?.businessAddress?.trim();
  const hourRows = formatBusinessHours(
    parseBusinessHours(business?.businessHours),
  );
  const name = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl;
  const logoAlt = resolveLogoAlt(business?.siteContent?.logoAltText, name);

  const { isEnabled } = await getBusinessFlags();

  const customFields = business?.siteContent?.customFields;

  const locationTag = resolveViiLocationTag(business, customFields);

  // Tagline: Content → Branding → Footer tagline wins; else the legacy
  // `vii.global.footer-tagline` field (retired 2026-09-25, a read-only
  // fallback — never written or cleared from here); else hidden.
  const footerTagline =
    nonBlank(business?.siteContent?.footerText) ??
    nonBlank(
      getRawCustomFieldString(customFields, "vii.global.footer-tagline"),
    );

  const socialLinks = business?.siteContent?.socialLinks;

  const policies = await api.content.getSimplifiedPages({ type: "policy" });
  const privacyPolicy = policies.find((p) => p.slug === "privacy-policy");
  const termsOfService = policies.find((p) => p.slug === "terms-of-service");
  const shippingPolicy = policies.find((p) => p.slug === "shipping-policy");
  const refundPolicy = policies.find((p) => p.slug === "refund-policy");

  // Owner nav, grouped (PF11, B10.2/B10.4): childless top-level links in one
  // "Quick Links" column, plus one short column per parent with children,
  // headed by its own label (pollen footer pattern). Same shared route→flag
  // filter (P-NAV-FLAGS) the header applies, so a flag-disabled route never
  // shows here even if it's in the owner's saved nav.
  const footerNav = filterNavByFlags(
    resolveNav(business?.siteContent?.navigationItems, DEFAULT_NAV_LINKS),
    isEnabled,
  );
  const mainLinks = footerNav.filter(
    (item) => item.href.trim() && !item.children?.some((c) => c.href.trim()),
  );
  const groupColumns = footerNav
    .map((item) => ({
      label: item.label,
      href: item.href,
      external: item.external,
      links: (item.children ?? []).filter((c) => c.href.trim()),
    }))
    .filter((group) => group.links.length > 0);

  return (
    <footer
      {...sectionGroupAttr("global", "branding")}
      style={{
        background: "var(--vii-paper)",
        color: "var(--vii-navy)",
      }}
    >
      {/* ── Main grid ── */}
      <div
        className="mx-auto grid gap-12 px-8 pt-16 pb-10"
        style={{
          maxWidth: "1320px",
        }}
      >
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-[1.6fr_2.4fr]">
          {/* ── Col 1: Wordmark + tagline + social ── */}
          <div className="flex flex-col gap-6">
            {/* Wordmark */}
            {logoUrl ? (
              <div className="relative h-12 w-28">
                <Image
                  src={logoUrl}
                  alt={logoAlt}
                  fill
                  sizes="112px"
                  className="object-contain object-left"
                />
              </div>
            ) : (
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontSize: "28px",
                    fontWeight: 500,
                    letterSpacing: "0.02em",
                    color: "var(--vii-navy)",
                    lineHeight: 1,
                  }}
                >
                  <em>{name}</em>
                </div>
                {locationTag && (
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "9px",
                      letterSpacing: "0.36em",
                      textTransform: "uppercase",
                      color: "var(--vii-ink-soft)",
                      fontWeight: 400,
                      marginTop: "6px",
                    }}
                  >
                    {locationTag}
                  </div>
                )}
              </div>
            )}

            {/* Tagline */}
            {footerTagline && (
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "13px",
                  lineHeight: 1.7,
                  color: "var(--vii-ink-soft)",
                  maxWidth: "280px",
                }}
              >
                {footerTagline}
              </p>
            )}

            {/* Social icons */}
            {hasViiSocialLinks(socialLinks) && (
              <ViiSocialLinks socialLinks={socialLinks} />
            )}
          </div>

          {/* ── Right: owner-nav columns + account + contact ── */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3">
            {mainLinks.length > 0 && (
              <ViiFooterCol
                title="Quick Links"
                links={mainLinks.map((l) => ({
                  href: l.href,
                  label: l.label,
                  external: l.external,
                }))}
              />
            )}

            {groupColumns.map((group, g) => (
              <ViiFooterCol
                key={`${group.label}-${g}`}
                title={group.label}
                titleHref={group.href || undefined}
                titleExternal={group.external}
                links={group.links.map((l) => ({
                  href: l.href,
                  label: l.label,
                  external: l.external,
                }))}
              />
            ))}

            {/* Account — omitted when customerAccounts is off (PF10, B10.3) */}
            {isEnabled("customerAccounts") && (
              <ViiFooterAccount
                ordersEnabled={isEnabled("orders")}
                linkStyle={columnLinkStyle}
                headingStyle={columnHeadingStyle}
              />
            )}

            {/* ── Contact info ── */}
            {(!!address || !!email || !!phone || hourRows.length > 0) && (
              <div>
                <h2 style={columnHeadingStyle}>Contact</h2>

                {address && (
                  <div style={{ marginBottom: "16px" }}>
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "var(--vii-navy)",
                        marginBottom: "4px",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      Location
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "13px",
                        lineHeight: 1.8,
                        color: "var(--vii-ink-soft)",
                      }}
                    >
                      {address}
                    </p>
                  </div>
                )}

                {hourRows.length > 0 && (
                  <div style={{ marginBottom: "16px" }}>
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "var(--vii-navy)",
                        marginBottom: "4px",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      Hours
                    </p>
                    <div
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "13px",
                        lineHeight: 1.8,
                        color: "var(--vii-ink-soft)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      {hourRows.map((row) => (
                        <div
                          key={row.label}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <span style={{ color: "var(--vii-navy)" }}>
                            {row.label}
                          </span>
                          <span>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!!email || !!phone) && (
                  <div>
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "var(--vii-navy)",
                        marginBottom: "4px",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      Reach out
                    </p>
                    <div
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "13px",
                        lineHeight: 1.8,
                        color: "var(--vii-ink-soft)",
                      }}
                    >
                      {email && (
                        <a
                          href={`mailto:${email}`}
                          className="block hover:opacity-80"
                          style={{
                            color: "inherit",
                            transition: "opacity 0.4s var(--vii-ease)",
                          }}
                        >
                          {email}
                        </a>
                      )}
                      {phone && (
                        <a
                          href={`tel:${phone.replace(/\s/g, "")}`}
                          className="block hover:opacity-80"
                          style={{
                            color: "inherit",
                            transition: "opacity 0.4s var(--vii-ease)",
                          }}
                        >
                          {phone}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div
        className="mx-auto flex flex-col gap-3 px-8 py-5 sm:flex-row sm:items-center sm:justify-between"
        style={{
          maxWidth: "1320px",
          borderTop:
            "1px solid color-mix(in srgb, var(--vii-navy) 12%, transparent)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "11px",
            letterSpacing: "0.1em",
            color: "var(--vii-ink-soft)",
          }}
        >
          © {new Date().getFullYear()} {name}
        </span>

        {/* Mandatory, non-hideable policy strip (B10.1, PF9) — privacy/terms
            fall back to the platform's own policy; shipping/refund have no
            platform equivalent, so they only appear once published. Index
            last. */}
        <div
          className="flex flex-wrap gap-5"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "10px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--vii-ink-soft)",
          }}
        >
          <Link
            href={
              privacyPolicy
                ? `/${privacyPolicy.slug}`
                : "/platform/policies/privacy-policy"
            }
            className="hover:opacity-80"
            style={{
              color: "inherit",
              transition: "opacity 0.4s var(--vii-ease)",
            }}
          >
            Privacy Policy
          </Link>

          <Link
            href={
              termsOfService
                ? `/${termsOfService.slug}`
                : "/platform/policies/terms-of-service"
            }
            className="hover:opacity-80"
            style={{
              color: "inherit",
              transition: "opacity 0.4s var(--vii-ease)",
            }}
          >
            Terms of Service
          </Link>

          {shippingPolicy && (
            <Link
              href={`/${shippingPolicy.slug}`}
              className="hover:opacity-80"
              style={{
                color: "inherit",
                transition: "opacity 0.4s var(--vii-ease)",
              }}
            >
              Shipping Policy
            </Link>
          )}

          {refundPolicy && (
            <Link
              href={`/${refundPolicy.slug}`}
              className="hover:opacity-80"
              style={{
                color: "inherit",
                transition: "opacity 0.4s var(--vii-ease)",
              }}
            >
              Refund Policy
            </Link>
          )}

          <Link
            href="/platform/policies/"
            className="hover:opacity-80"
            style={{
              color: "inherit",
              transition: "opacity 0.4s var(--vii-ease)",
            }}
          >
            Platform Policies
          </Link>
        </div>
      </div>
    </footer>
  );
}

function ViiFooterCol({
  title,
  titleHref,
  titleExternal,
  links,
}: {
  title: string;
  titleHref?: string;
  titleExternal?: boolean;
  links: { href: string; label: string; external?: boolean }[];
}) {
  return (
    <div>
      <h2 style={columnHeadingStyle}>
        {titleHref ? (
          <Link
            href={titleHref}
            {...externalLinkProps(titleExternal)}
            style={{ color: "inherit", textDecoration: "none" }}
            className="hover:opacity-80"
          >
            {title}
            {titleExternal ? (
              <span className="sr-only"> (opens in new tab)</span>
            ) : null}
          </Link>
        ) : (
          title
        )}
      </h2>
      <ul className="flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              {...externalLinkProps(link.external)}
              style={columnLinkStyle}
              className="hover:opacity-100"
            >
              {link.label}
              {link.external ? (
                <span className="sr-only"> (opens in new tab)</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
