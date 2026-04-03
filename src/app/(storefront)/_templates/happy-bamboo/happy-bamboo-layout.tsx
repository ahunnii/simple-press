"use server";

import { Outfit, Spectral } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../types";
import { getSession } from "~/server/better-auth/server";

import { BambooAnnouncementBar } from "./bamboo-announcement-bar";
import { HappyBambooFooter } from "./happy-bamboo-footer";
import { HappyBambooHeader } from "./happy-bamboo-header";

const fontSans = Outfit({ subsets: ["latin"], variable: "--font-sans" });
const fontSerif = Spectral({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "700"],
});

export async function HappyBambooLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  const session = await getSession();
  return (
    <main
      className={`${fontSans.variable} ${fontSerif.variable} happy-bamboo dark:happy-bamboo`}
    >
      <BambooAnnouncementBar businessId={business.id} />
      <HappyBambooHeader business={business} session={session ?? null} />
      <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      <HappyBambooFooter business={business} />
    </main>
  );
}
