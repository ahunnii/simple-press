import type { DefaultProductsPageTemplateProps } from "../../types";
import { resolveFields } from "..";

import { PollenShopClient } from "./pollen-shop-client";

export function PollenShopPage({ business }: DefaultProductsPageTemplateProps) {
  const f = resolveFields(business.siteContent?.customFields, [
    "pollen.shop.listing-title",
    "pollen.shop.listing-intro",
  ]);

  return (
    <PollenShopClient
      products={business.products ?? []}
      shopHeading={f["pollen.shop.listing-title"] ?? "Our Products"}
      shopIntro={f["pollen.shop.listing-intro"] ?? ""}
    />
  );
}
