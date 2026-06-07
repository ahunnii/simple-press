import type { DefaultCartPageTemplateProps } from "../../types";

import { SledgeCartContents } from "./sledge-cart-contents";

export async function SledgeCartPage({
  business,
}: DefaultCartPageTemplateProps) {
  return <SledgeCartContents business={business} />;
}
