import Link from "next/link";
import { FacebookIcon, TikTokIcon } from "@daveyplate/better-auth-ui";
import { InstagramLogoIcon, TwitterLogoIcon } from "@radix-ui/react-icons";
import { Leaf } from "lucide-react";

import type { DefaultFooterTemplateProps } from "../types";
import { api } from "~/trpc/server";
import { Separator } from "~/components/ui/separator";

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

export async function HappyBambooFooter({
  business,
}: DefaultFooterTemplateProps) {
  const email = business?.supportEmail ?? "hello@zairesvisions.com";

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
    // <footer className="bg-primary text-primary-foreground">
    //   <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
    //     <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
    //       <div className="flex flex-col gap-4">
    //         <Link href="/" className="flex items-center gap-2">
    //           <Leaf className="size-5" />
    //           <span className="font-heading text-xl font-bold">
    //             Finally Results LLC
    //           </span>
    //         </Link>
    //         <p className="text-primary-foreground/80 text-sm leading-relaxed">
    //           Premium bamboo paper products crafted with purpose. Better for
    //           you, better for the planet.
    //         </p>
    //       </div>

    //       <div>
    //         <h3 className="text-primary-foreground/60 mb-4 text-sm font-semibold tracking-wider uppercase">
    //           Quick Links
    //         </h3>
    //         <nav className="flex flex-col gap-2.5" aria-label="Quick links">
    //           {quickLinks.map((link) => (
    //             <Link
    //               key={link.label}
    //               href={link.href}
    //               className="text-primary-foreground/80 hover:text-primary-foreground text-sm transition-colors"
    //             >
    //               {link.label}
    //             </Link>
    //           ))}
    //         </nav>
    //       </div>

    //       <div>
    //         <h3 className="text-primary-foreground/60 mb-4 text-sm font-semibold tracking-wider uppercase">
    //           Policies
    //         </h3>
    //         <nav
    //           className="flex flex-col gap-2.5"
    //           aria-label="Customer care links"
    //         >
    //           {policies.map((link) => (
    //             <Link
    //               key={link.id}
    //               href={link.slug}
    //               className="text-primary-foreground/80 hover:text-primary-foreground text-sm transition-colors"
    //             >
    //               {link.title}
    //             </Link>
    //           ))}
    //         </nav>
    //       </div>

    //       <div>
    //         <h3 className="text-primary-foreground/60 mb-4 text-sm font-semibold tracking-wider uppercase">
    //           Connect
    //         </h3>
    //         <address className="text-primary-foreground/80 flex flex-col gap-2.5 text-sm not-italic">
    //           <span>Finally Results LLC</span>
    //           <span>Detroit, Michigan</span>
    //           <a
    //             href={`mailto:${email}`}
    //             className="hover:text-primary-foreground transition-colors"
    //           >
    //             {email}
    //           </a>
    //         </address>
    //       </div>
    //     </div>

    //     <div className="border-primary-foreground/20 mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
    //       <p className="text-primary-foreground/60 text-xs">
    //         {"© 2026 Finally Results LLC. All rights reserved."}
    //       </p>
    //       <p className="text-primary-foreground/60 text-xs">
    //         Proudly made in Detroit
    //       </p>
    //     </div>
    //   </div>
    // </footer>

    <footer className="border-border bg-foreground border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <Leaf className="text-muted h-8 w-8" />
              <span className="text-muted text-xl font-bold">
                Zaires Visions
              </span>
            </Link>
            <p className="text-muted text-sm leading-relaxed">
              Transforming everyday personal care into an experience that
              nurtures both people and the planet.
            </p>
            <div className="flex gap-4">
              {socialLinks?.facebook && (
                <a
                  href={socialLinks.facebook}
                  className="text-muted hover:text-primary transition-colors"
                  aria-label="Facebook"
                >
                  <FacebookIcon className="h-5 w-5" />
                </a>
              )}

              {socialLinks?.instagram && (
                <a
                  href={socialLinks.instagram}
                  className="text-muted hover:text-primary transition-colors"
                  aria-label="Instagram"
                >
                  <InstagramLogoIcon className="h-5 w-5" />
                </a>
              )}
              {socialLinks?.twitter && (
                <a
                  href={socialLinks.twitter}
                  className="text-muted hover:text-primary transition-colors"
                  aria-label="Twitter"
                >
                  <TwitterLogoIcon className="h-5 w-5" />
                </a>
              )}
              {socialLinks?.tiktok && (
                <a
                  href={socialLinks.tiktok}
                  className="text-muted hover:text-primary transition-colors"
                  aria-label="TikTok"
                >
                  <TikTokIcon className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-muted mb-4 font-semibold">Quick Links</h4>
            <ul className="flex flex-col space-y-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-muted hover:text-primary text-sm transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-muted mb-4 font-semibold">Support</h4>

            <address className="text-muted/80 flex flex-col gap-2.5 text-sm not-italic">
              <span>Zaires Visions LLC</span>
              <span>Detroit, Michigan</span>
              <a
                href="tel:+13138139450"
                className="hover:text-primary transition-colors"
              >
                (313) 813-9450
              </a>
              <a
                href={`mailto:${email}`}
                className="hover:text-primary transition-colors"
              >
                {email}
              </a>
            </address>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="text-muted flex flex-col items-center justify-between gap-4 text-sm md:flex-row">
          <p>
            &copy; {new Date().getFullYear()} Zaires Visions LLC. All rights
            reserved.
          </p>
          <div className="flex gap-4">
            {policies.map((link) => (
              <Link
                key={link.id}
                href={link.slug}
                className="hover:text-primary"
              >
                {link.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
