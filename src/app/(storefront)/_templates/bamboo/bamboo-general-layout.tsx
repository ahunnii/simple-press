import {
  Geist,
  Geist_Mono,
  Inter,
  Playfair_Display,
  Plus_Jakarta_Sans,
} from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../types";

import "~/styles/bamboo.css";

import { BambooFooter } from "./bamboo-footer";
import { BambooHeader } from "./bamboo-header";

// const _geist = Geist({ subsets: ["latin"] });
// const _geistMono = Geist_Mono({ subsets: ["latin"] });
// const _playfair = Playfair_Display({
//   subsets: ["latin"],
//   variable: "--font-playfair",
// });

const _inter = Inter({ subsets: ["latin"] });
const _plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"] });
export function BambooLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  return (
    <main className={`${_inter.className} ${_plusJakartaSans.className}`}>
      <BambooHeader business={business} />
      <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      <BambooFooter business={business} />
    </main>
  );
}
