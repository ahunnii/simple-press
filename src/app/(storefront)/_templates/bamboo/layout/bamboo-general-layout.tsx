import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";

import { BambooFooter } from "./bamboo-footer";
import { BambooHeader } from "./bamboo-header";
import { BambooRouteAnnouncer } from "./bamboo-route-announcer";

const _inter = Inter({ subsets: ["latin"] });
const _plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"] });
export function BambooLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  return (
    <div
      className={`${_inter.className} ${_plusJakartaSans.className} bamboo flex min-h-screen flex-col`}
    >
      {/* Skip navigation — first focusable element on every page */}
      <a
        href="#bamboo-main-content"
        className="bamboo-skip-link focus:bg-primary focus:text-primary-foreground sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-9999 focus:rounded focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:outline-none"
      >
        Skip to main content
      </a>
      <BambooRouteAnnouncer />
      <BambooHeader business={business} />
      <main
        id="bamboo-main-content"
        className="min-h-[calc(100vh-4rem)] flex-1"
      >
        {children}
      </main>
      <BambooFooter business={business} />
    </div>
  );
}
