import type { RouterOutputs } from "~/trpc/react";

import { DarkTrendCartContents } from "./dark-trend-cart-contents";
import { DarkTrendGeneralLayout } from "./dark-trend-general-layout";

type Props = {
  business: NonNullable<RouterOutputs["business"]["get"]>;
};
export async function DarkTrendCartPage({ business }: Props) {
  return (
    <DarkTrendGeneralLayout title="Cart">
      <DarkTrendCartContents business={business} />
    </DarkTrendGeneralLayout>
  );
}
