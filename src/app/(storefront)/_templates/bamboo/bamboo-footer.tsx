import Link from "next/link";
import { Leaf } from "lucide-react";

import type { DefaultFooterTemplateProps } from "../types";
import { api } from "~/trpc/server";

const quickLinks = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/insights", label: "Insights" },
  { href: "/contact", label: "Contact" },
];

// const customerCare = [
//   { href: "/shop", label: "Shipping Info" },
//   { href: "/shop", label: "Returns & Refunds" },
//   { href: "/contact", label: "FAQs" },
//   { href: "/contact", label: "Support" },
// ];

export async function BambooFooter({ business }: DefaultFooterTemplateProps) {
  const currentYear = new Date().getFullYear();

  const email = business?.supportEmail ?? "hello@finallyresults.com";

  const policies = await api.content.getSimplifiedPages({
    type: "policy",
  });

  const socialLinks = business?.siteContent?.socialLinks as
    | {
        instagram?: string;
        facebook?: string;
        twitter?: string;
      }
    | undefined;

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Leaf className="size-5" />
              <span className="font-serif text-xl font-bold">
                Finally Results LLC
              </span>
            </Link>
            <p className="text-primary-foreground/80 text-sm leading-relaxed">
              Premium bamboo paper products crafted with purpose. Better for
              you, better for the planet.
            </p>
          </div>

          <div>
            <h3 className="text-primary-foreground/60 mb-4 text-sm font-semibold tracking-wider uppercase">
              Quick Links
            </h3>
            <nav className="flex flex-col gap-2.5" aria-label="Quick links">
              {quickLinks.map((link) => (
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
              <span>Finally Results LLC</span>
              <span>Detroit, Michigan</span>
              <a
                href={`mailto:${email}`}
                className="hover:text-primary-foreground transition-colors"
              >
                {email}
              </a>
            </address>
          </div>
        </div>

        <div className="border-primary-foreground/20 mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
          <p className="text-primary-foreground/60 text-xs">
            {"© 2026 Finally Results LLC. All rights reserved."}
          </p>
          <p className="text-primary-foreground/60 text-xs">
            Proudly made in Detroit
          </p>
        </div>
      </div>
    </footer>
  );
}
