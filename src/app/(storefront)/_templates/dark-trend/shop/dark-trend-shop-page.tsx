import { Suspense } from "react";

import type { DefaultProductsPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { Separator } from "~/components/ui/separator";

import { resolveFields } from "..";
import { DarkTrendGeneralLayout } from "../layout/dark-trend-general-layout";
import { DarkTrendShopClient } from "./dark-trend-shop-client";

export function DarkTrendShopPage({
  business,
}: DefaultProductsPageTemplateProps) {
  const f = resolveFields(business.siteContent?.customFields, [
    "dark-trend.shop.listing-heading",
    "dark-trend.shop.listing-empty",
  ]);

  const heading = f["dark-trend.shop.listing-heading"] ?? "";
  const emptyText = f["dark-trend.shop.listing-empty"] ?? "";

  return (
    <DarkTrendGeneralLayout
      title={heading}
      titleFieldKey="dark-trend.shop.listing-heading"
      sectionAttrs={sectionGroupAttr("shop", "listing")}
    >
      <Separator className="my-10" />
      {business.products?.length === 0 ? (
        <div className="py-16 text-center">
          {/* S-11: text-gray-500 → text-white/60 for contrast */}
          <p
            {...fieldAttr("dark-trend.shop.listing-empty")}
            className="text-lg text-white/60"
          >
            {emptyText}
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
