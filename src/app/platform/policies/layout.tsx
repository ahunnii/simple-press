"use client";

import Link from "next/link";

import { PlatformHeader } from "~/app/_components/platform-specific/platform-header";

const POLICY_LINKS = [
  { label: "Terms of Service", href: "/platform/policies/terms-of-service" },
  { label: "Privacy Policy", href: "/platform/policies/privacy-policy" },
  { label: "Acceptable Use", href: "/platform/policies/acceptable-use" },
  {
    label: "Seller Agreement",
    href: "/platform/policies/seller-merchant",
  },
  { label: "Cookies", href: "/platform/policies/cookie" },
  { label: "DMCA", href: "/platform/policies/dmca" },
  { label: "INFORM Act", href: "/platform/policies/inform-act" },
  { label: "Disclaimer", href: "/platform/policies/disclaimer" },
  { label: "Accessibility", href: "/platform/policies/accessibility" },
];

export default function PoliciesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <PlatformHeader />
      <main>{children}</main>
      <footer className="border-t">
        <div className="container mx-auto px-4 py-8">
          <nav className="mb-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {POLICY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="text-center text-sm text-gray-600">
            © {new Date().getFullYear()} SimplePress. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
