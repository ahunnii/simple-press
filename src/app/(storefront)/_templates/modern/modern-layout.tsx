import type { DefaultLayoutTemplateProps } from "../types";

import { ModernFooter } from "./modern-footer";
import { ModernHeader } from "./modern-header";

export function ModernLayout({
  business,
  children,
}: DefaultLayoutTemplateProps) {
  return (
    <main className="min-h-screen font-sans antialiased">
      <ModernHeader business={business} />
      {children}
      <ModernFooter business={business} />
    </main>
  );
}
