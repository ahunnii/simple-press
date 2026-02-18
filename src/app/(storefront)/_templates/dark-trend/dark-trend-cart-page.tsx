import type { DefaultCartPageTemplateProps } from "../types";

import { DarkTrendCartContents } from "./dark-trend-cart-contents";
import { DarkTrendGeneralLayout } from "./dark-trend-general-layout";

export async function DarkTrendCartPage({
  business,
}: DefaultCartPageTemplateProps) {
  return (
    <DarkTrendGeneralLayout title="Cart">
      <DarkTrendCartContents business={business} />
    </DarkTrendGeneralLayout>
  );
}
