import type { DefaultCollectionPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import {
  GloveHeading,
  GloveRevealGroup,
  gloveRevealItemStyle,
  GloveSection,
  GloveStyleCard,
} from "../shared";
import { GloveListing } from "../shop/glove-listing";
import { gloveCollectionsData } from "./index";

/**
 * GloveCollectionPage (design.md Collection, extrapolated): the shop layout
 * for one collection — navy band with the collection's name and description,
 * breadcrumb Home / Shop / {name}, sort, grid and LOAD MORE — then a
 * "More Collections" row so the page is never a dead end. The route 404s
 * unpublished collections and only includes published products.
 */
export async function GloveCollectionPage({
  collection,
  business,
  additionalCollections,
}: DefaultCollectionPageTemplateProps) {
  const f = resolveFields(business.siteContent?.customFields, [
    ...gloveCollectionsData.map((field) => field.key),
    // Search copy is shared with the shop page (one edit covers both).
    "glove.shop.all-label",
    "glove.shop.results-label",
    "glove.shop.clear-search-label",
  ]);
  const get = (key: string) => f[key] ?? "";
  // B2.2/B2.5: /shop 404s with the products flag off, so don't link there.
  const { isEnabled } = await getBusinessFlags();
  const shopOn = isEnabled("products");

  const products = collection.collectionProducts.map(
    (cp) => cp.product,
  ) as Product[];
  const others = additionalCollections
    .filter((c) => c.id !== collection.id)
    .slice(0, 4);
  const moreHeading = get("glove.collections.more-heading");
  const buttonLabel = get("glove.collections.button-label");

  return (
    <>
      <GloveListing
        products={products}
        title={collection.name}
        subtitle={collection.description ?? undefined}
        showTabs={false}
        fixedCategory={collection.name}
        breadcrumb={[
          { label: "Home", href: "/" },
          ...(shopOn ? [{ label: "Shop", href: "/shop" }] : []),
          { label: collection.name },
        ]}
        copy={{
          allLabel: get("glove.shop.all-label"),
          resultsLabel: get("glove.shop.results-label"),
          clearSearchLabel: get("glove.shop.clear-search-label"),
          loadMoreLabel: get("glove.collections.load-more-label"),
          emptyHeading: get("glove.collections.detail-empty-heading"),
          emptyBody: get("glove.collections.detail-empty-body"),
          emptyButtonLabel: get("glove.collections.empty-button-label"),
          emptyButtonHref: shopOn ? "/shop" : "",
          noResultsHeading: get("glove.collections.no-results-heading"),
          noResultsBody: get("glove.collections.no-results-body"),
        }}
        keys={{
          loadMoreLabel: "glove.collections.load-more-label",
          emptyHeading: "glove.collections.detail-empty-heading",
          emptyBody: "glove.collections.detail-empty-body",
          emptyButtonLabel: "glove.collections.empty-button-label",
          noResultsHeading: "glove.collections.no-results-heading",
          noResultsBody: "glove.collections.no-results-body",
        }}
        gridSectionAttrs={sectionGroupAttr("collections", "detail")}
      />

      {others.length > 0 && moreHeading ? (
        <GloveSection
          tone="mist"
          aria-labelledby="glove-more-collections"
          sectionAttrs={sectionGroupAttr("collections", "detail")}
          reveal={false}
        >
          <GloveHeading
            id="glove-more-collections"
            fieldKey="glove.collections.more-heading"
            className="mb-10"
          >
            {moreHeading}
          </GloveHeading>
          <GloveRevealGroup threshold={0}>
            <ul className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-10 p-0 md:grid-cols-4">
              {others.map((c, i) => {
                const count = c._count.collectionProducts;
                return (
                  <li
                    key={c.id}
                    className="glove-reveal-item"
                    style={gloveRevealItemStyle(i)}
                  >
                    <GloveStyleCard
                      name={c.name}
                      blurb={`${count} ${count === 1 ? "Product" : "Products"}`}
                      image={c.imageUrl ?? "/placeholder.svg"}
                      href={`/collections/${c.slug}`}
                      buttonLabel={buttonLabel}
                      size={160}
                    />
                  </li>
                );
              })}
            </ul>
          </GloveRevealGroup>
        </GloveSection>
      ) : null}
    </>
  );
}
