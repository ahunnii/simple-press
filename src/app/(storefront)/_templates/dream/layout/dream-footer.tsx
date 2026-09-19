import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";

import { resolveDreamNav } from "../lib/nav";
import { resolveDreamFields } from "../lib/resolve-fields";
import { DreamSocialLinks } from "../shared/dream-social-links";

const FIELD_KEYS = [
  "dream.global.footer-signoff",
  "dream.global.footer-signoff-accent",
  "dream.global.footer-tagline",
  "dream.global.service-area",
  "dream.global.contact-email",
  "dream.global.contact-phone",
  "dream.global.contact-hours",
  "dream.global.header-cta-label",
  "dream.global.header-cta-url",
];

/**
 * Paper footer, hairline top rule, three columns (design.md "Chrome ›
 * Footer"): brand (mini logo + script sign-off + service area), links
 * (mirrors Admin → Content → Navigation top-level items via
 * `resolveDreamNav`, plus the header CTA), contact (email, phone, hours,
 * then the Branding social icon row — each hidden when blank/unset). Policy
 * links row falls back to `/platform/policies/*` when no merchant Page
 * exists, mirroring `wealth-footer.tsx`.
 */
export async function DreamFooter({ business }: DefaultFooterTemplateProps) {
  const name = business?.name ?? "";
  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const f = resolveDreamFields(customFields, FIELD_KEYS);
  const signoff = f["dream.global.footer-signoff"] ?? "";
  const signoffAccent = f["dream.global.footer-signoff-accent"] ?? "";
  const tagline = f["dream.global.footer-tagline"] ?? "";
  const serviceArea = f["dream.global.service-area"] ?? "";
  const email = f["dream.global.contact-email"] ?? "";
  const phone = f["dream.global.contact-phone"] ?? "";
  const hours = f["dream.global.contact-hours"] ?? "";
  const ctaLabel = f["dream.global.header-cta-label"] ?? "Estimate Quote";
  const ctaUrl = f["dream.global.header-cta-url"] ?? "/contact";
  const navItems = resolveDreamNav(business?.siteContent?.navigationItems);

  const logoUrl =
    business?.siteContent?.logoUrl ?? "/templates/dream/images/logo.webp";
  const logoAlt = resolveLogoAlt(business?.siteContent?.logoAltText, name);

  const policies = await api.content.getSimplifiedPages({ type: "policy" });
  const privacyPolicy = policies.find((p) => p.slug === "privacy-policy");
  const termsOfService = policies.find((p) => p.slug === "terms-of-service");

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
          {tagline ? (
            <p
              className="dream-footer-tagline"
              {...fieldAttr("dream.global.footer-tagline")}
            >
              {tagline}
            </p>
          ) : null}
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
          {navItems.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className="dream-footer-link"
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
            >
              {item.label}
              {item.external ? (
                <span className="sr-only"> (opens in new tab)</span>
              ) : null}
            </Link>
          ))}
          <Link href={ctaUrl} className="dream-footer-link">
            {ctaLabel}
          </Link>
        </nav>

        {/* Contact column — every line hidden when blank */}
        <div className="dream-footer-col dream-footer-col--contact">
          {email ? (
            <p>
              <a href={`mailto:${email}`} className="dream-link">
                {email}
              </a>
            </p>
          ) : null}
          {phone ? (
            <p>
              <a
                href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                className="dream-link"
              >
                {phone}
              </a>
            </p>
          ) : null}
          {hours ? <p>{hours}</p> : null}
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
