import Link from "next/link";
import { Leaf } from "lucide-react";

import type { DefaultFooterTemplateProps } from "../../types";
import { api } from "~/trpc/server";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
] as const;

export async function BambooFooter({ business }: DefaultFooterTemplateProps) {
  const email = business?.supportEmail;

  const name = business?.name ?? "Business Name";
  const footerTagline = business?.siteContent?.footerText;
  const address = business?.businessAddress;

  const policies = await api.content.getSimplifiedPages({
    type: "policy",
  });

  const navigationItems = business?.siteContent?.navigationItems as
    | { label: string; href: string }[]
    | undefined;

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Leaf className="size-5" />
              <span className="font-heading text-xl font-bold">{name}</span>
            </Link>
            <p className="text-primary-foreground/80 text-sm leading-relaxed">
              {footerTagline}
            </p>
          </div>

          <div>
            <h3 className="text-primary-foreground/60 mb-4 text-sm font-semibold tracking-wider uppercase">
              Quick Links
            </h3>
            <nav className="flex flex-col gap-2.5" aria-label="Quick links">
              {(navigationItems ?? NAV_LINKS).map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-primary-foreground/80 hover:text-primary-foreground text-sm transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="text-primary-foreground/60 mb-4 text-sm font-semibold tracking-wider uppercase">
              Policies
            </h3>
            <nav
              className="flex flex-col gap-2.5"
              aria-label="Customer care links"
            >
              {policies.map((link) => (
                <Link
                  key={link.id}
                  href={link.slug}
                  className="text-primary-foreground/80 hover:text-primary-foreground text-sm transition-colors"
                >
                  {link.title}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="text-primary-foreground/60 mb-4 text-sm font-semibold tracking-wider uppercase">
              Connect
            </h3>
            <address className="text-primary-foreground/80 flex flex-col gap-2.5 text-sm not-italic">
              <span>{name}</span>
              {address && <span>{address}</span>}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="hover:text-primary-foreground transition-colors"
                >
                  {email}
                </a>
              )}
            </address>
          </div>
        </div>

        <div className="border-primary-foreground/20 mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
          <p className="text-primary-foreground/60 text-xs">
            {"© 2026 " + name + ". All rights reserved."}
          </p>
          <p className="text-primary-foreground/60 text-xs">
            Proudly made in Detroit
          </p>
        </div>
      </div>
    </footer>
  );
}
