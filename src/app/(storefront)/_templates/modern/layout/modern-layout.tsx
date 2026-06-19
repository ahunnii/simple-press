import type { DefaultLayoutTemplateProps } from "../../types";

import { ModernFooter } from "./modern-footer";
import { ModernHeader } from "./modern-header";

export function ModernLayout({
  business,
  children,
}: DefaultLayoutTemplateProps) {
  return (
    <div className="flex min-h-screen flex-col font-sans antialiased">
      {/* Skip navigation — first focusable element on every page */}
      <a
        href="#main-content"
        className="focus:bg-foreground focus:text-background sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-sm focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:outline-none"
      >
        Skip to main content
      </a>
      <ModernHeader business={business} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <ModernFooter business={business} />
    </div>
  );
}
