import type { DefaultProductsPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { navHrefOffFlag } from "~/app/(storefront)/_components/nav/nav-flags";

import { resolveFields } from "..";
import { GloveListing } from "./glove-listing";
import { gloveShopData } from "./index";

/**
 * GloveShopPage (design.md Shop). Server half resolves the copy; the client
 * `GloveListing` owns the banner band + collection tabs, toolbar, grid and
 * LOAD MORE. `business.products` already carries each product's
 * `collectionProducts`, so the tabs and category lines cost no extra query.
 */
export async function GloveShopPage({
  business,
}: DefaultProductsPageTemplateProps) {
  const f = resolveFields(
    business.siteContent?.customFields,
    gloveShopData.map((field) => field.key),
  );
  const get = (key: string) => f[key] ?? "";
  const { isEnabled } = await getBusinessFlags();

  // B2.5: hide a field-driven button whose destination is flagged off.
  const emptyHrefRaw = get("glove.shop.empty-button-link");
  const emptyFlag = navHrefOffFlag(emptyHrefRaw, isEnabled);
  const emptyHref =
    emptyFlag === null || isEnabled(emptyFlag) ? emptyHrefRaw : "";

  const products = (business.products ?? []) as Product[];

  return (
    <GloveListing
      products={products}
      title={get("glove.shop.heading")}
      showTabs
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: get("glove.shop.heading") },
      ]}
      copy={{
        allLabel: get("glove.shop.all-label"),
        resultsLabel: get("glove.shop.results-label"),
        clearSearchLabel: get("glove.shop.clear-search-label"),
        loadMoreLabel: get("glove.shop.load-more-label"),
        emptyHeading: get("glove.shop.empty-heading"),
        emptyBody: get("glove.shop.empty-body"),
        emptyButtonLabel: get("glove.shop.empty-button-label"),
        emptyButtonHref: emptyHref,
        noResultsHeading: get("glove.shop.no-results-heading"),
        noResultsBody: get("glove.shop.no-results-body"),
      }}
      keys={{
        title: "glove.shop.heading",
        allLabel: "glove.shop.all-label",
        resultsLabel: "glove.shop.results-label",
        clearSearchLabel: "glove.shop.clear-search-label",
        loadMoreLabel: "glove.shop.load-more-label",
        emptyHeading: "glove.shop.empty-heading",
        emptyBody: "glove.shop.empty-body",
        emptyButtonLabel: "glove.shop.empty-button-label",
        noResultsHeading: "glove.shop.no-results-heading",
        noResultsBody: "glove.shop.no-results-body",
      }}
      bandSectionAttrs={sectionGroupAttr("shop", "hero")}
      gridSectionAttrs={sectionGroupAttr("shop", "grid")}
    />
  );
}
