import Image from "next/image";
import Link from "next/link";
import { Facebook, Instagram, Twitter } from "lucide-react";

import type { DefaultFooterTemplateProps } from "../../types";
import { api } from "~/trpc/server";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "Our Story" },
  { href: "/contact", label: "Contact Us" },
];

export async function ElegantFooter({ business }: DefaultFooterTemplateProps) {
  const email = business?.supportEmail;
  const phone = business?.phoneNumber;
  const address = business?.businessAddress;

  const navigationItems = business?.siteContent?.navigationItems as
    | { label: string; href: string }[]
    | undefined;

  const policies = await api.content.getSimplifiedPages({ type: "policy" });

  const socialLinks = business?.siteContent?.socialLinks as
    | {
        instagram?: string;
        facebook?: string;
        twitter?: string;
      }
    | undefined;

  return (
    <footer className="bg-card relative overflow-hidden pt-20 pb-10">
      {/* Giant Background Text */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 z-0 -translate-x-1/2 select-none">
        <span className="font-serif text-[200px] leading-none font-bold whitespace-nowrap text-white/20 sm:text-[200px] md:text-[400px] lg:text-[400px] xl:text-[400px]">
          {business?.name}
        </span>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-16 grid grid-cols-2 gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            {business?.siteContent?.logoUrl ? (
              <Image
                src={business.siteContent.logoUrl}
                alt={business.name}
                width={40}
                height={40}
                className="bg-primary rounded-full"
              />
            ) : (
              <h2 className="text-foreground mb-4 font-serif text-3xl">
                {business?.name}
              </h2>
            )}
            {business?.siteContent?.footerText && (
              <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                {business.siteContent.footerText}
              </p>
            )}

            <div className="flex gap-4">
              {socialLinks?.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-background text-foreground/60 hover:text-foreground boty-transition boty-shadow flex h-10 w-10 items-center justify-center rounded-full"
                  aria-label="Instagram"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {socialLinks?.facebook && (
                <a
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-background text-foreground/60 hover:text-foreground boty-transition boty-shadow flex h-10 w-10 items-center justify-center rounded-full"
                  aria-label="Facebook"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {socialLinks?.twitter && (
                <a
                  href={socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-background text-foreground/60 hover:text-foreground boty-transition boty-shadow flex h-10 w-10 items-center justify-center rounded-full"
                  aria-label="Twitter"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Nav Links */}
          <div>
            <h3 className="text-foreground mb-4 font-medium">Navigate</h3>
            <ul className="space-y-3">
              {(navigationItems ?? NAV_LINKS).map((link) => (
                <li key={link.label + link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground boty-transition text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h3 className="text-foreground mb-4 font-medium">Policies</h3>
            <ul className="space-y-3">
              {policies.map((policy) => (
                <li key={policy.id}>
                  <Link
                    href={policy.slug}
                    className="text-muted-foreground hover:text-foreground boty-transition text-sm"
                  >
                    {policy.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          {(email ?? phone ?? address) && (
            <div>
              <h3 className="text-foreground mb-4 font-medium">Contact</h3>
              <address className="flex flex-col gap-3 not-italic">
                {!!address && (
                  <span className="text-muted-foreground text-sm">
                    {address}
                  </span>
                )}
                {!!phone && (
                  <a
                    href={`tel:${phone.replace(/\D/g, "")}`}
                    className="text-muted-foreground hover:text-foreground boty-transition text-sm"
                  >
                    {phone}
                  </a>
                )}
                {!!email && (
                  <a
                    href={`mailto:${email}`}
                    className="text-muted-foreground hover:text-foreground boty-transition text-sm"
                  >
                    {email}
                  </a>
                )}
              </address>
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="border-border/50 border-t pt-10">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} {business?.name}. All rights
              reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
