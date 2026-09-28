import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import type { NavItem } from "~/app/(storefront)/_components/nav";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { resolveSocialLinks } from "~/lib/social-links";
import { telHref } from "~/lib/tel-href";
import { api } from "~/trpc/server";
import {
  externalLinkProps,
  resolveFooterQuickLinks,
} from "~/app/(storefront)/_components/nav";

import { resolveFields } from "..";

const headingClass =
  "text-xs font-semibold tracking-widest text-white uppercase";

/** Shipped default nav, used when the owner has set neither the main nav nor a footer quick-links list. */
const DARK_TREND_DEFAULT_NAV: NavItem[] = [
  { href: "/shop", label: "Shop" },
  { href: "/contact", label: "Contact" },
  { href: "/about", label: "About" },
];

export async function DarkTrendFooter({
  business,
}: DefaultFooterTemplateProps) {
  const currentYear = new Date().getFullYear();
  const email = business?.supportEmail?.trim() ?? "";
  const phone = business?.phoneNumber?.trim() ?? "";
  const address = business?.businessAddress?.trim() ?? "";
  const phoneHref = telHref(phone);
  const hasContact = !!(email || phone || address);
  const { isEnabled } = await getBusinessFlags();

  const f = resolveFields(business?.siteContent?.customFields, [
    "dark-trend.global.footer-nav-heading",
    "dark-trend.global.footer-contact-heading",
    "dark-trend.global.footer-social-heading",
  ]);
  const navHeading = f["dark-trend.global.footer-nav-heading"] ?? "";
  const contactHeading = f["dark-trend.global.footer-contact-heading"] ?? "";
  const socialHeading = f["dark-trend.global.footer-social-heading"] ?? "";

  const quickLinks = resolveFooterQuickLinks({
    footerItems: business?.siteContent?.footerNavigationItems,
    navigationItems: business?.siteContent?.navigationItems,
    navDefaults: DARK_TREND_DEFAULT_NAV,
    isEnabled,
  });

  const policies = await api.content.getSimplifiedPages({
    type: "policy",
  });

  const socialLinks = resolveSocialLinks(business?.siteContent?.socialLinks);

  return (
    <footer
      className="border-t border-white/10 bg-[#121212] bg-[url('/dark-trend-footer.png')] bg-bottom bg-no-repeat"
      {...sectionGroupAttr("global", "footer")}
    >
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            {business?.siteContent?.logoUrl ? (
              // N-3: wrap logo image in a link (text fallback already is one)
              <Link href="/" aria-label={`${business.name} home`}>
                <div className="relative aspect-video h-20 w-auto rounded-sm">
                  <Image
                    src={business.siteContent.logoUrl}
                    alt=""
                    sizes="(max-width: 768px) 100vw, 55px"
                    fill
                    className="object-cover"
                  />
                </div>
              </Link>
            ) : (
              <Link
                href="/"
                className="text-lg font-semibold tracking-widest text-white uppercase"
              >
                {business.name}
              </Link>
            )}

            {business.siteContent?.footerText && (
              <p className="mt-4 text-base text-white/60">
                {business.siteContent?.footerText}
              </p>
            )}
          </div>

          {quickLinks.length > 0 && (
            <div>
              {/* M-10: no h2 ancestor in footer — use <p> styled identically */}
              {navHeading.trim() && (
                <p
                  className={headingClass}
                  {...fieldAttr("dark-trend.global.footer-nav-heading")}
                >
                  {navHeading}
                </p>
              )}
              <ul className="mt-4 flex flex-col gap-3">
                {quickLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      {...externalLinkProps(link.external)}
                      className="text-sm text-white/70 transition-colors hover:text-white"
                    >
                      {link.label}
                      {link.external && (
                        <span className="sr-only"> (opens in new tab)</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-4">
            {hasContact && (
              <>
                {contactHeading.trim() && (
                  <p
                    className={headingClass}
                    {...fieldAttr("dark-trend.global.footer-contact-heading")}
                  >
                    {contactHeading}
                  </p>
                )}
                <ul className="mt-4 flex flex-col gap-3 text-sm text-white/70">
                  {!!address && <li>{address}</li>}
                  {!!phoneHref && (
                    <li>
                      <a
                        href={phoneHref}
                        className="transition-colors hover:text-white"
                      >
                        {phone}
                      </a>
                    </li>
                  )}
                  {!!email && (
                    <li>
                      <a
                        href={`mailto:${email}`}
                        className="transition-colors hover:text-white"
                      >
                        {email}
                      </a>
                    </li>
                  )}
                </ul>
              </>
            )}

            {socialLinks.length > 0 && (
              <>
                {socialHeading.trim() && (
                  <p
                    className={headingClass}
                    {...fieldAttr("dark-trend.global.footer-social-heading")}
                  >
                    {socialHeading}
                  </p>
                )}
                <ul className="mt-4 flex flex-row flex-wrap gap-4">
                  {socialLinks.map(({ key, ariaLabel, Icon, url }) => (
                    <li key={key}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/70 transition-colors hover:text-white"
                      >
                        <Icon className="h-5 w-5" />
                        <span className="sr-only">
                          {ariaLabel} (opens in new tab)
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <p className="text-sm text-white/60">
          © {currentYear} {business.name}. All rights reserved.
        </p>

        <div className="flex items-center gap-4">
          {policies?.map((policy, idx) => (
            <Fragment key={policy.id || idx}>
              {!!idx && (
                <span aria-hidden="true" className="text-white/60">
                  {" "}
                  |{" "}
                </span>
              )}
              <p className="inline text-sm text-white/60">
                <Link
                  href={`/${policy.slug}`}
                  className="underline transition-colors hover:text-white"
                >
                  {policy.title}
                </Link>
              </p>
            </Fragment>
          ))}
        </div>
      </div>
    </footer>
  );
}
