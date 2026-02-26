import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../types";

import "~/styles/bamboo.css";

import { BambooFooter } from "./bamboo-footer";
import { BambooHeader } from "./bamboo-header";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const _playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export function BambooLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  return (
    <main
      className={`${_geist.className} ${_geistMono.className} ${_playfair.className}`}
    >
      <BambooHeader business={business} />
      <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      <BambooFooter business={business} />
    </main>
  );
}
