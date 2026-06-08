import type { DefaultLayoutTemplateProps } from "../../types";

import { PollenFooter } from "./pollen-footer";
import { PollenHeader } from "./pollen-header";

export function PollenLayout({
  business,
  children,
}: DefaultLayoutTemplateProps) {
  return (
    <div className="pollen min-h-screen">
      {/* S-1: skip link — mirrors sledge-layout.tsx pattern */}
      <a
        href="#main-content"
        className="sr-only bg-white text-[#215935] shadow focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to main content
      </a>
      <PollenHeader business={business} />
      <main id="main-content">{children}</main>
      <PollenFooter business={business} />
    </div>
  );
}
