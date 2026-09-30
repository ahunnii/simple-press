import Link from "next/link";
import { Leaf } from "lucide-react";

import type { DefaultFooterTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveSocialLinks } from "~/lib/social-links";
import { telHref } from "~/lib/tel-href";
import { api } from "~/trpc/server";
import { Separator } from "~/components/ui/separator";
import {
  externalLinkProps,
  resolveFooterQuickLinks,
} from "~/app/(storefront)/_components/nav";

import { HB_DEFAULT_NAV } from "../lib/nav";
import { HappyBambooFooterAccount } from "./happy-bamboo-footer-account";
import { HappyBambooSocialIcons } from "./happy-bamboo-social-icons";

export async function HappyBambooFooter({
  business,
}: DefaultFooterTemplateProps) {
  const email = business?.supportEmail;
  const phone = business?.phoneNumber;
  const address = business?.businessAddress;
  const name = business?.name ?? "Business Name";
  const footerTagline = business?.siteContent?.footerText;

  const { isEnabled } = await getBusinessFlags();

  // Owner's flat footer Quick Links (falls back to the main nav's top level
  // when unset; an explicit `[]` means "no quick links"). The shared
  // route→flag filter (P-NAV-FLAGS) drops anything the business has switched
  // off, same as the header and mobile panel.
  const quickLinks = resolveFooterQuickLinks({
    footerItems: business?.siteContent?.footerNavigationItems,
    navigationItems: business?.siteContent?.navigationItems,
    navDefaults: HB_DEFAULT_NAV,
    isEnabled,
  });

  const policies = await api.content.getSimplifiedPages({
    type: "policy",
  });

  // Mandatory, non-hideable policy row (B10.1) — published merchant Pages by
  // slug; privacy/terms fall back to the platform's own policy since every
  // store is covered by it regardless of what it has published. Shipping and
  // refund have no platform equivalent, so they only appear once published.
  // Only these four standard slugs plus Platform Policies — any other
  // policy-type page (imports, seed data) is never auto-listed.
  const privacyPolicy = policies.find((p) => p.slug === "privacy-policy");
  const termsOfService = policies.find((p) => p.slug === "terms-of-service");
  const shippingPolicy = policies.find((p) => p.slug === "shipping-policy");
  const refundPolicy = policies.find((p) => p.slug === "refund-policy");

  const policyLinks: { label: string; href: string }[] = [
    {
      label: "Privacy Policy",
      href: privacyPolicy
        ? `/${privacyPolicy.slug}`
        : "/platform/policies/privacy-policy",
    },
    {
      label: "Terms of Service",
      href: termsOfService
        ? `/${termsOfService.slug}`
        : "/platform/policies/terms-of-service",
    },
    ...(shippingPolicy
      ? [{ label: "Shipping Policy", href: `/${shippingPolicy.slug}` }]
      : []),
    ...(refundPolicy
      ? [{ label: "Refund Policy", href: `/${refundPolicy.slug}` }]
      : []),
    { label: "Platform Policies", href: "/platform/policies/" },
  ];

  const socialLinks = resolveSocialLinks(business?.siteContent?.socialLinks);

  return (
    <footer className="border-border bg-foreground border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <Leaf className="text-muted h-8 w-8" aria-hidden="true" />
              <span className="text-muted font-serif text-xl font-bold">
                {name}
              </span>
            </Link>
            {!!footerTagline && (
              <p className="text-muted text-sm leading-relaxed">
                {footerTagline}
              </p>
            )}

            <HappyBambooSocialIcons
              socialLinks={socialLinks}
              label="Follow us on social media"
              className="gap-4"
              linkClassName="text-muted hover:text-[var(--hb-primary-on-dark)]"
              iconClassName="h-5 w-5"
            />
          </div>

          {/* Shop — hidden entirely when there's nothing to show (no
              resolved links and accounts are off), rather than rendering
              an empty heading. */}
          {(quickLinks.length > 0 || isEnabled("customerAccounts")) && (
            <div>
              <h4 className="text-muted mb-4 font-semibold">Quick Links</h4>
              <ul className="flex flex-col space-y-2">
                {quickLinks.map((link, i) => (
                  <li key={i}>
                    <Link
                      href={link.href}
                      {...externalLinkProps(link.external)}
                      className="text-muted text-sm transition-colors hover:text-[var(--hb-primary-on-dark)]"
                    >
                      {link.label}
                      {link.external && (
                        <span className="sr-only"> (opens in new tab)</span>
                      )}
                    </Link>
                  </li>
                ))}
                {/* Account entry, end of Quick Links (B10.3) — gated on
                    customerAccounts, own client component since the footer
                    itself is a server component. */}
                {isEnabled("customerAccounts") && (
                  <HappyBambooFooterAccount
                    ordersEnabled={isEnabled("orders")}
                  />
                )}
              </ul>
            </div>
          )}

          {/* Support */}
          <div>
            <h4 className="text-muted mb-4 font-semibold">Support</h4>

            <address className="text-muted/80 flex flex-col gap-2.5 text-sm not-italic">
              <span>{name}</span>
              {!!address && <span>{address}</span>}

              {!!phone && (
                <a
                  href={telHref(phone)}
                  className="transition-colors hover:text-[var(--hb-primary-on-dark)]"
                >
                  {phone}
                </a>
              )}
              {!!email && (
                <a
                  href={`mailto:${email}`}
                  className="transition-colors hover:text-[var(--hb-primary-on-dark)]"
                >
                  {email}
                </a>
              )}
            </address>
          </div>

          {/* Policies — always rendered (B10.1), exactly these five slots. */}
          <div>
            <h4 className="text-muted mb-4 font-semibold">Policies</h4>
            <ul className="flex flex-col space-y-2">
              {policyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted text-sm transition-colors hover:text-[var(--hb-primary-on-dark)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="text-muted text-center text-sm md:text-left">
          <p>
            &copy; {new Date().getFullYear()} {name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
