import Image from "next/image";
import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";

function InstagramIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PinterestIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M11 19l1.6-7.5M9 11c0-2 1.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5-1.5 3.7-3.4 3.7c-1 0-1.6-.6-1.6-.6" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14a3.5 3.5 0 1 0 3.5 3.5V4c.6 2.2 2.2 3.8 4.5 4" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 7h2V4h-2.5C12 4 11 5 11 6.5V9H9v3h2v8h3v-8h2.2L17 9h-3V6.8c0-.5.3-.8.7-.8H14" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

export function DefaultFooter({ business }: DefaultFooterTemplateProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#e8e8e8] mt-auto">
      <div className="mx-auto max-w-[1440px] px-6 pt-20 pb-8">

        {/* Top grid */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] pb-14 border-b border-[#e8e8e8]">

          {/* Brand column */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              {business.siteContent?.logoUrl ? (
                <Image
                  src={business.siteContent.logoUrl}
                  alt={business.name}
                  width={36}
                  height={36}
                  className="rounded-full object-cover"
                />
              ) : (
                <span className="font-serif text-[18px] font-semibold tracking-[-0.01em]">
                  {business.name}
                </span>
              )}
            </Link>
            {business.siteContent?.footerText && (
              <p className="text-sm text-[#6b6b6b] max-w-[300px] leading-relaxed">
                {business.siteContent.footerText}
              </p>
            )}

            {/* Social links */}
            <div className="flex gap-2 mt-2">
              {[
                { label: "Instagram", href: "#", Icon: InstagramIcon },
                { label: "Pinterest", href: "#", Icon: PinterestIcon },
                { label: "TikTok", href: "#", Icon: TikTokIcon },
                { label: "Facebook", href: "#", Icon: FacebookIcon },
                { label: "Email", href: "mailto:hello@yourshop.com", Icon: EmailIcon },
              ].map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-full border border-[#e8e8e8] grid place-items-center text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a] hover:text-white hover:border-[#0a0a0a]"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div className="flex flex-col gap-4">
            <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#6b6b6b]" aria-hidden="true">
              Shop
            </p>
            <nav aria-label="Shop links" className="flex flex-col gap-2.5">
              {[
                { href: "/shop", label: "All products" },
                { href: "/collections", label: "Collections" },
                { href: "/shop?sort=featured", label: "Featured" },
                { href: "/shop?sort=new", label: "New arrivals" },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm text-[#0a0a0a] hover:underline"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Help */}
          <div className="flex flex-col gap-4">
            <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#6b6b6b]" aria-hidden="true">
              Help
            </p>
            <nav aria-label="Help links" className="flex flex-col gap-2.5">
              {[
                { href: "/contact", label: "Contact" },
                { href: "#", label: "Shipping" },
                { href: "#", label: "Returns" },
                { href: "#", label: "FAQ" },
              ].map(({ href, label }) => (
                <Link
                  key={`help-${label}`}
                  href={href}
                  className="text-sm text-[#0a0a0a] hover:underline"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Company */}
          <div className="flex flex-col gap-4">
            <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#6b6b6b]" aria-hidden="true">
              Company
            </p>
            <nav aria-label="Company links" className="flex flex-col gap-2.5">
              {[
                { href: "/about", label: "About us" },
                { href: "/testimonials", label: "Reviews" },
                { href: "/blog", label: "Blog" },
                ...(business.businessAddress
                  ? [{ href: "/contact", label: "Find us" }]
                  : []),
              ].map(({ href, label }) => (
                <Link
                  key={`company-${label}`}
                  href={href}
                  className="text-sm text-[#0a0a0a] hover:underline"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-7 text-xs text-[#6b6b6b] font-medium tracking-[0.08em] uppercase">
          <span>
            &copy; {year} {business.name}
          </span>
          <div className="flex gap-5">
            <Link href="#" className="hover:text-[#0a0a0a] transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-[#0a0a0a] transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
