import Image from "next/image";
import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { api } from "~/trpc/server";
import { InstagramIcon } from "~/components/icons/instagram-icon";
import { FacebookIcon } from "~/components/icons/facebook-icon";

import { resolveFields } from "../index";

export async function ViiFooter({ business }: DefaultFooterTemplateProps) {
  const email = business?.supportEmail;
  const phone = business?.phoneNumber;
  const address = business?.businessAddress;
  const name = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl;

  const { isEnabled } = await getBusinessFlags();

  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const g = resolveFields(customFields, [
    "vii.global.location-tag",
    "vii.global.footer-tagline",
  ]);
  const locationTag = g["vii.global.location-tag"] ?? "";
  const footerTagline =
    g["vii.global.footer-tagline"] ??
    "A sanctuary for the senses. Personalized wellness experiences crafted for your body, mind, and spirit.";

  const socialLinks = business?.siteContent?.socialLinks as
    | {
        instagram?: string;
        facebook?: string;
        twitter?: string;
        tiktok?: string;
      }
    | undefined;

  const policies = await api.content.getSimplifiedPages({ type: "policy" });
  const privacyPolicy = policies.find((p) => p.slug === "privacy-policy");
  const termsOfService = policies.find((p) => p.slug === "terms-of-service");

  const SHOP_LINKS = [
    ...(isEnabled("products") ? [{ href: "/shop", label: "Shop All" }] : []),
    ...(isEnabled("collections")
      ? [{ href: "/collections", label: "Collections" }]
      : []),
  ] as const;

  const QUICK_LINKS = [
    { href: "/about", label: "About Us" },
    ...(isEnabled("blog") ? [{ href: "/blog", label: "Journal" }] : []),
    { href: "/contact", label: "Contact" },
    ...(isEnabled("testimonials")
      ? [{ href: "/testimonials", label: "Reviews" }]
      : []),
  ] as const;

  return (
    <footer
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
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          {/* ── Col 1: Wordmark + tagline + social ── */}
          <div className="flex flex-col gap-6">
            {/* Wordmark */}
            {logoUrl ? (
              <div className="relative h-12 w-28">
                <Image
                  src={logoUrl}
                  alt={name}
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
            {(socialLinks?.instagram ?? socialLinks?.facebook) && (
              <div className="flex gap-4">
                {socialLinks?.instagram && (
                  <a
                    href={socialLinks.instagram}
                    className="-m-3 flex items-center justify-center p-3 transition-opacity hover:opacity-70"
                    style={{ color: "var(--vii-ink-soft)" }}
                    aria-label="Instagram"
                  >
                    <InstagramIcon className="h-4 w-4" />
                  </a>
                )}
                {socialLinks?.facebook && (
                  <a
                    href={socialLinks.facebook}
                    className="-m-3 flex items-center justify-center p-3 transition-opacity hover:opacity-70"
                    style={{ color: "var(--vii-ink-soft)" }}
                    aria-label="Facebook"
                  >
                    <FacebookIcon className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ── Col 2: Shop links ── */}
          {SHOP_LINKS.length > 0 && (
            <ViiFooterCol
              title="Shop"
              links={SHOP_LINKS.map((l) => ({ href: l.href, label: l.label }))}
            />
          )}

          {/* ── Col 3: Quick links ── */}
          <ViiFooterCol
            title="Quick Links"
            links={QUICK_LINKS.map((l) => ({ href: l.href, label: l.label }))}
          />

          {/* ── Col 4: Contact info ── */}
          {(address ?? email ?? phone) && (
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "10px",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "var(--vii-ink-soft)",
                  fontWeight: 500,
                  marginBottom: "20px",
                }}
              >
                Contact
              </h2>

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

              {(email ?? phone) && (
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
                        className="block transition-opacity hover:opacity-80"
                        style={{ color: "inherit" }}
                      >
                        {email}
                      </a>
                    )}
                    {phone && <span className="block">{phone}</span>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div
        className="mx-auto flex flex-col gap-3 px-8 py-5 sm:flex-row sm:items-center sm:justify-between"
        style={{
          maxWidth: "1320px",
          borderTop: "1px solid rgba(30,53,64,0.12)",
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
          {privacyPolicy ? (
            <Link
              href={`/${privacyPolicy.slug}`}
              className="transition-opacity hover:opacity-80"
              style={{ color: "inherit" }}
            >
              Privacy Policy
            </Link>
          ) : (
            <Link
              href="/platform/policies/privacy-policy"
              className="transition-opacity hover:opacity-80"
              style={{ color: "inherit" }}
            >
              Privacy Policy
            </Link>
          )}

          {termsOfService ? (
            <Link
              href={`/${termsOfService.slug}`}
              className="transition-opacity hover:opacity-80"
              style={{ color: "inherit" }}
            >
              Terms of Service
            </Link>
          ) : (
            <Link
              href="/platform/policies/terms-of-service"
              className="transition-opacity hover:opacity-80"
              style={{ color: "inherit" }}
            >
              Terms of Service
            </Link>
          )}

          <Link
            href="/platform/policies/"
            className="transition-opacity hover:opacity-80"
            style={{ color: "inherit" }}
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
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h2
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "10px",
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "var(--vii-ink-soft)",
          fontWeight: 500,
          marginBottom: "20px",
        }}
      >
        {title}
      </h2>
      <ul className="flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "13px",
                color: "var(--vii-navy)",
                textDecoration: "none",
                lineHeight: 1.5,
                transition: "opacity 0.2s",
                opacity: 0.85,
              }}
              className="hover:opacity-100"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
