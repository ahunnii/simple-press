import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import { resolveSocialLinks } from "~/lib/social-links";
import { api } from "~/trpc/server";

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

  const socialLinks = resolveSocialLinks(business?.siteContent?.socialLinks);

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
            {socialLinks.length > 0 && (
              <ul
                className="mt-4 flex gap-3"
                aria-label="Follow us on social media"
              >
                {/* M-7: "(opens in new tab)" appended to aria-label; M-2: aria-hidden on decorative icons */}
                {socialLinks.map(({ key, ariaLabel, Icon, url }) => (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${ariaLabel} (opens in new tab)`}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
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
