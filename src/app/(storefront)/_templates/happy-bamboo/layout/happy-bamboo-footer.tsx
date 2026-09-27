import Link from "next/link";
import { Leaf } from "lucide-react";

import type { DefaultFooterTemplateProps } from "../../types";
import { resolveSocialLinks } from "~/lib/social-links";
import { telHref } from "~/lib/tel-href";
import { api } from "~/trpc/server";
import { Separator } from "~/components/ui/separator";
import { externalLinkProps } from "~/app/(storefront)/_components/nav";

import { resolveHappyBambooNav } from "../lib/nav";
import { HappyBambooSocialIcons } from "./happy-bamboo-social-icons";

export async function HappyBambooFooter({
  business,
}: DefaultFooterTemplateProps) {
  const email = business?.supportEmail;
  const phone = business?.phoneNumber;
  const address = business?.businessAddress;
  const name = business?.name ?? "Business Name";
  const footerTagline = business?.siteContent?.footerText;

  // Same list as the header/mobile panel, flattened: each top-level link,
  // then its children right after it. A group with an empty href (a pure
  // dropdown label) contributes only its children.
  const quickLinks = resolveHappyBambooNav(
    business?.siteContent?.navigationItems,
  ).flatMap((item) => [
    ...(item.href ? [item] : []),
    ...(item.children ?? []).filter((child) => child.href),
  ]);

  const policies = await api.content.getSimplifiedPages({
    type: "policy",
  });

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

          {/* Shop */}
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
            </ul>
          </div>

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

          {/* Policies */}
          {policies.length > 0 && (
            <div>
              <h4 className="text-muted mb-4 font-semibold">Policies</h4>
              <ul className="flex flex-col space-y-2">
                {policies.map((link) => (
                  <li key={link.id}>
                    <Link
                      href={`/${link.slug}`}
                      className="text-muted text-sm transition-colors hover:text-[var(--hb-primary-on-dark)]"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
