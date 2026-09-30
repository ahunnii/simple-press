import type { DefaultProductsPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { DefaultShopFilterClient } from "./default-shop-filter-client";
import {
  SHOP_LISTING_EMPTY_DEFAULT,
  SHOP_LISTING_HEADING_DEFAULT,
  SHOP_LISTING_LABEL_DEFAULT,
} from "./index";

export function DefaultProductsPage({
  business,
}: DefaultProductsPageTemplateProps) {
  const f = resolveFields(business.siteContent?.customFields, [
    "default.shop.listing-label",
    "default.shop.listing-heading",
    "default.shop.listing-empty",
  ]);
  const listingLabel =
    (f["default.shop.listing-label"] ?? "").trim() ||
    SHOP_LISTING_LABEL_DEFAULT;
  const listingHeading =
    (f["default.shop.listing-heading"] ?? "").trim() ||
    SHOP_LISTING_HEADING_DEFAULT;
  const listingEmpty =
    (f["default.shop.listing-empty"] ?? "").trim() ||
    SHOP_LISTING_EMPTY_DEFAULT;

  return (
    <div>
      {/* Page hero */}
      <section
        {...sectionGroupAttr("shop", "listing")}
        className="border-b border-[#e8e8e8] px-6 pt-20 pb-12 lg:px-8"
      >
        <div className="mx-auto max-w-[1440px]">
          <span
            {...fieldAttr("default.shop.listing-label")}
            className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
          >
            {listingLabel}
          </span>
          <h1
            {...fieldAttr("default.shop.listing-heading")}
            className="mt-3 font-serif text-[clamp(40px,5vw,72px)] leading-[1.04] font-semibold tracking-[-0.03em]"
          >
            {listingHeading}
          </h1>
        </div>
      </section>

      {/* Shop content */}
      <section className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          {business.products?.length === 0 ? (
            <div className="py-24 text-center">
              <p
                {...fieldAttr("default.shop.listing-empty")}
                className="text-[#6b6b6b]"
              >
                {listingEmpty}
              </p>
            </div>
          ) : (
            <DefaultShopFilterClient products={business.products} />
          )}
        </div>
      </section>
    </div>
  );
}
