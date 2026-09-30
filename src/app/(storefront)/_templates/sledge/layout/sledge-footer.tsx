import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";

import { resolveFields } from "../index";
import { resolveSledgeLocationTag } from "../shared/sledge-location-tag";
import { SledgeSocialLinks } from "../shared/sledge-social-links";

export async function SledgeFooter({ business }: DefaultFooterTemplateProps) {
  const name = business?.name ?? "";

  const customFields = business?.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const g = resolveFields(customFields, [
    "sledge.global.footer-tagline",
    "sledge.global.footer-notice-heading",
  ]);

  const noticeHeading = g["sledge.global.footer-notice-heading"] ?? "";
  const noticeText = g["sledge.global.footer-tagline"] ?? "";
  const hasNotice = noticeHeading.trim() || noticeText.trim();
  const locationTag = resolveSledgeLocationTag(business, customFields);

  const socialLinks = business?.siteContent?.socialLinks;

  const policies = await api.content.getSimplifiedPages({ type: "policy" });

  const privacyPolicy = policies.find((p) => p.slug === "privacy-policy");
  const termsOfService = policies.find((p) => p.slug === "terms-of-service");

  return (
    <footer className="sl-footer" {...sectionGroupAttr("global", "branding")}>
      {/* ── Main block ── */}
      <div className="sl-container-wide mx-auto px-7 pt-16 pb-10">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:items-center">
          {/* ── Left: notice heading + notice text ── */}
          {hasNotice ? (
            <div className="col-span-2">
              {noticeHeading.trim() ? (
                <h2
                  className="sl-footer-heading font-heading mb-4 leading-tight"
                  {...fieldAttr("sledge.global.footer-notice-heading")}
                >
                  {noticeHeading}
                </h2>
              ) : null}

              {noticeText.trim() ? (
                <p
                  className="font-sans text-lg leading-[1.75] whitespace-pre-wrap text-white/80"
                  {...fieldAttr("sledge.global.footer-tagline")}
                >
                  {noticeText}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* ── Right: social icons ── */}
          <SledgeSocialLinks
            socialLinks={socialLinks}
            className="md:justify-end"
          />
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="sl-container-wide mx-auto flex flex-col gap-3 border-t border-white/12 px-7 py-5 sm:flex-row sm:items-center sm:justify-between">
        <span className="sl-footer-meta font-sans">
          © {new Date().getFullYear()} {name}
          {locationTag && <span className="opacity-70"> · {locationTag}</span>}
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
