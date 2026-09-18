import Image from "next/image";
import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";
import { TikTokIcon } from "~/components/icons/tiktok-icon";

import { resolveFields } from "../index";
import { UmscGoogleReviewLink } from "../shared/umsc-google-review-link";

const SHOP_DOORS = [
  { href: "/collections/candles", label: "Candles" },
  { href: "/collections/soaps", label: "Soaps" },
  { href: "/collections/body-care", label: "Body Care" },
  { href: "/collections/home-care", label: "Home Care" },
] as const;

export async function UmscFooter({ business }: DefaultFooterTemplateProps) {
  const name = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl;
  const logoAlt = resolveLogoAlt(business?.siteContent?.logoAltText, name);

  const { isEnabled } = await getBusinessFlags();

  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const g = resolveFields(customFields, [
    "umsc.global.footer-tagline",
    "umsc.global.visit-stores-label",
    "umsc.global.visit-stores-url",
    "umsc.global.customer-service-phone",
    "umsc.global.google-review-url",
    "umsc.global.instagram-url",
    "umsc.global.facebook-url",
    "umsc.global.tiktok-url",
  ]);
  const footerTagline =
    g["umsc.global.footer-tagline"] ??
    "Small-batch soy candles, soaps, and body care, poured and packed by hand in Detroit.";
  const visitStoresLabel =
    g["umsc.global.visit-stores-label"] ?? "Visit Our Stores";
  const visitStoresUrl = g["umsc.global.visit-stores-url"] ?? "";
  const googleReviewUrl = g["umsc.global.google-review-url"] ?? "";

  // Business-record-first, field-as-override: the business's own phone
  // number and social links (same source `vii-footer.tsx` reads) are the
  // primary source; a non-empty template field overrides it. `||`, not `??`,
  // is intentional here — both sides are plain strings and an owner-cleared
  // field (`""`) must fall through to the business record, which `??` would
  // not catch.
  const socialLinks = business?.siteContent?.socialLinks as
    | { instagram?: string; facebook?: string; tiktok?: string }
    | undefined;
  const phone =
    (g["umsc.global.customer-service-phone"] ?? "").trim() ||
    (business?.phoneNumber ?? "");
  const instagramUrl =
    (g["umsc.global.instagram-url"] ?? "").trim() ||
    (socialLinks?.instagram ?? "");
  const facebookUrl =
    (g["umsc.global.facebook-url"] ?? "").trim() ||
    (socialLinks?.facebook ?? "");
  const tiktokUrl =
    (g["umsc.global.tiktok-url"] ?? "").trim() || (socialLinks?.tiktok ?? "");

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
            <p className="umsc-serif m-0 text-[19px] leading-[1.2] text-[var(--umsc-gold-soft)]">
              Get to know UM Scented Candles
            </p>
            {footerTagline && (
              <p
                {...fieldAttr("umsc.global.footer-tagline")}
                className="umsc-sans m-0 max-w-[280px] text-[13px] leading-[1.7] text-[var(--umsc-cream-on-black)]"
              >
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
                href={`tel:${phone.replace(/\s/g, "")}`}
                {...fieldAttr("umsc.global.customer-service-phone")}
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
              links={[...SHOP_DOORS, { href: "/shop", label: "All products" }]}
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
            {(instagramUrl || facebookUrl || tiktokUrl) && (
              <div className="mb-5 flex gap-4">
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    aria-label="Instagram"
                    className="-m-3 flex items-center justify-center p-3 text-[var(--umsc-cream-on-black)] hover:text-[var(--umsc-gold-soft)]"
                  >
                    <InstagramIcon className="size-4" />
                  </a>
                )}
                {facebookUrl && (
                  <a
                    href={facebookUrl}
                    aria-label="Facebook"
                    className="-m-3 flex items-center justify-center p-3 text-[var(--umsc-cream-on-black)] hover:text-[var(--umsc-gold-soft)]"
                  >
                    <FacebookIcon className="size-4" />
                  </a>
                )}
                {tiktokUrl && (
                  <a
                    href={tiktokUrl}
                    aria-label="TikTok"
                    className="-m-3 flex items-center justify-center p-3 text-[var(--umsc-cream-on-black)] hover:text-[var(--umsc-gold-soft)]"
                  >
                    <TikTokIcon className="size-4" />
                  </a>
                )}
              </div>
            )}
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
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h2 className="umsc-sans mb-5 text-[10px] font-medium tracking-[0.28em] text-[var(--umsc-cream-on-black)] uppercase opacity-80">
        {title}
      </h2>
      <ul className="flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.href + link.label}>
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
