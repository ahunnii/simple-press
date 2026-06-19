"use server";

import { Jost, Playfair_Display } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";
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
  const session = await getSession();

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

      <ViiHeader business={business} session={session ?? null} />

      <main id="main-content" className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>

      <ViiFooter business={business} />
    </div>
  );
}
