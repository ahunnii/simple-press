import type { DefaultLayoutTemplateProps } from "../../types";

import { DarkTrendFooter } from "./dark-trend-footer";
import { DarkTrendHeader } from "./dark-trend-header";

export function DarkTrendLayout({
  business,
  children,
}: DefaultLayoutTemplateProps) {
  return (
    <main className="dark-trend bg-background text-foreground min-h-screen font-sans antialiased">
      <DarkTrendHeader business={business} />
      {children}
      <DarkTrendFooter business={business} />
    </main>
  );
}
