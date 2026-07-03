"use server";

import { Outfit, Spectral } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveBanner } from "~/lib/site-banner/resolve";
import { resolveThemeVars } from "~/lib/template-themes";
import { getSession } from "~/server/better-auth/server";

import { HappyBambooAnnouncementBar } from "./happy-bamboo-announcement-bar";
import { HappyBambooFooter } from "./happy-bamboo-footer";
import { HappyBambooHeader } from "./happy-bamboo-header";

const fontSans = Outfit({ subsets: ["latin"], variable: "--font-sans" });
const fontSerif = Spectral({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "700"],
});

export async function HappyBambooLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  const [session, { isEnabled }] = await Promise.all([
    getSession(),
    getBusinessFlags(),
  ]);
  const banner = resolveBanner(business.siteContent, isEnabled("banners"));
  const themeVars = resolveThemeVars(
    "happy-bamboo",
    business.siteContent?.customFields,
  );
  return (
    <main
      className={`${fontSans.variable} ${fontSerif.variable} happy-bamboo dark:happy-bamboo`}
      style={themeVars ?? undefined}
    >
      <a
        href="#main-content"
        className="focus:text-foreground sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-100 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:ring-2 focus:ring-[var(--hb-brand)] focus:outline-none"
      >
        Skip to main content
      </a>
      {banner && <HappyBambooAnnouncementBar banner={banner} />}
      <HappyBambooHeader business={business} session={session ?? null} />
      <div id="main-content" tabIndex={-1} className="min-h-[calc(100vh-4rem)]">
        {children}
      </div>
      <HappyBambooFooter business={business} />
    </main>
  );
}
