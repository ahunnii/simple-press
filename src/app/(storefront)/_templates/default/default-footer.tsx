import Image from "next/image";
import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
};
export function DefaultFooter({ business }: Props) {
  return (
    <footer className="bg-background mt-auto border-t">
      <div className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              {business.siteContent?.logoUrl ? (
                <Image
                  src={business.siteContent.logoUrl}
                  alt={business.name}
                  width={40}
                  height={40}
                  className="bg-primary rounded-full"
                />
              ) : (
                <span className="text-xl font-bold">{business.name}</span>
              )}
            </Link>
            <p className="text-muted-foreground text-sm">
              {business.siteContent?.footerText}
            </p>
          </div>
          <div className="space-y-4"></div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Shop</h3>
            <nav className="flex flex-col space-y-2">
              <Link
                href="/products"
                className="text-muted-foreground hover:text-primary text-sm"
              >
                All Products
              </Link>
              <Link
                href="/about"
                className="text-muted-foreground hover:text-primary text-sm"
              >
                About Us
              </Link>
            </nav>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Support</h3>
            <nav className="flex flex-col space-y-2">
              <Link
                href="/contact"
                className="text-muted-foreground hover:text-primary text-sm"
              >
                Contact Us
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-primary text-sm"
              >
                Returns & Refunds
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-primary text-sm"
              >
                Shipping Information
              </Link>
            </nav>
          </div>
          {business?.businessAddress && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Contact</h3>
              <div className="text-muted-foreground flex flex-col space-y-2 text-sm">
                <p>{business.businessAddress}</p>
              </div>
            </div>
          )}
        </div>
        <div className="mt-8 border-t pt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-xs">
              &copy; {new Date().getFullYear()} {business.name}. All rights
              reserved.
            </p>
            <div className="flex gap-4">
              <Link
                href="#"
                className="text-muted-foreground hover:text-primary text-xs"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-primary text-xs"
              >
                Terms of Service
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-primary text-xs"
              >
                Cookies Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
