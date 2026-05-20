"use server";

import {
  Instrument_Serif,
  JetBrains_Mono,
  Space_Grotesk,
} from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";
import { getSession } from "~/server/better-auth/server";

import { NoiseAnnouncementBar } from "./noise-announcement-bar";
import { NoiseFooter } from "./noise-footer";
import { NoiseHeader } from "./noise-header";

const fontSans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const fontSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: "400",
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
  const session = await getSession();
  return (
    <main
      className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} editorial visual-editorial dark:editorial`}
    >
      <NoiseAnnouncementBar businessId={business.id} />
      <NoiseHeader business={business} session={session ?? null} />
      <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      <NoiseFooter business={business} />
    </main>
  );
}
