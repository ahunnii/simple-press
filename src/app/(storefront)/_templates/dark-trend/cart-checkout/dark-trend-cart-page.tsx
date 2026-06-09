import type { DefaultCartPageTemplateProps } from "../../types";

import { DarkTrendGeneralLayout } from "../layout/dark-trend-general-layout";
import { DarkTrendCartContents } from "./dark-trend-cart-contents";

export async function DarkTrendCartPage({
  business,
}: DefaultCartPageTemplateProps) {
  return (
    <DarkTrendGeneralLayout title="Cart">
      <DarkTrendCartContents business={business} />
    </DarkTrendGeneralLayout>
  );
}
