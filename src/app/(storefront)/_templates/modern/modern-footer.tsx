import Link from "next/link";

import type { FooterBusiness } from "../../_components/storefront-footer";

export function ModernFooter({ business }: { business: FooterBusiness }) {
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
              <li>
                <Link
                  href="/products?category=Furniture"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Furniture
                </Link>
              </li>
              <li>
                <Link
                  href="/products?category=Lighting"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Lighting
                </Link>
              </li>
              <li>
                <Link
                  href="/products?category=Decor"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Decor
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-foreground text-xs font-semibold tracking-widest uppercase">
              Company
            </h3>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <span className="text-muted-foreground text-sm">
                  Sustainability
                </span>
              </li>
              <li>
                <span className="text-muted-foreground text-sm">Careers</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-foreground text-xs font-semibold tracking-widest uppercase">
              Support
            </h3>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <span className="text-muted-foreground text-sm">Contact</span>
              </li>
              <li>
                <span className="text-muted-foreground text-sm">
                  Shipping & Returns
                </span>
              </li>
              <li>
                <span className="text-muted-foreground text-sm">FAQ</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-border mt-16 border-t pt-8">
          <p className="text-muted-foreground text-xs">
            &copy; {new Date().getFullYear()} {business.name}. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
