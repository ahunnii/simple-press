import type { DefaultCartPageTemplateProps } from "../../types";

import { NoiseCartContents } from "./noise-cart-contents";

export async function NoiseCartPage({
  business,
}: DefaultCartPageTemplateProps) {
  return <NoiseCartContents business={business} />;
}
