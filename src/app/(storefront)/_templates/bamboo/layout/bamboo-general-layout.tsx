import { Outfit, Spectral } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveBanner } from "~/lib/site-banner/resolve";
import { resolveThemeVars } from "~/lib/template-themes";
import { getSession } from "~/server/better-auth/server";

import { BambooAnnouncementBar } from "./bamboo-announcement-bar";
import { BambooFooter } from "./bamboo-footer";
import { BambooHeader } from "./bamboo-header";
import { BambooRouteAnnouncer } from "./bamboo-route-announcer";

const fontSans = Outfit({
  subsets: ["latin"],
  variable: "--font-bam-sans",
  display: "swap",
});
const fontSerif = Spectral({
  subsets: ["latin"],
  variable: "--font-bam-serif",
  weight: ["400", "700"],
  display: "swap",
});

export async function BambooLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  const [session, { isEnabled }] = await Promise.all([
    getSession(),
    getBusinessFlags(),
  ]);

  const banner = resolveBanner(business.siteContent, isEnabled("banners"));
  const themeVars = resolveThemeVars(
    "bamboo",
    business.siteContent?.customFields,
  );

  return (
    <div
      className={`${fontSans.variable} ${fontSerif.variable} bamboo bg-background relative flex min-h-screen flex-col`}
      style={themeVars ?? undefined}
    >
      {/* Skip navigation — first focusable element on every page */}
      <a
        href="#bamboo-main-content"
        className="bamboo-skip-link focus:bg-primary focus:text-primary-foreground sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-9999 focus:rounded focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:outline-none"
      >
        Skip to main content
      </a>
      <BambooRouteAnnouncer />
      {banner && <BambooAnnouncementBar banner={banner} />}
      <BambooHeader business={business} initialSession={session ?? null} />
      <main
        id="bamboo-main-content"
        className="min-h-[calc(100vh-4rem)] flex-1"
      >
        {children}
      </main>
      <BambooFooter business={business} />
    </div>
  );
}
