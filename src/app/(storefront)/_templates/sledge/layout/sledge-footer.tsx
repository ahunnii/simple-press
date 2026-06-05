import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import { api } from "~/trpc/server";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { InstagramIcon } from "~/components/icons/instagram-icon";
import { TikTokIcon } from "~/components/icons/tiktok-icon";

import { resolveFields } from "../index";

export async function NoiseFooter({ business }: DefaultFooterTemplateProps) {
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
      }
    | undefined;

  const hasSocial =
    socialLinks?.instagram ?? socialLinks?.facebook ?? socialLinks?.tiktok;

  const policies = await api.content.getSimplifiedPages({ type: "policy" });

  const privacyPolicy = policies.find((p) => p.slug === "privacy-policy");
  const termsOfService = policies.find((p) => p.slug === "terms-of-service");

  return (
    <footer
      style={{
        background: "var(--sl-dark)",
        color: "#ffffff",
        marginTop: 0,
      }}
    >
      {/* ── Main block ── */}
      <div className="mx-auto px-7 pt-16 pb-10" style={{ maxWidth: "1320px" }}>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:items-center">
          {/* ── Left: Heads Up heading + notice ── */}
          <div className="col-span-2">
            <h2
              className="font-heading mb-4 leading-tight"
              style={{
                fontSize: "clamp(3rem, 6vw, 5rem)",
                color: "var(--sl-coral)",
                lineHeight: 1,
              }}
            >
              Heads Up!
            </h2>

            {/* Red accent bar + notice */}
            <div>
              <p
                className="font-sans text-lg leading-[1.75] whitespace-pre-wrap"
                style={{
                  color: "rgba(255,255,255,0.8)",
                }}
              >
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
                  className="flex items-center justify-center transition-opacity hover:opacity-70"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "0.4rem",
                    background: "var(--sl-coral)",
                    color: "#ffffff",
                    flexShrink: 0,
                  }}
                >
                  <InstagramIcon className="h-5 w-5" />
                </a>
              )}
              {socialLinks?.facebook && (
                <a
                  href={socialLinks.facebook}
                  aria-label="Facebook"
                  className="flex items-center justify-center transition-opacity hover:opacity-70"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "0.4rem",
                    background: "var(--sl-coral)",
                    color: "#ffffff",
                    flexShrink: 0,
                  }}
                >
                  <FacebookIcon className="h-5 w-5" />
                </a>
              )}
              {socialLinks?.tiktok && (
                <a
                  href={socialLinks.tiktok}
                  aria-label="TikTok"
                  className="flex items-center justify-center transition-opacity hover:opacity-70"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "0.4rem",
                    background: "var(--sl-coral)",
                    color: "#ffffff",
                    flexShrink: 0,
                  }}
                >
                  <TikTokIcon className="h-5 w-5" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div
        className="mx-auto flex flex-col gap-3 px-7 py-5 sm:flex-row sm:items-center sm:justify-between"
        style={{
          maxWidth: "1320px",
          borderTop: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {/* Copyright */}
        <span
          className="font-sans"
          style={{
            fontSize: "12px",
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "0.04em",
          }}
        >
          © {new Date().getFullYear()} {name}
        </span>

        {/* Policy links */}
        <div className="flex flex-wrap gap-4">
          {privacyPolicy ? (
            <Link
              href={`/${privacyPolicy.slug}`}
              className="font-sans transition-colors hover:text-white"
              style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}
            >
              Privacy Policy
            </Link>
          ) : (
            <Link
              href="/platform/policies/privacy-policy"
              className="font-sans transition-colors hover:text-white"
              style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}
            >
              Privacy Policy
            </Link>
          )}

          {termsOfService ? (
            <Link
              href={`/${termsOfService.slug}`}
              className="font-sans transition-colors hover:text-white"
              style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}
            >
              Terms of Service
            </Link>
          ) : (
            <Link
              href="/platform/policies/terms-of-service"
              className="font-sans transition-colors hover:text-white"
              style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}
            >
              Terms of Service
            </Link>
          )}

          <Link
            href="/platform/policies/"
            className="font-sans transition-colors hover:text-white"
            style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}
          >
            Platform Policies
          </Link>
        </div>
      </div>
    </footer>
  );
}
