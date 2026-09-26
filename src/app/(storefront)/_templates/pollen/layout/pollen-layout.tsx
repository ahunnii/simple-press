import type { DefaultLayoutTemplateProps } from "../../types";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { resolveBanner } from "~/lib/site-banner/resolve";

import { resolveFields } from "..";
import { PollenFooter } from "./pollen-footer";
import { PollenHeader } from "./pollen-header";

export function PollenLayout({
  business,
  children,
}: DefaultLayoutTemplateProps) {
  const { isEnabled } = resolveFlags(business?.featureFlags);
  // Platform announcement bar (Content → Banner & popup). Rendered once here,
  // inside the fixed header, so it shows on every storefront page including
  // the homepage.
  const banner = resolveBanner(business.siteContent, isEnabled("banners"));

  // Resolved server-side so the client header doesn't bundle the whole
  // pollen field registry just for two strings.
  const f = resolveFields(business?.siteContent?.customFields, [
    "pollen.global.header-button-text",
    "pollen.global.header-button-link",
  ]);

  return (
    <div className="pollen min-h-screen">
      {/* S-1: skip link — mirrors sledge-layout.tsx pattern */}
      <a
        href="#main-content"
        className="sr-only bg-white text-[#215935] shadow focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to main content
      </a>
      <PollenHeader
        business={business}
        banner={banner}
        buttonText={f["pollen.global.header-button-text"] ?? ""}
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- || is intentional so an empty saved value also falls back
        buttonLink={f["pollen.global.header-button-link"] || "/contact"}
      />
      <main id="main-content">{children}</main>
      <PollenFooter business={business} />
    </div>
  );
}
