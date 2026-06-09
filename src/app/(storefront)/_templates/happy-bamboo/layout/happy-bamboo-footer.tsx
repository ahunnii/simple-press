import Link from "next/link";
import { TwitterLogoIcon } from "@radix-ui/react-icons";
import { Leaf } from "lucide-react";

import type { DefaultFooterTemplateProps } from "../../types";
import { api } from "~/trpc/server";
import { Separator } from "~/components/ui/separator";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";
import { TikTokIcon } from "~/components/icons/tiktok-icon";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

export async function HappyBambooFooter({
  business,
}: DefaultFooterTemplateProps) {
  const email = business?.supportEmail;
  const phone = business?.phoneNumber;
  const address = business?.businessAddress;
  const name = business?.name ?? "Business Name";
  const footerTagline = business?.siteContent?.footerText;

  const navigationItems = business?.siteContent?.navigationItems as
    | {
        label: string;
        href: string;
      }[]
    | undefined;

  const policies = await api.content.getSimplifiedPages({
    type: "policy",
  });

  const socialLinks = business?.siteContent?.socialLinks as
    | {
        instagram?: string;
        facebook?: string;
        twitter?: string;
        tiktok?: string;
      }
    | undefined;

  return (
    <footer className="border-border bg-foreground border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <Leaf className="text-muted h-8 w-8" aria-hidden="true" />
              <span className="text-muted font-serif text-xl font-bold">
                Support Happy Bamboo Toilet Tissue
              </span>
            </Link>
            {!!footerTagline && (
              <p className="text-muted text-sm leading-relaxed">
                {footerTagline}
              </p>
            )}

            <div className="flex gap-4">
              {socialLinks?.facebook && (
                <a
                  href={socialLinks.facebook}
                  className="text-muted hover:text-primary transition-colors"
                  aria-label="Facebook"
                >
                  <FacebookIcon className="h-5 w-5" aria-hidden="true" />
                </a>
              )}

              {socialLinks?.instagram && (
                <a
                  href={socialLinks.instagram}
                  className="text-muted hover:text-primary transition-colors"
                  aria-label="Instagram"
                >
                  <InstagramIcon className="h-5 w-5" aria-hidden="true" />
                </a>
              )}
              {socialLinks?.twitter && (
                <a
                  href={socialLinks.twitter}
                  className="text-muted hover:text-primary transition-colors"
                  aria-label="Twitter"
                >
                  <TwitterLogoIcon className="h-5 w-5" aria-hidden="true" />
                </a>
              )}
              {socialLinks?.tiktok && (
                <a
                  href={socialLinks.tiktok}
                  className="text-muted hover:text-primary transition-colors"
                  aria-label="TikTok"
                >
                  <TikTokIcon className="h-5 w-5" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-muted mb-4 font-semibold">Quick Links</h4>
            <ul className="flex flex-col space-y-2">
              {(navigationItems ?? quickLinks).map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted hover:text-primary text-sm transition-colors"
                  >
                    {link.label}
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
                  href={`tel:${phone.replace(/\D/g, "")}`}
                  className="hover:text-primary transition-colors"
                >
                  {phone}
                </a>
              )}
              {!!email && (
                <a
                  href={`mailto:${email}`}
                  className="hover:text-primary transition-colors"
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
                      className="text-muted hover:text-primary text-sm transition-colors"
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
