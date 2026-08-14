"use server";

import { Amatic_SC, Raleway } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveBanner } from "~/lib/site-banner/resolve";
import { getSession } from "~/server/better-auth/server";

import { SledgeAnnouncementBar } from "./sledge-announcement-bar";
import { SledgeFooter } from "./sledge-footer";
import { SledgeHeader } from "./sledge-header";

const fontSans = Raleway({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
});

const fontHeading = Amatic_SC({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "700"],
});

export async function SledgeLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  const [session, { isEnabled }] = await Promise.all([
    getSession(),
    getBusinessFlags(),
  ]);
  const banner = resolveBanner(business.siteContent, isEnabled("banners"));
  return (
    <div className={`${fontSans.variable} ${fontHeading.variable} sledge`}>
      <a
        href="#main-content"
        className="sr-only bg-[var(--sl-cream)] text-[var(--sl-ink)] focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-9999 focus:rounded focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to main content
      </a>
      {banner && <SledgeAnnouncementBar banner={banner} />}
      <SledgeHeader business={business} initialSession={session ?? null} />
      <main id="main-content" className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>
      <SledgeFooter business={business} />
    </div>
  );
}
