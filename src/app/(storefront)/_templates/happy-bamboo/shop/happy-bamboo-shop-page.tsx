import type { Metadata } from "next";

import type { DefaultProductsPageTemplateProps } from "../../types";

import { resolveFields } from "../index";
import { HappyBambooShopClient } from "./happy-bamboo-shop-client";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse our collection of premium bamboo toilet paper and household paper products. Septic-safe, hypoallergenic, and sustainably crafted.",
};

export function HappyBambooShopPage({
  business,
}: DefaultProductsPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const fields = resolveFields(customFields, [
    "happy-bamboo.sale-badge-format",
    "happy-bamboo.shop-listing-heading",
    "happy-bamboo.shop-listing-intro",
  ]);

  return (
    <HappyBambooShopClient
      products={business.products ?? []}
      saleBadgeFormat={fields["happy-bamboo.sale-badge-format"] ?? "true"}
      shopHeading={fields["happy-bamboo.shop-listing-heading"] ?? ""}
      shopIntro={fields["happy-bamboo.shop-listing-intro"] ?? ""}
    />
  );
}
