"use server";

import { Jost, Playfair_Display } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveBanner } from "~/lib/site-banner/resolve";
import { getSession } from "~/server/better-auth/server";

import { ViiFooter } from "./vii-footer";
import { ViiHeader } from "./vii-header";

const fontSerif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-vii-serif",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const fontSans = Jost({
  subsets: ["latin"],
  variable: "--font-vii-sans",
  weight: ["300", "400", "500", "600", "700"],
});

export async function ViiLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  const [session, { isEnabled }] = await Promise.all([
    getSession(),
    getBusinessFlags(),
  ]);

  const banner = resolveBanner(business.siteContent, isEnabled("banners"));

  return (
    <div
      className={`${fontSerif.variable} ${fontSans.variable} vii`}
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {/* Skip link — always the first focusable element */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded focus:px-4 focus:py-2 focus:shadow-lg"
        style={{
          background: "var(--vii-paper)",
          color: "var(--vii-navy)",
          fontFamily: "var(--font-sans)",
        }}
      >
        Skip to main content
      </a>

      {/*
        The header is fixed (position: fixed, top-0). The announcement bar is
        rendered INSIDE the fixed header stack (via ViiHeader) so that it scrolls
        away with the header scrim. We pass the resolved banner down as a prop
        rather than mounting it here above the header, which would push page
        content down but leave the bar floating above the fixed nav unpredictably.
      */}
      <ViiHeader
        business={business}
        session={session ?? null}
        banner={banner}
      />

      <main id="main-content" className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>

      <ViiFooter business={business} />
    </div>
  );
}
