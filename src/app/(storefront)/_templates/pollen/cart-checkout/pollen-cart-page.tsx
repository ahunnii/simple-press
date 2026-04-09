import type { DefaultCartPageTemplateProps } from "../../types";

import { PollenCartContents } from "./pollen-cart-contents";

export function PollenCartPage({ business }: DefaultCartPageTemplateProps) {
  return <PollenCartContents business={business} />;
}
