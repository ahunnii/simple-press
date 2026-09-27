import Image from "next/image";
import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveLogoAlt } from "~/lib/logo-alt";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";
import { parseTemplateListRows } from "~/lib/template-fields";
import { api } from "~/trpc/server";

import { resolveFields, UMSC_FOOTER_SHOP_LINKS_DEFAULT } from "../index";
import {
  resolveUmscContactDetails,
  umscTelHref,
} from "../shared/umsc-contact-details";
import { UmscGoogleReviewLink } from "../shared/umsc-google-review-link";
import { UmscSocialIcons } from "../shared/umsc-social-icons";

// Re-exported so the pre-migration import path (and the snapshot test) keep
// working — the rows themselves now live in `../index.ts`'s `defaultRows`.
export { UMSC_FOOTER_SHOP_LINKS_DEFAULT };

export async function UmscFooter({ business }: DefaultFooterTemplateProps) {
  const name = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl;
  const logoAlt = resolveLogoAlt(business?.siteContent?.logoAltText, name);

  const { isEnabled } = await getBusinessFlags();

  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const g = resolveFields(customFields, [
    "umsc.global.visit-stores-label",
    "umsc.global.visit-stores-url",
    "umsc.global.google-review-url",
    "umsc.global.footer-shop-heading",
  ]);
  const visitStoresLabel =
    g["umsc.global.visit-stores-label"] ?? "Visit Our Stores";
  const visitStoresUrl = g["umsc.global.visit-stores-url"] ?? "";
  const googleReviewUrl = g["umsc.global.google-review-url"] ?? "";
  const footerShopHeading = g["umsc.global.footer-shop-heading"] ?? "";

  const shopLinkRows = parseTemplateListRows(
    customFields?.["umsc.global.footer-shop-links"],
  ) as { _id?: string; label?: string; url?: string }[];
  const shopLinks =
    shopLinkRows.length > 0 ? shopLinkRows : UMSC_FOOTER_SHOP_LINKS_DEFAULT;

  // Settings (phone) and Content → Branding (footer tagline, social links)
  // own this data; saved values from the retired `umsc.global.*` fields are
  // read only as a silent fallback — see `resolveUmscContactDetails`.
  const { phone, footerTagline, socials } = resolveUmscContactDetails(business);

  const policies = await api.content.getSimplifiedPages({ type: "policy" });
  const storePolicy =
    policies.find((p) => p.slug === "privacy-policy") ??
    policies.find((p) => p.slug === "terms-of-service");
  const privacyPolicy = policies.find((p) => p.slug === "privacy-policy");
  const termsOfService = policies.find((p) => p.slug === "terms-of-service");

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
            {visitStoresUrl && (
              <Link
                href={visitStoresUrl}
                {...fieldAttr("umsc.global.visit-stores-label")}
                className="umsc-sans text-[13px] font-semibold text-[var(--umsc-gold-soft)] no-underline hover:underline"
              >
                {visitStoresLabel}
              </Link>
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

          {/* Col 2: Shop */}
          {isEnabled("products") && (
            <UmscFooterCol
              title="Shop"
              links={[
                ...shopLinks.map((row, i) => ({
                  href: typeof row.url === "string" ? row.url : "",
                  label: typeof row.label === "string" ? row.label : "",
                  itemIndex: i,
                })),
                { href: "/shop", label: "All products" },
              ]}
              fieldKey="umsc.global.footer-shop-links"
            />
          )}

          {/* Col 3: Help */}
          <UmscFooterCol
            title="Help"
            links={[
              { href: "/faq", label: "FAQ" },
              {
                href: storePolicy
                  ? `/${storePolicy.slug}`
                  : "/platform/policies/privacy-policy",
                label: "Store Policy",
              },
              { href: "/contact", label: "Contact" },
              { href: "/contact?type=custom", label: "Custom orders" },
            ]}
          />

          {/* Col 4: Follow */}
          <div>
            <h2 className="umsc-sans mb-5 text-[10px] font-medium tracking-[0.28em] text-[var(--umsc-cream-on-black)] uppercase opacity-80">
              Follow
            </h2>
            <UmscSocialIcons
              links={socials}
              className="mb-5"
              linkClassName="-m-3 flex items-center justify-center p-3 text-[var(--umsc-cream-on-black)] hover:text-[var(--umsc-gold-soft)]"
            />
            <UmscGoogleReviewLink
              href={googleReviewUrl}
              className="text-[var(--umsc-cream-on-black)]"
            />
          </div>
        </div>
      </div>

      <div
        className="mx-auto flex flex-col gap-3 border-t border-[var(--umsc-line-gold)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8"
        style={{ maxWidth: "var(--umsc-container)" }}
      >
        <span className="umsc-sans text-[11px] tracking-[0.05em] text-[var(--umsc-cream-on-black)] opacity-80">
          © {new Date().getFullYear()} {name}
        </span>
        <div className="umsc-sans flex flex-wrap gap-5 text-[10px] tracking-[0.1em] text-[var(--umsc-cream-on-black)] uppercase opacity-80">
          <Link
            href={
              privacyPolicy
                ? `/${privacyPolicy.slug}`
                : "/platform/policies/privacy-policy"
            }
            className="text-inherit no-underline hover:opacity-100"
          >
            Privacy Policy
          </Link>
          <Link
            href={
              termsOfService
                ? `/${termsOfService.slug}`
                : "/platform/policies/terms-of-service"
            }
            className="text-inherit no-underline hover:opacity-100"
          >
            Terms of Service
          </Link>
          <Link
            href="/platform/policies/"
            className="text-inherit no-underline hover:opacity-100"
          >
            Platform Policies
          </Link>
        </div>
      </div>
    </footer>
  );
}

function UmscFooterCol({
  title,
  links,
  fieldKey,
}: {
  title: string;
  links: { href: string; label: string; itemIndex?: number }[];
  /** List field owning `itemIndex`-marked rows (e.g. `umsc.global.footer-shop-links`), for `data-sp-item`. */
  fieldKey?: string;
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
                className="umsc-sans text-[13px] text-[var(--umsc-cream-on-black)] no-underline opacity-90 hover:opacity-100"
              >
                {link.label}
              </Link>
            </li>
          ))}
      </ul>
    </div>
  );
}
