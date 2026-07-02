import { Suspense } from "react";

import type { DefaultProductsPageTemplateProps } from "../../types";

import { ElegantShopClient } from "./elegant-shop-client";

export function ElegantShopPage({
  business,
}: DefaultProductsPageTemplateProps) {
  return (
    <Suspense>
      <ElegantShopClient business={business} />
    </Suspense>
  );
}
