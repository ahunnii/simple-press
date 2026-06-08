import type { DefaultLayoutTemplateProps } from "../../types";

import { DarkTrendFooter } from "./dark-trend-footer";
import { DarkTrendHeader } from "./dark-trend-header";

export function DarkTrendLayout({
  business,
  children,
}: DefaultLayoutTemplateProps) {
  return (
    <div className="dark-trend bg-background text-foreground min-h-screen font-sans antialiased">
      {/* Skip link — visible on keyboard focus, hidden otherwise (WCAG 2.4.1) */}
      <a href="#main-content" className="dt-skip-link">
        Skip to main content
      </a>
      <DarkTrendHeader business={business} />
      <main id="main-content">{children}</main>
      <DarkTrendFooter business={business} />
    </div>
  );
}
