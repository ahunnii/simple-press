import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import { api } from "~/trpc/server";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";
import { TikTokIcon } from "~/components/icons/tiktok-icon";
import { YouTubeIcon } from "~/components/icons/youtube-icon";

import { resolveFields } from "../index";

export async function SledgeFooter({ business }: DefaultFooterTemplateProps) {
  const name = business?.name ?? "";

  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const g = resolveFields(customFields, ["sledge.global.footer-tagline"]);

  // Default notice for "all sales final" — sourced from the editable footer-tagline field
  const noticeText =
    g["sledge.global.footer-tagline"] ??
    "All sales are final. Each piece is made with love and care — please review sizing and details before purchasing. Questions? Reach out before you buy!";

  const socialLinks = business?.siteContent?.socialLinks as
    | {
        instagram?: string;
        facebook?: string;
        twitter?: string;
        tiktok?: string;
        youtube?: string;
      }
    | undefined;

  const hasSocial =
    socialLinks?.instagram ??
    socialLinks?.facebook ??
    socialLinks?.tiktok ??
    socialLinks?.youtube;

  const policies = await api.content.getSimplifiedPages({ type: "policy" });

  const privacyPolicy = policies.find((p) => p.slug === "privacy-policy");
  const termsOfService = policies.find((p) => p.slug === "terms-of-service");

  return (
    <footer className="sl-footer">
      {/* ── Main block ── */}
      <div className="sl-container-wide mx-auto px-7 pt-16 pb-10">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:items-center">
          {/* ── Left: Heads Up heading + notice ── */}
          <div className="col-span-2">
            <h2 className="sl-footer-heading font-heading mb-4 leading-tight">
              Heads Up!
            </h2>

            <div>
              <p className="font-sans text-lg leading-[1.75] whitespace-pre-wrap text-white/80">
                {noticeText}
              </p>
            </div>
          </div>

          {/* ── Right: social icons ── */}
          {hasSocial && (
            <div className="flex flex-wrap items-start gap-3 md:justify-end">
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
              {socialLinks?.youtube && (
                <a
                  href={socialLinks.youtube}
                  aria-label="YouTube"
                  className="sl-social-btn transition-opacity hover:opacity-70"
                >
                  <YouTubeIcon className="h-5 w-5" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="sl-container-wide mx-auto flex flex-col gap-3 border-t border-white/12 px-7 py-5 sm:flex-row sm:items-center sm:justify-between">
        <span className="sl-footer-meta font-sans">
          © {new Date().getFullYear()} {name}
        </span>

        <div className="flex flex-wrap gap-4">
          {privacyPolicy ? (
            <Link
              href={`/${privacyPolicy.slug}`}
              className="sl-footer-meta font-sans transition-colors hover:text-white"
            >
              Privacy Policy
            </Link>
          ) : (
            <Link
              href="/platform/policies/privacy-policy"
              className="sl-footer-meta font-sans transition-colors hover:text-white"
            >
              Privacy Policy
            </Link>
          )}

          {termsOfService ? (
            <Link
              href={`/${termsOfService.slug}`}
              className="sl-footer-meta font-sans transition-colors hover:text-white"
            >
              Terms of Service
            </Link>
          ) : (
            <Link
              href="/platform/policies/terms-of-service"
              className="sl-footer-meta font-sans transition-colors hover:text-white"
            >
              Terms of Service
            </Link>
          )}

          <Link
            href="/platform/policies/"
            className="sl-footer-meta font-sans transition-colors hover:text-white"
          >
            Platform Policies
          </Link>
        </div>
      </div>
    </footer>
  );
}
