import Image from "next/image";
import Link from "next/link";
import { TwitterLogoIcon } from "@radix-ui/react-icons";

import type { DefaultFooterTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { api } from "~/trpc/server";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";
import { TikTokIcon } from "~/components/icons/tiktok-icon";

import { resolveFields } from "../index";

export async function NoiseFooter({ business }: DefaultFooterTemplateProps) {
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
    "noise.global.location-tag",
    "noise.global.footer-tagline",
  ]);
  const locationTag = g["noise.global.location-tag"] ?? "";
  const footerTagline =
    g["noise.global.footer-tagline"] ?? "Independent goods, made with care.";

  const QUICK_LINKS = [
    { href: "/about", label: "About Us" },
    ...(isEnabled("blog") ? [{ href: "/blog", label: "Blog" }] : []),
    ...(isEnabled("testimonials")
      ? [{ href: "/testimonials", label: "Testimonials" }]
      : []),
    { href: "/contact", label: "Contact" },
    ...(isEnabled("products") ? [{ href: "/shop", label: "Shop All" }] : []),
  ] as const;

  const socialLinks = business?.siteContent?.socialLinks as
    | {
        instagram?: string;
        facebook?: string;
        twitter?: string;
        tiktok?: string;
      }
    | undefined;

  const policies = await api.content.getSimplifiedPages({ type: "policy" });

  // const shippingPolicy = policies.find((p) => p.slug === "shipping-policy");
  // const returnPolicy = policies.find((p) => p.slug === "refund-policy");
  const privacyPolicy = policies.find((p) => p.slug === "privacy-policy");
  const termsOfService = policies.find((p) => p.slug === "terms-of-service");

  // const blogEnabled = isEnabled("blog");

  return (
    <footer
      style={{
        borderTop: "1px solid var(--vn-rule)",
        // background: "var(--vn-bone)",
        color: "var(--vn-ink)",
        marginTop: 80,
      }}
    >
      {/* ── Main grid ── */}
      <div
        className="mx-auto grid gap-12 px-7 pt-16 pb-10"
        style={{
          maxWidth: "1320px",
          gridTemplateColumns: "repeat(1, 1fr)",
        }}
      >
        <div
          className="grid gap-12"
          style={{
            gridTemplateColumns: "repeat(1, 1fr)",
          }}
        >
          {/* Small-screen: single column; md: 2 cols; lg: 4 cols */}
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
            {/* ── Col 1: Wordmark + tagline + newsletter ── */}
            <div className="flex flex-col gap-5">
              {/* Wordmark */}
              <div style={{ lineHeight: 1 }}>
                {logoUrl ? (
                  <div className="relative mb-3 h-14 w-28">
                    <Image
                      src={logoUrl}
                      alt={name}
                      fill
                      sizes="112px"
                      className="object-contain object-left"
                    />
                  </div>
                ) : (
                  <>
                    <div
                      className="font-serif"
                      style={{
                        fontSize: "26px",
                        letterSpacing: "0.16em",
                        fontWeight: 500,
                        color: "var(--vn-ink)",
                      }}
                    >
                      {name.toUpperCase()}
                    </div>
                    {locationTag && (
                      <div
                        className="mt-2 font-mono"
                        style={{
                          fontSize: "10px",
                          letterSpacing: "0.46em",
                          color: "var(--vn-steel-mist)",
                          fontWeight: 500,
                        }}
                      >
                        {locationTag}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Tagline */}
              {footerTagline && (
                <p
                  className="font-sans leading-[1.7]"
                  style={{
                    fontSize: "13px",
                    color: "var(--vn-steel-mist)",
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
                socialLinks?.tiktok) && (
                <div className="flex gap-4">
                  {socialLinks?.instagram && (
                    <a
                      href={socialLinks.instagram}
                      className="transition-opacity hover:opacity-60"
                      style={{ color: "var(--vn-steel-mist)" }}
                      aria-label="Instagram"
                    >
                      <InstagramIcon className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {socialLinks?.facebook && (
                    <a
                      href={socialLinks.facebook}
                      className="transition-opacity hover:opacity-60"
                      style={{ color: "var(--vn-steel-mist)" }}
                      aria-label="Facebook"
                    >
                      <FacebookIcon className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {socialLinks?.twitter && (
                    <a
                      href={socialLinks.twitter}
                      className="transition-opacity hover:opacity-60"
                      style={{ color: "var(--vn-steel-mist)" }}
                      aria-label="X / Twitter"
                    >
                      <TwitterLogoIcon className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {socialLinks?.tiktok && (
                    <a
                      href={socialLinks.tiktok}
                      className="transition-opacity hover:opacity-60"
                      style={{ color: "var(--vn-steel-mist)" }}
                      aria-label="TikTok"
                    >
                      <TikTokIcon className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* ── Col 2: Policies ── */}
            {/* {policies.length > 0 && (
              <FooterCol
                title="Policies"
                links={
                  policies.length > 0
                    ? policies.map((p) => ({
                        href: `/${p.slug}`,
                        label: p.title,
                      }))
                    : []
                }
              />
            )} */}

            <FooterCol
              title="Shop"
              links={[
                { href: "/shop", label: "Shop All" },
                { href: "/collections", label: "Collections" },
                { href: "/shop?sort_by=new", label: "New arrivals" },
              ]}
            />

            {/* ── Col 3: Quick links ── */}
            <FooterCol
              title="Quick Links"
              links={QUICK_LINKS.map((l) => ({ href: l.href, label: l.label }))}
            />

            {/* ── Col 4: Contact info ── */}
            <div>
              {(address ?? email ?? phone) && (
                <>
                  <h4
                    className="mb-5 font-mono"
                    style={{
                      fontSize: "10.5px",
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: "var(--vn-steel-mist)",
                    }}
                  >
                    Contact
                  </h4>
                </>
              )}

              {address && (
                <div className="mb-4">
                  <p
                    className="mb-0.5 font-sans font-semibold"
                    style={{ fontSize: "13px", color: "var(--vn-ink)" }}
                  >
                    Location
                  </p>
                  <p
                    className="font-sans leading-[1.8]"
                    style={{ fontSize: "13px", color: "var(--vn-steel-mist)" }}
                  >
                    {address}
                  </p>
                </div>
              )}

              {(email ?? phone) && (
                <div>
                  <p
                    className="mb-0.5 font-sans font-semibold"
                    style={{ fontSize: "13px", color: "var(--vn-ink)" }}
                  >
                    Reach out to us
                  </p>
                  <div
                    className="font-sans leading-[1.8]"
                    style={{ fontSize: "13px", color: "var(--vn-steel-mist)" }}
                  >
                    {email && (
                      <a
                        href={`mailto:${email}`}
                        className="block transition-opacity hover:opacity-80"
                      >
                        {email}
                      </a>
                    )}
                    {phone && <span className="block">{phone}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div
        className="mx-auto flex flex-col gap-3 px-7 py-6 sm:flex-row sm:items-center sm:justify-between"
        style={{
          maxWidth: "1320px",
          borderTop: "1px solid var(--vn-line-soft)",
        }}
      >
        {/* Copyright */}
        <span
          className="font-mono"
          style={{
            fontSize: "11px",
            letterSpacing: "0.1em",
            color: "var(--vn-steel-mist)",
          }}
        >
          © {new Date().getFullYear()} {name}
        </span>

        {/* Payment icons */}
        <div
          className="flex flex-wrap gap-3 font-mono"
          style={{
            padding: "4px 8px",
            fontSize: "9px",
            letterSpacing: "0.18em",
            color: "var(--vn-steel-mist)",
          }}
        >
          {privacyPolicy ? (
            <Link
              href={privacyPolicy.slug}
              className="transition-colors hover:text-[#0a0a0a]"
            >
              Privacy Policy{" "}
            </Link>
          ) : (
            <Link
              href="/platform/policies/privacy-policy"
              className="transition-colors hover:text-[#0a0a0a]"
            >
              Privacy Policy
            </Link>
          )}

          {termsOfService ? (
            <Link
              href={termsOfService.slug}
              className="transition-colors hover:text-[#0a0a0a]"
            >
              Terms of Service
            </Link>
          ) : (
            <Link
              href="/platform/policies/terms-of-service"
              className="transition-colors hover:text-[#0a0a0a]"
            >
              Terms of Service
            </Link>
          )}
          <Link
            href="/platform/policies/"
            className="transition-colors hover:text-[#0a0a0a]"
          >
            Platform Policies
          </Link>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
  className,
}: {
  title: string;
  links: { href: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={className}>
      <h4
        className="mb-5 font-mono"
        style={{
          fontSize: "10.5px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--vn-steel-mist)",
        }}
      >
        {title}
      </h4>
      <ul className="flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="vn-footer-link font-sans"
              style={{ fontSize: "13px" }}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
