"use server";

import { Marcellus, Work_Sans } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { safeHref } from "~/lib/safe-href";
import { resolveBanner } from "~/lib/site-banner/resolve";
import { getRawCustomFieldString } from "~/lib/template-fields";
import { resolveThemeVars } from "~/lib/template-themes";
import { getSession } from "~/server/better-auth/server";

import { nonBlank } from "../shared/umsc-non-blank";
import { UmscAnnouncementBar } from "./umsc-announcement-bar";
import { UmscFooter } from "./umsc-footer";
import { UmscHeader } from "./umsc-header";
import { UmscPlatformBanner } from "./umsc-platform-banner";

const fontSerif = Marcellus({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-umsc-serif",
  display: "swap",
});

const fontSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-umsc-sans",
  display: "swap",
});

/**
 * UmscLayout — server shell for the umsc (Unique Monique) template. The
 * header is solid black and sticky on every page (never transparent-over-
 * hero, per design.md's rejection of the vii pattern), so — unlike vii — the
 * banners render as normal in-flow elements above the header rather than
 * inside a fixed header stack.
 *
 * Announcement bar: the platform banner (Content → Announcements,
 * `resolveBanner` → `UmscPlatformBanner`) is the only live source. When no
 * banner is configured, an announcement the owner saved under the retired
 * `umsc.global.announcement-*` fields (2026-09-26) still renders as a silent
 * fallback via `UmscAnnouncementBar`, with its link only when both the saved
 * label and a safe saved URL exist. A fresh store shows no bar until the
 * owner turns on a banner.
 */
export async function UmscLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  const [session, { isEnabled }] = await Promise.all([
    getSession(),
    getBusinessFlags(),
  ]);

  const banner = resolveBanner(business.siteContent, isEnabled("banners"));
  const themeVars = resolveThemeVars(
    "umsc",
    business.siteContent?.customFields,
  );

  const customFields = business.siteContent?.customFields;
  const legacyText = nonBlank(
    getRawCustomFieldString(customFields, "umsc.global.announcement-text"),
  );
  const legacyLinkLabel = nonBlank(
    getRawCustomFieldString(
      customFields,
      "umsc.global.announcement-link-label",
    ),
  );
  const legacyLinkUrl =
    safeHref(
      getRawCustomFieldString(
        customFields,
        "umsc.global.announcement-link-url",
      ),
    ) ?? undefined;
  const hasLegacyLink = Boolean(legacyLinkLabel && legacyLinkUrl);

  return (
    <div
      className={`${fontSerif.variable} ${fontSans.variable} umsc flex min-h-screen flex-col`}
      style={themeVars ?? undefined}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded focus:bg-[var(--umsc-paper)] focus:px-4 focus:py-2 focus:text-[var(--umsc-ink)] focus:shadow-lg"
      >
        Skip to main content
      </a>

      {banner ? (
        <UmscPlatformBanner banner={banner} />
      ) : legacyText ? (
        <UmscAnnouncementBar
          text={legacyText}
          linkLabel={hasLegacyLink ? (legacyLinkLabel ?? "") : ""}
          linkUrl={hasLegacyLink ? (legacyLinkUrl ?? "") : ""}
        />
      ) : null}

      <UmscHeader business={business} initialSession={session ?? null} />

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <UmscFooter business={business} />
    </div>
  );
}
