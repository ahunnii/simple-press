import type { DefaultProductsPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { OlivePromoSection } from "../shared";
import { OliveShopClient } from "./olive-shop-client";

/**
 * OliveShopPage — the swatch grid, and the page the whole template is built
 * around.
 *
 * Server half: resolve the owner's copy and decide which sections render. The
 * filtering, sorting and pagination all live in the client half, which owns
 * the sticky toolbar and the grid; `useShopFilters` reads the collections
 * straight off each product's `collectionProducts`, so the chip tabs cost no
 * second query.
 */
export function OliveShopPage({ business }: DefaultProductsPageTemplateProps) {
  const customFields = business.siteContent?.customFields;

  const f = resolveFields(customFields, [
    "olive.shop.intro-heading",
    "olive.shop.intro-body",
    "olive.shop.empty-heading",
    "olive.shop.empty-body",
    "olive.shop.no-results-heading",
    "olive.shop.no-results-body",
    "olive.shop.promo-takeover",
    "olive.shop.promo-heading",
    "olive.shop.promo-body",
    "olive.shop.promo-image",
    "olive.shop.promo-button-label",
    "olive.shop.promo-button-link",
  ]);

  const products: Product[] = business.products ?? [];

  return (
    <>
      <OliveShopClient
        products={products}
        heading={f["olive.shop.intro-heading"] ?? ""}
        body={f["olive.shop.intro-body"] ?? ""}
        emptyHeading={f["olive.shop.empty-heading"] ?? ""}
        emptyBody={f["olive.shop.empty-body"] ?? ""}
        noResultsHeading={f["olive.shop.no-results-heading"] ?? ""}
        noResultsBody={f["olive.shop.no-results-body"] ?? ""}
        sectionAttrs={sectionGroupAttr("shop", "intro")}
        headingFieldKey="olive.shop.intro-heading"
        bodyFieldKey="olive.shop.intro-body"
      />

      {isSectionVisible(customFields, "olive", "shop.promo") ? (
        <OlivePromoSection
          takeover={f["olive.shop.promo-takeover"] === "true"}
          image={f["olive.shop.promo-image"] ?? "/placeholder.svg"}
          heading={f["olive.shop.promo-heading"] ?? ""}
          body={f["olive.shop.promo-body"] ?? ""}
          buttonLabel={f["olive.shop.promo-button-label"] ?? ""}
          buttonLink={f["olive.shop.promo-button-link"] ?? ""}
          tone="sage-tint"
          id="olive-shop-promo-heading"
          sectionAttrs={sectionGroupAttr("shop", "promo")}
          headingFieldKey="olive.shop.promo-heading"
          bodyFieldKey="olive.shop.promo-body"
          buttonLabelFieldKey="olive.shop.promo-button-label"
        />
      ) : null}
    </>
  );
}
