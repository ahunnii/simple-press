import Image from "next/image";
import Link from "next/link";
import { TwitterLogoIcon } from "@radix-ui/react-icons";

import type { DefaultFooterTemplateProps } from "../../types";
import { api } from "~/trpc/server";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";
import { TikTokIcon } from "~/components/icons/tiktok-icon";

const READ_LINKS = [
  { href: "/blog", label: "Journal" },
  { href: "/testimonials", label: "Voices" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const NAV_LINKS = [
  { href: "/", label: "Index" },
  { href: "/shop", label: "Shop" },
  { href: "/blog", label: "Journal" },
  { href: "/about", label: "Studio" },
  { href: "/contact", label: "Contact" },
];

export async function NoiseFooter({ business }: DefaultFooterTemplateProps) {
  const email = business?.supportEmail;
  const phone = business?.phoneNumber;
  const address = business?.businessAddress;
  const name = business?.name ?? "Visual Noise";
  const logoUrl = business?.siteContent?.logoUrl;

  const navigationItems = business?.siteContent?.navigationItems as
    | { label: string; href: string }[]
    | undefined;

  const policies = await api.content.getSimplifiedPages({ type: "policy" });

  const socialLinks = business?.siteContent?.socialLinks as
    | {
        instagram?: string;
        facebook?: string;
        twitter?: string;
        tiktok?: string;
      }
    | undefined;

  const hasSocial =
    !!(socialLinks?.instagram ?? socialLinks?.facebook ?? socialLinks?.twitter ?? socialLinks?.tiktok);

  return (
    <footer
      className="border-t-2 border-foreground"
      style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
    >
      {/* Main grid — 1 col → 2 col → 4 col */}
      <div
        className="grid gap-9 px-7 pt-16 pb-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]"
      >
        {/* Column 1 — Brand: large serif wordmark + address */}
        <div className="flex flex-col gap-0">
          {/* Big wordmark */}
          {logoUrl ? (
            <div className="relative mb-5" style={{ height: "80px", width: "180px" }}>
              <Image
                src={logoUrl}
                alt={name}
                fill
                sizes="180px"
                className="object-contain object-left"
              />
            </div>
          ) : (
            <div
              className="font-serif italic leading-[1] mb-4 select-none"
              style={{ fontSize: "56px", letterSpacing: "-0.02em" }}
            >
              {/* Split "Visual Noise" for the two-line treatment */}
              {name.includes(" ") ? (
                <>
                  {name.split(" ")[0]}
                  <br />
                  {name.split(" ").slice(1).join(" ")}.
                </>
              ) : (
                <>{name}.</>
              )}
            </div>
          )}

          {/* Mini — address block in JetBrains Mono */}
          <div
            className="font-mono text-[10.5px] leading-[1.6] tracking-[0.14em] uppercase"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            {address && <span>{address}<br /></span>}
            {phone && <span>{phone}<br /></span>}
            {email && (
              <a
                href={`mailto:${email}`}
                className="transition-opacity hover:opacity-80 block"
              >
                {email}
              </a>
            )}
            {!address && !phone && !email && (
              <span>Detroit, Michigan</span>
            )}
          </div>

          {/* Social icons */}
          {hasSocial && (
            <div className="flex gap-4 mt-5">
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
                  aria-label="Twitter"
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

        {/* Column 2 — Shop / Navigate */}
        <div>
          <h4
            className="font-mono text-[10.5px] tracking-[0.22em] uppercase mb-4"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Shop
          </h4>
          <ul className="flex flex-col gap-2">
            {(navigationItems ?? NAV_LINKS).map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="font-sans text-sm transition-opacity hover:opacity-60"
                  style={{ color: "var(--vn-bone)" }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3 — Read */}
        <div>
          <h4
            className="font-mono text-[10.5px] tracking-[0.22em] uppercase mb-4"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Read
          </h4>
          <ul className="flex flex-col gap-2">
            {READ_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="font-sans text-sm transition-opacity hover:opacity-60"
                  style={{ color: "var(--vn-bone)" }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 4 — Signal (social + newsletter) */}
        <div>
          <h4
            className="font-mono text-[10.5px] tracking-[0.22em] uppercase mb-4"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Signal
          </h4>
          <ul className="flex flex-col gap-2">
            {socialLinks?.instagram && (
              <li>
                <a
                  href={socialLinks.instagram}
                  className="font-sans text-sm transition-opacity hover:opacity-60 block"
                  style={{ color: "var(--vn-bone)" }}
                >
                  Instagram /&nbsp;
                  <span style={{ color: "var(--vn-steel-mist)" }}>
                    {socialLinks.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\/?/, "@").replace(/\/$/, "")}
                  </span>
                </a>
              </li>
            )}
            {socialLinks?.tiktok && (
              <li>
                <a
                  href={socialLinks.tiktok}
                  className="font-sans text-sm transition-opacity hover:opacity-60 block"
                  style={{ color: "var(--vn-bone)" }}
                >
                  TikTok
                </a>
              </li>
            )}
            {socialLinks?.facebook && (
              <li>
                <a
                  href={socialLinks.facebook}
                  className="font-sans text-sm transition-opacity hover:opacity-60 block"
                  style={{ color: "var(--vn-bone)" }}
                >
                  Facebook
                </a>
              </li>
            )}
            {socialLinks?.twitter && (
              <li>
                <a
                  href={socialLinks.twitter}
                  className="font-sans text-sm transition-opacity hover:opacity-60 block"
                  style={{ color: "var(--vn-bone)" }}
                >
                  Twitter / X
                </a>
              </li>
            )}
            {/* Always show newsletter link */}
            <li>
              <a
                href="#newsletter"
                className="font-sans text-sm transition-opacity hover:opacity-60 block"
                style={{ color: "var(--vn-bone)" }}
              >
                Newsletter
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar — three-piece: copyright · slogan · policies */}
      <div
        className="px-7 py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderTop: "1px solid #2a2c30" }}
      >
        {/* Copyright */}
        <span
          className="font-mono text-[10px] tracking-[0.18em] uppercase"
          style={{ color: "var(--vn-steel-mist)" }}
        >
          &copy; {new Date().getFullYear()} {name} — Detroit. All garments numbered.
        </span>

        {/* Slogan — center, hidden on small screens */}
        <span
          className="font-mono text-[10px] tracking-[0.18em] uppercase hidden lg:block"
          style={{ color: "var(--vn-steel-mist)" }}
        >
          Because fashion shouldn&apos;t be quiet ✦ ✦ ✦
        </span>

        {/* Policies */}
        <div className="flex flex-wrap gap-4">
          {policies.map((link) => (
            <Link
              key={link.id}
              href={`/${link.slug}`}
              className="font-mono text-[10px] tracking-[0.18em] uppercase transition-opacity hover:opacity-80"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              {link.title}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
