"use server";

import { Agdasima, Jost } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { getSession } from "~/server/better-auth/server";

import { BuildersFooter } from "./builders-footer";
import { BuildersHeader } from "./builders-header";

const fontDisplay = Jost({
  subsets: ["latin"],
  variable: "--font-builders-display",
  weight: ["300", "400", "500", "600", "700"],
});

const fontBody = Agdasima({
  subsets: ["latin"],
  variable: "--font-builders-body",
  weight: ["400", "700"],
});

export async function BuildersLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  const [session] = await Promise.all([getSession(), getBusinessFlags()]);

  return (
    <div
      className={`${fontDisplay.variable} ${fontBody.variable} builders`}
      style={{
        fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
        color: "var(--builders-ink, #131313)",
        background: "var(--builders-bg, #F8F9FA)",
      }}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:shadow-lg"
        style={{
          background: "var(--builders-surface, #ffffff)",
          color: "var(--builders-ink, #131313)",
          border: "1px solid var(--builders-rule, #e5e7eb)",
        }}
      >
        Skip to main content
      </a>
      <BuildersHeader business={business} session={session ?? null} />
      <main id="main-content" className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>
      <BuildersFooter business={business} />
    </div>
  );
}
