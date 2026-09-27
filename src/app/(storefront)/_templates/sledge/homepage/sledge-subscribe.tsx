"use client";

import Image from "next/image";

import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr } from "~/lib/preview/section-attrs";

import { SledgeSocialLinks } from "../shared/sledge-social-links";

type SledgeSubscribeProps = {
  image?: string;
  heading: string;
  body?: string;
  business?: RouterOutputs["business"]["getHomepage"];
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};

export function SledgeSubscribe({
  image,
  heading,
  body,
  business,
  sectionAttrs,
}: SledgeSubscribeProps) {
  const socialLinks = business?.siteContent?.socialLinks;

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

        {/* Right: heading, body, social links */}
        <div>
          <h2
            className="sl-heading-lg font-heading"
            {...fieldAttr("sledge.homepage-guarantee-heading")}
          >
            {heading}
          </h2>

          {body?.trim() ? (
            <p
              className="sl-quote-body mt-4 mb-6 font-sans"
              {...fieldAttr("sledge.homepage-guarantee-quote")}
            >
              {body}
            </p>
          ) : null}

          <SledgeSocialLinks
            socialLinks={socialLinks}
            className="md:justify-start"
          />
        </div>
      </div>
    </section>
  );
}
