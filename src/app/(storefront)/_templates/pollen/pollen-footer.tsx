import Image from "next/image";
import Link from "next/link";
import { Instagram } from "lucide-react";

import type { DefaultFooterTemplateProps } from "../types";

const mainMenuLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "About Us", href: "/about" },
  { label: "Request a Quote", href: "/contact" },
  { label: "Contact", href: "/contact" },
];

const accountLinks = [
  { label: "My Account", href: "/auth/sign-in" },
  { label: "Sign In", href: "/auth/sign-in" },
  { label: "Submit a Testimonial", href: "/testimonials/submit" },
];

export async function PollenFooter({ business }: DefaultFooterTemplateProps) {
  const themeSpecificFields = business?.siteContent?.customFields as Record<
    string,
    string
  >;

  return (
    <footer className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 lg:gap-16">
          {/* Left: Logo and Contact */}
          <div>
            <Link href="/" className="mb-6 inline-block">
              {business?.siteContent?.logoUrl ? (
                <Image
                  src={business.siteContent.logoUrl}
                  alt={business.name}
                  width={120}
                  height={120}
                />
              ) : (
                <span className="text-xl font-bold">{business.name}</span>
              )}
            </Link>
            <div className="space-y-3 text-sm leading-relaxed text-[#6b7280]">
              <p>
                Phone:{" "}
                {themeSpecificFields?.["pollen.global.phone-number"] ??
                  "(XXX) XXX-XXXX"}
              </p>
              <p>Email: {business?.supportEmail ?? "hello@example.com"}</p>
              <p>
                {" "}
                Address:{" "}
                {business?.businessAddress ?? "123 Main St, Anytown, USA"}
              </p>
            </div>
          </div>

          {/* Middle: Main Menu */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-[#374151]">
              Main Menu
            </h4>
            <ul className="space-y-3">
              {mainMenuLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[#6b7280] transition-colors hover:text-[#374151]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Account */}
          <div>
            <h4 className="mb-4 text-sm font-semibold text-[#374151]">
              Account
            </h4>
            <ul className="space-y-3">
              {accountLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[#6b7280] transition-colors hover:text-[#374151]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-[#e5e7eb] pt-8 md:flex-row">
          <p className="text-sm text-[#6b7280]">
            Copyright © {new Date().getFullYear()} {business.name}. All rights
            reserved.
          </p>
          <a
            href="#"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#374151] text-white transition-colors hover:bg-[#4b5563]"
            aria-label="Instagram"
          >
            <Instagram className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
