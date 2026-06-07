"use client";

import { useState } from "react";
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
  body,
  business,
  sectionAttrs,
}: SledgeSubscribeProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setEmail("");
    }
  };

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
        {/* Left: product image */}
        {image && (
          <div className="sl-media-frame sl-media-frame-cream">
            <Image
              src={image}
              alt="Featured product"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        )}

        {/* Right: subscribe form */}
        <div>
          <h2 className="sl-heading-lg font-heading">
            {heading ?? "Subscribe for the latest drops"}
          </h2>

          {/* Red bar + body copy */}
          {/* <div
            style={{
              borderLeft: "4px solid var(--sl-red)",
              paddingLeft: "1.25rem",
              marginBottom: "2rem",
            }}
          >
            <p
              className="font-sans italic"
              style={{
                fontSize: "clamp(13px, 1.6vw, 16px)",
                color: "var(--sl-ink)",
                lineHeight: 1.8,
              }}
            >
              {body ??
                "Be the first to know about new wearable-art pieces, limited drops, and behind-the-scenes studio moments."}
            </p>
          </div> */}

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
          {/* {submitted ? (
            <p
              role="status"
              className="font-sans font-semibold"
              style={{
                fontSize: "15px",
                color: "var(--sl-ink)",
                padding: "12px 0",
              }}
            >
              Thank you — you&apos;ll hear from us soon!
            </p>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <label htmlFor="sl-subscribe-email" className="sr-only">
                Email address
              </label>
              <input
                id="sl-subscribe-email"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="font-sans"
                style={{
                  flex: "1 1 200px",
                  background: "rgba(255,255,255,0.7)",
                  border: "2px solid rgba(255,255,255,0.9)",
                  borderRadius: "var(--radius, 0.5rem)",
                  padding: "10px 14px",
                  fontSize: "14px",
                  color: "var(--sl-ink)",
                  outline: "none",
                  minWidth: 0,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--sl-coral)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.9)";
                }}
              />
              <button type="submit" className="sl-btn" style={{ flexShrink: 0 }}>
                Subscribe
              </button>
            </form>
          )} */}
        </div>
      </div>
    </section>
  );
}
