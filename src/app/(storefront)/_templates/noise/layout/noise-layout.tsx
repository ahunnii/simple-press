"use server";

import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveBanner } from "~/lib/site-banner/resolve";
import { getSession } from "~/server/better-auth/server";
import {
  filterNavByFlags,
  resolveNav,
} from "~/app/(storefront)/_components/nav";

import { NoiseAnnouncementBar } from "./noise-announcement-bar";
import { NoiseFooter } from "./noise-footer";
import { NoiseHeader } from "./noise-header";
import { NOISE_DEFAULT_NAV, noiseNavLeftCount } from "./noise-nav";
import { NoiseRouteAnnouncer } from "./noise-route-announcer";

const fontSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
});

const fontSerif = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export async function NoiseLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  const [session, { isEnabled }] = await Promise.all([
    getSession(),
    getBusinessFlags(),
  ]);
  const banner = resolveBanner(business.siteContent, isEnabled);

  // The nav is resolved ONCE here: the owner's saved nav (`??` semantics
  // inside `resolveNav`, so a saved empty list means no links) or
  // `NOISE_DEFAULT_NAV`, then the shared route→flag filter (P-NAV-FLAGS).
  // The header's desktop bar and its mobile menu both render this array.
  const savedNav: unknown = business?.siteContent?.navigationItems;
  const navItems = filterNavByFlags(
    resolveNav(savedNav, NOISE_DEFAULT_NAV),
    isEnabled,
  );
  const navLeftCount = noiseNavLeftCount(navItems, !Array.isArray(savedNav));

  return (
    <div
      className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} noise visual-noise dark:noise`}
      style={{ color: "var(--vn-ink)" }}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded focus:px-4 focus:py-2 focus:shadow-lg"
        style={{ background: "var(--vn-paper)", color: "var(--vn-ink)" }}
      >
        Skip to main content
      </a>
      <NoiseRouteAnnouncer />
      {banner && <NoiseAnnouncementBar banner={banner} />}
      <NoiseHeader
        business={business}
        initialSession={session ?? null}
        navItems={navItems}
        navLeftCount={navLeftCount}
      />
      <main id="main-content" className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>
      <NoiseFooter business={business} initialSession={session ?? null} />
    </div>
  );
}
