"use server";

import { Amatic_SC, Raleway } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";
import { getSession } from "~/server/better-auth/server";

import { NoiseAnnouncementBar } from "./noise-announcement-bar";
import { NoiseFooter } from "./sledge-footer";
import { NoiseHeader } from "./sledge-header";

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
  const session = await getSession();
  return (
    <div className={`${fontSans.variable} ${fontHeading.variable} sledge`}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-9999 focus:rounded focus:px-4 focus:py-2 focus:shadow-lg"
        style={{ background: "var(--vn-paper)", color: "var(--vn-ink)" }}
      >
        Skip to main content
      </a>
      <NoiseAnnouncementBar businessId={business.id} />
      <NoiseHeader business={business} session={session ?? null} />
      <main id="main-content" className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>
      <NoiseFooter business={business} />
    </div>
  );
}
