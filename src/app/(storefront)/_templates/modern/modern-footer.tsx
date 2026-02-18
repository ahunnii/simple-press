import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../types";
import { api } from "~/trpc/server";

export async function ModernFooter({ business }: DefaultFooterTemplateProps) {
  const currentYear = new Date().getFullYear();

  const policies = await api.content.getSimplifiedPages({
    type: "policy",
  });
  const pages = await api.content.getSimplifiedPages({
    type: "page",
  });

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
          </div>

          <div>
            <h3 className="text-foreground text-xs font-semibold tracking-widest uppercase">
              Shop
            </h3>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <Link
                  href="/products"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  All Products
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-foreground text-xs font-semibold tracking-widest uppercase">
              Quick Links
            </h3>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  About
                </Link>{" "}
              </li>
              {pages?.map((page) => (
                <li key={page.id + page.title}>
                  <Link
                    href={page.slug}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-foreground text-xs font-semibold tracking-widest uppercase">
              Support
            </h3>
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
                    href={policy.slug}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {policy.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
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
