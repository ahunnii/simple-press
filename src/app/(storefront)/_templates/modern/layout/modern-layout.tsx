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
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-sm focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background focus:outline-none"
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
