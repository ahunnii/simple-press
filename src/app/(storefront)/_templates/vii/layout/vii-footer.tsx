import Image from "next/image";
import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";
import { TikTokIcon } from "~/components/icons/tiktok-icon";
import { TwitterIcon } from "~/components/icons/twitter-icon";
import { YouTubeIcon } from "~/components/icons/youtube-icon";

import { resolveFields } from "../index";

export async function ViiFooter({ business }: DefaultFooterTemplateProps) {
  const email = business?.supportEmail;
  const phone = business?.phoneNumber;
  const address = business?.businessAddress;
  const hourRows = formatBusinessHours(
    parseBusinessHours(business?.businessHours),
  );
  const name = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl;
  const logoAlt = resolveLogoAlt(business?.siteContent?.logoAltText, name);

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
        youtube?: string;
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
    ...(isEnabled("blog") ? [{ href: "/blog", label: "Blog" }] : []),
    { href: "/contact", label: "Contact" },
    ...(isEnabled("testimonials")
      ? [{ href: "/testimonials", label: "Reviews" }]
      : []),
  ] as const;

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
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
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
                    {...fieldAttr("vii.global.location-tag")}
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
                {...fieldAttr("vii.global.footer-tagline")}
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
            {(socialLinks?.instagram ??
              socialLinks?.facebook ??
              socialLinks?.twitter ??
              socialLinks?.tiktok ??
              socialLinks?.youtube) && (
              <div className="flex gap-4">
                {socialLinks?.instagram && (
                  <a
                    href={socialLinks.instagram}
                    className="-m-3 flex items-center justify-center p-3 hover:opacity-70"
                    style={{
                      color: "var(--vii-ink-soft)",
                      transition: "opacity 0.4s var(--vii-ease)",
                    }}
                    aria-label="Instagram"
                  >
                    <InstagramIcon className="h-4 w-4" />
                  </a>
                )}
                {socialLinks?.facebook && (
                  <a
                    href={socialLinks.facebook}
                    className="-m-3 flex items-center justify-center p-3 hover:opacity-70"
                    style={{
                      color: "var(--vii-ink-soft)",
                      transition: "opacity 0.4s var(--vii-ease)",
                    }}
                    aria-label="Facebook"
                  >
                    <FacebookIcon className="h-4 w-4" />
                  </a>
                )}
                {socialLinks?.twitter && (
                  <a
                    href={socialLinks.twitter}
                    className="-m-3 flex items-center justify-center p-3 hover:opacity-70"
                    style={{
                      color: "var(--vii-ink-soft)",
                      transition: "opacity 0.4s var(--vii-ease)",
                    }}
                    aria-label="X (Twitter)"
                  >
                    <TwitterIcon className="h-4 w-4" />
                  </a>
                )}
                {socialLinks?.tiktok && (
                  <a
                    href={socialLinks.tiktok}
                    className="-m-3 flex items-center justify-center p-3 hover:opacity-70"
                    style={{
                      color: "var(--vii-ink-soft)",
                      transition: "opacity 0.4s var(--vii-ease)",
                    }}
                    aria-label="TikTok"
                  >
                    <TikTokIcon className="h-4 w-4" />
                  </a>
                )}
                {socialLinks?.youtube && (
                  <a
                    href={socialLinks.youtube}
                    className="-m-3 flex items-center justify-center p-3 hover:opacity-70"
                    style={{
                      color: "var(--vii-ink-soft)",
                      transition: "opacity 0.4s var(--vii-ease)",
                    }}
                    aria-label="YouTube"
                  >
                    <YouTubeIcon className="h-4 w-4" />
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
          {(address ?? email ?? phone ?? hourRows.length > 0) && (
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
              className="hover:opacity-80"
              style={{
                color: "inherit",
                transition: "opacity 0.4s var(--vii-ease)",
              }}
            >
              Privacy Policy
            </Link>
          ) : (
            <Link
              href="/platform/policies/privacy-policy"
              className="hover:opacity-80"
              style={{
                color: "inherit",
                transition: "opacity 0.4s var(--vii-ease)",
              }}
            >
              Privacy Policy
            </Link>
          )}

          {termsOfService ? (
            <Link
              href={`/${termsOfService.slug}`}
              className="hover:opacity-80"
              style={{
                color: "inherit",
                transition: "opacity 0.4s var(--vii-ease)",
              }}
            >
              Terms of Service
            </Link>
          ) : (
            <Link
              href="/platform/policies/terms-of-service"
              className="hover:opacity-80"
              style={{
                color: "inherit",
                transition: "opacity 0.4s var(--vii-ease)",
              }}
            >
              Terms of Service
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
                transition: "opacity 0.4s var(--vii-ease)",
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
