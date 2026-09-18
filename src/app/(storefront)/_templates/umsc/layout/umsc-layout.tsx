"use server";

import { Marcellus, Work_Sans } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveBanner } from "~/lib/site-banner/resolve";
import { resolveThemeVars } from "~/lib/template-themes";
import { getSession } from "~/server/better-auth/server";

import { resolveFields } from "../index";
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
 * Two independent banners can stack here: the platform's owner-toggled admin
 * banner (`resolveBanner`, same mechanism as `vii-layout.tsx`) renders first
 * when active, and umsc's own field-driven `UmscAnnouncementBar` renders
 * below it. Each hides independently — the platform banner is off unless an
 * admin configures one; the template banner is off when its text field is
 * blank.
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

  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const f = resolveFields(customFields, [
    "umsc.global.announcement-text",
    "umsc.global.announcement-link-label",
    "umsc.global.announcement-link-url",
  ]);
  const announcementText = f["umsc.global.announcement-text"] ?? "";

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

      {banner && <UmscPlatformBanner banner={banner} />}

      {announcementText && (
        <UmscAnnouncementBar
          text={announcementText}
          linkLabel={f["umsc.global.announcement-link-label"] ?? ""}
          linkUrl={f["umsc.global.announcement-link-url"] ?? "/shop"}
        />
      )}

      <UmscHeader business={business} initialSession={session ?? null} />

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <UmscFooter business={business} />
    </div>
  );
}
