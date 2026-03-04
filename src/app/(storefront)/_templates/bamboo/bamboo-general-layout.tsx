import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../types";

import { BambooFooter } from "./bamboo-footer";
import { BambooHeader } from "./bamboo-header";

const _inter = Inter({ subsets: ["latin"] });
const _plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"] });
export function BambooLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  return (
    <main
      className={`${_inter.className} ${_plusJakartaSans.className} bamboo`}
    >
      <BambooHeader business={business} />
      <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      <BambooFooter business={business} />
    </main>
  );
}
