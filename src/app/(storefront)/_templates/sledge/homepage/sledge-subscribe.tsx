"use client";

import Image from "next/image";

import type { RouterOutputs } from "~/trpc/react";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";
import { TikTokIcon } from "~/components/icons/tiktok-icon";

type SledgeSubscribeProps = {
  image?: string;
  heading?: string;
  body?: string;
  business?: RouterOutputs["business"]["getHomepage"];
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};

export function SledgeSubscribe({
  image,
  heading,
  business,
  sectionAttrs,
}: SledgeSubscribeProps) {
  const socialLinks = business?.siteContent?.socialLinks as
    | {
        instagram?: string;
        facebook?: string;
        twitter?: string;
        tiktok?: string;
      }
    | undefined;

  const hasSocial =
    socialLinks?.instagram ?? socialLinks?.facebook ?? socialLinks?.tiktok;

  return (
    <section className="sl-section-green" {...sectionAttrs}>
      <div className="sl-container grid grid-cols-1 items-center gap-12 md:grid-cols-2">
        {/* Left: product image — decorative, so alt="" (M-9) */}
        {image && (
          <div className="sl-media-frame sl-media-frame-cream">
            <Image
              src={image}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        )}

        {/* Right: social links */}
        <div>
          <h2 className="sl-heading-lg font-heading">
            {heading ?? "Subscribe for the latest drops"}
          </h2>

          {hasSocial && (
            <div className="flex flex-wrap items-start gap-3 md:justify-start">
              {socialLinks?.instagram && (
                <a
                  href={socialLinks.instagram}
                  aria-label="Instagram"
                  className="sl-social-btn transition-opacity hover:opacity-70"
                >
                  <InstagramIcon className="h-5 w-5" />
                </a>
              )}
              {socialLinks?.facebook && (
                <a
                  href={socialLinks.facebook}
                  aria-label="Facebook"
                  className="sl-social-btn transition-opacity hover:opacity-70"
                >
                  <FacebookIcon className="h-5 w-5" />
                </a>
              )}
              {socialLinks?.tiktok && (
                <a
                  href={socialLinks.tiktok}
                  aria-label="TikTok"
                  className="sl-social-btn transition-opacity hover:opacity-70"
                >
                  <TikTokIcon className="h-5 w-5" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
