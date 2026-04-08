"use server";

import { Cormorant_Garamond, DM_Sans } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";
import { getSession } from "~/server/better-auth/server";

import { NoiseAnnouncementBar } from "./noise-announcement-bar";
import { NoiseFooter } from "./noise-footer";
import { NoiseHeader } from "./noise-header";

const fontSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontSerif = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

export async function NoiseLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  const session = await getSession();
  return (
    <main
      className={`${fontSans.variable} ${fontSerif.variable} noise dark:noise`}
    >
      <NoiseAnnouncementBar businessId={business.id} />
      <NoiseHeader business={business} session={session ?? null} />
      <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      <NoiseFooter business={business} />
    </main>
  );
}
