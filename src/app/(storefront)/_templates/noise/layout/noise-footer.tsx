import Image from "next/image";
import Link from "next/link";
import { TwitterLogoIcon } from "@radix-ui/react-icons";

import type { DefaultFooterTemplateProps } from "../../types";
import { api } from "~/trpc/server";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";
import { TikTokIcon } from "~/components/icons/tiktok-icon";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export async function NoiseFooter({ business }: DefaultFooterTemplateProps) {
  const email = business?.supportEmail;
  const phone = business?.phoneNumber;
  const address = business?.businessAddress;
  const name = business?.name ?? "Visual Noise";
  const footerTagline = business?.siteContent?.footerText;
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

  return (
    <footer className="bg-background">
      {/* Top border */}
      <div className="bg-border h-px" />

      {/* Main columns */}
      <div className="container mx-auto px-4 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <p className="text-foreground font-sans text-[9px] font-medium tracking-[0.35em] uppercase">
              {name}
            </p>
            {!!footerTagline && (
              <p className="text-foreground/65 font-sans text-sm leading-relaxed">
                {footerTagline}
              </p>
            )}
            <div className="flex gap-4 pt-1">
              {socialLinks?.facebook && (
                <a
                  href={socialLinks.facebook}
                  className="text-foreground/40 hover:text-foreground transition-colors"
                  aria-label="Facebook"
                >
                  <FacebookIcon className="h-3.5 w-3.5" />
                </a>
              )}
              {socialLinks?.instagram && (
                <a
                  href={socialLinks.instagram}
                  className="text-foreground/40 hover:text-foreground transition-colors"
                  aria-label="Instagram"
                >
                  <InstagramIcon className="h-3.5 w-3.5" />
                </a>
              )}
              {socialLinks?.twitter && (
                <a
                  href={socialLinks.twitter}
                  className="text-foreground/40 hover:text-foreground transition-colors"
                  aria-label="Twitter"
                >
                  <TwitterLogoIcon className="h-3.5 w-3.5" />
                </a>
              )}
              {socialLinks?.tiktok && (
                <a
                  href={socialLinks.tiktok}
                  className="text-foreground/40 hover:text-foreground transition-colors"
                  aria-label="TikTok"
                >
                  <TikTokIcon className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Navigate */}
          <div>
            <p className="text-foreground mb-5 font-sans text-[9px] font-medium tracking-[0.35em] uppercase">
              Navigate
            </p>
            <ul className="flex flex-col gap-3">
              {(navigationItems ?? quickLinks).map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-foreground/70 hover:text-foreground font-sans text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-foreground mb-5 font-sans text-[9px] font-medium tracking-[0.35em] uppercase">
              Contact
            </p>
            <address className="flex flex-col gap-3 not-italic">
              <span className="text-foreground/70 font-sans text-sm">
                {name}
              </span>
              {!!address && (
                <span className="text-foreground/70 font-sans text-sm">
                  {address}
                </span>
              )}
              {!!phone && (
                <a
                  href={`tel:${phone.replace(/\D/g, "")}`}
                  className="text-foreground/70 hover:text-foreground font-sans text-sm transition-colors"
                >
                  {phone}
                </a>
              )}
              {!!email && (
                <a
                  href={`mailto:${email}`}
                  className="text-foreground/70 hover:text-foreground font-sans text-sm transition-colors"
                >
                  {email}
                </a>
              )}
            </address>
          </div>

          {/* Motto */}
          <div>
            <p className="text-foreground mb-5 font-sans text-[9px] font-medium tracking-[0.35em] uppercase">
              The Brand
            </p>
            <p className="text-foreground/75 font-serif text-xl leading-snug font-light italic">
              ...because fashion shouldn&apos;t be quiet
            </p>
            <p className="text-foreground/40 mt-4 font-sans text-[9px] tracking-[0.3em] uppercase">
              Detroit, Michigan
            </p>
          </div>
        </div>
      </div>

      {/* Policy row */}
      <div className="border-border border-t">
        <div className="text-foreground/45 container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-5 font-sans text-[9px] tracking-[0.2em] uppercase sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {name}. All rights reserved.
          </p>
          <div className="flex gap-6">
            {policies.map((link) => (
              <Link
                key={link.id}
                href={`/${link.slug}`}
                className="hover:text-foreground/80 transition-colors"
              >
                {link.title}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Large centered logo — brand anchor */}
      <div className="border-border/40 border-t py-14">
        <div className="container mx-auto flex flex-col items-center px-4">
          {logoUrl ? (
            <div className="relative h-20 w-56">
              <Image
                src={logoUrl}
                alt={name}
                fill
                sizes="224px"
                className="object-contain"
              />
            </div>
          ) : (
            <p
              className="text-foreground/15 hover:text-foreground/30 text-center font-serif leading-none font-light tracking-[0.08em] transition-opacity select-none"
              style={{ fontSize: "clamp(3rem, 9vw, 8rem)" }}
            >
              {name}
            </p>
          )}
          <p className="text-foreground/25 mt-4 font-sans text-[8px] tracking-[0.55em] uppercase">
            Detroit · Visual Noise
          </p>
        </div>
      </div>
    </footer>
  );
}
