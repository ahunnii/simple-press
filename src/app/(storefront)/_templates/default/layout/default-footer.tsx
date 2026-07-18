import Image from "next/image";
import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { api } from "~/trpc/server";
import { EmailIcon } from "~/components/icons/email-icon";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";
import { LinkedinIcon } from "~/components/icons/linkedin-icon";
import { PinterestIcon } from "~/components/icons/pinterest-icon";
import { TikTokIcon } from "~/components/icons/tiktok-icon";
import { TwitterIcon } from "~/components/icons/twitter-icon";
import { YouTubeIcon } from "~/components/icons/youtube-icon";

export async function DefaultFooter({ business }: DefaultFooterTemplateProps) {
  const year = new Date().getFullYear();
  const { isEnabled } = await getBusinessFlags();

  const socialLinks = business?.siteContent?.socialLinks as
    | {
        instagram?: string;
        facebook?: string;
        twitter?: string;
        tiktok?: string;
        pinterest?: string;
        linkedin?: string;
        youtube?: string;
      }
    | undefined;

  const policies = await api.content.getSimplifiedPages({
    type: "policy",
  });

  const shippingPolicy = policies.find((p) => p.slug === "shipping-policy");
  const returnPolicy = policies.find((p) => p.slug === "refund-policy");
  const privacyPolicy = policies.find((p) => p.slug === "privacy-policy");
  const termsOfService = policies.find((p) => p.slug === "terms-of-service");

  const blogEnabled = isEnabled("blog");

  return (
    <footer className="mt-auto border-t border-[#e8e8e8]">
      <div className="mx-auto max-w-[1440px] px-6 pt-20 pb-8">
        {/* Top grid */}
        <div className="grid grid-cols-1 gap-10 border-b border-[#e8e8e8] pb-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
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
              <p className="max-w-[300px] text-sm leading-relaxed text-[#6b6b6b]">
                {business.siteContent.footerText}
              </p>
            )}

            {/* Social links */}
            <div className="mt-2 flex gap-2">
              {[
                ...(socialLinks?.instagram
                  ? [
                      {
                        label: "Instagram",
                        href: socialLinks.instagram,
                        Icon: InstagramIcon,
                      },
                    ]
                  : []),
                ...(socialLinks?.facebook
                  ? [
                      {
                        label: "Facebook",
                        href: socialLinks.facebook,
                        Icon: FacebookIcon,
                      },
                    ]
                  : []),
                ...(socialLinks?.twitter
                  ? [
                      {
                        label: "Twitter",
                        href: socialLinks.twitter,
                        Icon: TwitterIcon,
                      },
                    ]
                  : []),
                ...(socialLinks?.tiktok
                  ? [
                      {
                        label: "TikTok",
                        href: socialLinks.tiktok,
                        Icon: TikTokIcon,
                      },
                    ]
                  : []),
                ...(socialLinks?.pinterest
                  ? [
                      {
                        label: "Pinterest",
                        href: socialLinks.pinterest,
                        Icon: PinterestIcon,
                      },
                    ]
                  : []),
                ...(socialLinks?.linkedin
                  ? [
                      {
                        label: "LinkedIn",
                        href: socialLinks.linkedin,
                        Icon: LinkedinIcon,
                      },
                    ]
                  : []),
                ...(socialLinks?.youtube
                  ? [
                      {
                        label: "YouTube",
                        href: socialLinks.youtube,
                        Icon: YouTubeIcon,
                      },
                    ]
                  : []),
                {
                  label: "Email",
                  href: `mailto:${business.supportEmail}`,
                  Icon: EmailIcon,
                },
              ].map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="grid h-9 w-9 place-items-center rounded-full border border-[#e8e8e8] text-[#0a0a0a] transition-colors hover:border-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div className="flex flex-col gap-4">
            <p
              className="text-[11px] font-medium tracking-[0.18em] text-[#6b6b6b] uppercase"
              aria-hidden="true"
            >
              Shop
            </p>
            <nav aria-label="Shop links" className="flex flex-col gap-2.5">
              {[
                { href: "/shop", label: "All products" },
                ...(isEnabled("collections")
                  ? [{ href: "/collections", label: "Collections" }]
                  : []),
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
            <p
              className="text-[11px] font-medium tracking-[0.18em] text-[#6b6b6b] uppercase"
              aria-hidden="true"
            >
              Help
            </p>
            <nav aria-label="Help links" className="flex flex-col gap-2.5">
              {[
                { href: "/contact", label: "Contact" },
                ...(shippingPolicy
                  ? [{ href: `/${shippingPolicy.slug}`, label: "Shipping" }]
                  : []),
                ...(returnPolicy
                  ? [{ href: `/${returnPolicy.slug}`, label: "Returns" }]
                  : []),
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
            {(business.phoneNumber ?? business.businessAddress) && (
              <address className="mt-1 flex flex-col gap-1 text-sm text-[#6b6b6b] not-italic">
                {business.phoneNumber && (
                  <a
                    href={`tel:${business.phoneNumber}`}
                    className="hover:text-[#0a0a0a] hover:underline"
                  >
                    {business.phoneNumber}
                  </a>
                )}
                {business.businessAddress && (
                  <span>{business.businessAddress}</span>
                )}
              </address>
            )}
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-4">
            <p
              className="text-[11px] font-medium tracking-[0.18em] text-[#6b6b6b] uppercase"
              aria-hidden="true"
            >
              Quick Links
            </p>
            <nav aria-label="Quick links" className="flex flex-col gap-2.5">
              {[
                { href: "/about", label: "About us" },
                ...(isEnabled("testimonials")
                  ? [{ href: "/testimonials", label: "Reviews" }]
                  : []),
                ...(blogEnabled ? [{ href: "/blog", label: "Blog" }] : []),
                ...(isEnabled("services")
                  ? [{ href: "/services", label: "Services" }]
                  : []),
              ].map(({ href, label }) => (
                <Link
                  key={`quick-links-${label}`}
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
        <div className="flex flex-col gap-3 pt-7 text-xs font-medium tracking-[0.08em] text-[#6b6b6b] uppercase sm:flex-row sm:items-center sm:justify-between">
          <span>
            &copy; {year} {business.name}
          </span>
          <div className="flex gap-5">
            {privacyPolicy ? (
              <Link
                href={`/${privacyPolicy.slug}`}
                className="transition-colors hover:text-[#0a0a0a]"
              >
                Privacy Policy{" "}
              </Link>
            ) : (
              <Link
                href="/platform/policies/privacy-policy"
                className="transition-colors hover:text-[#0a0a0a]"
              >
                Privacy Policy
              </Link>
            )}

            {termsOfService ? (
              <Link
                href={`/${termsOfService.slug}`}
                className="transition-colors hover:text-[#0a0a0a]"
              >
                Terms of Service
              </Link>
            ) : (
              <Link
                href="/platform/policies/terms-of-service"
                className="transition-colors hover:text-[#0a0a0a]"
              >
                Terms of Service
              </Link>
            )}
            <Link
              href="/platform/policies/"
              className="transition-colors hover:text-[#0a0a0a]"
            >
              Platform Policies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
