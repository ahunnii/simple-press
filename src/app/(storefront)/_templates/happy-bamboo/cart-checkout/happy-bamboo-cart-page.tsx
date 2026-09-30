import type { DefaultCartPageTemplateProps } from "../../types";

import { resolveFields } from "..";
import { HappyBambooCartContents } from "./happy-bamboo-cart-contents";

export async function HappyBambooCartPage({
  business,
}: DefaultCartPageTemplateProps) {
  const f = resolveFields(business.siteContent?.customFields, [
    "happy-bamboo.global.cart-empty-text",
  ]);
  const cartEmptyText = f["happy-bamboo.global.cart-empty-text"] ?? "";

  return (
    <HappyBambooCartContents business={business} cartEmptyText={cartEmptyText} />
  );
}
