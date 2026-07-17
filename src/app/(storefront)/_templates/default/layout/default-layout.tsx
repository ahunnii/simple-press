import { Inter, Poppins } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveBanner } from "~/lib/site-banner/resolve";
import { resolveThemeVars } from "~/lib/template-themes";

import { DefaultAnnouncementBar } from "./default-announcement-bar";
import { DefaultFooter } from "./default-footer";
import { DefaultHeader } from "./default-header";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export async function DefaultLayout({
  business,
  children,
}: DefaultLayoutTemplateProps) {
  const { isEnabled } = await getBusinessFlags();
  const banner = resolveBanner(business.siteContent, isEnabled("banners"));
  const themeVars = resolveThemeVars(
    "default",
    business.siteContent?.customFields,
  );

  return (
    <div
      className={`${inter.variable} ${poppins.variable} default-template flex min-h-screen flex-col`}
      style={themeVars ?? undefined}
    >
      {/* Skip navigation — first focusable element on every page */}
      <a
        href="#main-content"
        className="default-skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-9999 focus:rounded-(--radius) focus:bg-[#0a0a0a] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-none"
      >
        Skip to main content
      </a>
      {banner && <DefaultAnnouncementBar banner={banner} />}
      <DefaultHeader business={business} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <DefaultFooter business={business} />
    </div>
  );
}
