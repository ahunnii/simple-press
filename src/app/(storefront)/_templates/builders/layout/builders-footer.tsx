import Image from "next/image";
import Link from "next/link";
import { TwitterLogoIcon } from "@radix-ui/react-icons";

import type { DefaultFooterTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { api } from "~/trpc/server";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";
import { TikTokIcon } from "~/components/icons/tiktok-icon";
import { YouTubeIcon } from "~/components/icons/youtube-icon";

export async function BuildersFooter({ business }: DefaultFooterTemplateProps) {
  const email = business?.supportEmail;
  const phone = business?.phoneNumber;
  const name = business?.name ?? "";
  const logoUrl = business?.siteContent?.logoUrl;

  const { isEnabled } = await getBusinessFlags();

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

  const QUICK_LINKS = [
    { href: "/about", label: "About Us" },
    ...(isEnabled("blog") ? [{ href: "/blog", label: "Journal" }] : []),
    ...(isEnabled("testimonials")
      ? [{ href: "/testimonials", label: "Testimonials" }]
      : []),
    { href: "/contact", label: "Contact" },
    ...(isEnabled("products") ? [{ href: "/shop", label: "Shop All" }] : []),
  ];

  return (
    <footer
      className="border-t"
      style={{
        background: "var(--builders-surface, #ffffff)",
        borderColor: "var(--builders-rule, #e5e7eb)",
        color: "var(--builders-ink, #131313)",
        marginTop: 80,
      }}
    >
      {/* ── Main grid ── */}
      <div
        className="mx-auto grid gap-12 px-6 pt-16 pb-10 md:px-12"
        style={{ maxWidth: "1280px" }}
      >
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.6fr_1fr_1fr_1.4fr]">
          {/* ── Col 1: Brand + tagline + social ── */}
          <div className="flex flex-col gap-5">
            {/* Brand */}
            {logoUrl ? (
              <div className="relative mb-2 h-12 w-24">
                <Image
                  src={logoUrl}
                  alt={name}
                  fill
                  sizes="96px"
                  className="object-contain object-left"
                />
              </div>
            ) : (
              <span
                className="text-base font-bold uppercase tracking-[0.2em]"
                style={{
                  fontFamily:
                    "var(--font-builders-display, 'Jost', sans-serif)",
                  color: "var(--builders-ink, #131313)",
                }}
              >
                {name || "Builders"}
              </span>
            )}

            {/* Tagline */}
            <p
              className="text-sm leading-relaxed text-gray-500"
              style={{ maxWidth: "260px" }}
            >
              Worker-owned. Community-rooted. Built to last.
            </p>

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
                    className="-m-2 flex items-center justify-center p-2 text-gray-400 transition-colors hover:text-gray-700"
                    aria-label="Instagram"
                  >
                    <InstagramIcon className="h-4 w-4" />
                  </a>
                )}
                {socialLinks?.facebook && (
                  <a
                    href={socialLinks.facebook}
                    className="-m-2 flex items-center justify-center p-2 text-gray-400 transition-colors hover:text-gray-700"
                    aria-label="Facebook"
                  >
                    <FacebookIcon className="h-4 w-4" />
                  </a>
                )}
                {socialLinks?.twitter && (
                  <a
                    href={socialLinks.twitter}
                    className="-m-2 flex items-center justify-center p-2 text-gray-400 transition-colors hover:text-gray-700"
                    aria-label="X / Twitter"
                  >
                    <TwitterLogoIcon className="h-4 w-4" />
                  </a>
                )}
                {socialLinks?.tiktok && (
                  <a
                    href={socialLinks.tiktok}
                    className="-m-2 flex items-center justify-center p-2 text-gray-400 transition-colors hover:text-gray-700"
                    aria-label="TikTok"
                  >
                    <TikTokIcon className="h-4 w-4" />
                  </a>
                )}
                {socialLinks?.youtube && (
                  <a
                    href={socialLinks.youtube}
                    className="-m-2 flex items-center justify-center p-2 text-gray-400 transition-colors hover:text-gray-700"
                    aria-label="YouTube"
                  >
                    <YouTubeIcon className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ── Col 2: Quick links ── */}
          <FooterCol title="Quick Links" links={QUICK_LINKS} />

          {/* ── Col 3: Services (static) ── */}
          <FooterCol
            title="Services"
            links={[
              { href: "/contact", label: "Structural Restoration" },
              { href: "/contact", label: "Interior Renovation" },
              { href: "/contact", label: "Historic Preservation" },
              { href: "/contact", label: "Structural Diagnostics" },
            ]}
          />

          {/* ── Col 4: Contact info ── */}
          {(email ?? phone) && (
            <div>
              <h2
                className="mb-5 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400"
                style={{
                  fontFamily:
                    "var(--font-builders-body, 'Agdasima', sans-serif)",
                }}
              >
                Contact
              </h2>
              <div className="flex flex-col gap-3 text-sm leading-relaxed text-gray-500">
                {email && (
                  <a
                    href={`mailto:${email}`}
                    className="transition-colors hover:text-gray-900"
                  >
                    {email}
                  </a>
                )}
                {phone && <span>{phone}</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div
        className="mx-auto flex flex-col gap-3 px-6 py-6 sm:flex-row sm:items-center sm:justify-between md:px-12"
        style={{
          maxWidth: "1280px",
          borderTop: "1px solid var(--builders-rule, #e5e7eb)",
        }}
      >
        <span
          className="text-xs uppercase tracking-[0.12em] text-gray-400"
          style={{
            fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
          }}
        >
          © {new Date().getFullYear()} {name}. Worker-Owned.
        </span>

        <div
          className="flex flex-wrap gap-6 text-xs uppercase tracking-widest text-gray-400"
          style={{
            fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
          }}
        >
          {privacyPolicy ? (
            <Link
              href={`/${privacyPolicy.slug}`}
              className="transition-colors hover:text-gray-700"
            >
              Privacy Policy
            </Link>
          ) : (
            <Link
              href="/platform/policies/privacy-policy"
              className="transition-colors hover:text-gray-700"
            >
              Privacy Policy
            </Link>
          )}
          {termsOfService ? (
            <Link
              href={`/${termsOfService.slug}`}
              className="transition-colors hover:text-gray-700"
            >
              Terms of Service
            </Link>
          ) : (
            <Link
              href="/platform/policies/terms-of-service"
              className="transition-colors hover:text-gray-700"
            >
              Terms of Service
            </Link>
          )}
          <Link
            href="/platform/policies/"
            className="transition-colors hover:text-gray-700"
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
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h2
        className="mb-5 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400"
        style={{
          fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
        }}
      >
        {title}
      </h2>
      <ul className="flex flex-col gap-3">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link
              href={link.href}
              className="text-sm text-gray-500 transition-colors hover:text-gray-900"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
