import type { DefaultLayoutTemplateProps } from "../types";

import { PollenFooter } from "./pollen-footer";
import { PollenHeader } from "./pollen-header";

export function PollenLayout({
  business,
  children,
}: DefaultLayoutTemplateProps) {
  return (
    <main className="min-h-screen">
      <PollenHeader business={business} />
      {children}
      <PollenFooter business={business} />
    </main>
  );
}
