import { Suspense } from "react";

import type { DefaultProductsPageTemplateProps } from "../../types";
import { Separator } from "~/components/ui/separator";

import { DarkTrendGeneralLayout } from "../layout/dark-trend-general-layout";
import { DarkTrendShopClient } from "./dark-trend-shop-client";

export function DarkTrendShopPage({
  business,
}: DefaultProductsPageTemplateProps) {
  return (
    <DarkTrendGeneralLayout title="All Products">
      <Separator className="my-10" />
      {business.products?.length === 0 ? (
        <div className="py-16 text-center">
          {/* S-11: text-gray-500 → text-white/60 for contrast */}
          <p className="text-lg text-white/60">
            No products available at this time.
          </p>
        </div>
      ) : (
        <Suspense>
          <DarkTrendShopClient products={business.products ?? []} />
        </Suspense>
      )}
    </DarkTrendGeneralLayout>
  );
}
