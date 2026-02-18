import type { DefaultLayoutTemplateProps } from "../types";

import { ElegantFooter } from "./elegant-footer";
import { ElegantHeader } from "./elegant-header";

export function ElegantLayout({
  business,
  children,
}: DefaultLayoutTemplateProps) {
  return (
    <main className="min-h-screen">
      <ElegantHeader business={business} />
      {children}
      <ElegantFooter business={business} />
    </main>
  );
}
