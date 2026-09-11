import { Bricolage_Grotesque, DM_Sans } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";
import { cn } from "~/lib/utils";

import { BambooSprite } from "../shared/bamboo-sprite";
import { BambooFooter } from "./bamboo-footer";
import { BambooHeader } from "./bamboo-header";
import { BambooRouteAnnouncer } from "./bamboo-route-announcer";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bamboo-display",
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-bamboo-body",
});

export function BambooLayout({
  children,
  business,
}: DefaultLayoutTemplateProps) {
  return (
    <div
      className={cn(
        display.variable,
        body.variable,
        "animated-bamboo flex min-h-screen flex-col",
      )}
    >
      <BambooSprite />

      {/* Skip navigation — first focusable element on every page */}
      <a href="#bamboo-main-content" className="bamboo-skip-link">
        Skip to main content
      </a>

      <BambooRouteAnnouncer />
      <BambooHeader business={business} />
      {/* Column flex so a page's trailing footer edge (mt-auto) can pin to
          the bottom of main even when the page content is shorter than the
          viewport, instead of leaving a strip of paper above the footer. */}
      <main
        id="bamboo-main-content"
        className="flex min-h-[calc(100vh-var(--bamboo-header-offset))] flex-1 flex-col"
      >
        {children}
      </main>
      <BambooFooter business={business} />
    </div>
  );
}
