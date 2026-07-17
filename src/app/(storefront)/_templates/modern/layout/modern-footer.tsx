import Link from "next/link";
import { TwitterLogoIcon } from "@radix-ui/react-icons";
import { Facebook, Instagram } from "lucide-react";

import type { DefaultFooterTemplateProps } from "../../types";
import { api } from "~/trpc/server";
import { YouTubeIcon } from "~/components/icons/youtube-icon";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

export async function ModernFooter({ business }: DefaultFooterTemplateProps) {
  const currentYear = new Date().getFullYear();
  const email = business?.supportEmail;
  const phone = business?.phoneNumber;
  const address = business?.businessAddress;

  const navigationItems = business?.siteContent?.navigationItems as
    | { label: string; href: string }[]
    | undefined;

  const policies = await api.content.getSimplifiedPages({
    type: "policy",
  });

  const socialLinks = business?.siteContent?.socialLinks as
    | {
        instagram?: string;
        facebook?: string;
        twitter?: string;
        youtube?: string;
      }
    | undefined;

  return (
    <footer className="border-border bg-secondary border-t">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link
              href="/"
              className="text-foreground text-xl font-semibold tracking-tight"
            >
              {business.name}
            </Link>
            {business.siteContent?.footerText && (
              <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
                {business.siteContent.footerText}
              </p>
            )}
            {(socialLinks?.instagram ??
              socialLinks?.facebook ??
              socialLinks?.twitter ??
              socialLinks?.youtube) && (
              <div className="mt-4 flex gap-3">
                {/* M-7: "(opens in new tab)" appended to aria-label; M-2: aria-hidden on decorative icons */}
                {socialLinks?.instagram && (
                  <a
                    href={socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram (opens in new tab)"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Instagram className="h-4 w-4" aria-hidden="true" />
                  </a>
                )}
                {socialLinks?.facebook && (
                  <a
                    href={socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook (opens in new tab)"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Facebook className="h-4 w-4" aria-hidden="true" />
                  </a>
                )}
                {socialLinks?.twitter && (
                  <a
                    href={socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter (opens in new tab)"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <TwitterLogoIcon className="h-4 w-4" aria-hidden="true" />
                  </a>
                )}
                {socialLinks?.youtube && (
                  <a
                    href={socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube (opens in new tab)"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <YouTubeIcon className="h-4 w-4" aria-hidden="true" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div>
            {/* M-10: demoted from h3 to h2 — no h2 ancestor existed after the page h1 */}
            <h2 className="text-foreground text-xs font-semibold tracking-widest uppercase">
              Navigate
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {(navigationItems ?? NAV_LINKS).map((link) => (
                <li key={link.label + link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            {/* M-10: demoted from h3 to h2 */}
            <h2 className="text-foreground text-xs font-semibold tracking-widest uppercase">
              Support
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <Link
                  href="/contact"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Contact
                </Link>
              </li>
              {policies?.map((policy) => (
                <li key={policy.id + policy.title}>
                  <Link
                    href={`/${policy.slug}`}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {policy.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {(email ?? phone ?? address) && (
            <div>
              {/* M-10: demoted from h3 to h2 */}
              <h2 className="text-foreground text-xs font-semibold tracking-widest uppercase">
                Contact
              </h2>
              <address className="mt-4 flex flex-col gap-3 not-italic">
                {!!address && (
                  <span className="text-muted-foreground text-sm">
                    {address}
                  </span>
                )}
                {!!phone && (
                  <a
                    href={`tel:${phone.replace(/\D/g, "")}`}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {phone}
                  </a>
                )}
                {!!email && (
                  <a
                    href={`mailto:${email}`}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {email}
                  </a>
                )}
              </address>
            </div>
          )}
        </div>

        <div className="border-border mt-16 border-t pt-8">
          <p className="text-muted-foreground text-xs">
            &copy; {currentYear} {business.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
