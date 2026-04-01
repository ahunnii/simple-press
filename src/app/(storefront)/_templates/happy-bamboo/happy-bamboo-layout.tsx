import { Inter, Outfit, Plus_Jakarta_Sans } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../types";

import { HappyBambooFooter } from "./happy-bamboo-footer";
import { HappyBambooHeader } from "./happy-bamboo-header";

const fontSans = Outfit({ subsets: ["latin"], variable: "--font-sans" });

export function HappyBambooLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  return (
    <main className={`${fontSans.variable} happy-bamboo dark:happy-bamboo`}>
      <HappyBambooHeader business={business} />
      <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      <HappyBambooFooter business={business} />
    </main>
  );
}
