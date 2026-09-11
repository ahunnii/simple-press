"use server";

import { Jost, PT_Sans, Roboto_Mono, Titillium_Web } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveBanner } from "~/lib/site-banner/resolve";
import { resolveThemeVars } from "~/lib/template-themes";
import { getSession } from "~/server/better-auth/server";

import { WealthFooter } from "./wealth-footer";
import { WealthHeader } from "./wealth-header";

const fontTitilliumWeb = Titillium_Web({
  subsets: ["latin"],
  variable: "--font-wealth-titillium",
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const fontJost = Jost({
  subsets: ["latin"],
  variable: "--font-wealth-jost",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const fontPTSans = PT_Sans({
  subsets: ["latin"],
  variable: "--font-wealth-ptsans",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const fontRobotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-wealth-robotomono",
  weight: ["400", "500"],
  display: "swap",
});

export async function WealthLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  const [session, { isEnabled }] = await Promise.all([
    getSession(),
    getBusinessFlags(),
  ]);

  const banner = resolveBanner(business.siteContent, isEnabled("banners"));
  // `wealth` has no theme presets (fixed brand, per design.md) — resolveThemeVars
  // returns null for a templateId with no TEMPLATE_THEMES entry, so this is a
  // safe no-op today and starts working automatically if a theme.ts is ever
  // added later.
  const themeVars = resolveThemeVars(
    "wealth",
    business.siteContent?.customFields,
  );

  return (
    <div
      className={`${fontTitilliumWeb.variable} ${fontJost.variable} ${fontPTSans.variable} ${fontRobotoMono.variable} wealth flex min-h-screen flex-col`}
      style={{ fontFamily: "var(--font-wealth-body)", ...themeVars }}
    >
      {/* Skip link — always the first focusable element */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:shadow-lg"
        style={{
          background: "var(--wealth-paper)",
          color: "var(--wealth-ink)",
          fontFamily: "var(--font-wealth-body)",
        }}
      >
        Skip to main content
      </a>

      <WealthHeader
        business={business}
        initialSession={session ?? null}
        banner={banner}
      />

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <WealthFooter business={business} />
    </div>
  );
}
