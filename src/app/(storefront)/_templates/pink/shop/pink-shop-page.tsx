import type { DefaultProductsPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { isInStock } from "~/lib/product-stock";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "../index";
import { PinkPageHeader } from "../shared/pink-page-header";
import { PinkShopClient } from "./pink-shop-client";

const FIELD_KEYS = [
  "pink.shop.header-heading",
  "pink.shop.header-intro",
  "pink.shop.filters-cta-heading",
  "pink.shop.filters-cta-body",
  "pink.shop.filters-cta-label",
  "pink.shop.filters-cta-href",
  "pink.shop.add-to-basket-label",
  "pink.shop.add-to-basket-added-label",
  "pink.shop.choose-options-label",
  "pink.shop.sold-out-label",
  "pink.shop.load-more-label",
  "pink.shop.empty-heading",
  "pink.shop.empty-body",
  "pink.shop.empty-cta-label",
  "pink.shop.empty-cta-href",
];

/**
 * Shop page — design.md → "Per-page section concepts → Shop".
 *
 * Server → client handoff: this component fetches/resolves everything,
 * `PinkShopClient` owns the in-memory filter/sort UI state (mirrors
 * `happy-bamboo-shop-client.tsx`).
 */
export function PinkShopPage({ business }: DefaultProductsPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const f = resolveFields(customFields, FIELD_KEYS);

  const products = (business.products ?? []) as unknown as Product[];
  const filtersVisible = isSectionVisible(customFields, "pink", "shop.filters");

  const totalShown = products.length;
  const readyToShip = products.filter((p) => {
    const additional = p.additionalFields as { comingSoon?: boolean } | null;
    if (additional?.comingSoon) return false;
    return isInStock(p);
  }).length;

  return (
    <>
      <PinkPageHeader
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Shop" }]}
        heading={f["pink.shop.header-heading"] ?? ""}
        headingFieldKey="pink.shop.header-heading"
        intro={f["pink.shop.header-intro"] ?? ""}
        introFieldKey="pink.shop.header-intro"
        sectionAttrs={sectionGroupAttr("shop", "header")}
        rightSlot={
          // PinkPageHeader became a LIGHT band on 2026-07-31, so these counts
          // moved from the dark ramp to the light one. `--pink-paper` here was
          // white-on-white and `--pink-ink-subtle` measured 2.6:1.
          <div className="flex flex-col items-start gap-1 md:items-end">
            <p className="text-[15px]" style={{ color: "var(--pink-ink)" }}>
              <span className="font-semibold">{totalShown}</span>{" "}
              {totalShown === 1 ? "piece shown" : "pieces shown"}
            </p>
            <p className="text-[15px]" style={{ color: "var(--pink-subtle)" }}>
              <span className="font-semibold" style={{ color: "var(--pink-ink)" }}>
                {readyToShip}
              </span>{" "}
              ready to ship
            </p>
          </div>
        }
      />

      <PinkShopClient
        products={products}
        filtersVisible={filtersVisible}
        filtersCta={{
          heading: f["pink.shop.filters-cta-heading"] ?? "",
          body: f["pink.shop.filters-cta-body"] ?? "",
          label: f["pink.shop.filters-cta-label"] ?? "",
          href: f["pink.shop.filters-cta-href"] ?? "/contact",
        }}
        copy={{
          addToBasketLabel: f["pink.shop.add-to-basket-label"] ?? "Add to basket",
          addedLabel: f["pink.shop.add-to-basket-added-label"] ?? "Added ✓",
          chooseOptionsLabel: f["pink.shop.choose-options-label"] ?? "Choose options",
          soldOutLabel: f["pink.shop.sold-out-label"] ?? "Sold out",
          loadMoreLabel: f["pink.shop.load-more-label"] ?? "Load more",
          emptyHeading: f["pink.shop.empty-heading"] ?? "Nothing here yet.",
          emptyBody: f["pink.shop.empty-body"] ?? "",
          emptyCtaLabel: f["pink.shop.empty-cta-label"] ?? "",
          emptyCtaHref: f["pink.shop.empty-cta-href"] ?? "/contact",
        }}
      />
    </>
  );
}
